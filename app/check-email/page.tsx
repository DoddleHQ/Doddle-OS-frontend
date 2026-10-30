'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Mail, Copy, Check, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/v2/AuthLayout';
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
        <div className="v2-scope">
            <AuthLayout positioning="Check your inbox for a verification link to activate your account.">
                <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}>
                    <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="text-center mb-6">
                        <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                            <Mail className="w-7 h-7" style={{ color: 'var(--v2-vermilion-ink)' }} strokeWidth={1.5} />
                        </motion.div>
                        <h1 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Check your email</h1>
                        <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>We&rsquo;ve sent a verification link to activate your account.</p>
                    </motion.div>

                    {email && (
                        <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-6">
                            <span className="v2-label text-[9px] block mb-1.5" style={{ color: 'var(--v2-paper-ink-2)' }}>Sent to</span>
                            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] border" style={{ borderColor: 'var(--v2-paper-rule-strong)', background: 'rgba(255,255,255,0.35)' }}>
                                <span className="flex-1 text-[14px] truncate v2-mono" style={{ color: 'var(--v2-paper-ink)' }}>{email}</span>
                                <button type="button" onClick={handleCopyEmail} className="p-1 hover:opacity-70 transition-opacity" aria-label="Copy email address" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                    {copied ? <Check className="w-4 h-4" style={{ color: 'var(--v2-sage)' }} /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mb-6">
                        <div className="space-y-2">
                            <div className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--v2-paper-rule-strong)' }} />
                                Check your spam or junk folder
                            </div>
                            <div className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--v2-paper-rule-strong)' }} />
                                The verification link expires in 24 hours
                            </div>
                        </div>
                    </motion.div>

                    {email && (
                        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mb-6">
                            <p className="text-[13px] mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>Didn&rsquo;t receive the email?</p>
                            <ResendVerificationEmail email={email} variant="secondary" />
                        </motion.div>
                    )}

                    <div className="border-t mb-6" style={{ borderColor: 'var(--v2-paper-rule)' }} />

                    <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="space-y-3">
                        <Link href="/login" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>
                            <ArrowLeft className="w-4 h-4" /> Back to login
                        </Link>
                        <Link href="/signup" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px] border" style={{ borderColor: 'var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}>
                            Sign up with a different email <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </AuthLayout>
        </div>
    );
}

function CheckEmailLoading() {
    return (
        <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
        </div>
    );
}

export default function CheckEmailPage() {
    return (
        <Suspense fallback={<CheckEmailLoading />}>
            <CheckEmailContent />
        </Suspense>
    );
}
