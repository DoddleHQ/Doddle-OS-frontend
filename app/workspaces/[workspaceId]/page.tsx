'use client';

import { useParams } from 'next/navigation';
import { WelcomeHero } from '@/components/demo/dashboard/WelcomeHero';

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="absolute inset-0 z-20 fade-in overflow-y-auto p-8 md:p-10">
      <WelcomeHero workspaceId={workspaceId} />
    </div>
  );
}
