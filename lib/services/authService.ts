const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_AUTH_TOKEN = process.env.NEXT_PUBLIC_API_AUTH_TOKEN || '';

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (API_AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${API_AUTH_TOKEN}`;
    }
    return headers;
}

export type SignupRequest = {
    orgName: string;
    email: string;
    password: string;
    rememberMe?: boolean;
};

export type SignupResponse = {
    tokenType: string;
    expiresIn: number;
    org: {
        orgName: string;
        email: string;
        isActive: boolean;
        createdAt: string;
    };
};

export type LoginRequest = {
    email: string;
    password: string;
    rememberMe?: boolean;
};

export type LoginResponse = {
    tokenType: string;
    expiresIn: number;
    org: {
        orgName: string;
        email: string;
        isActive: boolean;
        createdAt: string;
    };
};

export type LoginErrorConflict = {
    code: 'ACTIVE_SESSION';
    message: string;
    sessionCreatedAt: string;
    hint: string;
};

export class LoginError extends Error {
    status: number;
    conflict?: LoginErrorConflict;

    constructor(status: number, detail: string, conflict?: LoginErrorConflict) {
        super(detail);
        this.status = status;
        this.conflict = conflict;
    }
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({
            detail: 'Something went wrong. Please try again.',
        }));
        throw new Error(err.detail || 'Signup failed.');
    }

    return res.json();
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        if (res.status === 409) {
            const data: LoginErrorConflict = await res.json().catch(() => ({
                code: 'ACTIVE_SESSION' as const,
                message: 'An active session already exists.',
                sessionCreatedAt: '',
                hint: '',
            }));
            throw new LoginError(409, data.message, data);
        }

        const err = await res.json().catch(() => ({
            detail: 'Something went wrong. Please try again.',
        }));
        throw new LoginError(res.status, err.detail || 'Login failed.');
    }

    return res.json();
}

export async function loginForce(payload: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login/force`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({
            detail: 'Something went wrong. Please try again.',
        }));
        throw new LoginError(res.status, err.detail || 'Login failed.');
    }

    return res.json();
}
