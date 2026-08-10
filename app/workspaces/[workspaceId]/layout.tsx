'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { InstrumentShell } from '@/components/v2/dashboard/InstrumentShell';
import { useCurrentWorkspace } from '@/lib/hooks/useCurrentWorkspace';

/*
 * Workspace layout — 3-zone instrument panel shell.
 *
 * Zone 1 (ink rail): workspace switcher + module icons
 * Zone 2 (paper): top bar + scrollable page content
 * Zone 3 (ink feed): collapsible live activity
 *
 * Familiar pro layout executed at Specimen Terminal craft. Uses
 * useCurrentWorkspace so the workspace detail is cached and shared with the
 * settings page instead of fetched twice.
 */

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { workspace, isLoading } = useCurrentWorkspace(workspaceId);

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
