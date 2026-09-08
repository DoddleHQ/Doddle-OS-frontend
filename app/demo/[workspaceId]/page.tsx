'use client';

import { useParams } from 'next/navigation';
import { WelcomeHero } from '@/components/demo/dashboard/WelcomeHero';
import { TelemetryHeader } from '@/components/demo/dashboard/TelemetryHeader';
import { RunningProcesses } from '@/components/demo/dashboard/RunningProcesses';
import { PowerAgentsPanel } from '@/components/demo/dashboard/PowerAgentsPanel';

export default function DemoDashboardPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="absolute inset-0 z-20 fade-in flex flex-col overflow-y-auto p-8 md:p-10">
      <WelcomeHero workspaceId={workspaceId} />
      <TelemetryHeader workspaceId={workspaceId} />
      <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-[1500px] w-full pb-6 min-h-0">
        <RunningProcesses workspaceId={workspaceId} />
        <PowerAgentsPanel workspaceId={workspaceId} />
      </div>
    </div>
  );
}
