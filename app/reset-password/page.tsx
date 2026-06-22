'use client';

import { Suspense, useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Lock, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react';
import { validateResetToken, resetPassword } from '@/lib/services/authService';

const PASSWORD_RULES = [
    { label: '8\u201315 characters', test: (p: string) => /^.{8,15}$/.test(p) },
    { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'At least one digit', test: (p: string) => /[0-9]/.test(p) },
    { label: 'No whitespace', test: (p: string) => p.length > 0 && !/\s/.test(p) },
    { label: 'ASCII characters only', test: (p: string) => p.length > 0 && /^[\x20-\x7E]+$/.test(p) },
];

type FieldErrors = {
    password?: string;
};

type PageState = 'validating' | 'invalid_token' | 'reset_form' | 'success' | 'error';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [pageState, setPageState] = useState<PageState>('validating');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Validate token on mount
    useEffect(() => {
        if (!token || token.length < 10) {
            setPageState('invalid_token');
            return;
        }

        let cancelled = false;

        async function validate() {
            try {
                const valid = await validateResetToken(token);
                if (!cancelled) {
                    setPageState(valid ? 'reset_form' : 'invalid_token');
                }
            } catch {
                if (!cancelled) {
                    setPageState('invalid_token');
                }
            }
        }

        validate();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const passedCount = password
        ? PASSWORD_RULES.filter((r) => r.test(password)).length
        : 0;

    const strengthMeta = passedCount <= 2
        ? { label: 'Weak', color: 'bg-error-500', width: `${(passedCount / 6) * 100}%` }
        : passedCount <= 4
            ? { label: 'Medium', color: 'bg-warning-500', width: `${(passedCount / 6) * 100}%` }
            : { label: 'Strong', color: 'bg-success-500', width: `${(passedCount / 6) * 100}%` };

    const validateField = (field: string, value: string) => {
        const errs: FieldErrors = {};
        if (field === 'password') {
            if (!value) errs.password = 'Password is required.';
            else if (!PASSWORD_RULES.every((r) => r.test(value)))
                errs.password = 'Password does not meet all requirements.';
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setApiError('');

        const allErrors: FieldErrors = validateField('password', password);
        setTouched({ password: true });
        setErrors(allErrors);
        if (Object.keys(allErrors).length > 0) return;

        setIsLoading(true);
        try {
            await resetPassword(token, password);
            setPageState('success');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setApiError(message);
            setPageState('error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = (field: keyof FieldErrors) =>
        touched[field] && errors[field]
            ? 'border-error-500 focus:ring-2 focus:ring-error-500 focus:border-error-500'
            : 'border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

    // Invalid or expired token
    if (pageState === 'invalid_token') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center mb-4">
                                <X className="w-6 h-6 text-error-600" />
                            </div>
                            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                                Invalid or expired link
                            </h1>
                            <p className="text-sm text-neutral-500">
                                This password reset link is invalid or has expired.
                                Please request a new one.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Link
                                href="/forgot-password"
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                            >
                                Request new reset link
                            </Link>
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (pageState === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center mb-4">
                                <Check className="w-6 h-6 text-success-600" />
                            </div>
                            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                                Password reset successfully
                            </h1>
                            <p className="text-sm text-neutral-500">
                                Your password has been updated. Please log in with your new password.
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go to login
                        </Link>

                        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Enterprise-grade security</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Validating state
    if (pageState === 'validating') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mb-4" />
                            <p className="text-sm text-neutral-500">Validating reset link\u2026</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Reset form
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
                            Enter your new password below.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-neutral-700 mb-1.5"
                            >
                                New password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    placeholder="8\u201315 characters"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
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

                            {password && (
                                <div className="mt-2">
                                    <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${strengthMeta.color}`}
                                            style={{ width: strengthMeta.width }}
                                        />
                                    </div>
                                    <ul className="mt-2 space-y-1">
                                        {PASSWORD_RULES.map((rule) => {
                                            const passed = rule.test(password);
                                            return (
                                                <li
                                                    key={rule.label}
                                                    className={`flex items-center gap-1.5 text-xs ${passed ? 'text-success-600' : 'text-neutral-400'}`}
                                                >
                                                    {passed ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                                                    {rule.label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                            {touched.password && errors.password && !password && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.password}</p>
                            )}
                        </div>

                        {apiError && (
                            <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
                                {apiError}
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
                                    Reset password
                                    <Lock className="w-4 h-4" />
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
                    Remember your password?{' '}
                    <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}

function ResetPasswordLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto" />
                </div>
            </div>
        </div>
    );
}

const ResetPasswordPage = () => {
    return (
        <Suspense fallback={<ResetPasswordLoading />}>
            <ResetPasswordContent />
        </Suspense>
    );
};

export default ResetPasswordPage;
