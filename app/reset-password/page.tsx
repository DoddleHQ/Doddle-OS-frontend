'use client';

import { Suspense, useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Eye, EyeOff, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/v2/AuthLayout';
import { AuthInput } from '@/components/v2/AuthInput';
import { validateResetToken, resetPassword } from '@/lib/services/authService';

const PASSWORD_RULES = [
    { label: '8–15 characters', test: (p: string) => /^.{8,15}$/.test(p) },
    { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'At least one digit', test: (p: string) => /[0-9]/.test(p) },
    { label: 'No whitespace', test: (p: string) => p.length > 0 && !/\s/.test(p) },
    { label: 'ASCII characters only', test: (p: string) => p.length > 0 && /^[\x20-\x7E]+$/.test(p) },
];

type PageState = 'validating' | 'invalid_token' | 'reset_form' | 'success' | 'error';

function ResetPasswordContent() {
    const searchParams = useSearchParamsWrapper();
    const token = searchParams.get('token') || '';

    const [pageState, setPageState] = useState<PageState>('validating');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token || token.length < 10) {
            setPageState('invalid_token');
            return;
        }
        let cancelled = false;
        async function validate() {
            try {
                const valid = await validateResetToken(token);
                if (!cancelled) setPageState(valid ? 'reset_form' : 'invalid_token');
            } catch {
                if (!cancelled) setPageState('invalid_token');
            }
        }
        validate();
        return () => { cancelled = true; };
    }, [token]);

    const passedCount = password ? PASSWORD_RULES.filter((r) => r.test(password)).length : 0;
    const strengthLabel = passedCount <= 2 ? 'Weak' : passedCount <= 4 ? 'Medium' : 'Strong';
    const strengthColor = passedCount <= 2 ? 'var(--v2-vermilion)' : passedCount <= 4 ? 'var(--v2-paper-ink)' : 'var(--v2-sage)';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setApiError('');
        setError('');
        if (!password) { setError('Password is required'); return; }
        if (!PASSWORD_RULES.every((r) => r.test(password))) { setError('Password does not meet all requirements'); return; }
        setIsLoading(true);
        try {
            await resetPassword(token, password);
            setPageState('success');
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setPageState('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="v2-scope">
            <AuthLayout positioning="Set a new password to regain access to your autonomous agent workspaces.">
                <AnimatePresence mode="wait">
                    {/* Validating */}
                    {pageState === 'validating' && (
                        <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                            <div className="w-8 h-8 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin mb-4" style={{ color: 'var(--v2-vermilion)' }} />
                            <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Validating reset link…</p>
                        </motion.div>
                    )}

                    {/* Invalid token */}
                    {pageState === 'invalid_token' && (
                        <motion.div key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                            <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,50,27,0.08)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                                <X className="w-7 h-7" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />
                            </motion.div>
                            <h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Invalid or expired link</h2>
                            <p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }}>This password reset link is invalid or has expired. Please request a new one.</p>
                            <div className="space-y-3">
                                <Link href="/forgot-password" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Request new link <ArrowRight className="w-4 h-4" /></Link>
                                <Link href="/login" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[11px] rounded-[10px] border" style={{ borderColor: 'var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}><ArrowLeft className="w-4 h-4" /> Back to login</Link>
                            </div>
                        </motion.div>
                    )}

                    {/* Success */}
                    {pageState === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                            <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="var(--v2-vermilion-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} /></svg>
                            </motion.div>
                            <motion.h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Password reset.</motion.h2>
                            <motion.p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Your password has been updated. Log in with your new password.</motion.p>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Go to login <ArrowRight className="w-4 h-4" /></Link>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Form + error states */}
                    {(pageState === 'reset_form' || pageState === 'error') && (
                        <motion.form key="form" onSubmit={handleSubmit} noValidate initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
                            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-7">
                                <h1 className="v2-display text-[2.25rem] leading-[1] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>New password</h1>
                                <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Enter your new password below.</p>
                            </motion.div>

                            {apiError && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-5 border text-[13px] rounded-[8px] v2-mono" style={{ borderColor: 'var(--v2-vermilion)', background: 'rgba(200,50,27,0.04)', color: 'var(--v2-vermilion)' }}>
                                    <p className="font-semibold">{apiError}</p>
                                </motion.div>
                            )}

                            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-4">
                                <AuthInput id="password" label="New password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setError(''); }} placeholder="8–15 characters" autoComplete="new-password" error={error || undefined}
                                    trailing={<button type="button" onClick={() => setShowPassword((s) => !s)} className="p-1 hover:opacity-70" aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ color: 'var(--v2-paper-ink-2)' }}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
                            </motion.div>

                            {/* Strength meter */}
                            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mb-7">
                                <AnimatePresence>
                                    {password.length > 0 && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--v2-paper-rule)' }}>
                                                    <motion.div className="h-full rounded-full" animate={{ width: `${(passedCount / PASSWORD_RULES.length) * 100}%`, backgroundColor: strengthColor }} transition={{ duration: 0.3 }} />
                                                </div>
                                                <span className="v2-label text-[9px] min-w-[3.5rem] text-right" style={{ color: strengthColor }}>{strengthLabel}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                                {PASSWORD_RULES.map((rule, i) => {
                                                    const passed = rule.test(password);
                                                    return (
                                                        <div key={i} className="flex items-center gap-2 v2-mono text-[10.5px]">
                                                            <motion.span animate={{ scale: passed ? [0.6, 1.2, 1] : 1 }} transition={{ duration: 0.3 }} style={{ color: passed ? 'var(--v2-sage)' : 'var(--v2-paper-rule-strong)' }}>
                                                                {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                            </motion.span>
                                                            <span style={{ color: passed ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)' }}>{rule.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.button type="submit" disabled={isLoading} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: isLoading ? 1 : 1.01 }} whileTap={{ scale: isLoading ? 1 : 0.99 }}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[12px] rounded-[10px]"
                                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', opacity: isLoading ? 0.85 : 1, cursor: isLoading ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Resetting…</motion.span>
                                    ) : (
                                        <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><Lock className="w-4 h-4" /> Reset password</motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            <p className="v2-mono text-[12px] text-center mt-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                Remember your password? <Link href="/login" className="hover:underline font-medium font-bold" style={{ color: 'var(--v2-vermilion)' }}>Sign in</Link>
                            </p>
                        </motion.form>
                    )}
                </AnimatePresence>
            </AuthLayout>
        </div>
    );
}

// Wrapper for useSearchParams (needs Suspense)
function useSearchParamsWrapper() {
    return useSearchParams();
}

function ResetPasswordLoading() {
    return (
        <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordLoading />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
