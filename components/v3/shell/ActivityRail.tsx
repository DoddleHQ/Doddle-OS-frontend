'use client';

import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, v3AgentByKey } from '@/lib/v3/powerAgents';
import { useRouter } from 'next/navigation';
import { useV3Fetch, v3Ago, v3SessionStatus } from '@/lib/v3/data';
import { Pin, History } from 'lucide-react';
import { V3_APP_META } from '@/lib/v3/apps';

function demoProgress(id: string): number {
  const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((h * 31) % 19) * 5;
}

export function ActivityRail() {
  const router = useRouter();
  const railPinned = useV3OS((s) => s.railPinned);
  const pinRail = useV3OS((s) => s.pinRail);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const { selectAgent } = useV3OS.getState();

  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const sessions = useV3Fetch(() => (workspaceId ? fetchV3Sessions(workspaceId) : Promise.resolve([])), [workspaceId]);
  const recent = (sessions.data ?? []).slice(0, 5);

  const railBtn = (s: (typeof recent)[number], status: 'running' | 'attention' | 'done') => {
    const agent = v3AgentByKey(agents.data ?? [], s.agentKey);
    const Icon = agent?.icon;
    const pct = status === 'done' ? 100 : demoProgress(s.id);
    return (
      <button
        key={s.id}
        className={`rail-btn ${status === 'attention' ? 'kind-review st-attention' : status === 'running' ? 'kind-agent st-running' : 'kind-agent st-done'}`}
        style={{ ['--p' as string]: pct }}
        title={`${s.title} — ${status === 'done' ? 'done' : status === 'running' ? `running ${pct}%` : 'attention'} · ${v3Ago(s.updatedAt ?? s.createdAt)}`}
        aria-label={`${s.title}. Opens the agent execution view.`}
        onClick={() => {
          router.push('/v3/agents');
          if (s.agentKey) selectAgent(s.agentKey);
        }}
      >
        <span className="bar" />
        {Icon ? <Icon size={18} /> : null}
        <span className="dot" />
      </button>
    );
  };
  const byStatus = (s: (typeof recent)[number]) => v3SessionStatus(s);
  const doing = recent.filter((s) => byStatus(s) !== 'done');
  const done = recent.filter((s) => byStatus(s) === 'done').slice(0, 4);

  return (
    <>
      <div id="rail-hover-zone" aria-hidden="true" />
      <aside id="activity-rail" className={`glass no-select${railPinned ? ' pinned' : ''}`} aria-label="Activity">
        <div className="rail-label">DOING</div>
        <div id="rail-doing" className="flex flex-col items-center gap-2">
          {sessions.loading ? (
            <div className="rail-label">…</div>
          ) : doing.length === 0 ? (
            <div className="rail-label">—</div>
          ) : (
            doing.map((s) => railBtn(s, byStatus(s) as 'running' | 'attention'))
          )}
        </div>
        <div className="rail-sep" />
        <div id="rail-done" className="flex flex-col items-center gap-2">
          {done.map((s) => railBtn(s, 'done'))}
        </div>
        <div className="rail-sep" />
        <button
          className="rail-btn"
          onClick={() => router.push('/v3/reports')}
          title="History — all work, searchable"
          aria-label="History. All work, searchable."
        >
          <History size={18} />
        </button>
        <button
          className={`rail-btn${railPinned ? ' on' : ''}`}
          id="rail-pin-btn"
          onClick={() => pinRail(!railPinned)}
          title="Pin rail open"
          aria-label="Pin rail open"
          aria-pressed={railPinned}
        >
          <Pin size={18} />
        </button>
      </aside>
    </>
  );
}
