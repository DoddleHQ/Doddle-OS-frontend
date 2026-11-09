'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';

export interface EntryCta {
    href: string;
    label: string;
}

export function useEntryCta(): EntryCta {
    const status = useAuthStore((s) => s.status);
    const { workspaces } = useWorkspaces();

    const isAuthenticated = status === 'authenticated';
    const hasWorkspaces = workspaces.length > 0;

    if (!isAuthenticated) {
        return { href: '/login', label: 'Sign in to get started' };
    }
    if (!hasWorkspaces) {
        return { href: '/onboarding', label: 'Set up your workspace' };
    }
    return {
        href: `/legacy/workspaces/${workspaces[0].workspaceId}`,
        label: 'Enter the OS',
    };
}
