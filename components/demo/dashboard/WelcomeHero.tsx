'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { connectionService } from '@/lib/services/connectionService';
import type { DataSourceConnection } from '@/lib/types/connection.types';
import { BrandMark, greeting } from '../primitives';

export function WelcomeHero({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const displayName = user?.name || 'Operator';
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);

  useEffect(() => {
    connectionService.listConnections(workspaceId)
      .then(setConnections)
      .catch(() => setConnections([]));
  }, [workspaceId]);

  const magentoConnected = connections.some((c) => c.sourceType === 'magento' && c.isActive);
  const gscConnected = connections.some((c) => c.sourceType === 'gsc' && c.isActive);

  return (
    <div className="w-full flex flex-col items-center justify-center mb-6 mt-2 text-center rise">
      <BrandMark className="w-12 h-12 mb-4" />
      <h2 className="text-3xl font-bold tracking-tight mb-2 text-[var(--ink)]">
        {greeting()}, {displayName.split(' ')[0]}.
      </h2>
      <p className="text-[var(--ink-dim)] text-[13px] mb-5">What are we working on today?</p>

      <div className="flex items-center gap-4 text-[11px] font-mono">
        <span className="flex items-center gap-1.5">
          <span className={\`w-2 h-2 rounded-full ${magentoConnected ? 'bg-[var(--line-green)]' : 'border border-[var(--hairline-strong)]'\`} />
          <span style={{ color: magentoConnected ? 'var(--line-green)' : 'var(--ink-faint)' }}>
            Magento {magentoConnected ? 'connected' : 'offline'}
          </span>
        </span>
        <span className="w-px h-3 bg-[var(--hairline)]" />
        <span className="flex items-center gap-1.5">
          <span className={\`w-2 h-2 rounded-full ${gscConnected ? 'bg-[var(--line-green)]' : 'border border-[var(--hairline-strong)]'\`} />
          <span style={{ color: gscConnected ? 'var(--line-green)' : 'var(--ink-faint)' }}>
            Search Console {gscConnected ? 'connected' : 'offline'}
          </span>
        </span>
      </div>
    </div>
  );
}
