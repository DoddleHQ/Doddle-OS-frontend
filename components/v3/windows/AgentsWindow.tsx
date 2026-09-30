'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, MessageSquare, Wrench, Pencil, Trash2, ChevronDown, Copy, Check } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Session, v3AgentByKey } from '@/lib/v3/powerAgents';
import { useV3Fetch, v3Ago } from '@/lib/v3/data';
import { EngConsole } from '@/components/v3/ui/EngConsole';
import { V3Markdown } from '@/components/v3/ui/V3Markdown';

function RosterView() {
  const [q, setQ] = useState('');
  const { selectAgent } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const roster = agents.data ?? [];
    if (!needle) return roster;
    return roster.filter((a) => `${a.name} ${a.role} ${a.suite} ${a.key} ${a.handle}`.toLowerCase().includes(needle));
  }, [agents.data, q]);

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
      <div className="askbar" style={{ marginBottom: 12 }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search power agents… try 'crawl', 'shopify', 'content'"
          aria-label="Search power agents"
        />
        <span className="chip font-mono">{visible.length}/{agents.data?.length ?? 0}</span>
      </div>
      {suites.map(([suite, list]) => (
        <div key={suite} style={{ marginBottom: 12 }}>
          <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            {suite} · {list.length} agent{list.length === 1 ? '' : 's'}
          </p>
          <div className="roster-grid">
            {list.map((a) => (
              <button
                key={a.key}
                type="button"
                className="bento-item h-row"
                style={{ textAlign: 'left' }}
                onClick={() => selectAgent(a.key)}
              >
                <span
                  className="rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(147,51,234,.14)', width: 28, height: 28 }}
                >
                  <a.icon size={16} style={{ color: 'var(--violet)' }} />
                </span>
                <span className="min-w-0" style={{ flex: 1 }}>
                  <span className="block font-mono font-bold text-xs truncate">
                    {a.handle} · {a.role}
                  </span>
                  <span className="block text-[10px] font-mono truncate" style={{ color: 'var(--muted)' }}>
                    {a.name} — {a.suite}
                  </span>
                </span>
                <span
                  className="chip shrink-0"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAgent(a.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      selectAgent(a.key);
                    }
                  }}
                >
                  Deploy <ArrowUpRight size={10} style={{ display: 'inline' }} />
                </span>
              </button>
            ))}
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
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const titlePatchedRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          assistantId: agent?.assistantId,
          agentKey: agent?.key,
          workspaceId,
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

  async function newSession() {
    if (busy) stop();
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
        }
      }
    } catch {
      /* keep current session on failure */
    }
  }

  async function switchSession(id: string) {
    if (id === activeThread || busy) return;
    try {
      const res = await fetch(`/api/power-agents/threads/${id}`);
      if (!res.ok) {
        if (res.status === 404) setSessions((s) => s.filter((c) => c.id !== id));
        return;
      }
      const t = (await res.json()) as { messages: UIMessage[] };
      setActiveThread(id);
      activeThreadRef.current = id;
      setMessages(t.messages);
      // NOTE: joining an in-flight run's live stream (threads/[id]/join) is
      // deliberately not ported yet — history loads, tokens resume next pass
    } catch {
      /* stay on current */
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
    if (!agent || busy) return;
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

  return (
    <div>
      <div className="widget" style={{ marginBottom: 12 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <button className="back-link" onClick={() => selectAgent(null)}>
            ← all agents
          </button>
          <span className="chip">{busy ? 'streaming…' : 'deployed'}</span>
        </div>
        <div className="agent-head">
          <div className="tile" style={{ background: 'rgba(147,51,234,.14)' }}>
            <Icon size={20} style={{ color: 'var(--violet)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-mono font-bold text-base">
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
              <ChatFeed messages={messages} />
              {busy && (
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
                      <MessageSquare size={12} style={{ color: 'var(--violet)', flexShrink: 0 }} />
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
                    <MessageSquare size={12} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                    <span className="meta">
                      <p className="font-mono font-bold text-xs">{s.title}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {active ? 'active' : v3Ago(s.updatedAt ?? s.createdAt)}
                      </p>
                    </span>
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
              {busy ? 'streaming' : error ? 'stream error' : 'ready'}
            </p>
          </div>

          <div className="widget" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              This run
            </p>
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
            busy={busy}
            onStop={stop}
            showModels={false}
            onRun={(text) => void sendWithSession(text)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The conversation feed. Tool calls group across message boundaries, per tool
 * name: within an uninterrupted run (no text between), repeated invocations
 * of the SAME tool collapse into one accordion row (name ×N); distinct tools
 * stay their own rows and are never merged into a generic blob.
 */
function ChatFeed({ messages }: { messages: UIMessage[] }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  type ToolInfo = { key: string; name: string; state: string };
  type Item =
    | { kind: 'user'; key: string; text: string }
    | { kind: 'text'; key: string; text: string }
    | { kind: 'tool'; tool: ToolInfo }
    | { kind: 'toolgroup'; key: string; label: string; tools: ToolInfo[] };

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
    if (m.role === 'user') {
      flushRun(); // a user turn breaks any tool run
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
            <div key={item.key} className="v3-msg v3-msg-user">
              <span className="v3-msg-prompt">$</span>
              <span className="font-mono text-xs">{item.text}</span>
            </div>
          );
        }
        if (item.kind === 'text') return <V3Markdown key={item.key}>{item.text}</V3Markdown>;
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
