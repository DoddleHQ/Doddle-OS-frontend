'use client';

import { WelcomeHero } from '@/components/demo/dashboard/WelcomeHero';
import { TelemetryHeader } from '@/components/demo/dashboard/TelemetryHeader';
import { RunningProcesses } from '@/components/demo/dashboard/RunningProcesses';
import { PowerAgentsPanel } from '@/components/demo/dashboard/PowerAgentsPanel';

export default function DemoDashboardPage() {
  return (
    <div className="absolute inset-0 z-20 fade-in flex flex-col overflow-y-auto p-8 md:p-10">
      <WelcomeHero />
      <TelemetryHeader />
      <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-[1500px] w-full pb-6 min-h-0">
        <RunningProcesses />
        <PowerAgentsPanel />
      </div>
    </div>
  );
}
