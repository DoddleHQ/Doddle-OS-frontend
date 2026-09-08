'use client';

import { Activity } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { useCurrentWorkspace } from '@/lib/hooks/useCurrentWorkspace';

interface TelemetryHeaderProps {
  workspaceId: string;
}

/** System Telemetry header with the triage_queue / active_swarms instrument strip. */
export function TelemetryHeader({ workspaceId }: TelemetryHeaderProps) {
  const { workspace } = useCurrentWorkspace(workspaceId);
  const workspaceName = workspace?.name || 'Workspace';
  const runActive = useOS((s) => s.runActive);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const lastRunHadFailure = useOS((s) => s.lastRunHadFailure);
  const triageCount = useOS((s) => s.triage.length);
  const setOverlay = useOS((s) => s.setOverlay);

  const statusLine = runActive
    ? `${workspaceName} | status: executing`
    : lastRunHadFailure
      ? `${workspaceName} | status: halted`
      : runStartedAt
        ? `${workspaceName} | status: operational`
        : `${workspaceName} | status: operational | context_locked`;

  return (
    <header className="flex justify-between items-end mb-7 shrink-0 border-b agency-border pb-5 rise d1">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Activity className="w-6 h-6" style={{ color: 'var(--line-cobalt)' }} /> System Telemetry
        </h1>
        <p className="text-[var(--ink-dim)] text-xs mt-2.5 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--line-green)] animate-pulse" /> {statusLine}
        </p>
      </div>
      <div className="plate flex items-stretch divide-x divide-[var(--hairline)]">
        <button
          type="button"
          className="flex items-center gap-3 pl-4 pr-5 py-2.5 relative group"
          onClick={() => setOverlay('triageOpen')}
        >
          <span className="line-dot" style={{ ['--dot' as string]: 'var(--line-scarlet)' }} aria-hidden="true" />
          <span className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-mono text-[var(--ink-faint)]">triage_queue</span>
            <span className="text-[16px] font-bold leading-none mt-1.5 tnum transition-colors group-hover:text-[var(--ink)]">
              {triageCount} <span className="text-[9px] font-bold ml-0.5" style={{ color: 'var(--line-scarlet)' }}>REQ</span>
            </span>
          </span>
          {triageCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--line-scarlet)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--line-scarlet)' }} />
            </span>
          )}
        </button>
        <div className="flex items-center gap-3 px-5 py-2.5 cursor-default">
          <span
            className="line-dot"
            style={{
              ['--dot' as string]: 'var(--line-cobalt)',
              animation: runActive ? 'trainPulse 1.6s ease-out infinite' : undefined,
            }}
            aria-hidden="true"
          />
          <span className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-mono text-[var(--ink-faint)]">active_swarms</span>
            <span className="text-[16px] font-bold leading-none mt-1.5 tnum">{runActive ? 1 : 0}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
