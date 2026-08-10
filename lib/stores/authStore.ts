'use client';

import { create } from 'zustand';
import type { OrgResponse } from '@/lib/services/authService';

/*
 * Auth store — selector-based global state for auth status + org identity.
 *
 * Replaces the AuthContext value subscription model. Context re-rendered
 * every consumer on any auth state change (including the ~12-min proactive
 * refresh that updates expiresIn). With Zustand, components subscribe to
 * exactly the field they need:
 *
 *   const status = useAuthStore(s => s.status);
 *   const org    = useAuthStore(s => s.org);
 *
 * WHAT LIVES HERE: auth status, org identity, and the actions that mutate
 * them (loginSuccess, setAuthState, clear).
 *
 * WHAT DOES NOT LIVE HERE: the proactive refresh timer, the bootstrap effect,
 * the redirect-on-unauthenticated logic. Those remain in AuthContext (the
 * bootstrap provider) and the middleware — they're mechanisms, not UI state.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
    status: AuthStatus;
    org: OrgResponse | null;
    expiresIn: number;
    errorMessage?: string;

    /** Set after a successful login / force-login (called from AuthContext). */
    loginSuccess: (org: OrgResponse, expiresIn: number) => void;
    /** Replace the full auth state (used by bootstrap + refresh). */
    setAuthState: (state: { status: AuthStatus; org?: OrgResponse | null; expiresIn?: number; errorMessage?: string }) => void;
    /** Reset to unauthenticated (called on logout / refresh failure). */
    clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    status: 'loading',
    org: null,
    expiresIn: 0,

    loginSuccess: (org, expiresIn) =>
        set({ status: 'authenticated', org, expiresIn, errorMessage: undefined }),

    setAuthState: ({ status, org, expiresIn, errorMessage }) =>
        set((prev) => ({
            status,
            org: org !== undefined ? org : prev.org,
            expiresIn: expiresIn !== undefined ? expiresIn : prev.expiresIn,
            errorMessage,
        })),

    clear: () =>
        set({ status: 'unauthenticated', org: null, expiresIn: 0, errorMessage: undefined }),
}));
