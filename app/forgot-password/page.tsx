'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Sparkles, Lock, ArrowLeft, Mail } from 'lucide-react';
import { forgotPassword } from '@/lib/services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
    email?: string;
};

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [sent, setSent] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateField = (field: string, value: string) => {
        const errs: FieldErrors = {};
        if (field === 'email') {
            if (!value.trim()) errs.email = 'Email is required.';
            else if (!EMAIL_RE.test(value)) errs.email = 'Please enter a valid email address.';
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

        const allErrors: FieldErrors = validateField('email', email);
        setTouched({ email: true });
        setErrors(allErrors);
        if (Object.keys(allErrors).length > 0) return;

        setIsLoading(true);
        try {
            await forgotPassword(email);
            setSent(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setApiError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = (field: keyof FieldErrors) =>
        touched[field] && errors[field]
            ? 'border-error-500 focus:ring-2 focus:ring-error-500 focus:border-error-500'
            : 'border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                                <Mail className="w-6 h-6 text-primary-600" />
                            </div>
                            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                                Check your email
                            </h1>
                            <p className="text-sm text-neutral-500">
                                If <span className="font-medium text-neutral-700">{email}</span> is registered,
                                a password reset link has been sent. Please check your inbox.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Link>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Enterprise-grade security</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                                Enter your email and we&apos;ll send you a reset link.
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
                                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                                onBlur={() => handleBlur('email', email)}
                                className={`w-full rounded-lg border px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${inputClass('email')}`}
                            />
                            {touched.email && errors.email && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.email}</p>
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
                                    Send reset link
                                    <Mail className="w-4 h-4" />
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
};

export default ForgotPasswordPage;
