'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';

/**
 * Root page — redirects to the user's first workspace.
 * The demo OS interface is the main workspace experience.
 */
export default function RootPage() {
  const router = useRouter();
  const { workspaces, isLoading } = useWorkspaces();

  useEffect(() => {
    if (isLoading) return;
    if (workspaces.length > 0) {
      router.replace(`/workspaces/${workspaces[0].workspaceId}`);
    } else {
      router.replace('/onboarding');
    }
  }, [workspaces, isLoading, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#ECEAE1]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#14213F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-mono text-[#5f6a81]">loading Doddle OS…</p>
      </div>
    </div>
  );
}
