'use client';

import Link from 'next/link';
import { Terminal } from 'lucide-react';
import { aggregateStatus, useOS } from '@/lib/demo/osStore';
import { AGENTS, EXTRA_PROCESSES, NIGHTLY_AUDIT_ROW } from '@/lib/demo/data';
import { DemoIcon } from '@/lib/demo/icons';
import { ProgressBar, SwarmBadge } from '../primitives';

const agentInks: Record<string, string> = {
  infra: 'var(--line-cobalt)',
  sec: 'var(--line-amber)',
  data: 'var(--line-green)',
  writer: 'var(--line-scarlet)',
};

function AgentChip({ agentId }: { agentId: string }) {
  const agent = AGENTS[agentId];
  if (!agent) return null;
  return (
    <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: `1.5px solid ${agentInks[agentId] ?? 'var(--hairline-strong)'}` }} title={agent.handle}>
      <DemoIcon name={agent.icon} className="w-3 h-3" />
    </span>
  );
}

export function RunningProcesses({ workspaceId }: { workspaceId: string }) {
  const threads = useOS((s) => s.threads);
  const list = Object.values(threads);
  const status = aggregateStatus(list);
  const started = list.some((t) => t.startedAt !== null);
  const pct = list.length ? Math.round(list.reduce((a, t) => a + t.progress, 0) / list.length) : 0;

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0 plate lg:overflow-hidden">
      <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between shrink-0">
        <h3 className="text-xs font-semibold flex items-center gap-2.5 font-mono tracking-wide">
          <Terminal className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> running_processes
        </h3>
        <Link href={`/demo/${workspaceId}/graphs`} className="btn-outline !py-1 !px-2.5 !text-[10px]">
          doddle new swarm
        </Link>
      </div>
      <div className="lg:flex-1 lg:overflow-y-auto">
        {/* live GSC pipeline (engine-driven) */}
        <Link href={`/demo/${workspaceId}/launchpad`} className="dense-row">
          <span className="w-[34%] flex flex-col">
            <span className="text-xs font-bold truncate">GSC MCP Pipeline</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-1 truncate">id: gsc-mcp-integration</span>
          </span>
          <span className="w-[22%]"><SwarmBadge status={started ? status : 'idle'} /></span>
          <span className="w-[28%] flex items-center gap-2">
            <ProgressBar pct={started ? pct : 0} status={started ? status : 'idle'} />
            <span className="text-[10px] font-mono text-[var(--ink-dim)] tnum">{started ? `${pct}%` : '0%'}</span>
          </span>
          <span className="w-[16%] flex justify-end gap-1">
            <AgentChip agentId="sec" />
            <AgentChip agentId="data" />
          </span>
        </Link>

        {/* nightly audit (static running) */}
        <div className="dense-row">
          <span className="w-[34%] flex flex-col">
            <span className="text-xs font-bold truncate">{NIGHTLY_AUDIT_ROW.title}</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-1 truncate">id: {NIGHTLY_AUDIT_ROW.id}</span>
          </span>
          <span className="w-[22%]"><SwarmBadge status={NIGHTLY_AUDIT_ROW.status} /></span>
          <span className="w-[28%] flex items-center gap-2">
            <ProgressBar pct={NIGHTLY_AUDIT_ROW.progress} status={NIGHTLY_AUDIT_ROW.status} />
            <span className="text-[10px] font-mono text-[var(--ink-dim)] tnum">{NIGHTLY_AUDIT_ROW.progress}%</span>
          </span>
          <span className="w-[16%] flex justify-end gap-1">
            <AgentChip agentId={NIGHTLY_AUDIT_ROW.agentId} />
          </span>
        </div>

        {/* extra rows from the reference */}
        {EXTRA_PROCESSES.map((row) => {
          const dim = row.status === 'idle' || row.status === 'completed';
          return (
            <div key={row.id} className={`dense-row ${dim ? 'opacity-60' : ''}`}>
              <span className="w-[34%] flex flex-col">
                <span className={`text-xs font-bold truncate ${row.status === 'completed' ? 'line-through' : ''}`}>{row.title}</span>
                <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-1 truncate">id: {row.id}</span>
              </span>
              <span className="w-[22%]"><SwarmBadge status={row.status} /></span>
              <span className="w-[28%] flex items-center gap-2">
                <ProgressBar pct={row.progress} status={row.status} />
                <span className="text-[10px] font-mono text-[var(--ink-dim)] tnum">{row.progress}%</span>
              </span>
              <span className="w-[16%] flex justify-end gap-1">
                {row.agentId && <AgentChip agentId={row.agentId} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
