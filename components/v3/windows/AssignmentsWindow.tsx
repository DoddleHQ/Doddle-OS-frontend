'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Check, ArrowUpRight } from 'lucide-react';
import type { UIMessage } from 'ai';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, isV3SessionUnread, markThreadSeen } from '@/lib/v3/data';
import { fetchV3PowerAgents, SUITE_TINT, v3AgentByKey } from '@/lib/v3/powerAgents';
import { ChatFeed } from '@/components/v3/windows/AgentsChatFeed';
import type { V3Session } from '@/lib/v3/powerAgents';

type Tab = 'gantt' | 'board' | 'review';

const DAY = 86_400_000;

/**
 * Assignments — the full v13 depth on real session data:
 * Gantt (session timelines over a 14-day window), the fizzy status board
 * (awaiting review / reviewed), the review list with inline approvals,
 * and the v12 slide-over detail carrying the run's conversation.
 */
export function AssignmentsWindow() {
  const router = useRouter();
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const { viewThread } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [tab, setTab] = useState<Tab>('gantt');
  const [open, setOpen] = useState<V3Session | null>(null);
  const [seenTick, setSeenTick] = useState(0);

  const list = useMemo(() => {
    void seenTick;
    return feed;
  }, [feed, seenTick]);
  const awaiting = list.filter((s) => isV3SessionUnread(s));
  const reviewed = list.filter((s) => !isV3SessionUnread(s));
  const agentOf = (s: V3Session) => v3AgentByKey(agents.data ?? [], s.agentKey ?? null);

  const approve = (id: string) => {
    markThreadSeen(id);
    setSeenTick((t) => t + 1);
  };

  const counts = `${list.length} session${list.length === 1 ? '' : 's'} · ${awaiting.length} awaiting review · ${agents.data?.length ?? 0} agents`;

  if (feedError) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--amber)', padding: 24 }}>
        session feed unavailable ({feedError}) — assignments appear when the feed returns.
      </p>
    );
  }

  return (
    <div className="v3-fizzy-wrap">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {counts}
        </p>
        <div className="seg" role="tablist" aria-label="Assignments view">
          {(
            [
              ['gantt', 'Gantt'],
              ['board', 'Board'],
              ['review', `Review${awaiting.length ? ` ${awaiting.length}` : ''}`],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              className={`seg-btn${tab === id ? ' on' : ''}`}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'gantt' && <GanttTab list={list} agentOf={agentOf} onOpen={setOpen} />}
      {tab === 'board' && <BoardTab awaiting={awaiting} reviewed={reviewed} agentOf={agentOf} onOpen={setOpen} />}
      {tab === 'review' && <ReviewTab awaiting={awaiting} agentOf={agentOf} onOpen={setOpen} onApprove={approve} />}

      {list.length === 0 && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          No sessions yet — deploy a power agent to start the first one.
        </p>
      )}

      {open && (
        <SlideOver
          session={open}
          agentOf={agentOf}
          onClose={() => setOpen(null)}
          onApprove={approve}
          onOpenExecution={(agentKey, threadId) => {
            viewThread(agentKey, threadId);
            router.push('/v3/agents');
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Gantt: session timelines over a 14-day window ---------------- */

function GanttTab({
  list,
  agentOf,
  onOpen,
}: {
  list: V3Session[];
  agentOf: (s: V3Session) => ReturnType<typeof v3AgentByKey>;
  onOpen: (s: V3Session) => void;
}) {
  const DAYS = 14;
  const end = Date.now();
  const start = end - DAYS * DAY;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - start) / (DAYS * DAY)) * 100));
  const days = Array.from({ length: DAYS }, (_, i) => new Date(start + (i + 0.5) * DAY));

  return (
    <div>
      <div className="flex gap-2 items-center flex-wrap" style={{ marginBottom: 8 }}>
        <span className="chip">{DAYS}-day window</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
          bars = session span · dashed amber = awaiting review · green = reviewed
        </span>
      </div>
      <div className="gantt" role="list" aria-label="Session timeline">
        <div className="gantt-head">
          <div>session</div>
          <div className="gantt-scale">
            {days.map((d, i) => {
              const wkend = d.getDay() === 0 || d.getDay() === 6;
              const today = end - d.getTime() < DAY && d.getTime() < end;
              return (
                <span key={i} className={`gantt-tick${wkend ? ' wkend' : ''}${today ? ' today' : ''}`} style={{ left: `${(i / DAYS) * 100}%`, width: `${100 / DAYS}%` }}>
                  <b>{d.toLocaleDateString([], { weekday: 'short' })}</b>
                  <i>{d.getDate()}</i>
                </span>
              );
            })}
          </div>
        </div>
        {list.map((s) => {
          const a = agentOf(s);
          const from = new Date(s.createdAt ?? s.updatedAt ?? Date.now()).getTime();
          const to = new Date(s.updatedAt ?? s.createdAt ?? Date.now()).getTime();
          const left = pct(from);
          const right = Math.max(pct(to), left + 3); // same-day runs keep a visible sliver
          const unread = isV3SessionUnread(s);
          return (
            <button key={s.id} className="gantt-row" role="listitem" onClick={() => onOpen(s)} data-tip={`${s.title} · open details`}>
              <div className="gantt-label">
                <p className="font-mono font-bold text-xs truncate">{s.title}</p>
                <p className="font-mono text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                  {a ? `${a.handle} · ` : ''}
                  {v3Ago(s.updatedAt ?? s.createdAt)}
                </p>
              </div>
              <div className="gantt-track">
                <span className="gantt-today" style={{ left: 'calc(100% - 2px)' }} aria-hidden="true" />
                <span className="gantt-bar" role="img" aria-label={`${s.title} span, ${unread ? 'awaiting review' : 'reviewed'}`} style={{ left: `${left}%`, width: `${Math.max(right - left, 3)}%` }}>
                  <span className={`gantt-fill${unread ? ' st-attention' : ' st-done'}`} style={{ width: '100%' }} />
                </span>
                {unread && (
                  <span className="gantt-mile" title="review gate" style={{ left: `calc(${Math.min(right, 97)}% - 7px)` }} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Board: fizzy status columns ---------------- */

function BoardTab({
  awaiting,
  reviewed,
  agentOf,
  onOpen,
}: {
  awaiting: V3Session[];
  reviewed: V3Session[];
  agentOf: (s: V3Session) => ReturnType<typeof v3AgentByKey>;
  onOpen: (s: V3Session) => void;
}) {
  const col = (title: string, tone: string, items: V3Session[]) => (
    <section className="fizzy-col">
      <p className="fizzy-colhead">
        {title} <span className="count">{items.length}</span>
      </p>
      {items.map((s) => {
        const a = agentOf(s);
        const tint = a ? SUITE_TINT[a.suite] : undefined;
        return (
          <button key={s.id} className="fizzy-card" onClick={() => onOpen(s)} aria-label={`${s.title} — open details`}>
            <span className={`fizzy-tag ${tone}`}>
              <MessageSquare size={11} /> {a?.handle ?? 'session'} <span className="sep">·</span> {a?.suite.replace(' Suite', '') ?? 'workspace'}
            </span>
            <h4>{s.title}</h4>
            <p className="fizzy-meta">
              <span className="avatar" style={{ background: tint ? `linear-gradient(135deg, ${tint.color}, #7c3aed)` : undefined, color: '#fff' }}>
                {a?.name.slice(0, 2).toUpperCase() ?? '??'}
              </span>
              {v3Ago(s.updatedAt ?? s.createdAt)}
            </p>
          </button>
        );
      })}
      {items.length === 0 && (
        <p className="font-mono text-[10px]" style={{ color: 'var(--muted)', padding: '8px 2px' }}>
          empty
        </p>
      )}
    </section>
  );

  return (
    <div className="fizzy-board">
      {col('Awaiting review', 'amber', awaiting)}
      {col('Reviewed', 'green', reviewed)}
    </div>
  );
}

/* ---------------- Review: zebra rows with inline approval ---------------- */

function ReviewTab({
  awaiting,
  agentOf,
  onOpen,
  onApprove,
}: {
  awaiting: V3Session[];
  agentOf: (s: V3Session) => ReturnType<typeof v3AgentByKey>;
  onOpen: (s: V3Session) => void;
  onApprove: (id: string) => void;
}) {
  return (
    <div>
      {awaiting.length === 0 ? (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          All clear — finished runs wait here until you review them.
        </p>
      ) : (
        awaiting.map((s) => {
          const a = agentOf(s);
          return (
            <div key={s.id} className="thread-row v3-hrow" style={{ cursor: 'default' }}>
              <span className="meta" style={{ cursor: 'pointer' }} onClick={() => onOpen(s)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(s)}>
                <p className="font-mono font-bold text-xs">{s.title}</p>
                <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                  {a ? `${a.handle} · ` : ''}
                  finished {v3Ago(s.updatedAt ?? s.createdAt)} — awaiting your review
                </p>
              </span>
              <button className="chip shrink-0" onClick={() => onApprove(s.id)} aria-label={`Approve ${s.title}`}>
                <Check size={10} /> approve
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ---------------- Slide-over: session detail + conversation preview ---------------- */

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
    try {
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
    } catch (e) {
      if (alive) setError(e instanceof Error ? e.message : 'failed to load');
    }
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
