'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, Bot, Activity, Inbox, ChevronDown } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, useV3OperatorName, v3Ago, isV3SessionUnread, v3SessionStatus } from '@/lib/v3/data';
import { fetchV3PowerAgents, v3AgentByKey, SUITE_TINT, type V3Suite } from '@/lib/v3/powerAgents';
import { MorphText } from '@/components/v3/ui/MorphText';
import { Composer } from '@/components/v3/ui/Composer';
import { V3_MODULES } from '@/lib/v3/modules';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const SUITE_CAT: Record<V3Suite, string> = {
  'SEO Audit Suite': 'research',
  'Website Content Suite': 'writing',
  'DevOps Suite': 'code',
  'Shopify Suite': 'writing',
  'WordPress Suite': 'code',
  'GitOps Suite': 'code',
};

function demoProgress(id: string): number {
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((h * 31) % 19) * 5;
}

export function Dashboard() {
  const windows = useV3OS((s) => s.windows);
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const { selectAgent } = useV3OS.getState();
  const router = useRouter();
  const hidden = windows.some((w) => !w.minimized);

  const operator = useV3OperatorName();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [ask, setAsk] = useState('');
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('v3.mode') ?? 'default';
    } catch {
      return 'default';
    }
  });
  const [blueprint, setBlueprint] = useState<string | null>(() => {
    try {
      return localStorage.getItem('v3.bp');
    } catch {
      return null;
    }
  });
  const pickMode = (v: string) => {
    setMode(v);
    try {
      localStorage.setItem('v3.mode', v);
    } catch {
    }
  };
  const pickBlueprint = (v: string | null) => {
    setBlueprint(v);
    try {
      if (v) localStorage.setItem('v3.bp', v);
      else localStorage.removeItem('v3.bp');
    } catch {
    }
  };
  const [agentPick, setAgentPick] = useState<string | null>(() => {
    try {
      return localStorage.getItem('v3.agent');
    } catch {
      return null;
    }
  });
  const pickAgent = (v: string | null) => {
    setAgentPick(v);
    try {
      if (v) localStorage.setItem('v3.agent', v);
      else localStorage.removeItem('v3.agent');
    } catch {
    }
  };

  const mentioned = (text: string) => {
    const handles = [...text.matchAll(/@([A-Za-z0-9_]+)/g)].map((m) => '@' + m[1].toLowerCase());
    return (agents.data ?? []).find((a) => handles.includes(a.handle.toLowerCase()));
  };
  const send = () => {
    if (!ask.trim()) return;
    const target = mentioned(ask);
    if (target) {
      selectAgent(target.key);
      router.push('/agents');
    } else {
      const params = new URLSearchParams({ ask: ask.trim() });
      if (blueprint) params.set('bp', blueprint);
      const picked = (agents.data ?? []).find((a) => a.handle === agentPick || a.key === agentPick);
      if (picked) params.set('agent', picked.key);
      router.push(`/launchpad?${params.toString()}`);
    }
    setAsk('');
  };
  const liveMention = mentioned(ask);

  const list = feed;
  const reviewCount = list.filter((s) => v3SessionStatus(s) === 'attention').length;
  const active = list[0] ?? null;
  const activePct = active ? (v3SessionStatus(active) === 'done' ? 100 : demoProgress(active.id)) : 0;
  const activeAgent = v3AgentByKey(agents.data ?? [], active?.agentKey ?? null);
  const wsLabel = (workspaces.find((w) => w.id === workspaceId) ?? workspaces[0])?.name ?? '';
  const allDemo = list.length > 0 && list.every((s) => s.id.startsWith('demo_'));

  const taskRows = list.slice(1, 5);
  const typeWords = [...new Set(list.map((s) => v3AgentByKey(agents.data ?? [], s.agentKey ?? null)).filter((a): a is NonNullable<typeof a> => !!a).map((a) => SUITE_CAT[a.suite]))];
  const busyAgent = activeAgent;
  const idleAgent = (agents.data ?? []).find((a) => !list.some((s) => s.agentKey === a.key)) ?? null;

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
            placeholder="Describe what you're working on… e.g. research AI articles, review PR #42, organize Q3 files"
            ariaLabel="Describe what you're working on"
            mode={mode}
            onMode={pickMode}
            blueprint={blueprint}
            blueprintLabel={blueprint ? V3_MODULES.find((m) => m.slug === blueprint)?.name ?? 'Blueprint' : 'Blueprint'}
            onBlueprint={pickBlueprint}
            agentPick={agentPick}
            agentOptions={(agents.data ?? []).map((a) => ({ value: a.handle, label: a.name }))}
            onAgentPick={pickAgent}
          />
          {liveMention && (
            <p className="font-mono text-[10px]" style={{ color: 'var(--accent)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              → {liveMention.handle} · {liveMention.role} — mention routes the run to this agent
            </p>
          )}

          <div className="hero-quick">
            <Link href="/launchpad?type=research">↗ Research task</Link>
            <Link href="/agents">↗ Deploy research agent</Link>
            <Link href="/triage">↗ Needs review (<span>{reviewCount}</span>)</Link>
          </div>

          <div className="dash-cards" style={{ marginTop: 20 }}>
            <Link className="bento-item text-left" href="/assignments" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Layers size={20} className="mb-2" style={{ color: 'var(--green)' }} />
              <p className="font-bold text-sm">Assignments</p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                Tasks by type, in-progress first.
              </p>
            </Link>
            <Link className="bento-item text-left" href="/agents" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Bot size={20} className="mb-2" style={{ color: 'var(--violet)' }} />
              <p className="font-bold text-sm">Agents</p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                Contextual agents. Pick one to run it.
              </p>
            </Link>
            <Link className="bento-item text-left" href="/assignments" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Activity size={20} className="mb-2" style={{ color: 'var(--accent)' }} />
              <p className="font-bold text-sm">
                Active Execution {active ? <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>· {list.length} active</span> : null}
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                {active ? `${active.title} — ${activePct}%. Open Active Execution to follow it.` : 'No active project. Start a task to see progress.'}
              </p>
            </Link>
            <Link className="bento-item text-left" href="/triage" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Inbox size={20} className="mb-2" style={{ color: '#f87171' }} />
              <p className="font-bold text-sm">
                Triage Queue <span style={{ color: '#f87171' }}>{reviewCount}</span>
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                Items waiting for approval.
              </p>
            </Link>
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
                {feedError ? 'session feed unavailable' : `${list.length} active · ${wsLabel}${allDemo ? ' · demo data' : ''}`}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="chip">{list.length ? `active ${list.length}` : '—'}</span>
              <span className="chip">active</span>
              <strong className="font-mono text-sm">{list.length}</strong>
              <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
                {typeWords.length ? typeWords.join(' · ') : '—'}
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
                    in-progress tasks appear here first
                  </p>
                </div>
                <div className="pbar">
                  <div style={{ width: `${activePct}%` }} />
                </div>
                <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  {activePct}%
                </span>
              </div>
              <div className="table-glass" style={{ marginTop: 12 }}>
                <div className="space-y-2">
                  {taskRows.length > 0 ? (
                    taskRows.map((t) => {
                      const a = v3AgentByKey(agents.data ?? [], t.agentKey ?? null);
                      const pct = v3SessionStatus(t) === 'done' ? 100 : demoProgress(t.id);
                      const sub = [
                        a ? SUITE_CAT[a.suite] : null,
                        a ? a.handle : null,
                        v3Ago(t.updatedAt ?? t.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <div className="hrow" key={t.id}>
                          <div className="min-w-0" style={{ flex: 1 }}>
                            <p className="font-mono font-bold text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.title}
                            </p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                              {sub}
                            </p>
                          </div>
                          <div className="pbar">
                            <div style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                            {pct}%
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
            </div>
            <div className="bento-item">
              <p className="font-mono text-xs font-bold" style={{ marginBottom: 10 }}>
                AGENTS_IN_FLOW
              </p>
              {busyAgent && (
                <div className="flex items-center gap-3" style={{ padding: '8px 0' }}>
                  <busyAgent.icon size={16} style={{ color: SUITE_TINT[busyAgent.suite]?.color ?? 'var(--violet)' }} />
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs">{busyAgent.handle}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      {active ? `${active.title} — ${activePct}%` : 'Waiting for a task'}
                    </p>
                  </div>
                </div>
              )}
              {idleAgent && (
                <div className="flex items-center gap-3" style={{ padding: '8px 0' }}>
                  <idleAgent.icon size={16} style={{ color: SUITE_TINT[idleAgent.suite]?.color ?? 'var(--violet)' }} />
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs">{idleAgent.handle}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      Waiting for a task
                    </p>
                  </div>
                </div>
              )}
              <Link className="btn-ghost w-full" style={{ marginTop: 8, textDecoration: 'none' }} href="/agents">
                open agents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
