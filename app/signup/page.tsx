'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Check, X, ArrowRight, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/v2/AuthLayout';
import { AuthInput } from '@/components/v2/AuthInput';
import { signup } from '@/lib/services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = [
  { label: '8–15 characters', test: (p: string) => /^.{8,15}$/.test(p) },
  { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least one digit', test: (p: string) => /[0-9]/.test(p) },
  { label: 'No whitespace', test: (p: string) => p.length > 0 && !/\s/.test(p) },
  { label: 'ASCII characters only', test: (p: string) => p.length > 0 && /^[\x20-\x7E]+$/.test(p) },
];
type Status = 'idle' | 'loading' | 'success';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [status, setStatus] = useState<Status>('idle');
  const [apiError, setApiError] = useState('');
  const router = useRouter();

  const passedCount = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strengthLabel = passedCount <= 2 ? 'Weak' : passedCount <= 4 ? 'Medium' : 'Strong';
  const strengthColor = passedCount <= 2 ? 'var(--v2-vermilion)' : passedCount <= 4 ? 'var(--v2-paper-ink)' : 'var(--v2-sage)';

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email) e.email = 'Email is required';
    else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (!PASSWORD_RULES.every((r) => r.test(password))) e.password = 'Password does not meet all requirements';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    
    setStatus('loading');
    try {
      await signup({ name, email, password });
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setStatus('idle');
      setApiError(err instanceof Error ? err.message : 'Unable to complete signup. Please check your connection and try again.');
    }
  };

  return (
    <div className="v2-scope">
      <AuthLayout positioning="Deploy a fleet of specialized agents. Watch them hand the work to each other. Approve what ships.">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                <Mail className="w-7 h-7" style={{ color: 'var(--v2-vermilion-ink)' }} strokeWidth={1.5} />
              </motion.div>
              <motion.h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Check your email.</motion.h2>
              <motion.p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                We&rsquo;ve sent a verification link to <span className="v2-mono" style={{ color: 'var(--v2-paper-ink)' }}>{email}</span>.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px]" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>Back to sign in <ArrowRight className="w-4 h-4" /></Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} noValidate initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-7">
                <h1 className="v2-display text-[2.25rem] leading-[1] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Create your account</h1>
                <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Set up your organization and deploy your first agent.</p>
              </motion.div>

              {/* Impeccable design error alert container */}
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

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="space-y-4 mb-4">
                <AuthInput id="name" label="Full name" value={name} onChange={(v) => { setName(v); setErrors((p) => ({ ...p, name: undefined })); }} placeholder="Your name" autoComplete="name" error={errors.name} />
                <AuthInput id="email" label="Email" type="email" value={email} onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="you@company.com" autoComplete="email" error={errors.email} />
                <AuthInput id="password" label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }} placeholder="Create a password" autoComplete="new-password" error={errors.password}
                  trailing={<button type="button" onClick={() => setShowPassword((s) => !s)} className="p-1 hover:opacity-70 cursor-pointer" aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ color: 'var(--v2-paper-ink-2)' }}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mb-7">
                <AnimatePresence>
                  {password.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--v2-paper-rule)' }}>
                          <motion.div className="h-full rounded-full" animate={{ width: `${(passedCount / PASSWORD_RULES.length) * 100}%`, backgroundColor: strengthColor }} transition={{ duration: 0.3 }} />
                        </div>
                        <motion.span key={strengthLabel} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="v2-label text-[9px] min-w-[3.5rem] text-right" style={{ color: strengthColor }}>{strengthLabel}</motion.span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {PASSWORD_RULES.map((rule, i) => {
                          const passed = rule.test(password);
                          return (
                            <motion.div key={i} layout className="flex items-center gap-2 v2-mono text-[10.5px]">
                              <motion.span animate={{ scale: passed ? [0.6, 1.2, 1] : 1, rotate: passed ? [0, -10, 0] : 0 }} transition={{ duration: 0.3 }} style={{ color: passed ? 'var(--v2-sage)' : 'var(--v2-paper-rule-strong)' }}>
                                {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </motion.span>
                              <span style={{ color: passed ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)' }}>{rule.label}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.button type="submit" disabled={status === 'loading'} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: status === 'loading' ? 1 : 1.01 }} whileTap={{ scale: status === 'loading' ? 1 : 0.99 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[12px] rounded-[10px]"
                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', opacity: status === 'loading' ? 0.85 : 1, cursor: status === 'loading' ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(200,50,27,0.2)' }}>
                <AnimatePresence mode="wait">
                  {status === 'loading' ? (
                    <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Creating account…</motion.span>
                  ) : (
                    <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">Create account <ArrowRight className="w-4 h-4" /></motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="v2-mono text-[12px] text-center mt-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
                Already have an account? <Link href="/login" className="hover:underline font-medium font-bold" style={{ color: 'var(--v2-vermilion)' }}>Sign in</Link>
              </motion.p>
              <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="v2-mono text-[10px] text-center mt-4" style={{ color: 'var(--v2-paper-ink-2)' }}>
                By continuing, you agree to our{' '}
                <Link href="/terms" className="hover:underline font-medium" style={{ color: 'var(--v2-vermilion)' }}>Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" className="hover:underline font-medium" style={{ color: 'var(--v2-vermilion)' }}>Privacy Policy</Link>.
              </motion.p>
            </motion.form>
          )}
        </AnimatePresence>
      </AuthLayout>
    </div>
  );
}
