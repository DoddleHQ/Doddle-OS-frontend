'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/v2/AuthLayout';
import { AuthInput } from '@/components/v2/AuthInput';
import { login, loginForce, sendVerification, getMe, LoginError } from '@/lib/services/authService';
import { useAuth } from '@/lib/contexts/AuthContext';
import { GoogleAuthButton, AuthDivider } from '@/components/v2/GoogleAuthButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Status = 'idle' | 'loading' | 'success';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  state: 'Your Google sign-in link expired or was already used. Please try again.',
  inactive: 'Your account is deactivated. Please contact support.',
  google: 'Google could not complete the sign-in. Please try again.',
  email: 'Google returned an unverified email address. Verify your email with Google, then try again.',
};

export default function LoginPage() {
  const router = useRouter();
  const { loginSuccess } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [signupHref, setSignupHref] = useState('/signup');
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next) setSignupHref(`/signup?next=${encodeURIComponent(next)}`);
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [status, setStatus] = useState<Status>('idle');
  const [apiError, setApiError] = useState('');
  const [activeSession, setActiveSession] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  const routeAfterLogin = async () => {
    let next = new URLSearchParams(window.location.search).get('next');
    if (!next) {
      try {
        next = sessionStorage.getItem('pendingNext');
        if (next) sessionStorage.removeItem('pendingNext');
      } catch { next = null; }
    }
    if (!next) next = '/';
    setTimeout(() => {
      router.push(next);
    }, 1200);
  };

  // Google OAuth return trip: the backend lands on /login either with
  // ?error=<code> (handshake failed) or with auth cookies already set.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      const friendly = GOOGLE_ERROR_MESSAGES[oauthError] ?? 'Please try again.';
      setApiError(`Google sign-in failed. ${friendly}`);
      params.delete('error');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
      return;
    }
    let cancelled = false;
    getMe()
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        routeAfterLogin();
      })
      .catch(() => {
        // Not signed in — normal visit, show the form.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (resendStatus === 'loading' || cooldown > 0) return;
    setResendStatus('loading');
    try {
      await sendVerification(email);
      setResendStatus('sent');
      setCooldown(60);
    } catch (err: unknown) {
      setResendStatus('error');
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!email) {
      e.email = 'Email is required';
    } else if (!EMAIL_RE.test(email)) {
      e.email = 'Enter a valid email address';
    }
    if (!password) {
      e.password = 'Password is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const performLogin = async (force: boolean = false) => {
    setApiError('');
    setActiveSession(false);
    setEmailNotVerified(false);

    if (!validate()) return;

    setStatus('loading');
    try {
      const payload = { email, password, rememberMe };
      let result;
      if (force) {
        result = await loginForce(payload);
      } else {
        result = await login(payload);
      }
      loginSuccess(result);
      setStatus('success');
      await routeAfterLogin();
    } catch (err: unknown) {
      setStatus('idle');
      if (err instanceof LoginError) {
        if (err.status === 409 && err.conflict) {
          setActiveSession(true);
          setApiError(err.conflict.message);
        } else if (err.status === 403 && err.message.toLowerCase().includes('verif')) {
          setEmailNotVerified(true);
          setApiError(err.message);
        } else {
          setApiError(err.message);
        }
      } else {
        setApiError(err instanceof Error ? err.message : 'Unable to connect to the server. Please check your connection and try again.');
      }
    }
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    performLogin(false);
  };

  const handleForceLogin = () => {
    performLogin(true);
  };

  return (
    <div className="v2-scope">
      <AuthLayout positioning="An operating system where strategy reads like a specimen book and runs like a dealing floor.">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <motion.div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--v2-vermilion)' }} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="var(--v2-vermilion-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} /></svg>
              </motion.div>
              <motion.h2 className="v2-display text-[1.75rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>Welcome back.</motion.h2>
              <motion.p className="text-[14px] mb-7" style={{ color: 'var(--v2-paper-ink-2)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Redirecting to your workspaces…</motion.p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} noValidate initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}>
              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="mb-8">
                <h1 className="v2-display text-[2.25rem] leading-[1] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>Sign in</h1>
                <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Access your autonomous agent workspaces.</p>
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
                  <p className="font-semibold mb-1">{apiError}</p>
                  
                  {activeSession && (
                    <button
                      type="button"
                      onClick={handleForceLogin}
                      className="mt-2.5 px-3 py-1.5 v2-label text-[10px] rounded-[4px] hover:opacity-90 active:scale-95 transition-all font-bold cursor-pointer"
                      style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                    >
                      Replace session & continue
                    </button>
                  )}

                  {emailNotVerified && (
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendStatus === 'loading' || cooldown > 0}
                        className="v2-mono text-[11px] underline font-bold hover:opacity-80 disabled:opacity-50 disabled:no-underline flex items-center gap-1.5 cursor-pointer"
                      >
                        {resendStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {resendStatus === 'sent' && cooldown > 0 && `Verification sent. Resend in ${cooldown}s`}
                        {resendStatus === 'idle' && 'Resend Verification Email'}
                        {resendStatus === 'error' && 'Failed to send. Try again.'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="space-y-4 mb-5">
                <AuthInput id="email" label="Email" type="email" value={email} onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }} placeholder="you@company.com" autoComplete="email" error={errors.email} />
                <AuthInput id="password" label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }} placeholder="Enter your password" autoComplete="current-password" error={errors.password}
                  trailing={<button type="button" onClick={() => setShowPassword((s) => !s)} className="p-1 hover:opacity-70 cursor-pointer" aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ color: 'var(--v2-paper-ink-2)' }}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="flex items-center justify-between mb-7">
                <button type="button" onClick={() => setRememberMe((r) => !r)} className="flex items-center gap-2.5 cursor-pointer">
                  <motion.span className="w-9 h-5 rounded-full relative flex-shrink-0" animate={{ backgroundColor: rememberMe ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)' }}>
                    <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: 'var(--v2-paper-ground)', left: rememberMe ? '18px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
                  </motion.span>
                  <span className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Keep me signed in</span>
                </button>
                <Link href="/forgot-password" className="v2-mono text-[12px] hover:underline font-bold" style={{ color: 'var(--v2-vermilion)' }}>Forgot?</Link>
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

              <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="my-5">
                <AuthDivider />
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
                <GoogleAuthButton
                  onNavigate={() => {
                    const next = new URLSearchParams(window.location.search).get('next');
                    if (next) {
                      try { sessionStorage.setItem('pendingNext', next); } catch {}
                    }
                  }}
                />
              </motion.div>

              <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="v2-mono text-[12px] text-center mt-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
                No account? <Link href={signupHref} className="hover:underline font-medium font-bold" style={{ color: 'var(--v2-vermilion)' }}>Create one</Link>
              </motion.p>
            </motion.form>
          )}
        </AnimatePresence>
      </AuthLayout>
    </div>
  );
}
