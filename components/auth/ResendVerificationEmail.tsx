'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { sendVerification } from '@/lib/services/authService';

type ResendStatus = 'idle' | 'loading' | 'sent' | 'rate_limited' | 'error';

type ResendVerificationEmailProps = {
    /** The email address to send the verification link to. */
    email: string;
    /** Optional label for the button. Defaults to "Resend Verification Email". */
    label?: string;
    /** Optional variant for styling. Defaults to 'primary'. */
    variant?: 'primary' | 'secondary' | 'link';
    /** Optional className override. */
    className?: string;
};

/** Cooldown duration in seconds after a successful resend. */
const COOLDOWN_SECONDS = 60;

export function ResendVerificationEmail({
    email,
    label = 'Resend Verification Email',
    variant = 'primary',
    className = '',
}: ResendVerificationEmailProps) {
    const [status, setStatus] = useState<ResendStatus>('idle');
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [rateLimitMessage, setRateLimitMessage] = useState('');
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
            }
        };
    }, []);

    // Cooldown countdown
    useEffect(() => {
        if (cooldownRemaining <= 0) return;

        cooldownTimerRef.current = setInterval(() => {
            setCooldownRemaining((prev) => {
                if (prev <= 1) {
                    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [cooldownRemaining]);

    const handleResend = useCallback(async () => {
        if (status === 'loading' || cooldownRemaining > 0) return;

        setStatus('loading');
        try {
            await sendVerification(email);
            setStatus('sent');
            setCooldownRemaining(COOLDOWN_SECONDS);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send verification email.';
            // Check for rate-limit message
            if (message.toLowerCase().includes('too many') || message.toLowerCase().includes('rate')) {
                setStatus('rate_limited');
                setRateLimitMessage(message);
            } else {
                setStatus('error');
            }
        }
    }, [email, status, cooldownRemaining]);

    const isDisabled = status === 'loading' || cooldownRemaining > 0;

    // Link variant — minimal styling
    if (variant === 'link') {
        return (
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={isDisabled}
                    className={`text-sm font-medium text-primary-600 hover:text-primary-700 underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline transition-colors ${className}`}
                >
                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
                            Sending…
                        </>
                    )}
                    {status === 'sent' && cooldownRemaining > 0 && (
                        <>Email Sent! Resend again in {cooldownRemaining}s</>
                    )}
                    {status === 'rate_limited' && (
                        <>Resend available soon</>
                    )}
                    {(status === 'idle' || status === 'error' || (status === 'sent' && cooldownRemaining === 0)) && (
                        <>
                            <Mail className="w-3.5 h-3.5 inline mr-1" />
                            {label}
                        </>
                    )}
                </button>
                {status === 'sent' && cooldownRemaining === 0 && (
                    <p className="text-xs text-success-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Verification email sent!
                    </p>
                )}
                {status === 'rate_limited' && rateLimitMessage && (
                    <p className="text-xs text-warning-600">{rateLimitMessage}</p>
                )}
                {status === 'error' && (
                    <p className="text-xs text-error-600">Failed to send email. Please try again.</p>
                )}
            </div>
        );
    }

    // Button variants (primary / secondary)
    const baseClasses = variant === 'primary'
        ? 'flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        : 'flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-base font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleResend}
                disabled={isDisabled}
                className={`${baseClasses} ${className}`}
            >
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending…
                    </>
                )}
                {status === 'sent' && cooldownRemaining > 0 && (
                    <>
                        <Mail className="w-4 h-4" />
                        Resend again in {cooldownRemaining}s
                    </>
                )}
                {status === 'rate_limited' && (
                    <>
                        <Mail className="w-4 h-4" />
                        Resend available soon
                    </>
                )}
                {(status === 'idle' || status === 'error' || (status === 'sent' && cooldownRemaining === 0)) && (
                    <>
                        <Mail className="w-4 h-4" />
                        {label}
                    </>
                )}
            </button>
            {status === 'sent' && cooldownRemaining === 0 && (
                <p className="text-xs text-success-600 text-center flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Verification email sent!
                </p>
            )}
            {status === 'rate_limited' && rateLimitMessage && (
                <p className="text-xs text-warning-600 text-center">{rateLimitMessage}</p>
            )}
            {status === 'error' && (
                <p className="text-xs text-error-600 text-center">Failed to send email. Please try again.</p>
            )}
        </div>
    );
}
