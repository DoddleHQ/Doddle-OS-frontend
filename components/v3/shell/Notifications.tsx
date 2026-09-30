'use client';

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';

/** Triage panel: agent results waiting for the operator (reference #notifs). */
export function Notifications() {
  const open = useV3OS((s) => s.notifsOpen);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);

  if (!open) return null;

  const queue = v3Data.getReviewQueue().filter((r) => !approved.has(r.id));

  return (
    <div className="v3-notifs glass" role="dialog" aria-label="Triage queue">
      <div className="flex items-center justify-between mb-3">
        <strong className="text-sm font-mono flex items-center gap-2">
          <Inbox size={16} className="text-red-500" /> triage_queue · {queue.length} needs you
        </strong>
        <button className="chip" onClick={() => useV3OS.getState().toggleNotifs(false)}>
          esc
        </button>
      </div>
      <div className="flex-1 overflow-auto space-y-3">
        {queue.map((r) => (
          <div
            key={r.id}
            className="rounded-lg p-4"
            style={{ border: '1px solid rgba(245,158,11,.4)', background: 'rgba(245,158,11,.08)' }}
          >
            <span className="chip">{r.kind}</span>
            <h3 className="font-mono font-bold text-sm mt-2">{r.title}</h3>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {r.body}
            </p>
            <div className="flex gap-2 mt-3">
              <button className="btn-ghost flex-1" onClick={() => setPreview(preview === r.id ? null : r.id)}>
                review()
              </button>
              <button className="btn-primary flex-1" onClick={() => setApproved((s) => new Set(s).add(r.id))}>
                approve()
              </button>
            </div>
            {preview === r.id && (
              <pre className="terminal mt-2 text-[10px] whitespace-pre-wrap">{r.preview}</pre>
            )}
          </div>
        ))}
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
