import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


const PUBLIC_PATHS = [
    '/login',
    '/signup',
    '/terms',
    '/privacy',
    '/api-playground',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/check-email',
    '/onboarding',
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// In-memory session cache (Edge Runtime compatible)
//
// Avoids calling /auth/me on every single route navigation. The cache stores
// a timestamp and the access_token it was validated for. If the token hasn't
// changed and the cache hasn't expired, we skip the network call.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000; // 1 minute — revalidate once per minute at most

interface CacheEntry {
    accessToken: string;
    expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForCache = globalThis as any;
const sessionCache: Map<string, CacheEntry> =
    globalForCache.__sessionCache ?? new Map<string, CacheEntry>();
if (!globalForCache.__sessionCache) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalForCache as any).__sessionCache = sessionCache;
}

// ---------------------------------------------------------------------------
// Auth check
// ---------------------------------------------------------------------------

/**
 * Result of an auth check — carries any Set-Cookie headers the backend
 * issued (e.g. from a token rotation) so the middleware can forward them
 * to the browser response. Without forwarding, a server-side refresh would
 * leave the browser holding the stale access cookie.
 */
interface AuthResult {
    authenticated: boolean;
    /** Set-Cookie headers from the backend (e.g. rotated tokens). Forward as-is. */
    setCookies: string[];
}

/**
 * Check whether the request carries a valid, active session.
 *
 * Uses an in-memory cache to avoid redundant /auth/me calls when the user
 * navigates between protected routes within a short time window.
 *
 * FALLBACK: if the access token is expired but a refresh token is present,
 * attempts /auth/refresh before giving up. The middleware runs in the Edge
 * runtime and has no access to the client-side apiClient refresh logic, so
 * without this fallback a stale access cookie (common after long-lived
 * sessions like onboarding) causes a false-negative → redirect to /login →
 * which the isAuthRoute guard then bounces to /, stranding the user on home.
 */
async function checkAuth(request: NextRequest): Promise<AuthResult> {
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const empty: AuthResult = { authenticated: false, setCookies: [] };

    // No tokens at all — definitely unauthenticated
    if (!accessToken && !refreshToken) return empty;

    // Check cache first (keyed on the access token)
    if (accessToken) {
        const cached = sessionCache.get(accessToken);
        if (cached && Date.now() < cached.expiresAt) {
            return { authenticated: true, setCookies: [] }; // Cache hit
        }
    }

    // Cache miss or expired — verify with the backend
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { Cookie: `access_token=${accessToken}` },
        });

        if (res.ok) {
            // Cache the valid session
            if (accessToken) {
                sessionCache.set(accessToken, {
                    accessToken,
                    expiresAt: Date.now() + CACHE_TTL_MS,
                });
            }
            return { authenticated: true, setCookies: [] };
        }

        // Access token invalid — try refresh before declaring unauthenticated.
        // This recovers from the common "stale access cookie, valid refresh
        // cookie" state without bouncing the user to /login.
        if (refreshToken) {
            const refreshResult = await tryRefresh(refreshToken);
            if (refreshResult) {
                return { authenticated: true, setCookies: refreshResult.setCookies };
            }
        }

        // Invalid token — remove from cache
        if (accessToken) sessionCache.delete(accessToken);
        return empty;
    } catch {
        return empty;
    }
}

/**
 * Attempt a server-side token refresh using the refresh_token cookie.
 * Returns the Set-Cookie headers from the backend (rotated tokens) so the
 * middleware can forward them to the browser — without this, the browser
 * keeps the stale access cookie and every navigation re-triggers refresh.
 */
async function tryRefresh(refreshToken: string): Promise<{ setCookies: string[] } | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { Cookie: `refresh_token=${refreshToken}` },
        });
        if (!res.ok) return null;
        // getSetCookie() returns each Set-Cookie header as a separate entry,
        // exactly the shape needed to re-emit them on a NextResponse.
        const setCookies = res.headers.getSetCookie();
        return { setCookies };
    } catch {
        return null;
    }
}

/**
 * Apply any Set-Cookie headers from an AuthResult to a NextResponse so rotated
 * tokens actually reach the browser.
 */
function withAuthCookies(response: NextResponse, result: AuthResult): NextResponse {
    for (const cookie of result.setCookies) {
        response.headers.append('Set-Cookie', cookie);
    }
    return response;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isPublic = pathname === '/' || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    if (isPublic) {
        // If the user is already authenticated and visits an auth page,
        // redirect them to the home page
        if (isAuthRoute) {
            const result = await checkAuth(request);
            if (result.authenticated) {
                // Forward any rotated cookies onto the redirect
                return withAuthCookies(
                    NextResponse.redirect(new URL('/', request.url)),
                    result,
                );
            }
        }
        return NextResponse.next();
    }

    // Protected route — check authentication
    const result = await checkAuth(request);
    if (!result.authenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated — forward any rotated tokens from the refresh fallback
    return withAuthCookies(NextResponse.next(), result);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
