'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    getMe,
    refreshAccessToken,
    logout as apiLogout,
    DEFAULT_EXPIRES_IN,
    type OrgResponse,
} from '@/lib/services/authService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type AuthState =
    | { status: 'loading' }
    | { status: 'authenticated'; org: OrgResponse; expiresIn: number }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string };

type AuthContextValue = AuthState & {
    /** Manually refresh the access token (e.g. before an important API call). */
    refresh: () => Promise<void>;
    /** Log out and clear the session. */
    logout: () => Promise<void>;
    /**
     * Auth-aware fetch wrapper. Automatically retries once on 401 by refreshing
     * the access token first.
     */
    authFetch: (url: string, init?: RequestInit) => Promise<Response>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

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
const DISABLE_AUTH_REDIRECT = true;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [state, setState] = useState<AuthState>({ status: 'loading' });

    // Use a ref for pathname so timer callbacks always read the latest value
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    // Ref to hold the current refresh timer so we can cancel it.
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref to track whether a refresh is already in-flight (prevents concurrent refreshes).
    const refreshingRef = useRef(false);
    // Ref to hold pending 401 requests that should be retried after refresh.
    const pendingRetriesRef = useRef<(() => void)[]>([]);

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
                setState({ status: 'authenticated', org: authRes.org, expiresIn: authRes.expiresIn });
                // Schedule the next refresh
                scheduleRefresh(authRes.expiresIn);
            } catch {
                // Refresh failed — session is dead
                setState({ status: 'unauthenticated' });
                if (!DISABLE_AUTH_REDIRECT) {
                    const currentPath = pathnameRef.current;
                    const isCurrentPublic = PUBLIC_PATHS.some((p) => currentPath.startsWith(p));
                    if (!isCurrentPublic) {
                        router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
                    }
                }
            }
        }, delay);
    }, [clearRefreshTimer, router]);

    // -----------------------------------------------------------------------
    // Core refresh logic (used by manual refresh + 401 interceptor)
    // -----------------------------------------------------------------------
    const doRefresh = useCallback(async (): Promise<boolean> => {
        // Prevent concurrent refreshes
        if (refreshingRef.current) return false;
        refreshingRef.current = true;

        try {
            const authRes = await refreshAccessToken();
            setState({ status: 'authenticated', org: authRes.org, expiresIn: authRes.expiresIn });
            scheduleRefresh(authRes.expiresIn);

            // Retry any pending requests that failed with 401
            pendingRetriesRef.current.forEach((retry) => retry());
            pendingRetriesRef.current = [];

            return true;
        } catch {
            setState({ status: 'unauthenticated' });
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
    }, [router, scheduleRefresh]);

    // -----------------------------------------------------------------------
    // Bootstrap: check session on mount
    // -----------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            try {
                // getMe() returns OrgResponse (no expiresIn), so we use the
                // default TTL. The first proactive refresh will give us the
                // actual expiresIn from the refresh response.
                const org = await getMe();
                if (!cancelled) {
                    setState({ status: 'authenticated', org, expiresIn: DEFAULT_EXPIRES_IN });
                    scheduleRefresh(DEFAULT_EXPIRES_IN);
                }
            } catch {
                // Access token may have expired — try refresh
                if (!cancelled) {
                    const refreshed = await doRefresh();
                    if (!refreshed && !cancelled) {
                        setState({ status: 'unauthenticated' });
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
        setState({ status: 'unauthenticated' });
        if (!DISABLE_AUTH_REDIRECT) {
            router.replace('/login');
        }
    }, [clearRefreshTimer, router]);

    // -----------------------------------------------------------------------
    // Auth-aware fetch: retries once on 401
    // -----------------------------------------------------------------------
    const authFetch = useCallback(
        async (url: string, init?: RequestInit): Promise<Response> => {
            const res = await fetch(url, {
                ...init,
                credentials: 'include',
            });

            if (res.status === 401) {
                // Queue this request for retry after refresh
                return new Promise<Response>((resolve) => {
                    pendingRetriesRef.current.push(async () => {
                        const retryRes = await fetch(url, {
                            ...init,
                            credentials: 'include',
                        });
                        resolve(retryRes);
                    });
                    // Trigger refresh if not already in-flight
                    if (!refreshingRef.current) {
                        doRefresh();
                    }
                });
            }

            return res;
        },
        [doRefresh],
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <AuthContext.Provider value={{ ...state, refresh, logout, authFetch }}>
            {children}
        </AuthContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current auth state from any client component.
 *
 * ```tsx
 * const { status, org, refresh, logout, authFetch } = useAuth();
 *
 * if (status === 'loading') return <Skeleton />;
 * if (status === 'unauthenticated') return null;
 * // org is available
 * ```
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an <AuthProvider>.');
    }
    return ctx;
}
