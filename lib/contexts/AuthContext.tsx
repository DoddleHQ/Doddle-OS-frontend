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

interface AuthActions {
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    loginSuccess: (authRes: AuthResponse) => void;
}

const AuthActionsContext = createContext<AuthActions | null>(null);

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

const PUBLIC_PATHS = ['/login', '/signup', '/terms', '/privacy', '/api-playground', '/forgot-password', '/reset-password', '/verify-email', '/check-email'];

const REFRESH_RATIO = 0.8;

const DISABLE_AUTH_REDIRECT = process.env.NODE_ENV !== 'production';

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshingRef = useRef(false);

    const setAuthState = useAuthStore((s) => s.setAuthState);
    const clearAuth = useAuthStore((s) => s.clear);

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const scheduleRefresh = useCallback((expiresIn: number) => {
        clearRefreshTimer();
        const delay = expiresIn * 1000 * REFRESH_RATIO;
        refreshTimerRef.current = setTimeout(async () => {
            try {
                const authRes = await refreshAccessToken();
                setAuthState({ status: 'authenticated', user: authRes.user, expiresIn: authRes.expiresIn });
                scheduleRefresh(authRes.expiresIn);
            } catch {
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

    const doRefresh = useCallback(async (): Promise<boolean> => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loginSuccess = useCallback(
        (authRes: AuthResponse) => {
            setAuthState({ status: 'authenticated', user: authRes.user, expiresIn: authRes.expiresIn });
            scheduleRefresh(authRes.expiresIn);
        },
        [scheduleRefresh, setAuthState],
    );

    const refresh = useCallback(async () => {
        await doRefresh();
    }, [doRefresh]);

    const logout = useCallback(async () => {
        clearRefreshTimer();
        try {
            await apiLogout();
        } catch {
        }
        clearAuth();
        router.replace('/login');
    }, [clearRefreshTimer, router, clearAuth]);

    const actions: AuthActions = { refresh, logout, loginSuccess };

    return (
        <AuthActionsContext.Provider value={actions}>
            {children}
        </AuthActionsContext.Provider>
    );
}

export { useAuthStore, type AuthStatus };
export type { UserResponse };
