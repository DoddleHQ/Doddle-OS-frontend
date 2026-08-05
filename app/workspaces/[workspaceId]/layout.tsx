'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { InstrumentShell } from '@/components/v2/dashboard/InstrumentShell';
import { workspaceService } from '@/lib/services/workspaceService';
import type { Workspace } from '@/lib/types/workspace.types';

/*
 * Workspace layout — 3-zone instrument panel shell.
 *
 * Zone 1 (ink rail): workspace switcher + module icons
 * Zone 2 (paper): top bar + scrollable page content
 * Zone 3 (ink feed): collapsible live activity
 *
 * Familiar pro layout executed at Specimen Terminal craft.
 */

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const ws = await workspaceService.getWorkspace(workspaceId);
        setWorkspace(ws);
      } catch {
        // Use placeholder if API unreachable (design review / no backend)
        setWorkspace({ workspaceId, name: 'Workspace', websiteDomain: null, createdAt: new Date().toISOString(), updatedAt: null });
      } finally {
        setIsLoading(false);
      }
    }
    if (workspaceId) fetchWorkspace();
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
      </div>
    );
  }

  return (
    <InstrumentShell workspaceId={workspaceId} workspace={workspace}>
      {children}
    </InstrumentShell>
  );
}
