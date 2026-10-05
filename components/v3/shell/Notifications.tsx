'use client';

import { Inbox } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, isV3SessionUnread, markThreadSeen, v3Ago } from '@/lib/v3/data';
import { fetchV3PowerAgents } from '@/lib/v3/powerAgents';

/** Triage panel: runs updated since your last view, waiting for the operator. */
export function Notifications() {
  const open = useV3OS((s) => s.notifsOpen);
  const feed = useV3OS((s) => s.sessionFeed);
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  if (!open) return null;

  const queue = feed.filter((s) => isV3SessionUnread(s));

  return (
    <div className="v3-notifs glass" role="dialog" aria-label="Triage queue">
      <div className="flex items-center justify-between mb-3">
        <strong className="text-sm font-mono flex items-center gap-2">
          <Inbox size={16} className="text-red-500" /> triage_queue · {queue.length} needs you
        </strong>
        <span className="flex items-center gap-2">
          <button
            className="chip"
            onClick={() => {
              useV3OS.getState().toggleNotifs(false);
              useV3OS.getState().openApp('reports');
            }}
          >
            open triage
          </button>
          <button className="chip" onClick={() => useV3OS.getState().toggleNotifs(false)}>
            esc
          </button>
        </span>
      </div>
      <div className="flex-1 overflow-auto space-y-3">
        {queue.map((r) => {
          const agent = (agents.data ?? []).find((a) => a.key === r.agentKey);
          return (
            <div
              key={r.id}
              className="rounded-lg p-4"
              style={{ border: '1px solid rgba(245,158,11,.4)', background: 'rgba(245,158,11,.08)' }}
            >
              <span className="chip">APPROVAL_REQ</span>
              <h3 className="font-mono font-bold text-sm mt-2">{r.title}</h3>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {agent ? `${agent.handle} · ` : ''}
                finished · {v3Ago(r.updatedAt ?? r.createdAt)} — awaiting your review
              </p>
              <div className="flex gap-2 mt-3">
                <button className="btn-ghost flex-1" onClick={() => useV3OS.getState().viewThread(r.agentKey ?? '', r.id)}>
                  review()
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    markThreadSeen(r.id); // approve: reviewed — leaves the queue
                    useV3OS.setState((st) => ({ sessionFeed: [...st.sessionFeed] }));
                  }}
                >
                  approve()
                </button>
              </div>
            </div>
          );
        })}
        {queue.length === 0 && (
          <div className="rounded-lg p-4 font-mono text-xs" style={{ border: '1px solid var(--glass-border)' }}>
            <p style={{ color: 'var(--muted)' }}>
              Nothing waiting. New agent results land here + in the notch badge.
            </p>
          </div>
        )}
      </div>
      <p className="font-mono text-[10px] mt-3" style={{ color: 'var(--muted)' }}>
        Nothing ships until you approve.
      </p>
    </div>
  );
}
