'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

const EASE = [0.16, 1, 0.3, 1] as const;
const FAST = 0.15;
const NORMAL = 0.2;

type StatusVariant = 'healthy' | 'warning' | 'critical' | 'active' | 'idle' | 'neutral';

const STATUS_COLORS: Record<StatusVariant, string> = {
  healthy: 'var(--v2-sage)',
  warning: 'var(--v2-vermilion)',
  critical: 'var(--v2-vermilion)',
  active: 'var(--v2-sage)',
  idle: 'var(--v2-paper-ink-2)',
  neutral: 'var(--v2-paper-ink-2)',
};

const INK_STATUS_COLORS: Record<StatusVariant, string> = {
  healthy: 'var(--v2-sage)',
  warning: 'var(--v2-vermilion-lift)',
  critical: 'var(--v2-vermilion-lift)',
  active: 'var(--v2-sage)',
  idle: 'var(--v2-ink-text-2)',
  neutral: 'var(--v2-ink-text-2)',
};

export function StatusDot({
  variant,
  onInk = false,
  pulse = false,
  size = 6,
}: {
  variant: StatusVariant;
  onInk?: boolean;
  pulse?: boolean;
  size?: number;
}) {
  const color = onInk ? INK_STATUS_COLORS[variant] : STATUS_COLORS[variant];
  return (
    <motion.span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color }}
      animate={pulse ? { opacity: [1, 0.4, 1] } : undefined}
      transition={pulse ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
    />
  );
}

export function MetricItem({
  value,
  label,
  trend,
  onInk = false,
}: {
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  onInk?: boolean;
}) {
  const trendColor =
    trend === 'up'
      ? 'var(--v2-sage)'
      : trend === 'down'
        ? 'var(--v2-vermilion)'
        : onInk
          ? 'var(--v2-ink-text-2)'
          : 'var(--v2-paper-ink-2)';

  const ink = onInk ? 'var(--v2-ink-text)' : 'var(--v2-paper-ink)';
  const ink2 = onInk ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-semibold tabular-nums"
          style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.25rem', lineHeight: 1, color: ink }}
        >
          {value}
        </span>
        {trend && (
          <span style={{ fontSize: '0.7rem', color: trendColor, lineHeight: 1 }}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
          </span>
        )}
      </div>
      <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.75rem', color: ink2, lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  );
}

export function SkeletonBlock({
  width = '100%',
  height = 16,
  radius = 4,
  onInk = false,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  onInk?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: onInk ? 'var(--v2-ink-rule-strong)' : 'var(--v2-paper-rule)',
        opacity: 0.6,
        animation: 'v2-metric-breath 1.4s ease-in-out infinite',
      }}
    />
  );
}

export interface KanbanCardData {
  id: string;
  title: string;
  slug?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  assignee?: string;
  timestamp?: string;
}

export function KanbanCard({
  item,
  formatTime,
  onClick,
}: {
  item: KanbanCardData;
  formatTime: (ts?: string) => string;
  onClick?: () => void;
}) {
  const isUrgent = item.priority === 'urgent' || item.priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: NORMAL, ease: EASE }}
      onClick={onClick}
      className="px-3 py-2.5 rounded-[8px] cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.4)',
        border: '1px solid var(--v2-paper-rule)',
      }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.65)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="v2-mono"
          style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {item.slug || 'General'}
        </span>
        {isUrgent && <StatusDot variant="critical" size={5} />}
      </div>
      <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--v2-paper-ink)', marginBottom: '0.5rem' }}>
        {item.title}
      </p>
      <div className="flex items-center justify-between">
        <span className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
          {item.assignee || '—'}
        </span>
        <span className="v2-mono tabular-nums" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
          {formatTime(item.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

export function NavItem({
  href,
  active,
  onClick,
  icon,
  label,
  onInk = false,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  onInk?: boolean;
}) {
  const ink = onInk ? 'var(--v2-ink-text)' : 'var(--v2-paper-ink)';
  const ink2 = onInk ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)';
  const accentColor = onInk ? 'var(--v2-vermilion-lift)' : 'var(--v2-vermilion)';
  const activeBg = onInk ? 'rgba(232,68,46,0.12)' : 'rgba(200,50,27,0.06)';
  const hoverBg = onInk ? 'var(--v2-ink-rule)' : 'rgba(0,0,0,0.025)';

  return (
    <motion.div
      whileHover={{ backgroundColor: active ? activeBg : hoverBg }}
      transition={{ duration: FAST, ease: EASE }}
      style={{
        background: active ? activeBg : 'transparent',
        borderRadius: 8,
      }}
    >
      <a
        href={href}
        onClick={onClick}
        className="flex items-center gap-2.5 px-3 py-2"
        style={{ borderRadius: 8, outline: 'none' }}
      >
        <span style={{ color: active ? accentColor : ink2, flexShrink: 0 }}>{icon}</span>
        <span
          style={{
            fontFamily: 'var(--v2-font-sans)',
            fontSize: '0.82rem',
            fontWeight: active ? 600 : 400,
            color: active ? ink : ink2,
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
      </a>
    </motion.div>
  );
}

const TOOLTIP_EASE = [0.16, 1, 0.3, 1] as const;

export function InfoTooltip({ text, children }: { text: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState(0);

  const TOOLTIP_WIDTH = 176;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const margin = 8;

    const centeredLeft = trigger.left + trigger.width / 2 - TOOLTIP_WIDTH / 2;
    const centeredRight = centeredLeft + TOOLTIP_WIDTH;

    const overflowRight = centeredRight - viewportWidth + margin;
    const overflowLeft = margin - centeredLeft;

    if (overflowRight > 0 && overflowLeft <= 0) {
      setOffset(-overflowRight);
    } else if (overflowLeft > 0 && overflowRight <= 0) {
      setOffset(overflowLeft);
    } else if (overflowRight > 0 && overflowLeft > 0) {
      setOffset(overflowRight > overflowLeft ? -overflowRight : overflowLeft);
    } else {
      setOffset(0);
    }
  }, [open]);

  return (
    <span className="relative inline-flex items-center">
      <span
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        role="button"
        aria-label={text}
        className="inline-flex items-center cursor-help"
        style={{ color: 'var(--v2-paper-ink-2)' }}
      >
        {children || <Info className="w-3 h-3" strokeWidth={1.75} style={{ opacity: 0.6 }} />}
      </span>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.15, ease: TOOLTIP_EASE }}
            className="absolute z-50 top-full left-1/2 mt-1.5 w-44 px-2.5 py-1.5 rounded-[6px] pointer-events-none"
            style={{
              transform: `translateX(calc(-50% + ${offset}px))`,
              background: 'var(--v2-ink-ground)',
              color: 'var(--v2-ink-text)',
              fontFamily: 'var(--v2-font-sans)',
              fontSize: '0.68rem',
              lineHeight: 1.4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

