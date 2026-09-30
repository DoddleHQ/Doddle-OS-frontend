'use client';

import { Layers, Bot, Activity, Inbox, Zap, ChevronDown, Database, PenTool } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data, OPERATOR_FIRST_NAME } from '@/lib/v3/adapter';
import { MorphText } from '@/components/v3/ui/MorphText';
import { Sparkline } from '@/components/v3/ui/Sparkline';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const FLOW_AGENTS = ['@Google_Analyst', '@Content_Architect'];

/** Full-page chat-first dashboard — visible only when no window is open (reference #dashboard). */
export function Dashboard() {
  const windows = useV3OS((s) => s.windows);
  const { openApp, toggleNotifs } = useV3OS.getState();
  const hidden = windows.some((w) => !w.minimized);

  const thread = v3Data.getActiveThread();
  const review = v3Data.getReviewQueue();
  const agents = v3Data.getAgents().filter((a) => FLOW_AGENTS.includes(a.handle));

  const cards = [
    { icon: Layers, color: 'var(--green)', label: 'Assignments', sub: 'Tasks by type, in-progress first.', onClick: () => openApp('assignments') },
    { icon: Bot, color: 'var(--violet)', label: 'Agents', sub: 'Contextual agents. Pick one to run it.', onClick: () => openApp('agents') },
    {
      icon: Activity,
      color: 'var(--accent)',
      label: `Active Execution ${thread ? '· ' + thread.progress + '%' : ''}`,
      sub: thread ? thread.title : 'No active project.',
      onClick: () => openApp('launchpad'),
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
              {greeting()}, {OPERATOR_FIRST_NAME}. <MorphText options={['Ready?', 'Research?', 'Ship it?', 'Review?']} />
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
            <button onClick={() => openApp('launchpad')}>↗ Start a task</button>
            <button onClick={() => openApp('agents')}>↗ Deploy an agent</button>
            <button onClick={() => toggleNotifs(true)}>
              ↗ Needs review ({review.length})
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
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
                ● Ready · Marketing
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="chip">active</span>
              <strong className="font-mono text-sm">{thread ? '1' : '0'}</strong>
              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                {thread ? 'campaign' : '—'}
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
                  <p className="font-mono font-bold text-xs">{thread ? thread.title : 'No active project'}</p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {thread ? thread.step : 'in-progress tasks appear here first'}
                  </p>
                </div>
                <div className="pbar">
                  <div style={{ width: `${thread?.progress ?? 0}%` }} />
                </div>
                <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  {thread?.progress ?? 0}%
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
              {agents.map((a) => (
                <div key={a.handle} className="flex items-center gap-3" style={{ padding: '8px 0' }}>
                  {a.role === 'Analytics' ? (
                    <Database size={16} style={{ color: a.color }} />
                  ) : (
                    <PenTool size={16} style={{ color: a.color }} />
                  )}
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs">{a.handle}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      Waiting for a task
                    </p>
                  </div>
                </div>
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
