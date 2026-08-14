'use client';

import {
    createContext,
    useContext,
    useRef,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    getMe,
    refreshAccessToken,
    logout as apiLogout,
    DEFAULT_EXPIRES_IN,
    type UserResponse,
    type AuthResponse,
} from '@/lib/services/authService';
import { useAuthStore, type AuthStatus } from '@/lib/stores/authStore';

// ---------------------------------------------------------------------------
// Public hook + types
// ---------------------------------------------------------------------------

/**
 * AuthContext now holds only the ACTIONS (refresh, logout, loginSuccess) and
 * runs the bootstrap effect. The reactive STATE (status, user, expiresIn) lives
 * in the Zustand store so components can subscribe to exactly the field they
 * need without over-subscribing.
 *
 * For new code, prefer the selector API directly:
 *   const status = useAuthStore(s => s.status);
 *   const user   = useAuthStore(s => s.user);
 *
 * `useAuth()` is kept for components that need the actions (refresh / logout /
 * loginSuccess), and re-exports the reactive fields for backward compatibility.
 */
interface AuthActions {
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    loginSuccess: (authRes: AuthResponse) => void;
}

const AuthActionsContext = createContext<AuthActions | null>(null);

/** Backward-compatible hook: reactive auth state + actions. */
export function useAuth() {
    const actions = useContext(AuthActionsContext);
    const status = useAuthStore((s) => s.status);
    const user = useAuthStore((s) => s.user);
    const expiresIn = useAuthStore((s) => s.expiresIn);
    const errorMessage = useAuthStore((s) => s.errorMessage);

    if (!actions) {
        throw new Error('useAuth must be used within an <AuthProvider>.');
    }

    return {
        status,
        user,
        expiresIn,
        errorMessage,
        ...actions,
    };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = ['/login', '/signup', '/terms', '/privacy', '/api-playground', '/forgot-password', '/reset-password', '/verify-email', '/check-email'];

/** Refresh the token at 80 % of its lifetime to stay ahead of expiry. */
const REFRESH_RATIO = 0.8;

/**
 * When true, auth redirects to /login are disabled.
 * Set to false to re-enable authentication enforcement.
 */
const DISABLE_AUTH_REDIRECT = process.env.NODE_ENV !== 'production';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Use a ref for pathname so timer callbacks always read the latest value
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    // Ref to hold the current refresh timer so we can cancel it.
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref to track whether a refresh is already in-flight (prevents concurrent refreshes).
    const refreshingRef = useRef(false);

    const setAuthState = useAuthStore((s) => s.setAuthState);
    const clearAuth = useAuthStore((s) => s.clear);

    // -----------------------------------------------------------------------
    // Clear any scheduled refresh
    // -----------------------------------------------------------------------
    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    // -----------------------------------------------------------------------
    // Schedule a proactive refresh before the token expires
    // -----------------------------------------------------------------------
    const scheduleRefresh = useCallback((expiresIn: number) => {
        clearRefreshTimer();
        const delay = expiresIn * 1000 * REFRESH_RATIO; // convert to ms, use 80%
        refreshTimerRef.current = setTimeout(async () => {
            try {
                const authRes = await refreshAccessToken();
                setAuthState({ status: 'authenticated', user: authRes.user, expiresIn: authRes.expiresIn });
                // Schedule the next refresh
                scheduleRefresh(authRes.expiresIn);
            } catch {
                // Refresh failed — session is dead
                clearAuth();
                if (!DISABLE_AUTH_REDIRECT) {
                    const currentPath = pathnameRef.current;
                    const isCurrentPublic = PUBLIC_PATHS.some((p) => currentPath.startsWith(p));
                    if (!isCurrentPublic) {
                        router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
                    }
                }
            }
        }, delay);
    }, [clearRefreshTimer, router, setAuthState, clearAuth]);

    // -----------------------------------------------------------------------
    // Core refresh logic
    // -----------------------------------------------------------------------
    const doRefresh = useCallback(async (): Promise<boolean> => {
        // Prevent concurrent refreshes
        if (refreshingRef.current) return false;
        refreshingRef.current = true;

        try {
            const authRes = await refreshAccessToken();
            setAuthState({ status: 'authenticated', user: authRes.user, expiresIn: authRes.expiresIn });
            scheduleRefresh(authRes.expiresIn);
            return true;
        } catch {
            clearAuth();
            if (!DISABLE_AUTH_REDIRECT) {
                const currentPath = pathnameRef.current;
                const isCurrentPublic = PUBLIC_PATHS.some((p) => currentPath.startsWith(p));
                if (!isCurrentPublic) {
                    router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
                }
            }
            return false;
        } finally {
            refreshingRef.current = false;
        }
    }, [router, scheduleRefresh, setAuthState, clearAuth]);

    // -----------------------------------------------------------------------
    // Bootstrap: check session on mount
    // -----------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            try {
                const user = await getMe();
                if (!cancelled) {
                    setAuthState({ status: 'authenticated', user, expiresIn: DEFAULT_EXPIRES_IN });
                    scheduleRefresh(DEFAULT_EXPIRES_IN);
                }
            } catch {
                if (!cancelled) {
                    const refreshed = await doRefresh();
                    if (!refreshed && !cancelled) {
                        clearAuth();
                        if (!DISABLE_AUTH_REDIRECT && !isPublicPath) {
                            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
                        }
                    }
                }
            }
        }

        bootstrap();

        return () => {
            cancelled = true;
            clearRefreshTimer();
        };
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -----------------------------------------------------------------------
    // Login success — immediately update store (called by login page)
    // -----------------------------------------------------------------------
    const loginSuccess = useCallback(
        (authRes: AuthResponse) => {
            setAuthState({ status: 'authenticated', user: authRes.user, expiresIn: authRes.expiresIn });
            scheduleRefresh(authRes.expiresIn);
        },
        [scheduleRefresh, setAuthState],
    );

    // -----------------------------------------------------------------------
    // Manual refresh (exposed via context)
    // -----------------------------------------------------------------------
    const refresh = useCallback(async () => {
        await doRefresh();
    }, [doRefresh]);

    // -----------------------------------------------------------------------
    // Logout
    // -----------------------------------------------------------------------
    const logout = useCallback(async () => {
        clearRefreshTimer();
        try {
            await apiLogout();
        } catch {
            // best-effort
        }
        clearAuth();
        // Always redirect to login on explicit logout — this is a user action,
        // not a background auth failure, so DISABLE_AUTH_REDIRECT doesn't apply.
        router.replace('/login');
    }, [clearRefreshTimer, router, clearAuth]);

    const actions: AuthActions = { refresh, logout, loginSuccess };

    return (
        <AuthActionsContext.Provider value={actions}>
            {children}
        </AuthActionsContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Re-export the store selector hook + status type for ergonomic imports
// ---------------------------------------------------------------------------

export { useAuthStore, type AuthStatus };
export type { UserResponse };
