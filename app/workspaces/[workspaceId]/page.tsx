'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { WelcomeHero } from '@/components/demo/dashboard/WelcomeHero';
import { TelemetryHeader } from '@/components/demo/dashboard/TelemetryHeader';
import { RunningProcesses } from '@/components/demo/dashboard/RunningProcesses';
import { PowerAgentsPanel } from '@/components/demo/dashboard/PowerAgentsPanel';
import { workspaceService } from '@/lib/services/workspaceService';

export default function DemoDashboardPage() {
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
      {/* persona status call-out */}
      {hasPersona === false && (
        <div
          className="agency-card p-4 mb-6 flex items-center justify-between"
          style={{ borderColor: 'color-mix(in srgb, var(--line-amber) 35%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 4%, transparent)' }}
        >
          <p className="text-xs text-[var(--ink-dim)]">
            <span className="font-bold font-mono" style={{ color: 'var(--line-amber)' }}>brand_persona:</span>{' '}
            not configured — agents need your brand voice before writing. Set it up to improve output quality.
          </p>
          <Link
            href={`/workspaces/${workspaceId}/settings`}
            className="btn-outline !py-1.5 !px-3 !text-[10px] shrink-0 ml-4"
          >
            configure()
          </Link>
        </div>
      )}
      {hasPersona === true && (
        <div className="flex items-center gap-2 mb-4 fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--line-green)' }} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--line-green)' }}>brand_persona: configured</span>
        </div>
      )}

      <WelcomeHero workspaceId={workspaceId} />
      <TelemetryHeader workspaceId={workspaceId} />
      <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-[1500px] w-full pb-6 min-h-0">
        <RunningProcesses workspaceId={workspaceId} />
        <PowerAgentsPanel workspaceId={workspaceId} />
      </div>
    </div>
  );
}
