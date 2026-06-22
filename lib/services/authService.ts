/**
 * Auth Service — Client-side service for authentication API calls.
 *
 * The backend sets HttpOnly cookies (`access_token`, `refresh_token`) on
 * login / force-login / refresh.  All requests use `credentials: 'include'`
 * so the browser sends and receives cookies across the cross-origin boundary
 * (Next.js :3000 → Backend :8000).
 *
 * @see https://docs.doddleos.dev/auth  (backend API documentation)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types — camelCase to match the backend API exactly
// ---------------------------------------------------------------------------

/** Org profile returned by login, force-login, refresh, and /me. */
export type OrgResponse = {
    orgName: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
};

/** Response returned by login, force-login, and refresh. */
export type AuthResponse = {
    tokenType: string;
    expiresIn: number;
    org: OrgResponse;
};

/** Simple message response (signup, verify-email, send-verification, etc.). */
export type MessageResponse = {
    message: string;
};

/** Request body for POST /signup. */
export type SignupRequest = {
    orgName: string;
    email: string;
    password: string;
};

/** Request body for POST /login and POST /login/force. */
export type LoginRequest = {
    email: string;
    password: string;
    rememberMe?: boolean;
};

/** 409 Conflict detail when an active session already exists. */
export type ActiveSessionError = {
    code: 'session_active';
    message: string;
    sessionCreatedAt: string;
    hint: string;
};

/** Custom error class for login failures — carries status + optional 409 detail. */
export class LoginError extends Error {
    status: number;
    conflict?: ActiveSessionError;

    constructor(status: number, detail: string, conflict?: ActiveSessionError) {
        super(detail);
        this.name = 'LoginError';
        this.status = status;
        this.conflict = conflict;
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default request timeout — 10 seconds. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Default access token TTL used when bootstrapping from /me (no expiresIn). */
export const DEFAULT_EXPIRES_IN = 900; // 15 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Headers common to every auth request. */
function authHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
    };
}

/**
 * Wrapper around `fetch` that always includes credentials so HttpOnly cookies
 * are sent with — and received from — the backend. Includes a default timeout
 * that is properly cleaned up after the fetch completes.
 */
async function authFetch(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)),
        REQUEST_TIMEOUT_MS,
    );

    let res: Response;
    try {
        res = await fetch(url, {
            ...init,
            signal: controller.signal,
            credentials: 'include',
            headers: {
                ...authHeaders(),
                ...init?.headers,
            },
        });
    } finally {
        clearTimeout(timeoutId);
    }

    return res;
}

/**
 * Human-readable fallback messages for common HTTP status codes.
 * Used when the response body is empty or not parseable.
 */
function getStatusMessage(status: number): string {
    switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Invalid credentials. Please try again.';
        case 403: return 'Access denied. Your account may be inactive or not verified.';
        case 404: return 'The requested resource was not found.';
        case 409: return 'A conflict occurred. Please refresh and try again.';
        case 422: return 'Validation failed. Please check your input.';
        case 429: return 'Too many requests. Please wait a moment and try again.';
        case 500: return 'An internal server error occurred. Please try again later.';
        case 502: return 'The server is temporarily unavailable. Please try again.';
        case 503: return 'The service is temporarily unavailable. Please try again.';
        default:  return 'Something went wrong. Please try again.';
    }
}

/**
 * Parse a backend error response.
 *
 * The backend uses different error formats depending on the source:
 * - Route handler errors: `{"Detail": "..."}`  (capital D)
 * - Middleware errors:     `{"error": {"code": "...", "message": "..."}}`
 * - Validation errors:    `{"error": {"type": "ValidationError", "detail": "...", "context": {...}}}`
 *
 * Falls back to a status-code-specific message when the body is empty or
 * not JSON.
 */
async function parseErrorMessage(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type') || '';

    // If the response isn't JSON, use a status-based fallback
    if (!contentType.includes('application/json')) {
        return getStatusMessage(res.status);
    }

    try {
        const body = await res.json();

        // Standard HTTP exception: {"Detail": "..."}
        if (body.Detail) {
            return body.Detail;
        }

        // Middleware error: {"error": {"code": "...", "message": "..."}}
        if (body.error?.message) {
            return body.error.message;
        }

        // Validation error: {"error": {"detail": "...", "context": {"errors": [...]}}}
        if (body.error?.detail) {
            return body.error.detail;
        }

        // Fallback to status-based message
        return getStatusMessage(res.status);
    } catch {
        // Body was empty or malformed JSON
        return getStatusMessage(res.status);
    }
}

// ---------------------------------------------------------------------------
// Public API — Core Auth
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/signup
 *
 * Creates a new organization account and sends a verification email.
 * Does NOT log the user in — they must verify their email first, then log in.
 */
export async function signup(payload: SignupRequest): Promise<MessageResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await parseErrorMessage(res);
        throw new Error(err || 'Signup failed.');
    }

    return res.json();
}

/**
 * POST /api/v1/auth/login
 *
 * Validates credentials, checks for an existing active session (returns 409
 * if one exists), otherwise creates a new session and sets HttpOnly cookies.
 */
export async function login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        if (res.status === 409) {
            const data: ActiveSessionError = await res.json().catch(() => ({
                code: 'session_active' as const,
                message: 'An active session already exists.',
                sessionCreatedAt: '',
                hint: '',
            }));
            throw new LoginError(409, data.message, data);
        }

        const err = await parseErrorMessage(res);
        throw new LoginError(res.status, err || 'Login failed.');
    }

    return res.json();
}

/**
 * POST /api/v1/auth/login/force
 *
 * Replaces an existing active session with a new one. The old session is
 * invalidated in Redis, new tokens are issued and set as HttpOnly cookies.
 */
export async function loginForce(payload: LoginRequest): Promise<AuthResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/login/force`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await parseErrorMessage(res);
        throw new LoginError(res.status, err || 'Force login failed.');
    }

    return res.json();
}

/**
 * POST /api/v1/auth/refresh
 *
 * Reads the refresh token from the HttpOnly cookie, validates it, verifies the
 * Redis session, and rotates the access cookie. The refresh cookie is NOT modified.
 */
export async function refreshAccessToken(): Promise<AuthResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
    });

    if (!res.ok) {
        throw new Error('Session expired. Please log in again.');
    }

    return res.json();
}

/**
 * GET /api/v1/auth/me
 *
 * Returns the currently authenticated organization profile, hydrated fresh
 * from PostgreSQL. Requires a valid access_token cookie.
 */
export async function getMe(): Promise<OrgResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
    });

    if (!res.ok) {
        throw new Error('Not authenticated');
    }

    return res.json();
}

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the current session (invalidates Redis entries and clears both
 * HttpOnly cookies).
 */
export async function logout(): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
    });

    if (!res.ok) {
        // Best-effort — clear client state even if the server call fails
        console.warn('Logout request failed, clearing client state anyway.');
    }
}

// ---------------------------------------------------------------------------
// Public API — Email Verification
// ---------------------------------------------------------------------------

/** Possible outcomes of an email verification attempt. */
export type VerifyEmailResult =
    | { status: 'verified' }
    | { status: 'already_verified'; message: string }
    | { status: 'error'; message: string };

/**
 * GET /api/v1/auth/verify-email?token=<token>
 *
 * Verifies an email address using the token sent in the verification link.
 * The token is single-use and expires after 24 hours.
 *
 * The backend returns a **302 Redirect** on success (not JSON), so we use
 * `redirect: 'manual'` to prevent the browser from auto-following it.
 * An `opaqueredirect` response (status 0) means the verification succeeded.
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
    const res = await fetch(
        `${API_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`,
        {
            credentials: 'include',
            redirect: 'manual',
        },
    );

    // 302 → opaqueredirect (status 0) means verification succeeded
    if (res.status === 0 || res.type === 'opaqueredirect') {
        return { status: 'verified' };
    }

    // 200 with JSON — "already verified" case
    if (res.status === 200) {
        try {
            const body = await res.json();
            if (body.message && body.message.toLowerCase().includes('already verified')) {
                return { status: 'already_verified', message: body.message };
            }
            return { status: 'verified' };
        } catch {
            return { status: 'verified' };
        }
    }

    // 400 — invalid or expired token
    const err = await parseErrorMessage(res);
    return { status: 'error', message: err || 'Email verification failed.' };
}

/**
 * POST /api/v1/auth/send-verification
 *
 * Resends the email verification link. Always returns 200 to prevent
 * email enumeration.
 */
export async function sendVerification(email: string): Promise<MessageResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/send-verification`, {
        method: 'POST',
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const err = await parseErrorMessage(res);
        throw new Error(err || 'Failed to send verification email.');
    }

    return res.json();
}

// ---------------------------------------------------------------------------
// Public API — Password Reset
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/forgot-password
 *
 * Sends a password reset link to the provided email. Always returns 200
 * to prevent email enumeration.
 */
export async function forgotPassword(email: string): Promise<MessageResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const err = await parseErrorMessage(res);
        throw new Error(err || 'Failed to send password reset email.');
    }

    return res.json();
}

/**
 * GET /api/v1/auth/reset-password?token=<token>
 *
 * Validates a reset password token. Returns true if valid, false if expired.
 * Used by the frontend to verify the token before showing the reset form.
 */
export async function validateResetToken(token: string): Promise<boolean> {
    const res = await authFetch(
        `${API_BASE_URL}/api/v1/auth/reset-password?token=${encodeURIComponent(token)}`,
    );
    return res.ok;
}

/**
 * POST /api/v1/auth/reset-password
 *
 * Resets the password using the token from the reset email. The token is
 * single-use. Also evicts any active session.
 */
export async function resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
    });

    if (!res.ok) {
        const err = await parseErrorMessage(res);
        throw new Error(err || 'Password reset failed.');
    }

    return res.json();
}
