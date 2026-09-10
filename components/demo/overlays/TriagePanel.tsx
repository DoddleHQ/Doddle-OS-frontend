'use client';

import { useState } from 'react';
import { Inbox, X } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import type { TriageItem } from '@/lib/demo/types';

function TriageCard({ item }: { item: TriageItem }) {
  const resolveTriage = useOS((s) => s.resolveTriage);
  const setOverlay = useOS((s) => s.setOverlay);
  const [showPreview, setShowPreview] = useState(false);

  const isApproval = item.kind === 'approval';
  const tone = isApproval
    ? { border: 'var(--line-amber)', bg: 'color-mix(in srgb, var(--line-amber) 6%, transparent)' }
    : { border: 'var(--line-scarlet)', bg: 'color-mix(in srgb, var(--line-scarlet) 6%, transparent)' };

  const resolveAndClose = (outcome: 'approved' | 'restarted') => {
    resolveTriage(item.id, outcome);
    setOverlay('triageOpen', false);
  };

  return (
    <div className="agency-card p-5 !cursor-default slide-in" style={{ borderColor: tone.border, background: tone.bg }}>
      <span
        className="inline-block mb-3 text-[10px] font-bold font-mono px-2 py-0.5 rounded-[3px] border"
        style={{
          color: isApproval ? 'var(--line-amber)' : 'var(--line-scarlet)',
          borderColor: isApproval ? 'color-mix(in srgb, var(--line-amber) 45%, transparent)' : 'color-mix(in srgb, var(--line-scarlet) 45%, transparent)',
          background: isApproval ? 'color-mix(in srgb, var(--line-amber) 12%, transparent)' : 'color-mix(in srgb, var(--line-scarlet) 12%, transparent)',
        }}
      >
        {item.tag}
      </span>
      <h3 className="text-sm font-bold mb-1 font-mono">{item.title}</h3>
      <p className="text-xs text-[var(--ink-dim)] mb-4 leading-relaxed">{item.desc}</p>

      {item.preview && showPreview && (
        <pre className="terminal-container text-[10px] mb-4"><code>{item.preview}</code></pre>
      )}

      <div className="flex gap-2">
        {isApproval ? (
          <>
            {item.preview && (
              <button
                type="button"
                className="flex-1 agency-panel border agency-border py-1.5 rounded-[3px] text-xs font-mono hover:bg-[var(--net-panel-2)] transition-colors"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? 'Collapse' : 'Review'}
              </button>
            )}
            <button
              type="button"
              className="flex-1 py-1.5 rounded-[3px] text-xs font-bold font-mono text-white transition-transform hover:brightness-110"
              style={{ background: 'var(--line-amber)' }}
              onClick={() => resolveAndClose('approved')}
            >
              approve()
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="flex-1 agency-panel border agency-border py-1.5 rounded-[3px] text-xs font-mono hover:bg-[var(--net-panel-2)] transition-colors"
              onClick={() => useOS.getState().pushToast('Thread state snapshot opened in inspector (demo)')}
            >
              inspect()
            </button>
            <button
              type="button"
              className="flex-1 py-1.5 rounded-[3px] text-xs font-bold font-mono text-white transition-transform hover:brightness-110"
              style={{ background: 'var(--line-green)' }}
              onClick={() => resolveAndClose('restarted')}
            >
              restart_thread()
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function TriagePanel() {
  const open = useOS((s) => s.triageOpen);
  const triage = useOS((s) => s.triage);
  const setOverlay = useOS((s) => s.setOverlay);

  return (
    <div className={`side-panel ${open ? 'open' : ''} absolute top-0 right-0 bottom-0 w-[420px] agency-panel z-[70] flex flex-col`}>
      <div className="p-6 border-b agency-border flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 font-mono">
          <Inbox className="w-4 h-4" style={{ color: 'var(--line-scarlet)' }} /> triage_queue
        </h2>
        <button type="button" onClick={() => setOverlay('triageOpen', false)} className="text-[var(--ink-dim)] hover:text-[var(--ink)]" aria-label="Close triage">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {triage.length === 0 ? (
          <div className="text-center text-[var(--ink-faint)] mt-10">
            <Inbox className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-xs font-mono px-4 leading-relaxed">queue_empty.<br />Approvals and circuit-breaker events land here.</p>
          </div>
        ) : (
          triage.map((item) => <TriageCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
