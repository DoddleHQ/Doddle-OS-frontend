'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuthStore } from '@/lib/stores/authStore';

/**
 * Root page — redirects to the user's first workspace.
 * The demo OS interface is the main workspace experience.
 *
 * Waits for BOTH auth bootstrap AND workspace fetch to complete before
 * deciding where to send the user. Without the auth check, the effect
 * fires while authStatus is still 'loading', sees an empty workspace
 * list, and wrongly redirects to /onboarding.
 */
export default function RootPage() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();

  useEffect(() => {
    // Auth still bootstrapping — wait
    if (authStatus === 'loading') return;

    // Authenticated but workspaces still fetching — wait
    if (authStatus === 'authenticated' && workspacesLoading) return;

    if (authStatus === 'authenticated' && workspaces.length > 0) {
      router.replace(`/workspaces/${workspaces[0].workspaceId}`);
    } else if (authStatus === 'authenticated' && workspaces.length === 0) {
      router.replace('/onboarding');
    }
    // Unauthenticated: middleware handles the /login redirect
  }, [authStatus, workspaces, workspacesLoading, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#ECEAE1]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#14213F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-mono text-[#5f6a81]">loading Doddle OS…</p>
      </div>
    </div>
  );
}
