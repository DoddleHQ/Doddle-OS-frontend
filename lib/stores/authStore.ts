'use client';

import { create } from 'zustand';
import type { UserResponse } from '@/lib/services/authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
    status: AuthStatus;
    user: UserResponse | null;
    expiresIn: number;
    errorMessage?: string;

    loginSuccess: (user: UserResponse, expiresIn: number) => void;
    setAuthState: (state: { status: AuthStatus; user?: UserResponse | null; expiresIn?: number; errorMessage?: string }) => void;
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
