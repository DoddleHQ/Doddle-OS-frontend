'use client';

import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, isV3SessionUnread } from '@/lib/v3/data';
import { fetchV3PowerAgents, SUITE_TINT, v3AgentByKey, type V3Agent } from '@/lib/v3/powerAgents';

/**
 * Assignments — the v13 board grammar on real signal: every workspace
 * session, grouped by agent (columns on wide windows, sections when
 * narrow), each carrying its honest state — awaiting review (unread) or
 * reviewed. Clicking opens that thread in the agent's execution view.
 */
export function AssignmentsWindow() {
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const { viewThread } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const groups = useMemo(() => {
    const roster = agents.data ?? [];
    const by = new Map<string, { agent?: V3Agent; sessions: typeof feed }>();
    feed.forEach((s) => {
      const key = s.agentKey ?? 'unknown';
      const cur = by.get(key) ?? { agent: v3AgentByKey(roster, key), sessions: [] };
      cur.sessions.push(s);
      by.set(key, cur);
    });
    // agents with activity first (most recent wins), idle roster agents after
    const active = [...by.entries()].filter(([, g]) => g.sessions.length > 0);
    const idle = roster.filter((a) => !by.has(a.key));
    return { active, idle };
  }, [feed, agents.data]);

  const awaiting = feed.filter((s) => isV3SessionUnread(s)).length;

  if (feedError) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--amber)', padding: 24 }}>
        session feed unavailable ({feedError}) — assignments appear when the feed returns.
      </p>
    );
  }

  return (
    <div>
      <p className="font-mono text-xs" style={{ color: 'var(--muted)', marginBottom: 12 }}>
        {feed.length} session{feed.length === 1 ? '' : 's'} · {awaiting} awaiting review ·{' '}
        {groups.active.length + groups.idle.length} agents
      </p>
      <div className="v3-board">
        {groups.active.map(([key, g]) => {
          const tint = g.agent ? SUITE_TINT[g.agent.suite] : undefined;
          const Icon = g.agent?.icon ?? MessageSquare;
          return (
            <section key={key} className="widget v3-board-col">
              <p className="font-mono font-bold text-xs flex items-center gap-2" style={{ marginBottom: 8 }}>
                <span
                  className="rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: tint?.bg ?? 'var(--glass-tint)', width: 24, height: 24, color: tint?.color }}
                >
                  <Icon size={13} />
                </span>
                <span className="truncate">{g.agent?.handle ?? key}</span>
              </p>
              {g.sessions.map((s) => {
                const unread = isV3SessionUnread(s);
                return (
                  <button
                    key={s.id}
                    className="thread-row v3-session"
                    onClick={() => s.agentKey && viewThread(s.agentKey, s.id)}
                    data-tip={`${s.title} · open in execution view`}
                  >
                    <span className="meta">
                      <p className="font-mono font-bold text-xs truncate">{s.title}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {v3Ago(s.updatedAt ?? s.createdAt)}
                      </p>
                    </span>
                    {unread ? (
                      <span className="v3-unread-chip shrink-0">review</span>
                    ) : (
                      <span className="chip shrink-0 font-mono text-[9px]">reviewed</span>
                    )}
                  </button>
                );
              })}
            </section>
          );
        })}
        {groups.idle.length > 0 && (
          <section className="widget v3-board-col">
            <p className="font-mono font-bold text-xs" style={{ marginBottom: 8 }}>
              idle · waiting for a task
            </p>
            {groups.idle.map((a) => (
              <button
                key={a.key}
                className="thread-row v3-session"
                onClick={() => viewThread(a.key, '')}
                data-tip={`${a.handle} — open execution`}
              >
                <span className="meta">
                  <p className="font-mono font-bold text-xs truncate">{a.handle}</p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {a.role}
                  </p>
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
      {feed.length === 0 && !feedError && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          No sessions yet — deploy a power agent to start the first one.
        </p>
      )}
    </div>
  );
}
