'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Undo2, BarChart3 } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, markThreadSeen, v3SessionStatus } from '@/lib/v3/data';
import { fetchV3PowerAgents, v3AgentByKey } from '@/lib/v3/powerAgents';
import { ChatFeed } from '@/components/v3/windows/AgentsChatFeed';
import type { UIMessage } from 'ai';

/**
 * Triage — the v13 win-triage 3-pane, exact DOM: the queue fills pane one
 * (cols-1 until you hit View), the conversation loads the real thread
 * history, and the decision pane carries the reference gdock (Approve /
 * Request changes / Report). The queue is every session awaiting review;
 * Approve acknowledges it out of the queue.
 */
export function TriageWindow() {
  const router = useRouter();
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const { viewThread } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [history, setHistory] = useState<UIMessage[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [seenTick, setSeenTick] = useState(0);

  const queue = useMemo(() => {
    void seenTick;
    return feed.filter((s) => v3SessionStatus(s) === 'attention');
  }, [feed, seenTick]);

  const current = queue.find((s) => s.id === selected) ?? queue[0] ?? null;
  const agent = v3AgentByKey(agents.data ?? [], current?.agentKey ?? null);

  useEffect(() => {
    setFeedbackOpen(false);
    setFeedback('');
    if (!current) {
      setHistory(null);
      setHistoryError(null);
      return;
    }
    let alive = true;
    setHistory(null);
    setHistoryError(null);
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
    return () => {
      alive = false;
    };
  }, [current?.id]);

  function approve() {
    if (!current) return;
    markThreadSeen(current.id); // approve: the run is reviewed — it leaves the queue
    setSelected(null);
    setExpanded(false);
    setSeenTick((t) => t + 1);
  }

  function sendChanges() {
    if (!current) return;
    if (!feedback.trim()) return;
    if (current.agentKey) {
      viewThread(current.agentKey, current.id);
      router.push('/v3/agents');
    }
  }

  const countText = queue.length ? `${queue.length} waiting` : 'inbox zero';

  return (
    <section id="win-triage" className={`os-window glass${expanded ? '' : ' cols-1'}`} data-app="triage">
      <div className="titlebar">
        <div className="traffic">
          <button className="t-close" onClick={() => router.push('/v3')} aria-label="Close" />
        </div>
        <strong className="text-sm">Triage</strong>
        <span className="chip" style={{ marginLeft: 'auto' }} id="triage-count">
          {countText}
        </span>
      </div>
      <div className="win-body" style={{ margin: 0, textAlign: 'left' }}>
        <div className="triage-3col">
          <div className="pane">
            <p className="pane-label">
              QUEUE · REVIEW — NOTHING SHIPS WITHOUT YOU · <span>{countText}</span>
            </p>
            <div className="table-glass">
              <div id="triage-list" className="space-y-2" style={{ textAlign: 'left' }}>
                {feedError ? (
                  <p className="font-mono text-xs" style={{ color: 'var(--amber)', padding: 8 }}>
                    session feed unavailable ({feedError})
                  </p>
                ) : queue.length === 0 ? (
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    Inbox zero. New agent results land here.
                  </p>
                ) : (
                  queue.map((s) => {
                    const a = v3AgentByKey(agents.data ?? [], s.agentKey ?? null);
                    const on = current?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`hrow${on ? ' viewing' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelected(s.id)}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                        <div className="meta">
                          <p className="font-mono font-bold text-xs">{s.title}</p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                            {`awaiting review · ${v3Ago(s.updatedAt ?? s.createdAt)}${a ? ` · ${a.handle}` : ''}`}
                          </p>
                        </div>
                        <button
                          className="btn-deploy"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(s.id);
                            setExpanded(true);
                          }}
                        >
                          View
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button className="chip" onClick={() => router.push('/v3/assignments')}>
                see on Gantt →
              </button>
              <button className="chip" style={{ textDecoration: 'none' }} onClick={() => router.push('/v3/reports')}>
                artefact gallery →
              </button>
            </div>
          </div>

          <div className="pane" id="triage-conv-pane">
            <p className="pane-label">
              CONVERSATION · <span id="ts-title">{current ? current.title : 'nothing selected'}</span>
            </p>
            <div id="triage-conv" className="chat-list" style={{ marginTop: 10 }}>
              {!current ? (
                <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  Select an item from the queue — its thread opens here, nested output beneath it.
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

          <div className="pane" id="triage-side-pane">
            <p className="pane-label">DETAILS · REVIEW DECISION</p>
            <div id="triage-side" style={{ marginTop: 10 }}>
              {!current ? (
                <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                  Nothing selected.
                </p>
              ) : (
                <>
                  <h3 className="font-bold text-base">{current.title}</h3>
                  <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                    {`AWAITING REVIEW · ${v3Ago(current.updatedAt ?? current.createdAt)} · ${agent ? agent.handle : 'Doddle'}`}
                  </p>
                  <div className="pbar" style={{ marginTop: 10 }}>
                    <div style={{ width: '60%' }} />
                  </div>
                  {feedbackOpen && (
                    <div id="ts-feedback" style={{ marginTop: 12 }}>
                      <div className="eng">
                        <div className="eng-row">
                          <span className="eng-prompt">›</span>
                          <input
                            className="eng-input"
                            placeholder="What should change?"
                            aria-label="What should change?"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChanges()}
                          />
                          <button className="btn-deploy" onClick={sendChanges}>
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <div className="gdock" role="toolbar">
                      <button className="gseg" onClick={approve}>
                        <span className="gchip">
                          <Check size={14} />
                        </span>
                        <span className="glabel">Approve</span>
                      </button>
                      <button className="gseg" onClick={() => setFeedbackOpen(true)}>
                        <span className="gchip">
                          <Undo2 size={14} />
                        </span>
                        <span className="glabel">Request changes</span>
                      </button>
                      <button className="gseg" onClick={() => router.push('/v3/reports')}>
                        <span className="gchip">
                          <BarChart3 size={14} />
                        </span>
                        <span className="glabel">Report</span>
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
                    Nothing ships until you approve.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
