'use client';

import { useReducer, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Sparkles, Lock, ArrowRight, Mail } from 'lucide-react';
import { login, loginForce, LoginError } from '@/lib/services/authService';
import { ResendVerificationEmail } from '@/components/auth/ResendVerificationEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginState = {
    email: string;
    password: string;
    rememberMe: boolean;
};

type LoginAction =
    | { type: 'SET_EMAIL'; payload: string }
    | { type: 'SET_PASSWORD'; payload: string }
    | { type: 'TOGGLE_REMEMBER_ME' };

type FieldErrors = {
    email?: string;
    password?: string;
};

const loginReducer = (state: LoginState, action: LoginAction): LoginState => {
    switch (action.type) {
        case 'SET_EMAIL':
            return { ...state, email: action.payload };
        case 'SET_PASSWORD':
            return { ...state, password: action.payload };
        case 'TOGGLE_REMEMBER_ME':
            return { ...state, rememberMe: !state.rememberMe };
        default:
            return state;
    }
};

const initialState: LoginState = {
    email: '',
    password: '',
    rememberMe: true,
};

const LoginPage = () => {
    const router = useRouter();
    const [state, dispatch] = useReducer(loginReducer, initialState);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [activeSession, setActiveSession] = useState(false);
    const [emailNotVerified, setEmailNotVerified] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const { email, password, rememberMe } = state;

    const validateField = (field: string, value: string) => {
        const errs: FieldErrors = {};
        switch (field) {
            case 'email':
                if (!value.trim()) errs.email = 'Work email is required.';
                else if (!EMAIL_RE.test(value)) errs.email = 'Please enter a valid email address.';
                break;
            case 'password':
                if (!value) errs.password = 'Password is required.';
                break;
        }
        return errs;
    };

    const handleBlur = (field: string, value: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const fieldErrors = validateField(field, value);
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
    };

    const clearFieldError = (field: keyof FieldErrors) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleLogin = async (force: boolean = false) => {
        setApiError('');
        setActiveSession(false);
        setEmailNotVerified(false);

        const allErrors: FieldErrors = {
            ...validateField('email', email),
            ...validateField('password', password),
        };
        setTouched({ email: true, password: true });
        setErrors(allErrors);
        if (Object.keys(allErrors).length > 0) return;

        setIsLoading(true);
        try {
            const payload = { email, password, rememberMe };
            if (force) {
                await loginForce(payload);
            } else {
                await login(payload);
            }
            toast.success('Welcome back!');
            const next = new URLSearchParams(window.location.search).get('next') || '/';
            router.push(next);
        } catch (err: unknown) {
            if (err instanceof LoginError) {
                if (err.status === 409 && err.conflict) {
                    setActiveSession(true);
                    setApiError(err.conflict.message);
                } else if (err.status === 403 && err.message.toLowerCase().includes('verif')) {
                    setEmailNotVerified(true);
                    setApiError(err.message);
                } else {
                    setApiError(err.message);
                }
            } else {
                setApiError('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        handleLogin(false);
    };

    const handleForceLogin = () => {
        handleLogin(true);
    };

    const inputClass = (field: keyof FieldErrors) =>
        touched[field] && errors[field]
            ? 'border-error-500 focus:ring-2 focus:ring-error-500 focus:border-error-500'
            : 'border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold text-neutral-900">
                                Doddle OS
                            </span>
                        </div>
                        <p className="text-sm text-neutral-500 text-center">
                            Let agents handle the hustle, not you.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-neutral-700 mb-1.5"
                            >
                                Work email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => { dispatch({ type: 'SET_EMAIL', payload: e.target.value }); clearFieldError('email'); }}
                                onBlur={() => handleBlur('email', email)}
                                className={`w-full rounded-lg border px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${inputClass('email')}`}
                            />
                            {touched.email && errors.email && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-neutral-700 mb-1.5"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => { dispatch({ type: 'SET_PASSWORD', payload: e.target.value }); clearFieldError('password'); }}
                                    onBlur={() => handleBlur('password', password)}
                                    className={`w-full rounded-lg border px-4 py-3 pr-12 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${inputClass('password')}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:text-neutral-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {touched.password && errors.password && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <span className="text-sm text-neutral-600">Keep me signed in</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={rememberMe}
                                    onClick={() => dispatch({ type: 'TOGGLE_REMEMBER_ME' })}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${rememberMe ? 'bg-primary-600' : 'bg-neutral-300'}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${rememberMe ? 'translate-x-4' : 'translate-x-0'}`}
                                    />
                                </button>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-primary-600 hover:text-primary-700"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {apiError && (
                            <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 space-y-2">
                                <p className="text-sm text-error-700">{apiError}</p>
                                {activeSession && (
                                    <button
                                        type="button"
                                        onClick={handleForceLogin}
                                        disabled={isLoading}
                                        className="text-sm font-medium text-error-700 underline hover:text-error-800 disabled:opacity-50"
                                    >
                                        Replace existing session and continue
                                    </button>
                                )}
                                {emailNotVerified && (
                                    <div className="pt-2">
                                        <ResendVerificationEmail
                                            email={email}
                                            variant="link"
                                            label="Resend Verification Email"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    Log in
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Enterprise-grade security</span>
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-neutral-500">
                    New here?{' '}
                    <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-700">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
