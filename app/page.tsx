'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuthStore } from '@/lib/stores/authStore';

export default function RootPage() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();

  useEffect(() => {
    if (authStatus === 'loading') return;

    if (authStatus === 'authenticated' && workspacesLoading) return;

    if (authStatus === 'authenticated' && workspaces.length > 0) {
      router.replace('/v3');
    } else if (authStatus === 'authenticated' && workspaces.length === 0) {
      router.replace('/onboarding');
    } else if (authStatus === 'unauthenticated') {
      router.replace('/login');
    }
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
