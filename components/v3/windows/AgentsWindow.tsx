'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, MessageSquare, Wrench, Pencil, Trash2, ChevronDown, Copy, Check, UserRound } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, SUITE_TINT, v3AgentByKey, type V3Agent, type V3Session, type V3Suite } from '@/lib/v3/powerAgents';
import { useV3Fetch, v3Ago, isV3SessionUnread, markThreadSeen } from '@/lib/v3/data';
import { EngConsole } from '@/components/v3/ui/EngConsole';
import { V3Markdown } from '@/components/v3/ui/V3Markdown';

function RosterView() {
  const [q, setQ] = useState('');
  const [suiteFilter, setSuiteFilter] = useState<V3Suite | 'all'>('all');
  const { selectAgent } = useV3OS.getState();
  const workspaceId = useV3OS((s) => s.workspaceId);
  const agents = useV3Fetch(fetchV3PowerAgents, []);
  // workspace-wide feed powers each card's stats line (real session counts)
  const feed = useV3Fetch(() => (workspaceId ? fetchV3Sessions(workspaceId) : Promise.resolve([] as V3Session[])), [workspaceId]);

  const stats = useMemo(() => {
    const by = new Map<string, { count: number; last: string | null; unread: number }>();
    (feed.data ?? []).forEach((s) => {
      if (!s.agentKey) return;
      const cur = by.get(s.agentKey) ?? { count: 0, last: null, unread: 0 };
      cur.count += 1;
      if (isV3SessionUnread(s)) cur.unread += 1;
      const t = s.updatedAt ?? s.createdAt;
      if (t && (!cur.last || t > cur.last)) cur.last = t;
      by.set(s.agentKey, cur);
    });
    return by;
  }, [feed.data]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const roster = agents.data ?? [];
    return roster.filter((a) => {
      if (suiteFilter !== 'all' && a.suite !== suiteFilter) return false;
      if (!needle) return true;
      return `${a.name} ${a.role} ${a.suite} ${a.key} ${a.handle}`.toLowerCase().includes(needle);
    });
  }, [agents.data, q, suiteFilter]);

  // suite sections in roster order; within a section, an odd trailing card
  // spans the full row so no row is left half-empty
  const suites = useMemo(() => {
    const by = new Map<string, typeof visible>();
    visible.forEach((a) => {
      const list = by.get(a.suite) ?? [];
      list.push(a);
      by.set(a.suite, list);
    });
    return [...by.entries()];
  }, [visible]);

  const suiteList = useMemo(() => {
    const by = new Map<V3Suite, number>();
    (agents.data ?? []).forEach((a) => by.set(a.suite, (by.get(a.suite) ?? 0) + 1));
    return [...by.entries()];
  }, [agents.data]);

  /** Enter in the deploy prompt opens the best-scoring match (v13 behavior). */
  function deployBest() {
    const needle = q.trim().toLowerCase();
    if (!needle || visible.length === 0) return;
    const best = visible
      .map((a) => {
        let s = 0;
        if (a.handle.toLowerCase().includes(needle)) s += 3;
        if (a.name.toLowerCase().includes(needle)) s += 3;
        if (a.key.toLowerCase().includes(needle)) s += 2;
        if (a.role.toLowerCase().includes(needle)) s += 1;
        if (a.suite.toLowerCase().includes(needle)) s += 1;
        return [a, s] as const;
      })
      .sort((x, y) => y[1] - x[1])[0];
    if (best) selectAgent(best[0].key);
  }

  if (agents.loading) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--muted)', padding: 24 }}>
        loading power agents…
      </p>
    );
  }
  if (agents.error) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--amber)', padding: 24 }}>
        agents unavailable ({agents.error}) ·{' '}
        <button className="chip" onClick={agents.reload}>
          retry
        </button>
      </p>
    );
  }

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 6 }}>
        Deploy prompt · describe work — we pick the agent
      </p>
      <div className="askbar" style={{ marginBottom: 10 }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') deployBest();
          }}
          placeholder="Search power agents… try 'crawl', 'shopify', 'content'"
          aria-label="Search power agents"
        />
        <span className="chip font-mono">{visible.length}/{agents.data?.length ?? 0}</span>
      </div>
      <div className="v3-fchips" role="group" aria-label="Filter agents by suite">
        <button
          type="button"
          className={`fchip${suiteFilter === 'all' ? ' on' : ''}`}
          aria-pressed={suiteFilter === 'all'}
          onClick={() => setSuiteFilter('all')}
        >
          all · {agents.data?.length ?? 0}
        </button>
        {suiteList.map(([s, n]) => (
          <button
            key={s}
            type="button"
            className={`fchip${suiteFilter === s ? ' on' : ''}`}
            aria-pressed={suiteFilter === s}
            onClick={() => setSuiteFilter(suiteFilter === s ? 'all' : s)}
          >
            {s.replace(' Suite', '').toLowerCase()} · {n}
          </button>
        ))}
      </div>
      {suites.map(([suite, list]) => (
        <div key={suite} style={{ marginBottom: 12 }}>
          <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            {suite} · {list.length} agent{list.length === 1 ? '' : 's'}
          </p>
          <div className="roster-grid">
            {list.map((a) => {
              const tint = SUITE_TINT[a.suite];
              const st = stats.get(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  className="bento-item agent-card"
                  aria-label={`Deploy ${a.handle} — ${a.role} · ${st?.count ?? 0} sessions${st?.unread ? ` · ${st.unread} unread` : ''}`}
                  onClick={() => selectAgent(a.key)}
                >
                  <span className="profile-banner" style={{ background: tint.bg }} aria-hidden="true">
                    <span className={`profile-dot${st?.unread ? ' has-unread' : ''}`} />
                  </span>
                  <span className="profile-avatar" style={{ background: tint.bg, color: tint.color }} aria-hidden="true">
                    <a.icon size={22} />
                  </span>
                  <span className="profile-id min-w-0">
                    <span className="block font-mono font-bold text-xs truncate">{a.handle}</span>
                    <span className="block font-mono text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                      {a.role}
                    </span>
                  </span>
                  <span className="chip profile-suite">{a.suite.replace(' Suite', '')}</span>
                  <span className="profile-stats font-mono">
                    <span>
                      <strong>{st?.count ?? 0}</strong> sessions
                    </span>
                    <span>
                      <strong>{st ? v3Ago(st.last) : '—'}</strong> last run
                    </span>
                  </span>
                  <span className="btn-deploy profile-deploy" aria-hidden="true">
                    Deploy <ArrowUpRight size={10} style={{ display: 'inline' }} />
                  </span>
                  <span className="back-link profile-open" aria-hidden="true">
                    Open execution →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {visible.length === 0 && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          No power agents match “{q}”.
        </p>
      )}
    </div>
  );
}

function AgentExecView({ agentKey }: { agentKey: string }) {
  const workspaceId = useV3OS((s) => s.workspaceId);
  const { selectAgent } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const agent = v3AgentByKey(agents.data ?? [], agentKey);

  const [sessions, setSessions] = useState<V3Session[]>([]);
  // the chat transport's request builder is captured once — read live values
  // through refs so a deep-linked exec view (roster still loading at mount)
  // sends the resolved agent/workspace, not the undefined first render
  const agentRef = useRef(agent);
  agentRef.current = agent;
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const titlePatchedRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // unread chips re-render when a thread is marked viewed
  const [seenTick, setSeenTick] = useState(0);
  const seen = useCallback((id: string) => {
    markThreadSeen(id);
    setSeenTick((t) => t + 1);
  }, []);
  // live-join of an in-flight run (switch-back resume) — abortable
  const joinAbortRef = useRef<AbortController | null>(null);
  const [liveJoin, setLiveJoin] = useState(false);
  useEffect(() => () => joinAbortRef.current?.abort(), []);
  // unread: threads updated since their last view, except the one open now
  // (declared with the other hooks — before the early returns below)
  const unreadIds = useMemo(() => {
    void seenTick; // recompute when a thread is marked viewed
    return new Set(sessions.filter((s) => s.id !== activeThread && isV3SessionUnread(s)).map((s) => s.id));
  }, [sessions, activeThread, seenTick]);


  const refreshSessions = useCallback(async () => {
    if (!agent || !workspaceId) return;
    try {
      const res = await fetch(
        `/api/power-agents/threads?agentKey=${encodeURIComponent(agent.key)}&workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      if (res.ok) setSessions((await res.json()) as V3Session[]);
    } catch {
      /* list is best-effort */
    }
  }, [agent, workspaceId]);

  useEffect(() => {
    refreshSessions();
    setActiveThread(null);
    activeThreadRef.current = null;
  }, [refreshSessions]);

  // consume a deep-linked thread (triage/assignments) exactly once: load
  // that session's history into the fresh exec view
  const deepThread = useV3OS((s) => s.selectedThreadKey);
  const deepConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (deepThread && deepThread !== deepConsumedRef.current) {
      deepConsumedRef.current = deepThread;
      useV3OS.setState({ selectedThreadKey: null });
      void switchSession(deepThread);
    }
  }, [deepThread]);

  // the same streaming utils the /power-agents page uses: stock useChat over
  // the AI-SDK bridge at /api/power-agents/chat
  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/power-agents/chat',
      prepareSendMessagesRequest: ({ id, messages: chatMessages, trigger, requestMetadata, api, headers, body, credentials }) => ({
        id,
        trigger,
        requestMetadata,
        api,
        headers,
        credentials,
        body: {
          ...(body as Record<string, unknown> | undefined),
          assistantId: agentRef.current?.assistantId,
          agentKey: agentRef.current?.key,
          workspaceId: workspaceIdRef.current,
          threadId: activeThreadRef.current,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.parts?.map((p) => (p.type === 'text' ? p.text : '')).join(''),
          })),
        },
      }),
    }),
    onFinish: (options) => {
      // the bridge emits the (lazily created) thread id as a data part
      const part = options.message.parts?.find((p) => p.type === 'data-thread-id') as unknown as
        | { type: string; data?: string[] }
        | undefined;
      const id = part?.data?.[0];
      if (id && id !== activeThreadRef.current) {
        setActiveThread(id);
        activeThreadRef.current = id;
        setSessions((s) => (s.some((c) => c.id === id) ? s : [{ id, title: 'New session', agentKey: agentKey, createdAt: null, updatedAt: null }, ...s]));
      }
      const viewedId = id ?? activeThreadRef.current;
      if (viewedId) seen(viewedId); // the run you just watched is read
      // first reply in an untitled session: auto-title from context
      const chip = sessions.find((c) => c.id === (id ?? activeThreadRef.current));
      if (chip && (chip.title === 'New session' || !chip.title) && titlePatchedRef.current !== chip.id) {
        titlePatchedRef.current = chip.id;
        const agentLine =
          options.message.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => (p as { text?: string }).text ?? '')
            .join('')
            .split(/[.!?\n]/)
            .map((s) => s.replace(/[*`>#-]/g, '').trim())
            .find((s) => s.length > 15) ?? '';
        const userText =
          messages
            .filter((m) => m.role === 'user')
            .map((m) => m.parts?.map((p) => (p.type === 'text' ? (p as { text?: string }).text : '')).join(''))
            .filter(Boolean)
            .pop() ?? '';
        const title = (agentLine || userText).trim().slice(0, 48) || 'New session';
        fetch(`/api/power-agents/threads/${chip.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })
          .then(refreshSessions)
          .catch(() => {});
      } else {
        refreshSessions();
      }
    },
  });

  const busy = status === 'submitted' || status === 'streaming';
  // the run-state chip treats a joined in-flight run as streaming too
  const streaming = busy || liveJoin;
  // DAG steps: this run's tool calls in order, with their live states
  const runSteps = useMemo(() => {
    const out: { name: string; state: 'running' | 'done' | 'failed' }[] = [];
    messages.forEach((m) =>
      (m.parts ?? []).forEach((p) => {
        if (!p.type.startsWith('tool-')) return;
        const st = (p as { state?: string }).state ?? '';
        out.push({
          name: p.type.slice('tool-'.length) || 'tool',
          state: st === 'input-streaming' || st === 'input-available' ? 'running' : st === 'output-error' ? 'failed' : 'done',
        });
      }),
    );
    return out;
  }, [messages]);


  async function newSession() {
    if (busy) stop();
    joinAbortRef.current?.abort();
    if (!agent || !workspaceId) return;
    try {
      const res = await fetch('/api/power-agents/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentKey: agent.key, assistantId: agent.assistantId, workspaceId }),
      });
      if (res.ok) {
        const t = (await res.json()) as { id?: string; title?: string };
        const id = t?.id;
        if (id) {
          setSessions((s) => [{ id, title: t.title ?? 'New session', agentKey: agent.key, createdAt: null, updatedAt: null }, ...s]);
          setActiveThread(id);
          activeThreadRef.current = id;
          setMessages([]);
          seen(id);
        }
      }
    } catch {
      /* keep current session on failure */
    }
  }

  async function switchSession(id: string) {
    if (id === activeThread || busy) return;
    joinAbortRef.current?.abort(); // drop any joined stream before switching
    try {
      const res = await fetch(`/api/power-agents/threads/${id}`);
      if (!res.ok) {
        if (res.status === 404) setSessions((s) => s.filter((c) => c.id !== id));
        return;
      }
      const t = (await res.json()) as { messages: UIMessage[]; busy?: boolean };
      setActiveThread(id);
      activeThreadRef.current = id;
      setMessages(t.messages);
      seen(id); // viewing the thread reads it
      // a live run on this thread: attach to its stream for token-level resume
      if (t.busy) void joinActiveStream(id);
    } catch {
      /* stay on current */
    }
  }

  /** Attach to a running stream on a thread and feed parts into messages —
   *  the same join protocol the production power-agents page uses. */
  async function joinActiveStream(threadId: string) {
    joinAbortRef.current?.abort();
    setLiveJoin(true);
    let ac: AbortController | null = null;
    const patchLastAssistant = (patch: (parts: UIMessage['parts']) => UIMessage['parts']) => {
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'assistant') {
            next[i] = { ...next[i], parts: patch(next[i].parts ?? []) };
            break;
          }
        }
        return next;
      });
    };
    try {
      ac = new AbortController();
      joinAbortRef.current = ac;
      const res = await fetch(`/api/power-agents/threads/${threadId}/join`, { signal: ac.signal });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let joinedText = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, '');
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          let part: Record<string, unknown>;
          try {
            part = JSON.parse(data);
          } catch {
            continue;
          }
          if (part.type === 'text-delta') {
            joinedText += part.delta as string;
            const text = joinedText;
            patchLastAssistant((parts) => {
              const idx = parts.findIndex((p) => p.type === 'text');
              if (idx >= 0) {
                return parts.map((p, i) => (i === idx ? ({ ...p, type: 'text', text, state: 'streaming' } as UIMessage['parts'][number]) : p));
              }
              return [...parts, { type: 'text', text, state: 'streaming' } as UIMessage['parts'][number]];
            });
          } else if (part.type === 'finish') {
            patchLastAssistant((parts) => parts.map((p) => (p.type === 'text' ? ({ ...p, state: 'done' } as UIMessage['parts'][number]) : p)));
            seen(threadId);
            refreshSessions();
            return;
          } else if (part.type === 'data-no-active-run') {
            return; // run finished between the check and the join
          }
        }
      }
    } catch {
      /* join is best-effort */
    } finally {
      setLiveJoin(false);
    }
  }

  async function renameSession(id: string) {
    if (!renaming || !renaming.value.trim()) return setRenaming(null);
    const title = renaming.value.trim().slice(0, 80);
    setRenaming(null);
    setSessions((s) => s.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await fetch(`/api/power-agents/threads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch {
      refreshSessions(); // optimistic — revert on failure
    }
  }

  async function deleteSession(id: string) {
    setConfirmingDelete(null);
    setSessions((s) => s.filter((c) => c.id !== id));
    if (activeThreadRef.current === id) {
      activeThreadRef.current = null;
      setActiveThread(null);
      setMessages([]);
    }
    try {
      await fetch(`/api/power-agents/threads/${id}`, { method: 'DELETE' });
    } catch {
      /* chip stays gone; the server list reconciles on next refresh */
    }
    refreshSessions();
  }

  /** Send — creating the session thread up front when none is selected,
   *  so a new run has its identity immediately (not only at stream end). */
  async function sendWithSession(text: string) {
    if (!agent || streaming) return;
    if (!activeThreadRef.current) {
      try {
        const res = await fetch('/api/power-agents/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentKey: agent.key, assistantId: agent.assistantId, workspaceId, title: 'New session' }),
        });
        const t = res.ok ? ((await res.json()) as { id?: string; title?: string }) : null;
        const id = t?.id;
        if (id) {
          activeThreadRef.current = id;
          setActiveThread(id);
          seen(id);
          setSessions((s) => (s.some((c) => c.id === id) ? s : [{ id, title: t.title ?? 'New session', agentKey: agent.key, createdAt: null, updatedAt: null }, ...s]));
        }
      } catch {
        /* fall back to the server's lazy thread creation on send */
      }
    }
    await sendMessage({ text });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, busy]);

  if (agents.loading) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--muted)', padding: 24 }}>
        loading agent…
      </p>
    );
  }
  if (!agent) {
    return (
      <div className="flex flex-col items-center" style={{ padding: 40 }}>
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          Unknown agent.
        </p>
        <button className="back-link mt-2" onClick={() => selectAgent(null)}>
          ← all agents
        </button>
      </div>
    );
  }
  const Icon = agent.icon;
  const activeChip = sessions.find((s) => s.id === activeThread) ?? null;
  const tint = SUITE_TINT[agent.suite];
  // v13 run states: an idle agent is deployed, a finished run awaits review
  const runState = streaming ? 'streaming…' : error ? 'stream error' : messages.length > 0 ? 'done — awaiting your review' : 'deployed';

  return (
    <div>
      <div className="widget agent-profile-head" style={{ marginBottom: 12 }}>
        <div className="profile-banner" style={{ background: tint.bg }} aria-hidden="true" />
        <div className="head-row">
          <button className="back-link" onClick={() => selectAgent(null)}>
            ← all agents
          </button>
          <span className="chip">{runState}</span>
        </div>
        <div className="agent-head">
          <div className="tile" style={{ background: tint.bg, color: tint.color }}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-mono font-bold text-base truncate">
              {agent.handle} · {agent.role}
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {agent.suite} · {agent.key}
            </p>
          </div>
        </div>
      </div>
      <div className="v3-split">
        <div className="v3-split-canvas">
          <div className="widget v3-chat-wrap">
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              Conversation · {agent.handle}
              {activeChip ? ` · ${activeChip.title}` : ' · new session'}
            </p>
              <div className="v3-chat" role="log" aria-live="polite">
              {messages.length === 0 && !busy && (
                <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  No messages yet — assign a task below. Nothing ships without you.
                </p>
              )}
              <ChatFeed messages={messages} agent={agent} />
              {streaming && (
                <p className="font-mono text-xs v3-working" style={{ color: 'var(--muted)' }}>
                  working…
                </p>
              )}
              {error && (
                <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>
                  stream error: {error.message || String(error)}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="widget" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)' }}>
                Sessions · this workspace
              </p>
              <button className="chip" onClick={newSession}>
                + new
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                No sessions yet — the first task starts one.
              </p>
            ) : (
              sessions.map((s) => {
                const active = s.id === activeThread;
                if (renaming && renaming.id === s.id) {
                  return (
                    <div key={s.id} className="thread-row" style={{ cursor: 'default' }}>
                      <MessageSquare size={12} style={{ color: tint.color, flexShrink: 0 }} />
                      <input
                        className="task-input meta"
                        autoFocus
                        value={renaming.value}
                        aria-label={`Rename ${s.title}`}
                        onChange={(e) => setRenaming({ id: s.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameSession(s.id);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        style={{ padding: '4px 8px', fontSize: 12 }}
                      />
                      <button className="chip shrink-0" onClick={() => renameSession(s.id)} aria-label="Save name">
                        save
                      </button>
                    </div>
                  );
                }
                return (
                  <div
                    key={s.id}
                    className={`thread-row v3-session${active ? ' viewing' : ''}`}
                    data-tip={`${s.title} · click to load`}
                    onClick={() => switchSession(s.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && switchSession(s.id)}
                  >
                    <MessageSquare size={12} style={{ color: tint.color, flexShrink: 0 }} />
                    <span className="meta">
                      <p className="font-mono font-bold text-xs">{s.title}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {active ? 'active' : v3Ago(s.updatedAt ?? s.createdAt)}
                      </p>
                    </span>
                    {unreadIds.has(s.id) && (
                      <span className="v3-unread-chip shrink-0" title="updated since your last view">
                        new
                      </span>
                    )}
                    {confirmingDelete === s.id ? (
                      <span className="v3-session-actions shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button className="chip" style={{ color: '#dc2626' }} onClick={() => deleteSession(s.id)} aria-label={`Confirm delete ${s.title}`}>
                          delete?
                        </button>
                        <button className="chip" onClick={() => setConfirmingDelete(null)} aria-label="Cancel delete">
                          ✕
                        </button>
                      </span>
                    ) : (
                      <span className="v3-session-actions shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button className="chip" onClick={() => { setRenaming({ id: s.id, value: s.title }); }} aria-label={`Rename ${s.title}`} data-tip="rename">
                          <Pencil size={10} />
                        </button>
                        <button className="chip" onClick={() => setConfirmingDelete(s.id)} aria-label={`Delete ${s.title}`} data-tip="delete">
                          <Trash2 size={10} />
                        </button>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="v3-split-input">
          {/* run context panel — fills the column above the console */}
          <div className="widget">
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              Session
            </p>
            <p className="font-mono font-bold text-xs truncate" title={activeChip?.title}>
              {activeChip?.title ?? 'new session'}
            </p>
            {activeThread ? (
              <button
                className="chip mt-2"
                style={{ maxWidth: '100%' }}
                data-tip="copy thread id"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(activeThread);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 1500);
                  } catch {
                    /* clipboard unavailable */
                  }
                }}
              >
                {copiedId ? <Check size={10} /> : <Copy size={10} />} {activeThread.slice(0, 14)}…
              </button>
            ) : (
              <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
                starts on first message
              </p>
            )}
            <p className="font-mono text-[10px] mt-2 flex items-center gap-1.5" style={{ color: busy ? 'var(--accent)' : 'var(--muted)' }}>
              <span
                aria-hidden="true"
                className={busy ? 'v3-working' : ''}
                style={{ width: 6, height: 6, borderRadius: '50%', background: busy ? 'var(--accent)' : error ? '#dc2626' : '#10b981', display: 'inline-block', flexShrink: 0 }}
              />
              {streaming ? 'streaming' : error ? 'stream error' : messages.length > 0 ? 'done — awaiting your review' : 'ready'}
            </p>
          </div>

          <div className="widget" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              This run
            </p>
            {/* v13 kinetic DAG: the run's tool sequence as step nodes — done
                dim green, active pulses in accent, fill lines complete */}
            {runSteps.length > 0 && (
              <>
                <div className="dag" role="list" aria-label="Run progress">
                  {runSteps.map((s, i) => (
                    <span key={`${s.name}-${i}`} style={{ display: 'contents' }}>
                      {i > 0 && <span className={`dag-line${runSteps[i - 1].state === 'done' ? ' fill' : ''}`} aria-hidden="true" />}
                      <span
                        className={`dag-node${s.state === 'running' ? ' active' : s.state === 'failed' ? ' failed' : ' done'}`}
                        role="listitem"
                        aria-label={`${s.name} ${s.state}`}
                      >
                        <span className={`dag-dot${s.state === 'running' ? ' run' : ''}`} aria-hidden="true" />
                        <span className="dag-label font-mono">{s.name}</span>
                      </span>
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[10px]" style={{ color: 'var(--muted)', marginBottom: 8 }}>
                  {runSteps.filter((s) => s.state === 'done').length}/{runSteps.length} steps
                  {runSteps.some((s) => s.state === 'running') ? ' · running' : ''}
                </p>
              </>
            )}
            {[
              ['messages', String(messages.length)],
              ['tool calls', String(messages.reduce((n, m) => n + (m.parts ?? []).filter((p) => p.type.startsWith('tool-')).length, 0))],
              [
                'in flight',
                String(
                  messages.reduce(
                    (n, m) =>
                      n +
                      (m.parts ?? []).filter(
                        (p) => p.type.startsWith('tool-') && ['input-streaming', 'input-available'].includes((p as { state?: string }).state ?? ''),
                      ).length,
                    0,
                  ),
                ),
              ],
              ['sessions', String(sessions.length)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between font-mono text-[10px]" style={{ padding: '3px 0' }}>
                <span style={{ color: 'var(--muted)' }}>{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
            <button className="btn-ghost w-full" style={{ marginTop: 10, minHeight: 32, fontSize: 11 }} onClick={newSession}>
              + new session
            </button>
          </div>
          <EngConsole
            placeholder={`message ${agent.handle}…`}
            buttonLabel="Run"
            busy={streaming}
            onStop={() => {
              stop();
              joinAbortRef.current?.abort(); // Stop also detaches a joined run
            }}
            showModels={false}
            onRun={(text) => void sendWithSession(text)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The conversation feed, in the v13 chat grammar: every turn is a chat
 * message (avatar · name · time · bubble) and tool calls render as nested
 * replies under the flow. Tool grouping is unchanged: across message
 * boundaries, per tool name — within an uninterrupted run (no text
 * between), repeated invocations of the SAME tool collapse into one
 * accordion row (name ×N); distinct tools stay their own rows and are
 * never merged into a generic blob.
 */
export function ChatFeed({ messages, agent }: { messages: UIMessage[]; agent?: V3Agent }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const tint = agent ? SUITE_TINT[agent.suite] : undefined;
  const Avatar = agent?.icon;

  type ToolInfo = { key: string; name: string; state: string };
  type Item =
    | { kind: 'user'; key: string; text: string; time: string | null }
    | { kind: 'text'; key: string; text: string; time: string | null }
    | { kind: 'tool'; tool: ToolInfo }
    | { kind: 'toolgroup'; key: string; label: string; tools: ToolInfo[] };

  // UIMessage.createdAt (when the stream provides it) → "HH:MM" chat time
  const timeOf = (m: UIMessage): string | null => {
    const t = (m as { createdAt?: unknown }).createdAt;
    if (!t) return null;
    const d = t instanceof Date ? t : new Date(String(t));
    if (Number.isNaN(d.getTime())) return null;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const items: Item[] = [];
  let toolRun: ToolInfo[] = [];
  const flushRun = () => {
    if (toolRun.length === 0) return;
    // group the run by tool name, preserving first-appearance order —
    // repeats of the same tool collapse; different tools never merge
    const byName = new Map<string, ToolInfo[]>();
    toolRun.forEach((t) => {
      const list = byName.get(t.name) ?? [];
      list.push(t);
      byName.set(t.name, list);
    });
    byName.forEach((tools, name) => {
      if (tools.length === 1) {
        items.push({ kind: 'tool', tool: tools[0] });
      } else {
        items.push({ kind: 'toolgroup', key: `grp-${name}-${items.length}`, tools, label: name });
      }
    });
    toolRun = [];
  };

  messages.forEach((m) => {
    const time = timeOf(m);
    if (m.role === 'user') {
      flushRun(); // a user turn breaks any tool run
      const text = m.parts?.map((p) => (p.type === 'text' ? (p as { text?: string }).text ?? '' : '')).join('');
      if (text) items.push({ kind: 'user', key: `usr-${m.id}`, text, time });
      return;
    }
    (m.parts ?? []).forEach((p, i) => {
      if (p.type.startsWith('tool-')) {
        const tp = p as unknown as { toolCallId?: string; state?: string };
        toolRun.push({ key: `${m.id}-${tp.toolCallId ?? i}`, name: p.type.slice('tool-'.length) || 'tool', state: tp.state ?? '' });
      } else {
        flushRun();
        if (p.type === 'text' && (p as { text?: string }).text) {
          items.push({ kind: 'text', key: `txt-${m.id}-${i}`, text: (p as { text: string }).text, time });
        }
      }
    });
  });
  flushRun();

  const toolState = (state: string): 'running' | 'failed' | 'done' =>
    state === 'input-streaming' || state === 'input-available' ? 'running' : state === 'output-error' ? 'failed' : 'done';

  const toolRow = (t: ToolInfo, className = '') => {
    const st = toolState(t.state);
    return (
      <p key={t.key} className={`v3-tool-row font-mono text-[10px] ${className}${st === 'running' ? ' running' : ''}${st === 'failed' ? ' failed' : ''}`}>
        <Wrench size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> {t.name}
        {st === 'running' ? ' · running…' : st === 'failed' ? ' · failed' : ' · done'}
      </p>
    );
  };

  return (
    <>
      {items.map((item) => {
        if (item.kind === 'user') {
          return (
            <div key={item.key} className="v3-cmsg v3-msg-user">
              <span className="v3-cavatar" aria-hidden="true">
                <UserRound size={15} />
              </span>
              <span className="v3-cbody">
                <span className="v3-chead">
                  <span className="v3-cname">you</span>
                  {item.time && <span className="v3-ctime">{item.time}</span>}
                </span>
                <span className="v3-cbubble v3-cbubble-user">
                  <span className="v3-msg-prompt">$</span>
                  <span className="font-mono text-xs">{item.text}</span>
                </span>
              </span>
            </div>
          );
        }
        if (item.kind === 'text') {
          return (
            <div key={item.key} className="v3-cmsg v3-msg-assistant">
              <span className="v3-cavatar" style={tint ? { background: tint.bg, color: tint.color } : undefined} aria-hidden="true">
                {Avatar && <Avatar size={15} />}
              </span>
              <span className="v3-cbody">
                <span className="v3-chead">
                  <span className="v3-cname">{agent?.handle ?? 'agent'}</span>
                  {item.time && <span className="v3-ctime">{item.time}</span>}
                </span>
                <span className="v3-cbubble">
                  <V3Markdown>{item.text}</V3Markdown>
                </span>
              </span>
            </div>
          );
        }
        if (item.kind === 'tool') return toolRow(item.tool);

        const anyRunning = item.tools.some((t) => toolState(t.state) === 'running');
        const anyFailed = item.tools.some((t) => toolState(t.state) === 'failed');
        const label = item.label;
        const expanded = expandedGroups.has(item.key);
        return (
          <div key={item.key} className="v3-tool-group">
            <button
              type="button"
              className={`v3-tool-row v3-tool-group-head font-mono text-[10px]${anyRunning ? ' running' : ''}${anyFailed ? ' failed' : ''}`}
              aria-expanded={expanded}
              onClick={() =>
                setExpandedGroups((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.key)) next.delete(item.key);
                  else next.add(item.key);
                  return next;
                })
              }
            >
              <Wrench size={10} style={{ display: 'inline', verticalAlign: '-1px' }} />
              <span className="truncate">{label}</span>
              <span className="v3-tool-count">×{item.tools.length}</span>
              <ChevronDown size={10} className="v3-tool-chev" style={{ display: 'inline', verticalAlign: '-1px' }} />
            </button>
            {expanded && item.tools.map((t) => toolRow(t, 'v3-tool-child '))}
          </div>
        );
      })}
    </>
  );
}

export function AgentsWindow() {
  const selected = useV3OS((s) => s.selectedAgentKey);
  return selected ? <AgentExecView agentKey={selected} /> : <RosterView />;
}
