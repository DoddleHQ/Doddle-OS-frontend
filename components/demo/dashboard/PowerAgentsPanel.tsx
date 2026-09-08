'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { AGENTS } from '@/lib/demo/data';
import { DemoIcon } from '@/lib/demo/icons';

export function PowerAgentsPanel({ workspaceId }: { workspaceId: string }) {
  const dataLive = useOS((s) => s.threads.data?.status === 'running');
  const data = AGENTS.data;
  const writer = AGENTS.writer;

  return (
    <div className="shrink-0 plate overflow-hidden">
      <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between shrink-0">
        <h3 className="text-xs font-semibold flex items-center gap-2.5 font-mono tracking-wide">
          <Zap className="w-4 h-4" style={{ color: 'var(--line-green)' }} /> active_power_agents
        </h3>
        <Link href={`/demo/${workspaceId}/power-agents`} className="text-[11px] font-mono text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors">
          open() →
        </Link>
      </div>
      <div className="p-2.5 space-y-1.5">
        {[data, writer].map((agent) => {
          const live = agent.id === 'data' && dataLive;
          const ink = agent.id === 'data' ? 'var(--line-green)' : 'var(--line-amber)';
          return (
            <Link
              key={agent.id}
              href={`/demo/${workspaceId}/power-agents`}
              className="flex items-center gap-3 p-2.5 hover:bg-[var(--net-panel-2)] rounded-[6px] border border-transparent transition-colors"
            >
              <span className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0" style={{ border: `1.5px solid ${ink}` }}>
                <DemoIcon name={agent.icon} className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-bold font-mono truncate">{agent.handle}</span>
                <span className={`block text-[10px] font-mono mt-0.5 truncate ${live ? 'text-[var(--line-green)] animate-pulse' : 'text-[var(--ink-faint)]'}`}>
                  {live ? '> Processing schema...' : '> Awaiting input'}
                </span>
              </span>
              {live && <span className="w-1.5 h-1.5 rounded-full bg-[var(--line-green)] animate-pulse shrink-0" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
