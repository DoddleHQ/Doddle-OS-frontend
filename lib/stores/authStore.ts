'use client';

import { create } from 'zustand';
import type { UserResponse } from '@/lib/services/authService';

/*
 * Auth store — selector-based global state for auth status + user identity.
 *
 * Replaces the AuthContext value subscription model. Context re-rendered
 * every consumer on any auth state change (including the ~12-min proactive
 * refresh that updates expiresIn). With Zustand, components subscribe to
 * exactly the field they need:
 *
 *   const status = useAuthStore(s => s.status);
 *   const user   = useAuthStore(s => s.user);
 *
 * WHAT LIVES HERE: auth status, user identity, and the actions that mutate
 * them (loginSuccess, setAuthState, clear).
 *
 * WHAT DOES NOT LIVE HERE: the proactive refresh timer, the bootstrap effect,
 * the redirect-on-unauthenticated logic. Those remain in AuthContext (the
 * bootstrap provider) and the middleware — they're mechanisms, not UI state.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
    status: AuthStatus;
    user: UserResponse | null;
    expiresIn: number;
    errorMessage?: string;

    /** Set after a successful login / force-login (called from AuthContext). */
    loginSuccess: (user: UserResponse, expiresIn: number) => void;
    /** Replace the full auth state (used by bootstrap + refresh). */
    setAuthState: (state: { status: AuthStatus; user?: UserResponse | null; expiresIn?: number; errorMessage?: string }) => void;
    /** Reset to unauthenticated (called on logout / refresh failure). */
    clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    status: 'loading',
    user: null,
    expiresIn: 0,

    loginSuccess: (user, expiresIn) =>
        set({ status: 'authenticated', user, expiresIn, errorMessage: undefined }),

    setAuthState: ({ status, user, expiresIn, errorMessage }) =>
        set((prev) => ({
            status,
            user: user !== undefined ? user : prev.user,
            expiresIn: expiresIn !== undefined ? expiresIn : prev.expiresIn,
            errorMessage,
        })),

    clear: () =>
        set({ status: 'unauthenticated', user: null, expiresIn: 0, errorMessage: undefined }),
}));
