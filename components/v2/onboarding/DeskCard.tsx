'use client';

import { motion } from 'motion/react';

/*
 * DeskCard — the animated paper card for the Agent's Desk onboarding.
 *
 * Each card materializes with Motion Design's Premium archetype choreography:
 *   1. Anticipation: slight pull-back (y: -5px, 100ms)
 *   2. Arc entry: rise with 10px perpendicular offset + fade (350ms, cubic-bezier)
 *   3. Settle: drop to final position with shadow expand (secondary action, 50ms after)
 *
 * Variants:
 *   - agent: paper card, ink text, left-aligned (the brand strategist speaks)
 *   - user: vermilion-tinted card, right-aligned (your answer)
 *   - system: centered pill, mono text (status messages)
 *   - summary: full-width card with markdown-like formatted content
 */

export type CardVariant = 'agent' | 'user' | 'system' | 'summary';

interface DeskCardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  delay?: number;
}

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

const variantStyles: Record<CardVariant, { bg: string; color: string; align: string; border: string; radius: string; maxWidth: string }> = {
  agent: {
    bg: 'rgba(255,255,255,0.45)',
    color: 'var(--v2-paper-ink)',
    align: 'self-start',
    border: '1px solid var(--v2-paper-rule)',
    radius: '12px 12px 12px 4px',
    maxWidth: '85%',
  },
  user: {
    bg: 'rgba(200,50,27,0.06)',
    color: 'var(--v2-paper-ink)',
    align: 'self-end',
    border: '1px solid rgba(200,50,27,0.15)',
    radius: '12px 12px 4px 12px',
    maxWidth: '85%',
  },
  system: {
    bg: 'transparent',
    color: 'var(--v2-paper-ink-2)',
    align: 'self-center',
    border: 'none',
    radius: '9999px',
    maxWidth: '90%',
  },
  summary: {
    bg: 'rgba(255,255,255,0.5)',
    color: 'var(--v2-paper-ink)',
    align: 'self-start',
    border: '1px solid var(--v2-paper-rule-strong)',
    radius: '16px',
    maxWidth: '100%',
  },
};

export function DeskCard({ variant = 'agent', children, delay = 0 }: DeskCardProps) {
  const s = variantStyles[variant];

  if (variant === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay, ease: PREMIUM_EASE }}
        className={`flex ${s.align} my-2`}
      >
        <div className="px-3 py-1 v2-mono text-[11px] rounded-full" style={{ border: '1px solid var(--v2-paper-rule)', color: s.color }}>
          {children}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      // Anticipation → Arc entry → Settle choreography
      initial={{ opacity: 0, y: 24, x: variant === 'user' ? 10 : -10, rotate: variant === 'user' ? 1 : -0.5 }}
      animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: PREMIUM_EASE,
      }}
      className={`flex ${s.align} mb-3 w-full`}
    >
      <motion.div
        className="px-4 py-3"
        style={{
          background: s.bg,
          color: s.color,
          border: s.border,
          borderRadius: s.radius,
          maxWidth: s.maxWidth,
        }}
        // Secondary action: shadow settles 50ms after the card arrives
        initial={{ boxShadow: '0 0 0 0 rgba(0,0,0,0)' }}
        animate={{ boxShadow: '0 2px 12px 0 rgba(0,0,0,0.04)' }}
        transition={{ duration: 0.3, delay: delay + 0.15, ease: PREMIUM_EASE }}
      >
        {variant === 'agent' && (
          <div className="mb-1.5">
            <span className="v2-label text-[8px]" style={{ color: 'var(--v2-vermilion)' }}>GTM Strategist</span>
          </div>
        )}
        <div className="text-[14px] leading-[1.55]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/*
 * AgentTyping — the ambient pulse indicator shown while the agent "thinks".
 * Motion Design: ambient continuous pattern, sine ease-in-out, 1.4s loop.
 */
export function AgentTyping() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: PREMIUM_EASE }}
      className="flex self-start mb-3"
    >
      <div className="flex items-center gap-2 px-4 py-3 rounded-[12px_12px_12px_4px]" style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid var(--v2-paper-rule)' }}>
        <div className="flex items-center gap-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--v2-paper-ink-2)' }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
