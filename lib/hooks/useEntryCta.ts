'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';

/*
 * useEntryCta — resolve the home/landing CTA across all session states.
 *
 * Previously this 3-way auth + workspace check was duplicated byte-for-byte
 * between HeroSpecimen and CloseCta, which is how the "authenticated but no
 * workspaces" bug slipped in (only one copy got fixed at first). Centralizing
 * it here guarantees both CTAs (and any future ones) resolve identically.
 *
 * States:
 *   - unauthenticated             → /login            ("Sign in to get started")
 *   - authenticated, no workspace → /onboarding       ("Set up your workspace")
 *   - authenticated, has workspace → /workspaces/{id}  ("Enter the OS")
 */

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
        href: `/workspaces/${workspaces[0].workspaceId}`,
        label: 'Enter the OS',
    };
}
