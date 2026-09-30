'use client';

import { useV3OS } from '@/lib/v3/osStore';
import { V3_APP_META } from '@/lib/v3/apps';
import { v3Data } from '@/lib/v3/adapter';

/** Right-edge peek rail: what's doing, what's stashed (reference #activity-rail). */
export function ActivityRail() {
  const railPinned = useV3OS((s) => s.railPinned);
  const windows = useV3OS((s) => s.windows);
  const minimized = windows.filter((w) => w.minimized);
  const { openApp } = useV3OS.getState();
  const thread = v3Data.getActiveThread();
  const AssignmentsIcon = V3_APP_META.assignments.icon;
  const HistoryIcon = V3_APP_META.history.icon;

  return (
    <aside className={`activity-rail glass no-select${railPinned ? ' pinned' : ''}`} aria-label="Activity">
      <div className="rail-label">DOING</div>
      <div className="flex flex-col items-center gap-2">
        {thread ? (
          <button
            className="rail-btn st-running kind-campaign"
            style={{ ['--p' as string]: thread.progress }}
            data-tip={`${thread.title} · ${thread.progress}% · running — click to open Assignments`}
            aria-label={`${thread.title}, ${thread.progress} percent, running. Opens Assignments.`}
            onClick={() => openApp('assignments')}
          >
            <span className="bar" />
            <AssignmentsIcon size={18} />
            <span className="dot" />
          </button>
        ) : (
          <span className="rail-label" style={{ writingMode: 'vertical-rl' }}>
            idle
          </span>
        )}
      </div>
      {minimized.length > 0 && (
        <>
          <div className="rail-sep" />
          <div className="rail-label">MIN</div>
          <div className="flex flex-col items-center gap-2">
            {minimized.map((w) => {
              const meta = V3_APP_META[w.id];
              const Icon = meta.icon;
              return (
                <button
                  key={w.id}
                  className="rail-btn st-minimized"
                  data-tip={`${meta.name} · minimized — click to restore`}
                  aria-label={`${meta.name}, minimized. Click to restore.`}
                  onClick={() => openApp(w.id)}
                >
                  <Icon size={18} />
                  <span className="dot" />
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="rail-sep" />
      <button
        className="rail-btn"
        data-tip="History — all work, searchable"
        aria-label="History. All work, searchable."
        onClick={() => openApp('history')}
      >
        <HistoryIcon size={18} />
      </button>
    </aside>
  );
}
