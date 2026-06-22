'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Sparkles,
    Lock,
    ArrowLeft,
    Check,
    X,
    Mail,
    AlertTriangle,
    Info,
} from 'lucide-react';
import { verifyEmail, type VerifyEmailResult } from '@/lib/services/authService';

type VerificationStatus =
    | 'loading'
    | 'verified'
    | 'already_verified'
    | 'expired'
    | 'invalid'
    | 'error';

/** Auto-redirect countdown in seconds after successful verification. */
const REDIRECT_SECONDS = 3;

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [status, setStatus] = useState<VerificationStatus>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [alreadyVerifiedMessage, setAlreadyVerifiedMessage] = useState('');
    const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Verify email on mount
    useEffect(() => {
        if (!token || token.length < 10) {
            setStatus('invalid');
            return;
        }

        let cancelled = false;

        async function verify() {
            try {
                const result: VerifyEmailResult = await verifyEmail(token);
                if (cancelled) return;

                switch (result.status) {
                    case 'verified':
                        setStatus('verified');
                        break;
                    case 'already_verified':
                        setStatus('already_verified');
                        setAlreadyVerifiedMessage(result.message);
                        break;
                    case 'error':
                        // Distinguish between expired and invalid
                        const msg = result.message.toLowerCase();
                        if (msg.includes('expired') || msg.includes('invalid')) {
                            setStatus('expired');
                        } else {
                            setStatus('invalid');
                        }
                        setErrorMessage(result.message);
                        break;
                }
            } catch {
                if (!cancelled) {
                    setStatus('error');
                }
            }
        }

        verify();

        return () => {
            cancelled = true;
        };
    }, [token]);

    // Auto-redirect countdown after successful verification
    useEffect(() => {
        if (status !== 'verified') return;

        countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    router.push('/login');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [status, router]);

    // ── Loading State ──────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mb-4" />
                            <p className="text-sm text-neutral-500">Verifying your email…</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Verified State ─────────────────────────────────────────────────────
    if (status === 'verified') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mb-4">
                                <Check className="w-7 h-7 text-success-600" />
                            </div>
                            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                                Email verified successfully!
                            </h1>
                            <p className="text-sm text-neutral-500">
                                Your email has been verified. Redirecting to login in{' '}
                                <span className="font-medium text-primary-600">{countdown}</span> seconds…
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                            Go to Login
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

    // ── Already Verified State ──────────────────────────────────────────────
    if (status === 'already_verified') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                                <Info className="w-7 h-7 text-primary-600" />
                            </div>
                            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                                Already verified
                            </h1>
                            <p className="text-sm text-neutral-500">
                                {alreadyVerifiedMessage || 'Your email is already verified. You can log in now.'}
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                            Go to Login
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

    // ── Expired / Invalid Token State ───────────────────────────────────────
    if (status === 'expired' || status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 rounded-full bg-error-100 flex items-center justify-center mb-4">
                                {status === 'expired' ? (
                                    <AlertTriangle className="w-7 h-7 text-error-600" />
                                ) : (
                                    <X className="w-7 h-7 text-error-600" />
                                )}
                            </div>
                            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                                {status === 'expired'
                                    ? 'Verification link expired'
                                    : 'Invalid verification link'}
                            </h1>
                            <p className="text-sm text-neutral-500">
                                {status === 'expired'
                                    ? 'This verification link has expired. Please request a new one.'
                                    : 'This verification link is invalid. Please request a new one.'}
                            </p>
                        </div>

                        {/* Resend section — link to signup for a new link */}
                        <div className="space-y-3 mb-6">
                            <p className="text-sm text-neutral-600">
                                Need a new verification link?
                            </p>
                            <Link
                                href="/signup"
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                Sign up again to get a new link
                            </Link>
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
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

    // ── Generic Error State ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8 text-center">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-14 h-14 rounded-full bg-error-100 flex items-center justify-center mb-4">
                            <X className="w-7 h-7 text-error-600" />
                        </div>
                        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-neutral-500">
                            {errorMessage || 'An unexpected error occurred during verification. Please try again.'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>
                        <Link
                            href="/signup"
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                            Sign up again
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

function VerifyEmailLoading() {
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

const VerifyEmailPage = () => {
    return (
        <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailContent />
        </Suspense>
    );
};

export default VerifyEmailPage;
