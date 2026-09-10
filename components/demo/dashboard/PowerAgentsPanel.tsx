'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { AGENT_LIST } from '@/components/v2/content-factory/agents';
import { connectionService } from '@/lib/services/connectionService';
import { useEffect, useState } from 'react';
import type { DataSourceConnection } from '@/lib/types/connection.types';

const agentInks: Record<string, string> = {
  'content-architect': 'var(--line-cobalt)',
  'magento-content': 'var(--line-green)',
  'interactive-website-architect': 'var(--line-amber)',
};

/** Agent roster + data source status */
export function PowerAgentsPanel({ workspaceId }: { workspaceId: string }) {
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);

  useEffect(() => {
    connectionService.listConnections(workspaceId)
      .then(setConnections)
      .catch(() => setConnections([]));
  }, [workspaceId]);

  const magentoConnected = connections.some((c) => c.sourceType === 'magento' && c.isActive);
  const gscConnected = connections.some((c) => c.sourceType === 'gsc' && c.isActive);

  return (
    <div className="flex flex-col gap-4">
      <div className="plate overflow-hidden">
        <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between shrink-0">
          <h3 className="text-xs font-semibold flex items-center gap-2.5 font-mono tracking-wide">
            <Zap className="w-4 h-4" style={{ color: 'var(--line-green)' }} /> Agents
          </h3>
          <Link
            href={`/workspaces/${workspaceId}/power-agents`}
            className="text-[11px] font-mono text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors"
          >
            Open
          </Link>
        </div>
        <div className="p-2.5 space-y-1.5">
          {AGENT_LIST.map((agent) => {
            const ink = agentInks[agent.slug] ?? 'var(--line-cobalt)';
            const gated = agent.connectionSource === 'magento' && !magentoConnected;
            return (
              <Link
                key={agent.slug}
                href={`/workspaces/${workspaceId}/modules/content-factory/v2/${agent.slug}`}
                className="flex items-center gap-3 p-2.5 hover:bg-[var(--net-panel-2)] rounded-[6px] transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 text-[11px] font-bold font-mono"
                  style={{ border: `1.5px solid ${ink}`, color: ink }}
                >
                  {agent.initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold font-mono truncate">
                    {agent.name} · {agent.role}
                  </span>
                  <span className="block text-[10px] text-[var(--ink-faint)] truncate">
                    {gated ? 'Requires Magento connection' : agent.workingStatus}
                  </span>
                </span>
                {gated && <span className="w-2 h-2 rounded-full bg-[var(--line-amber)] shrink-0" title="Connection required" />}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="plate overflow-hidden">
        <div className="px-5 py-3.5 border-b agency-border shrink-0">
          <h3 className="text-xs font-semibold font-mono tracking-wide">Data Sources</h3>
        </div>
        <div className="p-2.5 space-y-1">
          {[
            { name: 'Magento', connected: magentoConnected, desc: magentoConnected ? 'Connected' : 'Not connected' },
            { name: 'Search Console', connected: gscConnected, desc: gscConnected ? 'Connected' : 'Not connected' },
          ].map((src) => (
            <Link
              key={src.name}
              href={`/workspaces/${workspaceId}/settings`}
              className="flex items-center gap-3 p-2.5 hover:bg-[var(--net-panel-2)] rounded-[6px] transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${src.connected ? 'bg-[var(--line-green)]' : 'border border-[var(--hairline-strong)]'}`}
              />
              <span className="text-xs font-mono">{src.name}</span>
              <span
                className="text-[10px] font-mono ml-auto"
                style={{ color: src.connected ? 'var(--line-green)' : 'var(--ink-faint)' }}
              >
                {src.desc}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
