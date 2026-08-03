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
    '/v2',
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
 * Check whether the request carries a valid, active session.
 *
 * Uses an in-memory cache to avoid redundant /auth/me calls when the user
 * navigates between protected routes within a short time window.
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) return false;

    // Check cache first
    const cached = sessionCache.get(accessToken);
    if (cached && Date.now() < cached.expiresAt) {
        return true; // Cache hit — session was recently validated
    }

    // Cache miss or expired — call the backend
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: {
                Cookie: `access_token=${accessToken}`,
            },
        });

        if (res.ok) {
            // Cache the valid session
            sessionCache.set(accessToken, {
                accessToken,
                expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return true;
        }

        // Invalid token — remove from cache
        sessionCache.delete(accessToken);
        return false;
    } catch {
        return false;
    }
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
            const authenticated = await isAuthenticated(request);
            if (authenticated) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        }
        return NextResponse.next();
    }

    // Protected route — check authentication
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
