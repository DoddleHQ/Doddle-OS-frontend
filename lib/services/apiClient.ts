/**
 * API Client — a thin fetch wrapper with automatic 401 → refresh → retry.
 *
 * This module is NOT a React hook so it can be used from any service function.
 * It coordinates with the AuthContext via a shared refresh-promise pattern.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/** Default request timeout — 15 seconds (slightly longer than auth calls). */
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Refresh lock — ensures only one refresh happens at a time
// ---------------------------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessTokenOnce(): Promise<boolean> {
    // Dynamic import to avoid circular deps at module level
    const { refreshAccessToken } = await import('@/lib/services/authService');
    try {
        await refreshAccessToken();
        return true;
    } catch {
        return false;
    }
}

function getRefreshPromise(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = refreshAccessTokenOnce().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

// ---------------------------------------------------------------------------
// Public fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Human-readable fallback messages for common HTTP status codes.
 */
function getStatusMessage(status: number): string {
    switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Session expired. Please log in again.';
        case 403: return 'Access denied.';
        case 404: return 'The requested resource was not found.';
        case 409: return 'A conflict occurred. Please refresh and try again.';
        case 422: return 'Validation failed. Please check your input.';
        case 429: return 'Too many requests. Please wait a moment and try again.';
        case 500: return 'An internal server error occurred. Please try again later.';
        default:  return `Request failed (${status}).`;
    }
}

/**
 * Parse an error response into a human-readable message.
 * Handles multiple backend error formats and empty bodies.
 */
async function parseErrorMessage(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        return getStatusMessage(res.status);
    }
    try {
        const body = await res.json();
        if (body.Detail) return body.Detail;
        if (body.error?.message) return body.error.message;
        if (body.error?.detail) return body.error.detail;
        return getStatusMessage(res.status);
    } catch {
        return getStatusMessage(res.status);
    }
}

/**
 * Auth-aware fetch that:
 * 1. Sends requests with `credentials: 'include'` (HttpOnly cookies).
 * 2. On 401, refreshes the access token once and retries the request.
 * 3. If refresh also fails, rejects with an error.
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
        res = await fetch(fullUrl, {
            ...init,
            signal: controller.signal,
            credentials: 'include',
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (res.status === 401) {
        // Try to refresh the token
        const refreshed = await getRefreshPromise();
        if (refreshed) {
            // Retry the original request with the new cookie
            return fetch(fullUrl, {
                ...init,
                credentials: 'include',
            });
        }
    }

    return res;
}

/**
 * Convenience: JSON GET
 */
export async function apiGet<T = unknown>(url: string): Promise<T> {
    const res = await apiFetch(url, {
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const message = await parseErrorMessage(res);
        throw new Error(message);
    }
    return res.json();
}

/**
 * Convenience: JSON POST
 */
export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const message = await parseErrorMessage(res);
        throw new Error(message);
    }
    return res.json();
}

/**
 * Convenience: JSON PATCH
 */
export async function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
    const res = await apiFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const message = await parseErrorMessage(res);
        throw new Error(message);
    }
    return res.json();
}

/**
 * Convenience: JSON DELETE
 */
export async function apiDelete(url: string): Promise<void> {
    const res = await apiFetch(url, { method: 'DELETE' });
    if (!res.ok) {
        const message = await parseErrorMessage(res);
        throw new Error(message);
    }
}
