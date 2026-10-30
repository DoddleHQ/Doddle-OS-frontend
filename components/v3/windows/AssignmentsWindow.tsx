'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, ArrowUpRight, Layers } from 'lucide-react';
import type { UIMessage } from 'ai';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, markThreadSeen, v3SessionStatus } from '@/lib/v3/data';
import { fetchV3PowerAgents, SUITE_TINT, v3AgentByKey } from '@/lib/v3/powerAgents';
import { ChatFeed } from '@/components/v3/windows/AgentsChatFeed';
import type { V3Agent, V3Session } from '@/lib/v3/powerAgents';

const DAY = 86_400_000;

const CAT_LABEL: Record<string, string> = {
  research: 'Research', code: 'Code', data: 'Data', writing: 'Writing', admin: 'Admin', design: 'Design',
};
const CAT_COLOR: Record<string, string> = {
  research: 'var(--task-research)', code: 'var(--task-code)', data: 'var(--task-data)',
  writing: 'var(--task-writing)', admin: 'var(--task-admin)', design: 'var(--task-design)',
};
const SUITE_CAT: Record<string, string> = {
  'SEO Audit Suite': 'research', 'Website Content Suite': 'writing', 'DevOps Suite': 'code',
  'Shopify Suite': 'writing', 'WordPress Suite': 'code', 'GitOps Suite': 'code',
};
const STAGES: Record<string, string[]> = {
  research: ['scan sources', 'read & extract', 'synthesize'],
  code: ['checkout', 'patch', 'verify'],
  writing: ['outline', 'draft', 'polish'],
  data: ['pull', 'model', 'report'],
  admin: ['collect', 'organize'],
  design: ['brief', 'draft', 'review'],
};

function hashOf(id: string, mod: number): number {
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (h * 31) % mod;
}

interface Kid {
  id: string;
  title: string;
  status: 'running' | 'attention' | 'done';
  ts: number;
  pct: number;
}
interface Task {
  id: string;
  title: string;
  status: 'running' | 'attention' | 'done';
  ts: number;
  createdAt: number;
  agent: V3Agent | null;
  cat: string;
  kids: Kid[];
  progress: number;
}

export function AssignmentsWindow() {
  const router = useRouter();
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const { viewThread } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [tab, setTab] = useState<'waterfall' | 'board' | 'review'>('waterfall');
  const [fizzyFilter, setFizzyFilter] = useState('');
  const [ganttFilter, setGanttFilter] = useState('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeBoardCol, setActiveBoardCol] = useState('review');
  const [open, setOpen] = useState<V3Session | null>(null);
  const [seenTick, setSeenTick] = useState(0);
  const qRef = useRef<HTMLInputElement>(null);

  const wsLabel = (workspaces.find((w) => w.id === workspaceId) ?? workspaces[0])?.name ?? 'DODDLEHQ';

  const tasks: Task[] = useMemo(() => {
    void seenTick;
    return feed.map((s) => {
      const agent = v3AgentByKey(agents.data ?? [], s.agentKey ?? null);
      const cat = agent ? SUITE_CAT[agent.suite] ?? 'research' : 'research';
      const status = v3SessionStatus(s);
      const created = new Date(s.createdAt ?? s.updatedAt ?? Date.now()).getTime();
      const updated = new Date(s.updatedAt ?? s.createdAt ?? Date.now()).getTime();
      const names = STAGES[cat] ?? STAGES.research;
      const span = Math.max(updated - created, DAY);
      const doneStages = status === 'done' ? names.length : names.length - 1;
      const kids: Kid[] = names.map((name, i) => ({
        id: `${s.id}:${i}`,
        title: name,
        status: i < doneStages ? 'done' : status,
        ts: created + Math.round(((i + 1) / names.length) * Math.min(span, DAY * 2)),
        pct: i < doneStages ? 100 : 30 + hashOf(`${s.id}:${i}`, 40),
      }));
      return {
        id: s.id,
        title: s.title,
        status,
        ts: updated,
        createdAt: created,
        agent: agent ?? null,
        cat,
        kids,
        progress: kids.length ? Math.round((doneStages / kids.length) * 100) : 0,
      };
    });
  }, [feed, agents.data, seenTick]);

  const reviewList = tasks.filter((t) => t.status === 'attention');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        qRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const approve = (id: string) => {
    markThreadSeen(id);
    setSeenTick((t) => t + 1);
  };

  const q = fizzyFilter.toLowerCase().trim();
  const qmatch = (t: Task) => !q || t.title.toLowerCase().includes(q);
  const gmatch = (t: Task) =>
    ganttFilter === 'all'
      ? true
      : ganttFilter === 'proposed'
        ? false
        : ganttFilter === 'running'
          ? t.status === 'running'
          : ganttFilter === 'review'
            ? t.status === 'attention'
            : t.status === 'done';

  return (
    <section id="win-assignments" className="os-window glass page focused" data-app="campaigns">
      <div className="titlebar">
        <div className="traffic">
          <button className="t-close" onClick={() => router.push('/v3')} aria-label="Close" />
          <button className="t-min" aria-label="Minimize" />
          <button className="t-max" aria-label="Maximize" />
        </div>
        <strong className="text-sm">Assignments &amp; Tasks</strong>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          fizzy board · ⌘4
        </span>
      </div>

      <div className="win-body fizzy-wrap" style={{ minHeight: '60vh' }}>
        {feedError ? (
          <p className="font-mono text-xs" style={{ color: 'var(--amber)', padding: 14 }}>
            session feed unavailable ({feedError}) — assignments appear when the feed returns.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 14 }}>
              <div className="seg" id="proj-tabs" role="tablist" aria-label="Assignments view">
                {(['waterfall', 'board', 'review'] as const).map((p) => (
                  <button
                    key={p}
                    className={`seg-btn${tab === p ? ' on' : ''}`}
                    role="tab"
                    aria-selected={tab === p}
                    onClick={() => setTab(p)}
                  >
                    {p === 'waterfall' ? 'Gantt' : p === 'board' ? 'Board' : <>Review{reviewList.length ? <span>{` · ${reviewList.length}`}</span> : null}</>}
                  </button>
                ))}
              </div>
              <span style={{ flex: 1 }} />
              <div className="askbar" style={{ flex: 1, minWidth: 200, maxWidth: 360, margin: 0 }}>
                <Search size={16} className="shrink-0" style={{ color: 'var(--muted)' }} />
                <input
                  ref={qRef}
                  value={fizzyFilter}
                  onChange={(e) => setFizzyFilter(e.target.value)}
                  placeholder="Filter these cards... [F]"
                  aria-label="Filter these cards"
                />
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  ⇅
                </span>
              </div>
            </div>

            <div className={`proj-tab${tab === 'waterfall' ? ' on' : ''}`} id="proj-tab-waterfall">
              <div className="flex gap-2 items-center flex-wrap" style={{ marginBottom: 8 }}>
                <span className="chip">21-day window</span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  bars = scheduled span · fill = progress · ◆ = review gate
                </span>
                <span style={{ flex: 1 }} />
                <div className="flex gap-2 flex-wrap font-mono text-xs items-center" id="gantt-filters">
                  <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                    Status
                  </span>
                  {['all', 'proposed', 'running', 'review', 'done'].map((g) => (
                    <button key={g} className={`fchip${ganttFilter === g ? ' on' : ''}`} onClick={() => setGanttFilter(g)}>
                      {g}
                    </button>
                  ))}
                  <button
                    className="btn-deploy"
                    style={{ minHeight: 30 }}
                    onClick={() => {
                      setGanttFilter('all');
                      setFizzyFilter('');
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="gantt" id="waterfall-list">
                <Waterfall
                  tasks={tasks.filter((t) => gmatch(t) && qmatch(t))}
                  collapsed={collapsed}
                  onToggle={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
                  onOpen={(id) => setOpen(feed.find((s) => s.id === id) ?? null)}
                />
              </div>
            </div>

            <div className={`proj-tab${tab === 'board' ? ' on' : ''}`} id="proj-tab-board">
              <div className="pane" style={{ marginBottom: 10 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="btn-deploy" onClick={() => router.push('/v3/launchpad')}>
                    + Route new task → agent / human
                  </button>
                  <div className="flex gap-2 flex-wrap">
                    {['research', 'code', 'data', 'writing', 'admin', 'design'].map((c) => (
                      <button key={c} className="fchip" onClick={() => router.push(`/v3/launchpad?type=${c}`)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div id="board-route" className="hidden" style={{ marginTop: 10 }} />
              </div>
              <FizzyBoard
                tasks={tasks.filter(qmatch)}
                wsLabel={wsLabel}
                activeCol={activeBoardCol}
                onCol={(k) => setActiveBoardCol(k)}
                onAdd={() => router.push('/v3/launchpad?type=generic')}
                onOpen={(id) => setOpen(feed.find((s) => s.id === id) ?? null)}
              />
              <div className="fizzy-bottom">
                <span>
                  PINNED <kbd className="chip">P</kbd>
                </span>
                <span>
                  SEARCH <kbd className="chip">K</kbd>
                </span>
                <span>
                  NOTIFICATIONS <kbd className="chip">N</kbd>
                </span>
              </div>
            </div>

            <div className={`proj-tab${tab === 'review' ? ' on' : ''}`} id="proj-tab-review">
              <p className="pane-label">REVIEW · APPROVE HERE — NOTHING SHIPS WITHOUT YOU</p>
              <div className="table-glass">
                <div id="proj-tab-review-list" className="space-y-2">
                  {reviewList.length === 0 ? (
                    <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      Inbox zero. Nothing waiting on you.
                    </p>
                  ) : (
                    reviewList.map((t) => (
                      <div className="hrow" key={t.id}>
                        <div className="meta">
                          <p className="font-mono font-bold text-xs">
                            {t.title} <span className="task-category-badge" style={{ background: CAT_COLOR[t.cat] ?? 'var(--muted)' }}>{CAT_LABEL[t.cat] ?? t.cat}</span>
                          </p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                            {t.status === 'attention' ? 'waiting on you' : 'done · unapproved'} · {v3Ago(new Date(t.ts).toISOString())}
                            {t.agent ? ` · ${t.agent.handle}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap" style={{ flexShrink: 0 }}>
                          <button className="chip" onClick={() => setOpen(feed.find((s) => s.id === t.id) ?? null)}>Open</button>
                          <button className="chip" onClick={() => setOpen(feed.find((s) => s.id === t.id) ?? null)}>View</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {open && (
        <SlideOver
          session={open}
          agentOf={(s) => v3AgentByKey(agents.data ?? [], s.agentKey ?? null)}
          onClose={() => setOpen(null)}
          onApprove={approve}
          onOpenExecution={(agentKey, threadId) => {
            viewThread(agentKey, threadId);
            router.push('/v3/agents');
          }}
        />
      )}
    </section>
  );
}

function ganttPill(status: string) {
  if (status === 'done') return <span className="st-pill done">DONE</span>;
  if (status === 'attention') return <span className="st-pill attn">REVIEW</span>;
  if (status === 'proposed') return <span className="st-pill prop">QUEUED</span>;
  return <span className="st-pill run">IN PROGRESS</span>;
}

function spanOf(s: number, status: string, kidCount: number, ts: number) {
  const dur = (status === 'done' ? 2 : 2 + kidCount * 0.7) * DAY;
  return { s, e: status === 'done' ? ts : s + dur };
}

function Waterfall({
  tasks,
  collapsed,
  onToggle,
  onOpen,
}: {
  tasks: Task[];
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const now = Date.now();
  const win0 = now - 14 * DAY;
  const win1 = now + 7 * DAY;
  const pos = (ts: number) => Math.max(0, Math.min(100, ((ts - win0) / (win1 - win0)) * 100));

  if (tasks.length === 0) {
    return <p className="font-mono text-xs" style={{ padding: 14, color: 'var(--muted)' }}>No tasks to chart. Start one from Board → Maybe.</p>;
  }

  const weeks = [0, 1, 2].map((i) => {
    const s = new Date(win0 + i * 7 * DAY);
    const e = new Date(Math.min(win1, s.getTime() + 6 * DAY));
    return { l: pos(s.getTime()), s, e };
  });
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const miles = tasks.filter((t) => t.status === 'attention').slice(0, 6);

  const barOf = (title: string, s: number, e: number, pct: number, st: string) => {
    const fill = st === 'st-done' ? '#059669' : st === 'st-attention' ? '#dc2626' : st === 'st-proposed' ? '#d97706' : '#2f6bd8';
    const l = pos(s);
    const r = pos(Math.max(e, s + DAY * 0.5));
    const w = Math.max(6, r - l);
    return (
      <div className={`gantt-bar plan ${st}`} style={{ left: `${l}%`, width: `${w}%` }} title={`${title} · ${pct}%`}>
        <div className="gantt-fill" style={{ width: `${pct}%`, background: fill }} />
        <span className="gantt-pct">{`${title.slice(0, 26)} – ${pct}%`}</span>
      </div>
    );
  };

  return (
    <>
      <div className="gantt-head">
        <div>EPIC · 21-DAY WINDOW</div>
        <div className="gantt-weeks">
          {weeks.map((w, i) => (
            <div key={i} className="gantt-week" style={{ left: `${w.l}%` }}>
              <b>{`Week ${i + 1}`}</b>
              <i>{`${fmt(w.s)} - ${fmt(w.e)}`}</i>
            </div>
          ))}
        </div>
      </div>
      {miles.length > 0 && (
        <div className="gantt-miles">
          {miles.map((t) => (
            <span key={t.id} className="gantt-mile-tag" title={t.title}>
              {t.title.slice(0, 18)}
            </span>
          ))}
        </div>
      )}
      {tasks.slice(0, 8).map((t) => {
        const shut = !!collapsed[t.id];
        const { s, e } = spanOf(t.createdAt, t.status, t.kids.length, t.ts);
        const st = t.status === 'attention' ? 'st-attention' : t.status === 'done' ? 'st-done' : '';
        return (
          <div key={t.id}>
            <div className="gantt-row" style={{ cursor: 'pointer' }}>
              <div className="gantt-label">
                <div className="flex items-center gap-2">
                  <button className="epic-chev" onClick={(ev) => { ev.stopPropagation(); onToggle(t.id); }} aria-label={shut ? 'Expand stages' : 'Collapse stages'}>
                    {shut ? '›' : '⌄'}
                  </button>
                  <p style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                    {t.title.slice(0, 30)}
                  </p>
                  {ganttPill(t.status)}
                </div>
                <p className="font-mono text-[10px]" style={{ color: 'var(--muted)', margin: '2px 0 0 28px' }}>
                  {t.kids.length ? `${t.kids.length} stages` : v3Ago(new Date(t.ts).toISOString())}
                </p>
              </div>
              <div className="gantt-track" onClick={() => onOpen(t.id)}>
                <div className="gantt-today" style={{ left: `${pos(now)}%` }} />
                {barOf(t.title, s, e, t.progress, st)}
              </div>
            </div>
            {!shut &&
              t.kids.map((k) => {
                const ks = spanOf(k.ts - DAY, k.status, 0, k.ts);
                const kst = k.status === 'attention' ? 'st-attention' : k.status === 'done' ? 'st-done' : '';
                return (
                  <div key={k.id} className="gantt-row" style={{ cursor: 'pointer' }}>
                    <div className="gantt-label gantt-kid-label" style={{ paddingLeft: 48 }}>
                      <p className="font-mono text-[11px]" style={{ color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {k.title.slice(0, 34)}
                      </p>
                    </div>
                    <div className="gantt-track" onClick={() => onOpen(t.id)}>
                      <div className="gantt-today" style={{ left: `${pos(now)}%` }} />
                      {barOf(k.title, ks.s, ks.e, k.pct, kst)}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })}
    </>
  );
}

function FizzyBoard({
  tasks,
  wsLabel,
  activeCol,
  onCol,
  onAdd,
  onOpen,
}: {
  tasks: Task[];
  wsLabel: string;
  activeCol: string;
  onCol: (k: string) => void;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const groups = [
    { key: 'proposed', title: 'PROPOSED', pill: '', items: tasks.filter((t) => false) },
    { key: 'running', title: 'RUNNING', pill: 'blue', items: tasks.filter((t) => t.status === 'running') },
    { key: 'review', title: 'NEEDS REVIEW', pill: 'lilac', items: tasks.filter((t) => t.status === 'attention') },
    { key: 'done', title: 'DONE', pill: 'grey', items: tasks.filter((t) => t.status === 'done').slice(0, 9) },
  ];
  return (
    <div className="fizzy-board single" id="fizzy-board">
      {groups.map((g) => {
        if (g.key !== activeCol) {
          return (
            <div className="fizzy-col narrow" key={g.key}>
              <button className={`fizzy-vpill ${g.pill} clickable`} onClick={() => onCol(g.key)} title={`Open ${g.title}`}>
                <span className="count">{g.items.length}</span> {g.title}
              </button>
            </div>
          );
        }
        return (
          <div className="fizzy-col" key={g.key}>
            <button className="fizzy-colhead clickable" onClick={() => onCol(g.key)} title="Collapse">
              {g.title} <span className="count">{g.items.length}</span>
            </button>
            {g.items.length > 0
              ? g.items.slice(0, 6).map((t, i) => (
                  <FizzyCard key={t.id} task={t} num={i + 1} ws={wsLabel.toUpperCase()} onOpen={onOpen} />
                ))
              : g.key === 'proposed' ? (
                  <div className="fizzy-add">
                    <button className="btn-deploy" onClick={onAdd}>Add a card (C)</button>
                    <p className="font-mono text-[11px] mt-3" style={{ color: 'var(--muted)' }}>WATCHING FOR NEW CARDS</p>
                  </div>
                ) : (
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>— none —</p>
                )}
            <div className="fizzy-shelf" />
          </div>
        );
      })}
    </div>
  );
}

function FizzyCard({ task: t, num, ws, onOpen }: { task: Task; num: number; ws: string; onOpen: (id: string) => void }) {
  const who = t.agent?.handle ?? 'workspace';
  const added = new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <button
      className="fizzy-card"
      style={{ borderLeftColor: CAT_COLOR[t.cat] ?? 'var(--accent)', ['--fc' as string]: CAT_COLOR[t.cat] ?? 'var(--accent)', textAlign: 'left' }}
      onClick={() => onOpen(t.id)}
      aria-label={`${t.title} — open details`}
    >
      <div className="folder-deck" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="fizzy-tag">
        <span>{String(num).padStart(2, '0')}</span>
        <span className="sep">|</span>
        <span>{ws}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.85 }}>{(CAT_LABEL[t.cat] ?? t.cat).toUpperCase()}</span>
      </div>
      <h4>{t.title}</h4>
      <div className="fizzy-meta">
        <span className="avatar">{(t.agent?.name ?? who).slice(0, 2).toUpperCase()}</span>
        <span>
          ADDED {added.toUpperCase()}
          <br />
          {who.toUpperCase()}
        </span>
        <span style={{ marginLeft: 'auto' }} />
        {t.status === 'done' ? <span className="chip">done ✓</span> : <span className="chip">open →</span>}
        <span className="cmt">💬 {hashOf(t.id, 9)}</span>
        <span className="folder-kebab" title="Quick view">⋮</span>
      </div>
    </button>
  );
}

function SlideOver({
  session,
  agentOf,
  onClose,
  onApprove,
  onOpenExecution,
}: {
  session: V3Session;
  agentOf: (s: V3Session) => ReturnType<typeof v3AgentByKey>;
  onClose: () => void;
  onApprove: (id: string) => void;
  onOpenExecution: (agentKey: string, threadId: string) => void;
}) {
  const agent = agentOf(session);
  const [history, setHistory] = useState<UIMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setHistory(null);
    setError(null);
    fetch(`/api/power-agents/threads/${session.id}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const t = (await res.json()) as { messages: UIMessage[] };
        setHistory(t.messages ?? []);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'failed to load');
      });
    return () => {
      alive = false;
    };
  }, [session.id]);

  return (
    <div className="v3-slideover" role="dialog" aria-label={`${session.title} details`} onClick={onClose}>
      <div className="glass slide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)' }}>
            Session detail
          </p>
          <button className="chip" onClick={onClose}>
            esc
          </button>
        </div>
        <h3 className="font-mono font-bold text-sm">{session.title}</h3>
        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
          {agent ? `${agent.handle} · ${agent.suite}` : 'agent unknown'} · updated {v3Ago(session.updatedAt ?? session.createdAt)}
        </p>
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <button className="btn-deploy flex-1" onClick={() => { onApprove(session.id); onClose(); }}>
            <Check size={12} /> Approve
          </button>
          <button
            className="btn-ghost flex-1"
            disabled={!session.agentKey}
            onClick={() => session.agentKey && onOpenExecution(session.agentKey, session.id)}
          >
            <ArrowUpRight size={12} /> Open in execution
          </button>
        </div>
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', margin: '14px 0 6px' }}>
          Conversation
        </p>
        <div className="v3-chat" style={{ maxHeight: 380 }} role="log">
          {error ? (
            <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>history unavailable ({error})</p>
          ) : history === null ? (
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>loading run…</p>
          ) : history.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>This run has no stored messages.</p>
          ) : (
            <ChatFeed messages={history} agent={agent ?? undefined} />
          )}
        </div>
      </div>
    </div>
  );
}
