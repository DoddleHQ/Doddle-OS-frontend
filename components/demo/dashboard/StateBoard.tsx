'use client';

import { Activity, Cpu, Inbox } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { RunningProcesses } from './RunningProcesses';
import { PowerAgentsPanel } from './PowerAgentsPanel';

/**
 * StateBoard — the machine's side of the board: telemetry header, live
 * processes, power agents. Reports state; commands live in the desk.
 */
export function StateBoard() {
  const runActive = useOS((s) => s.runActive);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const lastRunHadFailure = useOS((s) => s.lastRunHadFailure);
  const triageCount = useOS((s) => s.triage.length);
  const setOverlay = useOS((s) => s.setOverlay);

  const statusLine = runActive
    ? 'status: executing | swarm_live'
    : lastRunHadFailure
      ? 'status: halted | triage_required'
      : runStartedAt
        ? 'status: operational | run_archived'
        : 'status: operational | context_locked';

  return (
    <section className="flex-1 flex flex-col min-w-0 px-8 md:px-10 py-8 overflow-hidden">
      <header className="flex justify-between items-end mb-6 shrink-0 rise d1">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
            <Activity className="w-5 h-5" style={{ color: 'var(--line-cobalt)' }} /> System Telemetry
          </h2>
          <p className="text-[var(--ink-dim)] text-[11px] mt-2 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--line-green)] animate-pulse" /> {statusLine}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="plate px-3.5 py-2 flex items-center gap-3 relative group"
            onClick={() => setOverlay('triageOpen')}
          >
            <span className="w-7 h-7 rounded-[5px] flex items-center justify-center" style={{ border: '1px solid var(--line-scarlet)' }}>
              <Inbox className="w-3.5 h-3.5" style={{ color: 'var(--line-scarlet)' }} />
            </span>
            <span className="text-left">
              <span className="block text-[9px] font-mono text-[var(--ink-faint)]">triage_queue</span>
              <span className="block text-[15px] font-bold leading-none mt-0.5 tnum">
                {triageCount} <span className="text-[9px] font-bold ml-0.5" style={{ color: 'var(--line-scarlet)' }}>REQ</span>
              </span>
            </span>
            {triageCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--line-scarlet)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--line-scarlet)' }} />
              </span>
            )}
          </button>
          <div className="plate px-3.5 py-2 flex items-center gap-3 cursor-default">
            <span className="w-7 h-7 rounded-[5px] flex items-center justify-center" style={{ border: '1px solid var(--line-cobalt)' }}>
              <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--line-cobalt)' }} />
            </span>
            <span className="text-left">
              <span className="block text-[9px] font-mono text-[var(--ink-faint)]">active_swarms</span>
              <span className="block text-[15px] font-bold leading-none mt-0.5 tnum">{runActive ? 1 : 0}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-5 min-h-0 rise d2">
        <RunningProcesses />
        <PowerAgentsPanel />
      </div>
    </section>
  );
}
