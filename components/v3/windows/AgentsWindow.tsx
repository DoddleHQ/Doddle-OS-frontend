'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wrench, Pencil, Trash2, ChevronDown, Plus, Cpu } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, SUITE_TINT, v3AgentByKey, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';
import { useV3Fetch, v3Ago, isV3SessionUnread, markThreadSeen } from '@/lib/v3/data';
import { V3Markdown } from '@/components/v3/ui/V3Markdown';
import { Glide } from '@/components/v3/ui/Glide';
import { COMPOSER_MODELS, COMPOSER_MODES } from '@/components/v3/ui/Composer';

/* ------------------------------------------------------------------ */
/* Roster — v13 exact: deploy-prompt composer, ACTIVE/IDLE columns, dock */
/* ------------------------------------------------------------------ */

function RosterView() {
  const [q, setQ] = useState('');
  const { selectAgent } = useV3OS.getState();
  const workspaceId = useV3OS((s) => s.workspaceId);
  const agents = useV3Fetch(fetchV3PowerAgents, []);
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
    if (!needle) return roster;
    return roster.filter((a) => `${a.name} ${a.role} ${a.suite} ${a.key} ${a.handle}`.toLowerCase().includes(needle));
  }, [agents.data, q]);

  const { active, idle } = useMemo(() => {
    const a = visible.filter((x) => (stats.get(x.key)?.count ?? 0) > 0);
    const i = visible.filter((x) => (stats.get(x.key)?.count ?? 0) === 0);
    return { active: a, idle: i };
  }, [visible, stats]);

  /** v13 deployFromSearch: Enter / Deploy opens the best-scoring match. */
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

  const card = (a: V3Agent) => {
    const tint = SUITE_TINT[a.suite];
    const st = stats.get(a.key);
    return (
      <div
        key={a.key}
        className="bento-item agent-pick agent-card-v profile-card"
        data-agent={a.key}
        style={{ cursor: 'pointer' }}
        onClick={() => selectAgent(a.key)}
      >
        <div className="profile-banner" style={{ background: tint.bg }}>
          <span className={`profile-dot${st?.unread ? ' has-unread' : ''}`} />
        </div>
        <div className="profile-avatar" style={{ background: tint.bg, color: tint.color }}>
          <a.icon size={26} />
        </div>
        <p className="font-mono font-bold text-sm mt-2">{a.handle}</p>
        <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
          {a.role}
        </p>
        <div className="flex gap-1 justify-center flex-wrap mt-2">
          <span className="chip">{a.suite.replace(' Suite', '')}</span>
        </div>
        <p className="agent-card-desc font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
          {a.name} — {a.suite}
        </p>
        <div className="profile-stats">
          <span>
            <strong>{st?.count ?? 0}</strong> sessions
          </span>
          <span>
            <strong>{st ? v3Ago(st.last) : '—'}</strong> last run
          </span>
        </div>
        <button
          className="btn-deploy w-full mt-3"
          onClick={(e) => {
            e.stopPropagation();
            selectAgent(a.key);
          }}
        >
          Deploy
        </button>
        <button
          className="back-link mt-2"
          onClick={(e) => {
            e.stopPropagation();
            selectAgent(a.key);
          }}
        >
          Open execution →
        </button>
      </div>
    );
  };

  return (
    <div id="agent-roster-view">
      <div className="composer" style={{ marginBottom: 12, borderColor: 'rgba(29,78,216,.35)' }}>
        <p className="pane-label">DEPLOY PROMPT · DESCRIBE WORK → WE PICK THE AGENT</p>
        <input
          className="composer-input"
          style={{ minHeight: 44 }}
          placeholder="What needs doing? e.g. 'audit tenant security' or 'draft launch email'"
          aria-label="Search power agents"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && deployBest()}
        />
        <div className="composer-bar">
          <button className="composer-icon" title="Attach files" aria-label="Attach files">
            <Plus size={16} />
          </button>
          <RosterGlides />
          <button className="btn-deploy" style={{ marginLeft: 'auto' }} onClick={deployBest}>
            Deploy <kbd>⏎</kbd>
          </button>
        </div>
        <p className="font-mono text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
          Type above — best match highlights below. Nothing runs until you hit Deploy.
        </p>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <p className="pane-label" style={{ margin: 0 }}>
          CONTEXTUAL AGENTS · PICK ONE TO DEPLOY
        </p>
        <span className="chip font-mono">
          {visible.length}/{agents.data?.length ?? 0}
        </span>
      </div>

      <div className="agent-colhead" style={{ marginBottom: 8 }}>
        <span className="chip">AGENT PROFILES</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
          {visible.length} agent{visible.length === 1 ? '' : 's'}
        </span>
      </div>
      <div id="agent-roster-active" className="agent-profile-grid">
        {[...active, ...idle].map(card)}
      </div>

      <p className="pane-label" style={{ margin: '14px 0 8px' }}>
        QUICK SWITCH · WORKSPACE AGENTS
      </p>
      <div className="flex gap-2 flex-wrap">
        {(agents.data ?? []).map((a) => {
          const tint = SUITE_TINT[a.suite];
          return (
            <button
              key={a.key}
              className="rail-btn"
              title={`${a.handle} — ${a.role}`}
              onClick={() => selectAgent(a.key)}
              style={{ border: '1px solid var(--glass-border)', background: tint.bg, color: tint.color }}
            >
              <a.icon size={16} />
            </button>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          No power agents match “{q}”.
        </p>
      )}
    </div>
  );
}

/** model/mode glides for the roster + exec composers (local, design-forward). */
function RosterGlides() {
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem('v3.model') ?? 'GPT-5';
    } catch {
      return 'GPT-5';
    }
  });
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('v3.mode') ?? 'default';
    } catch {
      return 'default';
    }
  });
  return (
    <>
      <Glide
        value={model}
        options={COMPOSER_MODELS}
        icon={Cpu}
        ariaLabel="Model"
        onChange={(v) => {
          setModel(v);
          try {
            localStorage.setItem('v3.model', v);
          } catch {
            /* private mode */
          }
        }}
      />
      <Glide
        value={mode}
        options={[...COMPOSER_MODES, { value: 'admin', label: 'Admin' }, { value: 'design', label: 'Design' }, { value: 'support', label: 'Support' }]}
        ariaLabel="Mode"
        onChange={(v) => {
          setMode(v);
          try {
            localStorage.setItem('v3.mode', v);
          } catch {
            /* private mode */
          }
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exec view — v13 exact: centered head pane, terminal log, glass       */
/* threads table, composer with Deploy ⌘⏎, sess-state line             */
/* ------------------------------------------------------------------ */

function AgentExecView({ agentKey }: { agentKey: string }) {
  const workspaceId = useV3OS((s) => s.workspaceId);
  const { selectAgent } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const agent = v3AgentByKey(agents.data ?? [], agentKey);

  const [sessions, setSessions] = useState<V3Session[]>([]);
  const agentRef = useRef(agent);
  agentRef.current = agent;
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const titlePatchedRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [task, setTask] = useState('');

  const refreshSessions = useCallback(async () => {
    if (!agent || !workspaceId) return;
    try {
      const res = await fetch(`/api/power-agents/threads?agentKey=${encodeURIComponent(agent.key)}&workspaceId=${encodeURIComponent(workspaceId)}`);
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

  const deepThread = useV3OS((s) => s.selectedThreadKey);
  const deepConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (deepThread && deepThread !== deepConsumedRef.current) {
      deepConsumedRef.current = deepThread;
      useV3OS.setState({ selectedThreadKey: null });
      void switchSession(deepThread);
    }
  }, [deepThread]);

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
      if (viewedId) seen(viewedId);
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
  const [seenTick, setSeenTick] = useState(0);
  const seen = useCallback((id: string) => {
    markThreadSeen(id);
    setSeenTick((t) => t + 1);
  }, []);
  const joinAbortRef = useRef<AbortController | null>(null);
  const [liveJoin, setLiveJoin] = useState(false);
  useEffect(() => () => joinAbortRef.current?.abort(), []);
  const streaming = busy || liveJoin;
  const unreadIds = useMemo(() => {
    void seenTick;
    return new Set(sessions.filter((s) => s.id !== activeThread && isV3SessionUnread(s)).map((s) => s.id));
  }, [sessions, activeThread, seenTick]);

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
    joinAbortRef.current?.abort();
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
      seen(id);
      if (t.busy) void joinActiveStream(id);
    } catch {
      /* stay on current */
    }
  }

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
            return;
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
      refreshSessions();
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

  async function deployTask() {
    if (!task.trim() || !agent || streaming) return;
    const text = task.trim();
    setTask('');
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
  }, [messages.length, streaming]);

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
  const tint = SUITE_TINT[agent.suite];
  const sessState = streaming ? 'streaming…' : error ? 'stream error' : 'idle — nothing running';
  const mine = sessions.length;

  return (
    <div id="agent-exec-view">
      <div className="pane text-center" style={{ marginBottom: 12 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <button className="back-link" onClick={() => selectAgent(null)}>
            ← all agents
          </button>
          <span className="chip">{streaming ? 'streaming…' : messages.length > 0 ? 'done — awaiting your review' : 'deployed'}</span>
        </div>
        <div className="profile-avatar mx-auto" style={{ background: tint.bg, color: tint.color }}>
          <Icon size={20} />
        </div>
        <p className="font-mono font-bold text-lg mt-2">{agent.handle}</p>
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {agent.role}
        </p>
        <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
          {mine} session{mine === 1 ? '' : 's'} · {agent.suite}
        </p>
      </div>

      <div className="split agent-flow">
        <div className="split-canvas">
          <div className="pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
            <p className="pane-label">
              CONVERSATION · <span>{agent.handle}</span>
            </p>
            <div className="terminal" style={{ flex: 1, minHeight: 220, overflowY: 'auto' }} role="log" aria-live="polite">
              {messages.length === 0 && !streaming && <span>— assign a task below. nothing ships without you.</span>}
              <TerminalFeed messages={messages} />
              {streaming && <span className="v3-working">working…</span>}
              {error && <span style={{ color: 'var(--amber)' }}>stream error: {error.message || String(error)}</span>}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="pane" style={{ maxHeight: 200, overflowY: 'auto' }}>
            <p className="pane-label">THREADS · TASKS THIS AGENT IS CARRYING</p>
            <div className="table-glass">
              <div>
                {sessions.length === 0 ? (
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)', padding: 8 }}>
                    no threads yet — the first task starts one
                  </p>
                ) : (
                  sessions.map((s) => {
                    const on = s.id === activeThread;
                    if (renaming && renaming.id === s.id) {
                      return (
                        <div key={s.id} className="thread-row" style={{ cursor: 'default' }}>
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
                        className={`thread-row v3-session${on ? ' viewing' : ''}`}
                        onClick={() => switchSession(s.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && switchSession(s.id)}
                      >
                        <span className="meta">
                          <p className="font-mono font-bold text-xs">{s.title}</p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                            {on ? 'active' : v3Ago(s.updatedAt ?? s.createdAt)}
                          </p>
                        </span>
                        {unreadIds.has(s.id) && <span className="v3-unread-chip shrink-0">new</span>}
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
                            <button className="chip" onClick={() => setRenaming({ id: s.id, value: s.title })} aria-label={`Rename ${s.title}`}>
                              <Pencil size={10} />
                            </button>
                            <button className="chip" onClick={() => setConfirmingDelete(s.id)} aria-label={`Delete ${s.title}`}>
                              <Trash2 size={10} />
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
                <button className="back-link" style={{ padding: 8 }} onClick={newSession}>
                  + new thread
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="split-input">
          <div className="composer">
            <textarea
              className="composer-input"
              rows={2}
              placeholder="assign task…  /plan /run @file"
              aria-label={`message ${agent.handle}`}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void deployTask();
              }}
            />
            <div className="composer-bar">
              <button className="composer-icon" title="Attach files" aria-label="Attach files">
                <Plus size={16} />
              </button>
              <RosterGlides />
              {streaming ? (
                <button
                  className="btn-deploy"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    stop();
                    joinAbortRef.current?.abort();
                  }}
                  aria-label="Stop the run"
                >
                  Stop
                </button>
              ) : (
                <button className="btn-deploy" style={{ marginLeft: 'auto' }} disabled={!task.trim()} onClick={() => void deployTask()}>
                  Deploy <kbd>⌘⏎</kbd>
                </button>
              )}
            </div>
          </div>
          <p className="font-mono text-[10px]" style={{ color: '#6b7280', marginTop: 10 }}>
            {sessState}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The v13 agent-log: terminal lines — $ user, markdown replies, tool runs. */
function TerminalFeed({ messages }: { messages: UIMessage[] }) {
  type ToolInfo = { key: string; name: string; state: string };
  type Item =
    | { kind: 'user'; key: string; text: string }
    | { kind: 'text'; key: string; text: string }
    | { kind: 'tool'; tool: ToolInfo }
    | { kind: 'toolgroup'; key: string; label: string; tools: ToolInfo[] };
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const items: Item[] = [];
  let toolRun: ToolInfo[] = [];
  const flushRun = () => {
    if (toolRun.length === 0) return;
    const byName = new Map<string, ToolInfo[]>();
    toolRun.forEach((t) => {
      const list = byName.get(t.name) ?? [];
      list.push(t);
      byName.set(t.name, list);
    });
    byName.forEach((tools, name) => {
      if (tools.length === 1) items.push({ kind: 'tool', tool: tools[0] });
      else items.push({ kind: 'toolgroup', key: `grp-${name}-${items.length}`, tools, label: name });
    });
    toolRun = [];
  };
  messages.forEach((m) => {
    if (m.role === 'user') {
      flushRun();
      const text = m.parts?.map((p) => (p.type === 'text' ? (p as { text?: string }).text ?? '' : '')).join('');
      if (text) items.push({ kind: 'user', key: `usr-${m.id}`, text });
      return;
    }
    (m.parts ?? []).forEach((p, i) => {
      if (p.type.startsWith('tool-')) {
        const tp = p as unknown as { toolCallId?: string; state?: string };
        toolRun.push({ key: `${m.id}-${tp.toolCallId ?? i}`, name: p.type.slice('tool-'.length) || 'tool', state: tp.state ?? '' });
      } else {
        flushRun();
        if (p.type === 'text' && (p as { text?: string }).text) {
          items.push({ kind: 'text', key: `txt-${m.id}-${i}`, text: (p as { text: string }).text });
        }
      }
    });
  });
  flushRun();

  const toolState = (state: string): 'running' | 'failed' | 'done' =>
    state === 'input-streaming' || state === 'input-available' ? 'running' : state === 'output-error' ? 'failed' : 'done';

  const toolLine = (t: ToolInfo, className = '') => {
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
            <p key={item.key}>
              <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>$ </span>
              <span className="font-mono text-xs">{item.text}</span>
            </p>
          );
        }
        if (item.kind === 'text') {
          return (
            <div key={item.key} className="v3-md-term">
              <V3Markdown>{item.text}</V3Markdown>
            </div>
          );
        }
        if (item.kind === 'tool') return toolLine(item.tool);
        const anyRunning = item.tools.some((t) => toolState(t.state) === 'running');
        const expanded = expandedGroups.has(item.key);
        return (
          <div key={item.key} className="v3-tool-group">
            <button
              type="button"
              className={`v3-tool-row v3-tool-group-head font-mono text-[10px]${anyRunning ? ' running' : ''}`}
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
              <span className="truncate">{item.label}</span>
              <span className="v3-tool-count">×{item.tools.length}</span>
              <ChevronDown size={10} className="v3-tool-chev" style={{ display: 'inline', verticalAlign: '-1px' }} />
            </button>
            {expanded && item.tools.map((t) => toolLine(t, 'v3-tool-child '))}
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

export { ChatFeed } from '@/components/v3/windows/AgentsChatFeed';
