'use client';

import { useState } from 'react';
import { Layers, Bot, Activity, Inbox, ChevronDown } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';
import { useV3Fetch, useV3OperatorName, v3Ago, isV3SessionUnread } from '@/lib/v3/data';
import { fetchV3PowerAgents, v3AgentByKey, SUITE_TINT } from '@/lib/v3/powerAgents';
import { MorphText } from '@/components/v3/ui/MorphText';
import { Sparkline } from '@/components/v3/ui/Sparkline';
import { Composer } from '@/components/v3/ui/Composer';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The v13 index page, exact DOM: hero + composer + quick links + cards +
 *  telemetry (active-task rows with progress bars, agents in flow). */
export function Dashboard() {
  const windows = useV3OS((s) => s.windows);
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const { openApp, selectAgent } = useV3OS.getState();
  const hidden = windows.some((w) => !w.minimized);

  const operator = useV3OperatorName();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  // composer state — model/mode are design-forward picks (persisted locally)
  const [ask, setAsk] = useState('');
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem('v3.model') ?? 'Muse Spark 1.3';
    } catch {
      return 'Muse Spark 1.3';
    }
  });
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('v3.mode') ?? 'default';
    } catch {
      return 'default';
    }
  });
  const pickModel = (v: string) => {
    setModel(v);
    try {
      localStorage.setItem('v3.model', v);
    } catch {
      /* private mode */
    }
  };
  const pickMode = (v: string) => {
    setMode(v);
    try {
      localStorage.setItem('v3.mode', v);
    } catch {
      /* private mode */
    }
  };

  // @mentions route to the real roster
  const mentioned = (text: string) => {
    const handles = [...text.matchAll(/@([A-Za-z0-9_]+)/g)].map((m) => '@' + m[1].toLowerCase());
    return (agents.data ?? []).find((a) => handles.includes(a.handle.toLowerCase()));
  };
  const send = () => {
    if (!ask.trim()) return;
    const target = mentioned(ask);
    if (target) {
      selectAgent(target.key);
      openApp('agents');
    } else {
      openApp('launchpad');
    }
    setAsk('');
  };
  const liveMention = mentioned(ask);

  const list = feed;
  const reviewCount = list.filter((s) => isV3SessionUnread(s)).length;
  const active = list[0] ?? null;
  const activeAgent = v3AgentByKey(agents.data ?? [], active?.agentKey ?? null);
  const wsLabel = (workspaces.find((w) => w.id === workspaceId) ?? workspaces[0])?.name ?? '';

  // v13 semantics on real data: every session is a finished run (100%), the
  // top one is the headline row, the rest fill the glass table
  const taskRows = list.slice(1, 5);
  const flowAgents = (() => {
    const roster = agents.data ?? [];
    const recentKeys = [...new Set(list.map((s) => s.agentKey).filter((k): k is string => !!k))];
    const ordered = [...recentKeys.map((k) => v3AgentByKey(roster, k)), ...roster]
      .filter((a): a is NonNullable<typeof a> => !!a)
      .filter((a, i, arr) => arr.findIndex((x) => x.key === a.key) === i)
      .slice(0, 2);
    return ordered.map((a) => {
      const mine = list.filter((s) => s.agentKey === a.key);
      return { agent: a, last: mine[0], count: mine.length };
    });
  })();

  return (
    <section id="dashboard" className={`dashboard${hidden ? ' dash-hidden' : ''}`} aria-label="Dashboard">
      <div className="dash-inner">
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

          <Composer
            value={ask}
            onChange={setAsk}
            onSend={send}
            placeholder="Describe what you're working on… e.g. research Q4 keywords, @Crawlability audit the blog"
            ariaLabel="Describe what you're working on"
            model={model}
            onModel={pickModel}
            mode={mode}
            onMode={pickMode}
          />
          {liveMention && (
            <p className="font-mono text-[10px]" style={{ color: 'var(--accent)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              → {liveMention.handle} · {liveMention.role} — mention routes the run to this agent
            </p>
          )}

          <div className="hero-quick">
            <button onClick={() => openApp('launchpad')}>
              ↗ Research task
            </button>
            <button onClick={() => openApp('agents')}>
              ↗ Deploy research agent
            </button>
            <button onClick={() => openApp('reports')}>
              ↗ Needs review ({reviewCount})
            </button>
          </div>

          <div className="dash-cards" style={{ marginTop: 20 }}>
            <button className="bento-item text-left" onClick={() => openApp('assignments')}>
              <Layers size={20} className="mb-2" style={{ color: 'var(--green)' }} />
              <p className="font-bold text-sm">Assignments</p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                Tasks by type, in-progress first.
              </p>
            </button>
            <button className="bento-item text-left" onClick={() => openApp('agents')}>
              <Bot size={20} className="mb-2" style={{ color: 'var(--violet)' }} />
              <p className="font-bold text-sm">Agents</p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                Contextual agents. Pick one to run it.
              </p>
            </button>
            <button className="bento-item text-left" onClick={() => openApp('agents')}>
              <Activity size={20} className="mb-2" style={{ color: 'var(--accent)' }} />
              <p className="font-bold text-sm">
                Active Execution {active ? <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>· session</span> : null}
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                {active ? `${active.title}. Open Active Execution to follow it.` : 'No active project.'}
              </p>
            </button>
            <button className="bento-item text-left" onClick={() => openApp('reports')}>
              <Inbox size={20} className="mb-2" style={{ color: 'var(--amber)' }} />
              <p className="font-bold text-sm">
                Triage Queue <span style={{ color: '#ef4444' }}>{reviewCount}</span>
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                Items waiting for approval.
              </p>
            </button>
          </div>
          <div className="scroll-cue">
            <ChevronDown size={20} />
          </div>
        </div>

        <div id="dash-telemetry" style={{ marginTop: 24 }}>
          <div className="flex items-end justify-between" style={{ marginBottom: 12 }}>
            <div>
              <h2 className="text-xl font-bold">System Telemetry</h2>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
                <span aria-hidden="true" style={{ color: feedError ? '#ef4444' : '#10b981' }}>●</span>{' '}
                {feedError ? 'session feed unavailable' : `${list.length} active · ${wsLabel}`}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="chip">{wsLabel || '—'}</span>
              <span className="chip">active</span>
              <strong className="font-mono text-sm">{reviewCount}</strong>
              <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
                need review
              </span>
            </div>
          </div>
          <div className="dash-telemetry">
            <div className="bento-item">
              <p className="font-mono text-xs font-bold" style={{ marginBottom: 10 }}>
                ACTIVE_TASKS
              </p>
              <div className="flex items-center gap-3">
                <div className="min-w-0" style={{ flex: 1 }}>
                  <p className="font-mono font-bold text-xs">{active ? active.title : 'No active project'}</p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {active
                      ? `session · ${v3Ago(active.updatedAt ?? active.createdAt)}${activeAgent ? ` · ${activeAgent.handle}` : ''}`
                      : 'in-progress tasks appear here first'}
                  </p>
                </div>
                <div className="pbar">
                  <div style={{ width: active ? '100%' : '0%' }} />
                </div>
                <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  {active ? '100%' : '0%'}
                </span>
              </div>
              <div className="table-glass" style={{ marginTop: 12 }}>
                <div className="space-y-2">
                  {taskRows.length > 0 ? (
                    taskRows.map((t) => {
                      const a = v3AgentByKey(agents.data ?? [], t.agentKey ?? null);
                      const unread = isV3SessionUnread(t);
                      return (
                        <div className="hrow" key={t.id}>
                          <div className="min-w-0" style={{ flex: 1 }}>
                            <p className="font-mono font-bold text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.title}
                            </p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                              {`${unread ? 'awaiting review' : 'reviewed'}${a ? ` · ${a.handle}` : ''} · ${v3Ago(t.updatedAt ?? t.createdAt)}`}
                            </p>
                          </div>
                          <div className="pbar">
                            <div style={{ width: unread ? '40%' : '100%', background: unread ? 'var(--amber)' : undefined }} />
                          </div>
                          <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                            {unread ? '—' : '100%'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      in-progress tasks appear here first
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
                <Sparkline series={v3Data.getSparkSeries()} />
              </div>
            </div>
            <div className="bento-item">
              <p className="font-mono text-xs font-bold" style={{ marginBottom: 10 }}>
                AGENTS_IN_FLOW
              </p>
              {flowAgents.map(({ agent, last, count }) => (
                <button
                  key={agent.key}
                  className="flex items-center gap-3 w-full text-left"
                  style={{ padding: '8px 0' }}
                  onClick={() => {
                    openApp('agents');
                    selectAgent(agent.key);
                  }}
                >
                  <agent.icon size={16} style={{ color: SUITE_TINT[agent.suite]?.color ?? 'var(--violet)' }} />
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs">{agent.handle}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      {last ? `${last.title} — ${v3Ago(last.updatedAt ?? last.createdAt)}${count > 1 ? ` · ${count} sessions` : ''}` : 'Waiting for a task'}
                    </p>
                  </div>
                </button>
              ))}
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
