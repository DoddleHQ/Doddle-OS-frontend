'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight } from 'lucide-react';
import { AuthLayout } from '@/components/v2/AuthLayout';
import { AuthInput } from '@/components/v2/AuthInput';
import { forgotPassword } from '@/lib/services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Status = 'idle' | 'loading' | 'success';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [status, setStatus] = useState<Status>('idle');
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: typeof errors = {};
    if (!email) {
      e.email = 'Email is required';
    } else if (!EMAIL_RE.test(email)) {
      e.email = 'Enter a valid email address';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;

    setStatus('loading');
    try {
      await forgotPassword(email);
      setStatus('success');
    } catch (err: unknown) {
      setStatus('idle');
      setApiError(err instanceof Error ? err.message : 'Unable to send reset link. Please check your connection and try again.');
    }
  };

  return (
    <div className="v2-scope">
      <AuthLayout positioning="Enter your email to request a password reset. Manage your strategy without boundaries.">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                <Mail className="w-7 h-7" style={{ color: 'var(--v2-vermilion-ink)' }} strokeWidth={1.5} />
              </motion.div>
              <motion.h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Check your email.</motion.h2>
              <motion.p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                If an account exists for <span className="v2-mono" style={{ color: 'var(--v2-paper-ink)' }}>{email}</span>, we have sent a password reset link.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Back to sign in <ArrowRight className="w-4 h-4" /></Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} noValidate initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-7">
                <h1 className="v2-display text-[2.25rem] leading-[1] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Reset password</h1>
                <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Enter your email and we&rsquo;ll send you a password reset link.</p>
              </motion.div>

              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 mb-5 border text-[13px] leading-relaxed rounded-[8px] v2-mono"
                  style={{
                    borderColor: 'var(--v2-vermilion)',
                    background: 'rgba(200, 50, 27, 0.04)',
                    color: 'var(--v2-vermilion)',
                  }}
                >
                  <p className="font-semibold">{apiError}</p>
                </motion.div>
              )}

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="space-y-4 mb-6">
                <AuthInput id="email" label="Email" type="email" value={email} onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="you@company.com" autoComplete="email" error={errors.email} />
              </motion.div>

              <motion.button type="submit" disabled={status === 'loading'} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: status === 'loading' ? 1 : 1.01 }} whileTap={{ scale: status === 'loading' ? 1 : 0.99 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[12px] rounded-[10px]"
                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', opacity: status === 'loading' ? 0.85 : 1, cursor: status === 'loading' ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>
                <AnimatePresence mode="wait">
                  {status === 'loading' ? (
                    <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Sending link…</motion.span>
                  ) : (
                    <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">Send reset link <ArrowRight className="w-4 h-4" /></motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="v2-mono text-[12px] text-center mt-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
                Remember your password? <Link href="/login" className="hover:underline font-medium font-bold" style={{ color: 'var(--v2-vermilion)' }}>Sign in</Link>
              </motion.p>
            </motion.form>
          )}
        </AnimatePresence>
      </AuthLayout>
    </div>
  );
}
