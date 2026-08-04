import { TAPE_EVENTS, type TapeEvent, type TapeTone } from './content';

/*
 * TapeTicker — the terminal's heartbeat.
 * A continuous mono event stream of real agent-to-agent handoffs, drawn from
 * the project's own thread + activity data (content.ts). Lives in both
 * registers: paper (muted) above the fold, ink (live vermilion) below.
 *
 * HYDRATION SAFETY: the marquee is a pure/stateless server component (no
 * 'use client', no useState/useEffect) — it renders identical static output on
 * server and client, so it can NEVER cause a hydration mismatch. Only the
 * 'tail' variant needs client interactivity; it lives in a separate file with
 * a mounted() gate so its dynamic content only appears after hydration.
 */

export function toneColor(tone: TapeTone, onInk?: boolean) {
  if (tone === 'conflict') return onInk ? 'var(--v2-vermilion-lift)' : 'var(--v2-vermilion)';
  if (tone === 'complete') return 'var(--v2-sage)';
  if (tone === 'artifact') return onInk ? 'var(--v2-ink-text)' : 'var(--v2-paper-ink)';
  return onInk ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)';
}

export function TapeRow({ e, onInk }: { e: TapeEvent; onInk?: boolean }) {
  const c = toneColor(e.tone, onInk);
  return (
    <span className="v2-mono inline-flex items-center gap-3 whitespace-nowrap text-[12px] md:text-[13px]">
      <span style={{ color: onInk ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)' }}>{e.from}</span>
      <span style={{ color: c }}>→</span>
      <span style={{ color: onInk ? 'var(--v2-ink-text)' : 'var(--v2-paper-ink)' }}>{e.to}</span>
      <span className="v2-label" style={{ color: c, letterSpacing: '0.08em' }}>
        {e.action}
      </span>
      <span style={{ color: onInk ? 'var(--v2-ink-rule-strong)' : 'var(--v2-paper-rule-strong)' }}>·</span>
    </span>
  );
}

interface TapeTickerProps {
  onInk?: boolean;
  variant?: 'marquee' | 'tail';
  className?: string;
}

export function TapeTicker({ onInk, variant = 'marquee', className = '' }: TapeTickerProps) {
  if (variant === 'tail') {
    // Lazy-load the client-only tail to keep this file server-safe.
    const Tail = require('./TapeTail').TapeTail as (p: { onInk?: boolean; className?: string }) => JSX.Element;
    return <Tail onInk={onInk} className={className} />;
  }

  // Marquee — pure, stateless, identical on server and client.
  const loop = [...TAPE_EVENTS, ...TAPE_EVENTS];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderBottom: onInk ? 'var(--v2-rule) solid var(--v2-ink-rule)' : 'var(--v2-rule) solid var(--v2-paper-rule)',
      }}
      aria-label="Live agent activity tape"
    >
      <div className="flex w-max gap-6 py-2.5" style={{ animation: 'v2-tape-scroll 48s linear infinite' }}>
        {loop.map((e, i) => (
          <TapeRow key={i} e={e} onInk={onInk} />
        ))}
      </div>
    </div>
  );
}
