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

const CACHE_TTL_MS = 60_000;

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

interface AuthResult {
    authenticated: boolean;
    setCookies: string[];
}

async function checkAuth(request: NextRequest): Promise<AuthResult> {
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const empty: AuthResult = { authenticated: false, setCookies: [] };

    if (!accessToken && !refreshToken) return empty;

    if (accessToken) {
        const cached = sessionCache.get(accessToken);
        if (cached && Date.now() < cached.expiresAt) {
            return { authenticated: true, setCookies: [] };
        }
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { Cookie: `access_token=${accessToken}` },
        });

        if (res.ok) {
            if (accessToken) {
                sessionCache.set(accessToken, {
                    accessToken,
                    expiresAt: Date.now() + CACHE_TTL_MS,
                });
            }
            return { authenticated: true, setCookies: [] };
        }

        if (refreshToken) {
            const refreshResult = await tryRefresh(refreshToken);
            if (refreshResult) {
                return { authenticated: true, setCookies: refreshResult.setCookies };
            }
        }

        if (accessToken) sessionCache.delete(accessToken);
        return empty;
    } catch {
        return empty;
    }
}

async function tryRefresh(refreshToken: string): Promise<{ setCookies: string[] } | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { Cookie: `refresh_token=${refreshToken}` },
        });
        if (!res.ok) return null;
        const setCookies = res.headers.getSetCookie();
        return { setCookies };
    } catch {
        return null;
    }
}

function withAuthCookies(response: NextResponse, result: AuthResult): NextResponse {
    for (const cookie of result.setCookies) {
        response.headers.append('Set-Cookie', cookie);
    }
    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    if (isPublic) {
        if (isAuthRoute) {
            const result = await checkAuth(request);
            if (result.authenticated) {
                return withAuthCookies(
                    NextResponse.redirect(new URL('/', request.url)),
                    result,
                );
            }
        }
        return NextResponse.next();
    }

    const result = await checkAuth(request);
    if (!result.authenticated) {
        const loginUrl = new URL('/login', request.url);
        const fullPath = pathname + (request.nextUrl.search || '');
        loginUrl.searchParams.set('next', fullPath);
        return NextResponse.redirect(loginUrl);
    }

    return withAuthCookies(NextResponse.next(), result);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
