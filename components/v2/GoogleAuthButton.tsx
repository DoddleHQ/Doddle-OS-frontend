'use client';

import { motion } from 'motion/react';
import { GOOGLE_LOGIN_URL } from '@/lib/services/authService';

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A8.99 8.99 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.09l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

interface GoogleAuthButtonProps {
  /** Stash any ?next= param before the browser leaves for Google. */
  onNavigate?: () => void;
}

export function GoogleAuthButton({ onNavigate }: GoogleAuthButtonProps) {
  return (
    <motion.a
      href={GOOGLE_LOGIN_URL}
      onClick={onNavigate}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 v2-label text-[12px] rounded-[10px] no-underline"
      style={{
        background: 'var(--v2-paper-ground)',
        color: 'var(--v2-paper-ink)',
        border: '1px solid var(--v2-paper-rule-strong)',
        cursor: 'pointer',
      }}
    >
      <GoogleG />
      Continue with Google
    </motion.a>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="flex-1 h-px" style={{ background: 'var(--v2-paper-rule-strong)' }} />
      <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
        or
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--v2-paper-rule-strong)' }} />
    </div>
  );
}
