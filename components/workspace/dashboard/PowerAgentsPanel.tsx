'use client';

import Link from 'next/link';
import { connectionService } from '@/lib/services/connectionService';
import { useEffect, useState } from 'react';
import type { DataSourceConnection } from '@/lib/types/connection.types';
import { DemoIcon } from '@/lib/demo/icons';
import { WORKSPACE_MODULES } from '@/components/v2/dashboard/modules';

const moduleIconMap: Record<string, string> = {
  'Mission Control': 'layout-dashboard',
  'SEO Cluster': 'search',
  'Content Factory': 'file-text',
  'Social Growth': 'share-2',
  'SaaS Launch Ops': 'rocket',
  'Business Audit': 'bar-chart-3',
  'Analytics Action': 'pie-chart',
  'Ads Execution': 'megaphone',
  'Email Nurture': 'mail',
  'Brand Guardrails': 'shield-alert',
};

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
        <div className="px-5 py-3.5 border-b agency-border shrink-0">
          <h3 className="text-xs font-semibold font-mono tracking-wide">Modules</h3>
        </div>
        <div className="p-2 space-y-0.5">
          {WORKSPACE_MODULES.map((mod) => (
            <Link
              key={mod.path}
              href={`/legacy/workspaces/${workspaceId}/${mod.path}`}
              className="flex items-center gap-3 p-2.5 hover:bg-[var(--net-panel-2)] rounded-[6px] transition-colors"
            >
              <DemoIcon
                name={moduleIconMap[mod.name] ?? 'file-text'}
                className="w-4 h-4 shrink-0"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold truncate">{mod.name}</span>
                <span className="block text-[10px] text-[var(--ink-faint)] truncate">{mod.desc}</span>
              </span>
            </Link>
          ))}
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
              href={`/legacy/workspaces/${workspaceId}/settings`}
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
