'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { WelcomeHero } from '@/components/demo/dashboard/WelcomeHero';
import { RunningProcesses } from '@/components/demo/dashboard/RunningProcesses';
import { workspaceService } from '@/lib/services/workspaceService';

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [hasPersona, setHasPersona] = useState<boolean | null>(null);

  useEffect(() => {
    workspaceService.getPersona(workspaceId).then((p) => {
      setHasPersona(!!(p && p.content.trim()));
    }).catch(() => setHasPersona(false));
  }, [workspaceId]);

  return (
    <div className="absolute inset-0 z-20 fade-in flex flex-col overflow-y-auto p-8 md:p-10">
      {hasPersona === false && (
        <div
          className="agency-card p-4 mb-4 flex items-center justify-between"
          style={{ borderColor: 'color-mix(in srgb, var(--line-amber) 35%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 4%, transparent)' }}
        >
          <p className="text-xs text-[var(--ink-dim)]">
            <span className="font-bold" style={{ color: 'var(--line-amber)' }}>Brand Persona:</span>{' '}
            not configured — agents need your brand voice before writing.
          </p>
          <Link
            href={\`/workspaces/${workspaceId}/settings\`}
            className="btn-outline !py-1.5 !px-3 !text-[10px] shrink-0 ml-4"
          >
            Configure
          </Link>
        </div>
      )}
      {hasPersona === true && (
        <div className="flex items-center gap-2 mb-3 fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--line-green)' }} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--line-green)' }}>Brand Persona configured</span>
        </div>
      )}

      <WelcomeHero workspaceId={workspaceId} />
      <div className="max-w-[900px] w-full mx-auto pb-6">
        <RunningProcesses workspaceId={workspaceId} />
      </div>
    </div>
  );
}
