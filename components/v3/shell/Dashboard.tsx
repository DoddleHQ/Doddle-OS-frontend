'use client';

import { Layers, Bot, Activity, Inbox, Zap, ChevronDown } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';
import { useV3Fetch, useV3OperatorName, v3Ago } from '@/lib/v3/data';
import { fetchV3PowerAgents, fetchV3Sessions, v3AgentByKey } from '@/lib/v3/powerAgents';
import { MorphText } from '@/components/v3/ui/MorphText';
import { Sparkline } from '@/components/v3/ui/Sparkline';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function LoadingLine({ label }: { label: string }) {
  return (
    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
      {label}…
    </p>
  );
}

/** Full-page chat-first dashboard — visible only when no window is open (reference #dashboard). */
export function Dashboard() {
  const windows = useV3OS((s) => s.windows);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const { openApp, toggleNotifs, selectAgent } = useV3OS.getState();
  const hidden = windows.some((w) => !w.minimized);

  const operator = useV3OperatorName();
  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const sessions = useV3Fetch(() => (workspaceId ? fetchV3Sessions(workspaceId) : Promise.resolve([])), [workspaceId]);
  const review = v3Data.getReviewQueue();

  const list = sessions.data ?? [];
  const active = list[0] ?? null;
  const activeAgent = v3AgentByKey(agents.data ?? [], active?.agentKey ?? null);
  const activeSub = active
    ? `session · ${v3Ago(active.updatedAt ?? active.createdAt)}${activeAgent ? ` · ${activeAgent.handle}` : ''}`
    : null;
  // the two agents with the most recent activity, else the first two of the roster
  const flowAgents = (() => {
    const roster = agents.data ?? [];
    const recentKeys = [...new Set(list.map((s) => s.agentKey).filter((k): k is string => !!k))];
    const ordered = [...recentKeys.map((k) => v3AgentByKey(roster, k)), ...roster]
      .filter((a): a is NonNullable<typeof a> => !!a)
      .filter((a, i, arr) => arr.findIndex((x) => x.key === a.key) === i)
      .slice(0, 2);
    return ordered.map((a) => {
      const mine = list.filter((s) => s.agentKey === a.key);
      return { agent: a, count: mine.length, last: mine[0] };
    });
  })();

  const cards = [
    { icon: Layers, color: 'var(--green)', label: 'Assignments', sub: 'Tasks by type, in-progress first.', onClick: () => openApp('assignments') },
    { icon: Bot, color: 'var(--violet)', label: `Agents ${(agents.data?.length ?? 0) > 0 ? '· ' + agents.data!.length : ''}`, sub: 'Power agents. Pick one to run it.', onClick: () => openApp('agents') },
    {
      icon: Activity,
      color: 'var(--accent)',
      label: `Active Execution ${active ? '· session' : ''}`,
      sub: active ? active.title : 'No sessions in this workspace yet.',
      onClick: () => openApp('agents'),
    },
    { icon: Inbox, color: 'var(--amber)', label: `Triage Queue ${review.length}`, sub: 'Items waiting for approval.', onClick: () => toggleNotifs(true) },
  ];

  return (
    <section className={`dashboard${hidden ? ' dash-hidden' : ''}`} aria-label="Dashboard">
      <div className="dash-inner">
        {/* ABOVE THE FOLD: the ask bar is the highlighter */}
        <div className="dash-hero">
          <div className="text-center">
            <div
              className="font-bold text-xl tracking-tight"
              style={{ color: '#1d4ed8', background: 'linear-gradient(90deg,#1d4ed8,#7c3aed,#db2777)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              DoddleOS
            </div>
            <h1 className="text-3xl font-bold mt-2">
              {greeting()}
              {operator ? `, ${operator}` : ''}. <MorphText options={['Ready?', 'Research?', 'Ship it?', 'Review?']} />
            </h1>
            <p className="text-sm font-mono mt-1" style={{ color: 'var(--muted)' }}>
              What are you working on?
            </p>
          </div>
          <div className="hero-ask" style={{ marginTop: 20 }}>
            <Zap size={20} style={{ color: 'var(--accent)' }} />
            <input
              placeholder="Describe what you're working on… e.g. research Q4 keywords, review the landing draft"
              aria-label="Describe what you're working on"
              onKeyDown={(e) => e.key === 'Enter' && openApp('launchpad')}
            />
            <button className="btn-deploy" onClick={() => openApp('launchpad')}>
              Get started <kbd>⏎</kbd>
            </button>
          </div>
          <div className="hero-quick">
            <button onClick={() => openApp('launchpad')}>
              <Zap size={12} aria-hidden="true" /> Start a task
            </button>
            <button onClick={() => openApp('agents')}>
              <Bot size={12} aria-hidden="true" /> Deploy an agent
            </button>
            <button onClick={() => toggleNotifs(true)}>
              <Inbox size={12} aria-hidden="true" /> Needs review ({review.length})
            </button>
          </div>
          <div className="dash-cards" style={{ marginTop: 20 }}>
            {cards.map(({ icon: Icon, color, label, sub, onClick }) => (
              <button key={label} className="bento-item text-left" onClick={onClick}>
                <Icon size={20} className="mb-2" style={{ color }} />
                <p className="font-bold text-sm">{label}</p>
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                  {sub}
                </p>
              </button>
            ))}
          </div>
          <div className="scroll-cue">
            <ChevronDown size={20} />
          </div>
        </div>

        {/* BELOW THE FOLD: telemetry */}
        <div style={{ marginTop: 24 }}>
          <div className="flex items-end justify-between" style={{ marginBottom: 12 }}>
            <div>
              <h2 className="text-xl font-bold">System Telemetry</h2>
              <p className="font-mono text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }}
                />
                {sessions.loading ? 'connecting…' : sessions.error ? 'session feed unavailable' : `${list.length} session${list.length === 1 ? '' : 's'} · ${agents.data?.length ?? 0} agents`}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="chip">live</span>
              <strong className="font-mono text-sm">{list.length}</strong>
              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                sessions
              </span>
            </div>
          </div>
          <div className="dash-telemetry">
            <div className="widget">
              <p className="font-mono text-xs font-bold" style={{ marginBottom: 10 }}>
                ACTIVE_TASKS
              </p>
              <div className="flex items-center gap-3">
                <div className="min-w-0" style={{ flex: 1 }}>
                  {sessions.loading ? (
                    <LoadingLine label="loading workspace sessions" />
                  ) : sessions.error ? (
                    <p className="font-mono text-[10px]" style={{ color: 'var(--amber)' }}>
                      {sessions.error} ·{' '}
                      <button className="chip" onClick={sessions.reload}>
                        retry
                      </button>
                    </p>
                  ) : (
                    <>
                      <p className="font-mono font-bold text-xs">{active ? active.title : 'No sessions yet'}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {activeSub ?? 'Deploy a power agent to start the first session'}
                      </p>
                    </>
                  )}
                </div>
                <div className="pbar">
                  <div style={{ width: list.length ? '100%' : '0%' }} />
                </div>
                <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  {list.length}
                </span>
              </div>
              <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
                <Sparkline series={v3Data.getSparkSeries()} />
              </div>
            </div>
            <div className="widget">
              <p className="font-mono text-xs font-bold" style={{ marginBottom: 10 }}>
                AGENTS_IN_FLOW
              </p>
              {agents.loading ? (
                <LoadingLine label="loading agents" />
              ) : (
                flowAgents.map(({ agent, count, last }) => (
                  <button
                    key={agent.key}
                    className="flex items-center gap-3 w-full text-left"
                    style={{ padding: '8px 0' }}
                    data-tip={`${agent.handle} — open execution`}
                    onClick={() => {
                      openApp('agents');
                      selectAgent(agent.key);
                    }}
                  >
                    <agent.icon size={16} style={{ color: 'var(--violet)' }} />
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-xs">
                        {agent.handle} · {agent.role}
                      </p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {count
                          ? `${count} session${count > 1 ? 's' : ''} · last ${v3Ago(last!.updatedAt ?? last!.createdAt)}`
                          : 'Waiting for a task'}
                      </p>
                    </div>
                  </button>
                ))
              )}
              <button className="btn-ghost w-full" style={{ marginTop: 8 }} onClick={() => openApp('agents')}>
                open agents
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
