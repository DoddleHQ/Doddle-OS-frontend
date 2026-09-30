'use client';

import { Layers, History } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';

/** Right-edge peek rail: what's doing, what's done (reference #activity-rail). */
export function ActivityRail() {
  const railPinned = useV3OS((s) => s.railPinned);
  const { openApp } = useV3OS.getState();
  const thread = v3Data.getActiveThread();

  return (
    <aside className={`activity-rail glass no-select${railPinned ? ' pinned' : ''}`} aria-label="Activity">
      <div className="rail-label">DOING</div>
      <div className="flex flex-col items-center gap-2">
        {thread ? (
          <button
            className="rail-btn st-running kind-campaign"
            style={{ ['--p' as string]: thread.progress }}
            title={`${thread.title} · ${thread.progress}%`}
            onClick={() => openApp('assignments')}
          >
            <span className="bar" />
            <Layers size={18} />
            <span className="dot" />
          </button>
        ) : (
          <span className="rail-label" style={{ writingMode: 'vertical-rl' }}>
            idle
          </span>
        )}
      </div>
      <div className="rail-sep" />
      <button className="rail-btn" title="History — all work, searchable" onClick={() => openApp('history')}>
        <History size={18} />
      </button>
    </aside>
  );
}
