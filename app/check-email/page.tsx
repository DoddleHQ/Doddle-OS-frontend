'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, Copy, Check, Sparkles, Lock, ShieldCheck } from 'lucide-react';
import { ResendVerificationEmail } from '@/components/auth/ResendVerificationEmail';

function CheckEmailContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const [copied, setCopied] = useState(false);

    const handleCopyEmail = async () => {
        if (!email) return;
        try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = email;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                            <Mail className="w-7 h-7 text-primary-600" />
                        </div>
                        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
                            Check your email
                        </h1>
                        <p className="text-sm text-neutral-500 text-center">
                            We&apos;ve sent a verification link to your email address.{' '}
                            Click the link to activate your account.
                        </p>
                    </div>

                    {/* Email display with copy button */}
                    {email && (
                        <div className="mb-6">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
                                Verification sent to
                            </label>
                            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                                <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                                <span className="flex-1 text-sm font-medium text-neutral-900 truncate">
                                    {email}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyEmail}
                                    className="shrink-0 p-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:text-primary-600 transition-colors"
                                    aria-label="Copy email address"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-success-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tips */}
                    <div className="mb-6 space-y-2">
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Tips
                        </p>
                        <ul className="space-y-1.5">
                            <li className="flex items-start gap-2 text-sm text-neutral-600">
                                <ShieldCheck className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                                Check your spam or junk folder
                            </li>
                            <li className="flex items-start gap-2 text-sm text-neutral-600">
                                <ShieldCheck className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                                The verification link expires in 24 hours
                            </li>
                        </ul>
                    </div>

                    {/* Resend verification */}
                    {email && (
                        <div className="mb-6">
                            <p className="text-sm text-neutral-600 mb-3">
                                Didn&apos;t receive the email?
                            </p>
                            <ResendVerificationEmail
                                email={email}
                                variant="secondary"
                            />
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-neutral-100 my-6" />

                    {/* Actions */}
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
                            Sign up with a different email
                        </Link>
                    </div>

                    {/* Security badge */}
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Enterprise-grade security</span>
                    </div>
                </div>

                {/* Branding */}
                <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-neutral-500">Doddle OS</span>
                </div>
            </div>
        </div>
    );
}

function CheckEmailLoading() {
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

const CheckEmailPage = () => {
    return (
        <Suspense fallback={<CheckEmailLoading />}>
            <CheckEmailContent />
        </Suspense>
    );
};

export default CheckEmailPage;
