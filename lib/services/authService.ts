const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export type UserResponse = {
    name: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
};

export type AuthResponse = {
    tokenType: string;
    expiresIn: number;
    user: UserResponse;
};

export type MessageResponse = {
    message: string;
};

export type SignupRequest = {
    name: string;
    email: string;
    password: string;
};

export type LoginRequest = {
    email: string;
    password: string;
    rememberMe?: boolean;
};

export type ActiveSessionError = {
    code: 'session_active';
    message: string;
    sessionCreatedAt: string;
    hint: string;
};

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

const REQUEST_TIMEOUT_MS = 10_000;

export const DEFAULT_EXPIRES_IN = 900;

// Google OAuth: backend-driven handshake. Must be a plain browser
// navigation (never fetch) — the backend answers with a 302 to Google
// and later lands back on /login with cookies set or ?error=<code>.
export const GOOGLE_LOGIN_URL = `${API_BASE_URL}/api/v1/auth/google/login`;

function authHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
    };
}

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

async function parseErrorMessage(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        return getStatusMessage(res.status);
    }

    try {
        const body = await res.json();

        if (body.Detail) {
            return body.Detail;
        }

        if (body.error?.message) {
            return body.error.message;
        }

        if (body.error?.detail) {
            return body.error.detail;
        }

        return getStatusMessage(res.status);
    } catch {
        return getStatusMessage(res.status);
    }
}

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

export async function refreshAccessToken(): Promise<AuthResponse> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
    });

    if (!res.ok) {
        throw new Error('Session expired. Please log in again.');
    }

    return res.json();
}

export async function getMe(): Promise<UserResponse> {
    const { apiFetch } = await import('./apiClient');
    const res = await apiFetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
    });

    if (!res.ok) {
        throw new Error('Not authenticated');
    }

    return res.json();
}

export async function logout(): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
    });

    if (!res.ok) {
        console.warn('Logout request failed, clearing client state anyway.');
    }
}

export type VerifyEmailResult =
    | { status: 'verified' }
    | { status: 'already_verified'; message: string }
    | { status: 'error'; message: string };

export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
    const res = await fetch(
        `${API_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`,
        {
            credentials: 'include',
            redirect: 'manual',
        },
    );

    if (res.status === 0 || res.type === 'opaqueredirect') {
        return { status: 'verified' };
    }

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

    const err = await parseErrorMessage(res);
    return { status: 'error', message: err || 'Email verification failed.' };
}

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

export async function validateResetToken(token: string): Promise<boolean> {
    const res = await authFetch(
        `${API_BASE_URL}/api/v1/auth/reset-password?token=${encodeURIComponent(token)}`,
    );
    return res.ok;
}

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

export type UserProfileResponse = {
    name: string;
    email: string;
    updatedAt: string;
};

export async function editProfile(name: string): Promise<UserProfileResponse> {
    const { apiPatch } = await import('./apiClient');
    const raw = await apiPatch(`${API_BASE_URL}/api/v1/user/edit-profile`, { name });
    return raw as UserProfileResponse;
}

export async function lookupUser(email: string): Promise<{ name: string; email: string } | null> {
    try {
        const { apiGet } = await import('./apiClient');
        const raw = await apiGet(`${API_BASE_URL}/api/v1/user/lookup?email=${encodeURIComponent(email)}`);
        return raw as { name: string; email: string };
    } catch {
        return null;
    }
}
