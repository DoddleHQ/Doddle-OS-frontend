'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, MessageSquareReply, Copy, Inbox } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, isV3SessionUnread, markThreadSeen } from '@/lib/v3/data';
import { fetchV3PowerAgents, v3AgentByKey } from '@/lib/v3/powerAgents';
import { ChatFeed } from '@/components/v3/windows/AgentsChatFeed';
import type { UIMessage } from 'ai';

/**
 * Triage — the v13 3-pane (queue | conversation | details) on REAL signal:
 * the queue is every workspace session updated since you last viewed it
 * ("done — awaiting your review"). Approve = acknowledge (mark viewed);
 * Request changes = open that thread in the agent's execution view and
 * direct the next run. Nothing here is seeded.
 */
export function TriageWindow() {
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const { viewThread } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<UIMessage[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [seenTick, setSeenTick] = useState(0);
  const [copiedId, setCopiedId] = useState(false);

  // the queue recompute flips when an item is acknowledged
  const queue = useMemo(() => {
    void seenTick;
    return feed.filter((s) => isV3SessionUnread(s));
  }, [feed, seenTick]);

  const current = queue.find((s) => s.id === selected) ?? queue[0] ?? null;
  const agent = v3AgentByKey(agents.data ?? [], current?.agentKey ?? null);

  // load the selected thread's conversation (real history endpoint)
  useEffect(() => {
    setCopiedId(false);
    if (!current) {
      setHistory(null);
      setHistoryError(null);
      return;
    }
    let alive = true;
    setHistory(null);
    setHistoryError(null);
    try {
      fetch(`/api/power-agents/threads/${current.id}`)
        .then(async (res) => {
          if (!alive) return;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const t = (await res.json()) as { messages: UIMessage[] };
          setHistory(t.messages ?? []);
        })
        .catch((e: unknown) => {
          if (alive) setHistoryError(e instanceof Error ? e.message : 'failed to load');
        });
    } catch (e) {
      if (alive) setHistoryError(e instanceof Error ? e.message : 'failed to load');
    }
    return () => {
      alive = false;
    };
  }, [current?.id]);

  function acknowledge(id: string) {
    markThreadSeen(id); // approve: the run is reviewed — it leaves the queue
    setSeenTick((t) => t + 1);
  }

  return (
    <div className="v3-triage">
      {/* queue */}
      <div className="widget v3-triage-queue">
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
          Queue · awaiting your review
        </p>
        {feedError ? (
          <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>
            session feed unavailable ({feedError})
          </p>
        ) : queue.length === 0 ? (
          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
            All clear — finished runs wait here until you review them.
          </p>
        ) : (
          queue.map((s) => {
            const a = v3AgentByKey(agents.data ?? [], s.agentKey ?? null);
            const on = current?.id === s.id;
            return (
              <button
                key={s.id}
                className={`thread-row v3-session${on ? ' viewing' : ''}`}
                onClick={() => setSelected(s.id)}
                aria-current={on}
              >
                <span className="meta">
                  <p className="font-mono font-bold text-xs truncate">{s.title}</p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {a ? `${a.handle} · ` : ''}
                    {v3Ago(s.updatedAt ?? s.createdAt)}
                  </p>
                </span>
                {!on && <span className="v3-unread-chip shrink-0">new</span>}
              </button>
            );
          })
        )}
      </div>

      {/* conversation */}
      <div className="widget v3-chat-wrap v3-triage-conv">
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
          Conversation {current ? `· ${current.title}` : ''}
        </p>
        <div className="v3-chat" role="log" aria-live="polite">
          {!current ? (
            <p className="font-mono text-xs" style={{ color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Inbox size={12} /> Select an item to read the run.
            </p>
          ) : historyError ? (
            <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>history unavailable ({historyError})</p>
          ) : history === null ? (
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              loading run…
            </p>
          ) : history.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              This run has no stored messages.
            </p>
          ) : (
            <ChatFeed messages={history} agent={agent} />
          )}
        </div>
      </div>

      {/* details + actions */}
      <div className="widget v3-triage-detail">
        <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 8 }}>
          Details
        </p>
        {!current ? (
          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
            Nothing waiting.
          </p>
        ) : (
          <>
            <p className="font-mono font-bold text-xs truncate" title={current.title}>
              {current.title}
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
              {agent ? `${agent.handle} · ${agent.suite}` : 'agent unknown'}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span style={{ color: 'var(--muted)' }}>updated</span>
                <span className="font-bold">{v3Ago(current.updatedAt ?? current.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span style={{ color: 'var(--muted)' }}>created</span>
                <span className="font-bold">{v3Ago(current.createdAt)}</span>
              </div>
            </div>
            {current.id && (
              <button
                className="chip mt-2"
                style={{ maxWidth: '100%' }}
                data-tip="copy thread id"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(current.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 1500);
                  } catch {
                    /* clipboard unavailable */
                  }
                }}
              >
                {copiedId ? <Check size={10} /> : <Copy size={10} />} {current.id.slice(0, 14)}…
              </button>
            )}
            <div className="flex flex-col gap-2" style={{ marginTop: 12 }}>
              <button
                className="btn-deploy"
                disabled={!current.agentKey}
                onClick={() => current && acknowledge(current.id)}
              >
                <Check size={12} /> Approve — mark reviewed
              </button>
              <button
                className="btn-ghost"
                disabled={!current.agentKey}
                onClick={() => current.agentKey && viewThread(current.agentKey, current.id)}
              >
                <MessageSquareReply size={12} /> Request changes — direct the agent
              </button>
            </div>
            <p className="font-mono text-[10px] mt-3" style={{ color: 'var(--muted)' }}>
              Nothing ships without you.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
