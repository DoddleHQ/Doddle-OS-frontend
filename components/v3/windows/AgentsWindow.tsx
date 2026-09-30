'use client';

import { useMemo, useState } from 'react';
import { Search, ArrowUpRight, MessageSquare } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3SessionsForAgent, v3AgentByKey } from '@/lib/v3/powerAgents';
import { useV3Fetch, v3Ago } from '@/lib/v3/data';
import { EngConsole } from '@/components/v3/ui/EngConsole';

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
      {/* flat 2-col grid — a final lone card (odd count) spans the full row so
          every row carries two agents; suite stays visible as the card label */}
      <div className="roster-grid">
        {visible.map((a, i) => {
          const lone = visible.length % 2 === 1 && i === visible.length - 1;
          return (
            <div key={a.key} className={`bento-item${lone ? ' span-row' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(147,51,234,.14)' }}
                >
                  <a.icon size={20} style={{ color: 'var(--violet)' }} />
                </div>
                <button className="btn-deploy" onClick={() => selectAgent(a.key)}>
                  Deploy
                </button>
              </div>
              <p className="font-mono font-bold text-sm mt-3">
                {a.handle} · {a.role}
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                {a.name} — {a.suite}
              </p>
              <button className="back-link mt-3" onClick={() => selectAgent(a.key)}>
                Open execution <ArrowUpRight size={12} style={{ display: 'inline' }} />
              </button>
            </div>
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

function AgentExecView({ agentKey }: { agentKey: string }) {
  const workspaceId = useV3OS((s) => s.workspaceId);
  const { selectAgent } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const agent = v3AgentByKey(agents.data ?? [], agentKey);
  const [session, setSession] = useState<{ text: string; model: string }[]>([]);
  const sessions = useV3Fetch(
    () => (workspaceId && agentKey ? fetchV3SessionsForAgent(workspaceId, agentKey) : Promise.resolve([])),
    [workspaceId, agentKey],
  );

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
  const list = sessions.data ?? [];

  return (
    <div>
      <div className="widget" style={{ marginBottom: 12 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <button className="back-link" onClick={() => selectAgent(null)}>
            ← all agents
          </button>
          <span className="chip">deployed</span>
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
            </p>
            <div className="terminal" style={{ flex: 1, minHeight: 200, overflowY: 'auto' }}>
              {session.length === 0 ? (
                <div>
                  <div style={{ color: '#9ca3af' }}>— session —</div>
                  <div style={{ color: '#9ca3af' }}>Assign a task below. Live chat streaming arrives with the execution screen.</div>
                </div>
              ) : (
                session.map((s, i) => (
                  <div key={i}>
                    <span style={{ color: '#34d399' }}>$</span> {s.text} <span style={{ color: '#5b6478' }}>· {s.model} · queued</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="widget" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
              Sessions · this agent in this workspace
            </p>
            {sessions.loading ? (
              <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                loading sessions…
              </p>
            ) : sessions.error ? (
              <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>
                {sessions.error} ·{' '}
                <button className="chip" onClick={sessions.reload}>
                  retry
                </button>
              </p>
            ) : list.length === 0 ? (
              <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                No sessions yet. Deploy this agent to start the first one.
              </p>
            ) : (
              list.map((s) => (
                <button key={s.id} className="thread-row" data-tip={`${s.title} · ${v3Ago(s.updatedAt ?? s.createdAt)}`}>
                  <MessageSquare size={12} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                  <span className="meta">
                    <p className="font-mono font-bold text-xs">{s.title}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      session · {v3Ago(s.updatedAt ?? s.createdAt)}
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
              {session.length === 0 ? 'idle — nothing queued' : `${session.length} queued · nothing ships without you`}
            </p>
          </div>
          <EngConsole
            placeholder={`assign ${agent.handle} a task…`}
            buttonLabel="Deploy"
            hints={['/plan', '/run', '@files']}
            onRun={(text, model) => setSession((s) => [...s, { text, model }])}
          />
        </div>
      </div>
    </div>
  );
}

export function AgentsWindow() {
  const selected = useV3OS((s) => s.selectedAgentKey);
  return selected ? <AgentExecView agentKey={selected} /> : <RosterView />;
}
