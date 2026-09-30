'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, MessageSquare, Wrench } from 'lucide-react';
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
            {list.map((a, i) => {
              // every card is one compact horizontal row; a lone trailing
              // agent simply spans the full width — same shape, wider
              const lone = list.length % 2 === 1 && i === list.length - 1;
              return (
                <button
                  key={a.key}
                  type="button"
                  className={`bento-item h-row${lone ? ' span-row' : ''}`}
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
        const t = (await res.json()) as { id: string; title: string };
        setSessions((s) => [{ id: t.id, title: t.title, agentKey: agent.key, createdAt: null, updatedAt: null }, ...s]);
        setActiveThread(t.id);
        activeThreadRef.current = t.id;
        setMessages([]);
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
          <div className="widget" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
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
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
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
              sessions.map((s) => (
                <button
                  key={s.id}
                  className={`thread-row${s.id === activeThread ? ' viewing' : ''}`}
                  data-tip={`${s.title} · click to load`}
                  onClick={() => switchSession(s.id)}
                >
                  <MessageSquare size={12} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                  <span className="meta">
                    <p className="font-mono font-bold text-xs">{s.title}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      {s.id === activeThread ? 'active' : v3Ago(s.updatedAt ?? s.createdAt)}
                    </p>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="v3-split-input">
          <div className="widget">
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              Session
            </p>
            <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
              {activeChip ? `${activeChip.title} · ${activeChip.id.slice(0, 8)}…` : 'new — the first message starts it'}
              {busy ? ' · streaming' : ''}
            </p>
          </div>
          <EngConsole
            placeholder={`message ${agent.handle}…`}
            buttonLabel="Run"
            busy={busy}
            onStop={stop}
            showModels={false}
            onRun={(text) => sendMessage({ text })}
          />
        </div>
      </div>
    </div>
  );
}

/** One feed message: user lines echo mono; assistant renders markdown + tool rows. */
function ChatMessage({ message }: { message: UIMessage }) {
  if (message.role === 'user') {
    const text = message.parts?.map((p) => (p.type === 'text' ? (p as { text?: string }).text ?? '' : '')).join('');
    return (
      <div className="v3-msg v3-msg-user">
        <span className="v3-msg-prompt">$</span>
        <span className="font-mono text-xs">{text}</span>
      </div>
    );
  }
  const text = message.parts?.map((p) => (p.type === 'text' ? (p as { text?: string }).text ?? '' : '')).join('');
  const tools = (message.parts ?? []).filter((p) => p.type.startsWith('tool-')) as Array<{
    type: string;
    toolCallId: string;
    state: string;
  }>;
  return (
    <div className="v3-msg v3-msg-assistant">
      {tools.map((t) => {
        const name = t.type.slice('tool-'.length) || 'tool';
        const running = t.state === 'input-streaming' || t.state === 'input-available';
        const failed = t.state === 'output-error';
        return (
          <p key={t.toolCallId} className={`v3-tool-row font-mono text-[10px]${running ? ' running' : ''}${failed ? ' failed' : ''}`}>
            <Wrench size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> {name}
            {running ? ' · running…' : failed ? ' · failed' : ' · done'}
          </p>
        );
      })}
      {text ? <V3Markdown>{text}</V3Markdown> : null}
    </div>
  );
}

export function AgentsWindow() {
  const selected = useV3OS((s) => s.selectedAgentKey);
  return selected ? <AgentExecView agentKey={selected} /> : <RosterView />;
}
