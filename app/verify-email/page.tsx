'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Check, X, Mail, AlertTriangle, Info, ArrowRight, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/components/v2/AuthLayout';
import { verifyEmail, type VerifyEmailResult } from '@/lib/services/authService';

type VerificationStatus = 'loading' | 'verified' | 'already_verified' | 'expired' | 'invalid' | 'error';
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

    useEffect(() => {
        if (!token || token.length < 10) { setStatus('invalid'); return; }
        let cancelled = false;
        async function verify() {
            try {
                const result: VerifyEmailResult = await verifyEmail(token);
                if (cancelled) return;
                switch (result.status) {
                    case 'verified': setStatus('verified'); break;
                    case 'already_verified': setStatus('already_verified'); setAlreadyVerifiedMessage(result.message); break;
                    case 'error':
                        const msg = result.message.toLowerCase();
                        if (msg.includes('expired') || msg.includes('invalid')) setStatus('expired');
                        else setStatus('invalid');
                        setErrorMessage(result.message);
                        break;
                }
            } catch { if (!cancelled) setStatus('error'); }
        }
        verify();
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => {
        if (status !== 'verified') return;
        countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); router.push('/login'); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, [status, router]);

    const renderState = () => {
        // Loading
        if (status === 'loading') return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <div className="w-8 h-8 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin mb-4" style={{ color: 'var(--v2-vermilion)' }} />
                <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Verifying your email…</p>
            </motion.div>
        );

        // Verified
        if (status === 'verified') return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="var(--v2-vermilion-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} /></svg>
                </motion.div>
                <motion.h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Email verified.</motion.h2>
                <motion.p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Redirecting to login in <span style={{ color: 'var(--v2-vermilion)' }}>{countdown}</span>s…</motion.p>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                    <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Go to login <ArrowRight className="w-4 h-4" /></Link>
                </motion.div>
            </motion.div>
        );

        // Already verified
        if (status === 'already_verified') return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,50,27,0.08)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                    <Info className="w-7 h-7" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />
                </motion.div>
                <h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Already verified</h2>
                <p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }}>{alreadyVerifiedMessage || 'Your email is already verified. You can log in now.'}</p>
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Go to login <ArrowRight className="w-4 h-4" /></Link>
            </motion.div>
        );

        // Expired / Invalid
        if (status === 'expired' || status === 'invalid') return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,50,27,0.08)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                    {status === 'expired' ? <AlertTriangle className="w-7 h-7" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} /> : <X className="w-7 h-7" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />}
                </motion.div>
                <h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>{status === 'expired' ? 'Link expired' : 'Invalid link'}</h2>
                <p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }}>{status === 'expired' ? 'This verification link has expired.' : 'This verification link is invalid.'} Please request a new one.</p>
                <div className="space-y-3">
                    <Link href="/signup" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}><Mail className="w-4 h-4" /> Sign up again</Link>
                    <Link href="/login" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px] border" style={{ borderColor: 'var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}><ArrowLeft className="w-4 h-4" /> Back to login</Link>
                </div>
            </motion.div>
        );

        // Generic error
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,50,27,0.08)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                    <X className="w-7 h-7" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />
                </motion.div>
                <h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Something went wrong</h2>
                <p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }}>{errorMessage || 'An unexpected error occurred during verification.'}</p>
                <div className="space-y-3">
                    <Link href="/login" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}><ArrowLeft className="w-4 h-4" /> Back to login</Link>
                    <Link href="/signup" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px] border" style={{ borderColor: 'var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}>Sign up again</Link>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="v2-scope">
            <AuthLayout positioning="Verifying your email address to activate your account.">
                {renderState()}
            </AuthLayout>
        </div>
    );
}

function VerifyEmailLoading() {
    return (
        <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailContent />
        </Suspense>
    );
}
