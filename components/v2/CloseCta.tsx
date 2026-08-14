'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEntryCta } from '@/lib/hooks/useEntryCta';
import { Logo } from '@/components/v2/Logo';

/*
 * CloseCta — paper register, the close.
 * Anchored, quiet, specimen-book registration. One CTA, no manufactured urgency,
 * no social proof the product can't back (PRODUCT.md: no real customers/logos).
 * Auth-aware: shows "Enter the OS" + workspace link if authenticated, otherwise
 * "Sign in to get started" + /login.
 */

export function CloseCta() {
  const { href: ctaHref, label: ctaLabel } = useEntryCta();

  return (
    <section
      className="px-6 md:px-10 pt-28 pb-20 md:pt-40 md:pb-32"
      style={{ background: 'var(--v2-paper-ground)', color: 'var(--v2-paper-ink)', borderTop: 'var(--v2-rule) solid var(--v2-paper-rule)' }}
    >
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-end">
          <motion.h2
            className="v2-display text-[clamp(2.25rem,6vw,4.5rem)]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Run the marketing
            <br />
            output of a team —
            <br />
            <span style={{ color: 'var(--v2-vermilion)' }}>by directing it.</span>
          </motion.h2>

          <motion.div
            className="flex flex-col items-start gap-5"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={ctaHref}
              className="group inline-flex items-center gap-3 px-7 py-3.5 transition-colors"
              style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
            >
              <span className="v2-label text-[12px]">{ctaLabel}</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </Link>
            <p className="v2-mono text-[11px] leading-[1.6]" style={{ color: 'var(--v2-paper-ink-2)', maxWidth: '32ch' }}>
              No credit card. Deploy your first workspace and your first agent in minutes.
            </p>
          </motion.div>
        </div>

        {/* Colophon — specimen-book close */}
        <motion.div
          className="mt-20 md:mt-28 pt-5 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: 'var(--v2-rule) solid var(--v2-paper-rule)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8 }}
        >
          <span className="v2-mono text-[11px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            <Logo variant="wordmark" theme="light" />
          </span>
          <span className="v2-label text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            autonomous agent orchestration
          </span>
        </motion.div>
      </div>
    </section>
  );
}