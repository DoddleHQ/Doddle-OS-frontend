'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Logo } from '@/components/v2/Logo';
import { FlowingThreads } from './FlowingThreads';

/*
 * AuthLayout — flowing threads on paper.
 *
 * Full-viewport PAPER register. The FlowingThreads canvas fills the
 * background: thin ink threads weave slowly, a vermilion glow travels along
 * one every few seconds. The form sits centered in a calm clearing where
 * thread density drops.
 *
 * Responsive: on short viewports the layout scrolls (overflow-y auto) so the
 * form is never clipped. Absolute elements (wordmark, live indicator) are
 * positioned with responsive spacing. The canvas is fixed-position so it
 * covers the viewport during scroll, not the document.
 */

export function AuthLayout({ children, positioning }: { children: React.ReactNode; positioning: string }) {
  return (
    <div
      className="v2-scope min-h-screen relative flex items-center justify-center py-24 md:py-0"
      style={{ background: 'var(--v2-paper-ground)' }}
    >
      {/* === BACKGROUND — flowing threads (fixed, covers viewport during scroll) === */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FlowingThreads />
      </div>

      {/* === WORDMARK — top-left === */}
      <Link href="/" className="fixed top-5 left-5 md:top-8 md:left-10 z-20">
        <motion.span
          className="v2-display text-[1.125rem] md:text-[1.5rem] block"
          style={{ color: 'var(--v2-paper-ink)' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Logo variant="wordmark" theme="light" />
        </motion.span>
      </Link>

      {/* === LIVE INDICATOR — bottom-left (desktop only) === */}
      <motion.div
        className="fixed bottom-8 left-10 z-20 max-w-sm hidden lg:block"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--v2-vermilion)' }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="v2-label text-[9px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            Live · agent handoff network
          </span>
        </div>
        <p className="v2-display text-[clamp(1rem,1.5vw,1.25rem)] leading-[1.2]" style={{ color: 'var(--v2-paper-ink-2)' }}>
          {positioning}
        </p>
      </motion.div>

      {/* === THE FORM — centered, scrollable === */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] mx-5 md:mx-6 p-6 md:p-9"
        style={{
          background: 'rgba(239,231,214,0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid var(--v2-paper-rule)',
          borderRadius: '16px',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}