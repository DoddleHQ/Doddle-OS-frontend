'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../landing/AuthLayout';
import { AuthInput } from '../landing/AuthInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Status = 'idle' | 'loading' | 'success';

export default function V2LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [status, setStatus] = useState<Status>('idle');

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1100);
  };

  return (
    <AuthLayout positioning="An operating system where strategy reads like a specimen book and runs like a dealing floor.">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="var(--v2-vermilion-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} /></svg>
            </motion.div>
            <motion.h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Welcome back.</motion.h2>
            <motion.p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Redirecting to your workspaces… <span className="v2-mono text-[10px]">(demo)</span></motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <Link href="/v2" className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Enter the OS <ArrowRight className="w-4 h-4" /></Link>
            </motion.div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} noValidate initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-8">
              <h1 className="v2-display text-[2.25rem] leading-[1] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Sign in</h1>
              <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Access your autonomous agent workspaces.</p>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="space-y-4 mb-5">
              <AuthInput id="email" label="Work email" type="email" value={email} onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="you@company.com" autoComplete="email" error={errors.email} />
              <AuthInput id="password" label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }} placeholder="Enter your password" autoComplete="current-password" error={errors.password}
                trailing={<button type="button" onClick={() => setShowPassword((s) => !s)} className="p-1 hover:opacity-70" aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ color: 'var(--v2-paper-ink-2)' }}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="flex items-center justify-between mb-7">
              <button type="button" onClick={() => setRememberMe((r) => !r)} className="flex items-center gap-2.5">
                <motion.span className="w-9 h-5 rounded-full relative flex-shrink-0" animate={{ backgroundColor: rememberMe ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)' }}>
                  <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: 'var(--v2-paper-ground)', left: rememberMe ? '18px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
                </motion.span>
                <span className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Keep me signed in</span>
              </button>
              <Link href="/v2" className="v2-mono text-[12px] hover:underline" style={{ color: 'var(--v2-vermilion)' }}>Forgot?</Link>
            </motion.div>

            <motion.button type="submit" disabled={status === 'loading'} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: status === 'loading' ? 1 : 1.01 }} whileTap={{ scale: status === 'loading' ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[12px] rounded-[10px]"
              style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', opacity: status === 'loading' ? 0.85 : 1, cursor: status === 'loading' ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>
              <AnimatePresence mode="wait">
                {status === 'loading' ? (
                  <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Signing in…</motion.span>
                ) : (
                  <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="v2-mono text-[12px] text-center mt-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
              No account? <Link href="/v2/signup" className="hover:underline font-medium" style={{ color: 'var(--v2-vermilion)' }}>Create one</Link>
            </motion.p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
