'use client';

import { useV3OS } from '@/lib/v3/osStore';
import { V3_APP_META } from '@/lib/v3/apps';
import { fetchV3PowerAgents, fetchV3Sessions, v3AgentByKey } from '@/lib/v3/powerAgents';
import { useV3Fetch, v3Ago, isV3SessionUnread } from '@/lib/v3/data';

/** Right-edge peek rail: recent power-agent sessions + stashed windows (reference #activity-rail). */
export function ActivityRail() {
  const railPinned = useV3OS((s) => s.railPinned);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const windows = useV3OS((s) => s.windows);
  const minimized = windows.filter((w) => w.minimized);
  const { openApp, selectAgent } = useV3OS.getState();

  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const sessions = useV3Fetch(() => (workspaceId ? fetchV3Sessions(workspaceId) : Promise.resolve([])), [workspaceId]);
  const recent = (sessions.data ?? []).slice(0, 5);
  const HistoryIcon = V3_APP_META.history.icon;

  const railBtn = (s: (typeof recent)[number]) => {
    const agent = v3AgentByKey(agents.data ?? [], s.agentKey);
    const Icon = agent?.icon ?? V3_APP_META.agents.icon;
    return (
      <button
        key={s.id}
        className="rail-btn st-running kind-agent"
        data-tip={`${s.title} · ${agent ? agent.handle : 'session'} · ${v3Ago(s.updatedAt ?? s.createdAt)} · click to open`}
        aria-label={`${s.title}, session. Opens the agent.`}
        onClick={() => {
          openApp('agents');
          if (s.agentKey) selectAgent(s.agentKey);
        }}
      >
        <Icon size={18} />
        <span className="dot" />
      </button>
    );
  };
  const doing = recent.filter(isV3SessionUnread);
  const done = recent.filter((s) => !isV3SessionUnread(s));

  return (
    <aside className={`activity-rail glass no-select${railPinned ? ' pinned' : ''}`} aria-label="Activity">
      <div className="rail-label">DOING</div>
      <div className="flex flex-col items-center gap-2">
        {sessions.loading ? (
          <span className="rail-label" style={{ writingMode: 'vertical-rl' }}>
            …
          </span>
        ) : doing.length === 0 ? (
          <span className="rail-label" style={{ writingMode: 'vertical-rl' }}>
            idle
          </span>
        ) : (
          doing.map(railBtn)
        )}
      </div>
      {done.length > 0 && (
        <>
          <div className="rail-sep" />
          <div className="rail-label">DONE</div>
          <div className="flex flex-col items-center gap-2">{done.map(railBtn)}</div>
        </>
      )}
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
