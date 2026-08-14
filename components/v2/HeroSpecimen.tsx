'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { TapeTicker } from './TapeTicker';
import { Logo } from '@/components/v2/Logo';
import { useEntryCta } from '@/lib/hooks/useEntryCta';

gsap.registerPlugin(useGSAP);

/*
 * HeroSpecimen — the thesis viewport (paper register).
 * The Instrument Serif display rises and locks into place one line at a time
 * (specimen sheets being laid down), vermilion lands last. No eyebrow, no
 * gradient text, no chrome. The register shift to ink waits one scroll.
 */

const LINES = [
  { text: 'An operating system', accent: false },
  { text: 'for autonomous', accent: false },
  { text: 'marketing agents.', accent: true },
];

export function HeroSpecimen() {
  const heroRef = useRef<HTMLElement>(null);
  const { href: ctaHref, label: ctaLabel } = useEntryCta();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Reduced-motion: no reveal mask. Lines sit in normal flow immediately,
      // so descenders are never clipped.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        const wraps = gsap.utils.toArray<HTMLElement>('.v2-hero-mask');
        wraps.forEach((w) => { w.style.overflow = 'visible'; });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const lines = gsap.utils.toArray<HTMLElement>('.v2-hero-line');
        const wraps = gsap.utils.toArray<HTMLElement>('.v2-hero-mask');
        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          // Once the reveal completes, drop the overflow mask so serif
          // descenders (g, j, p, y) render fully at rest — they were being
          // clipped by the per-line mask in its resting state.
          onComplete: () => {
            wraps.forEach((w) => { w.style.overflow = 'visible'; });
          },
        });
        tl.from(lines, { yPercent: 120, opacity: 0, duration: 0.9, stagger: 0.12 })
          .from('.v2-hero-meta', { y: 16, opacity: 0, duration: 0.7 }, '-=0.4')
          .from('.v2-hero-rule', { scaleX: 0, transformOrigin: 'left center', duration: 0.7, ease: 'power2.out' }, '-=0.5');
        return () => tl.kill();
      });
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col"
      style={{ background: 'var(--v2-paper-ground)', color: 'var(--v2-paper-ink)' }}
    >
      {/* Top edge: the tape (terminal motif on paper, muted) */}
      <div className="px-6 md:px-10 pt-5">
        <div className="flex items-center justify-between">
          <span className="v2-label text-[11px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            <Logo variant="wordmark" theme="light" />
          </span>
          <span className="v2-mono text-[11px] hidden md:inline" style={{ color: 'var(--v2-paper-ink-2)' }}>
            autonomous agent orchestration
          </span>
        </div>
      </div>
      <TapeTicker />

      {/* Hero body */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-10 pt-10 pb-8">
        <div className="max-w-[1180px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-end">
          {/* Display — Instrument Serif, revealed line by line.
              The per-line mask (overflow-hidden) is ONLY active during the GSAP
              reveal; onComplete clears it to 'visible' so serif descenders (the
              'g' in 'marketing') are never clipped at rest. Reduced-motion skips
              the mask entirely. */}
          <h1 className="v2-display text-[clamp(2.75rem,8vw,6.5rem)]">
            {LINES.map((l, i) => (
              <span key={i} className="v2-hero-mask block overflow-hidden">
                <span
                  className="v2-hero-line block"
                  style={l.accent ? { color: 'var(--v2-vermilion)' } : undefined}
                >
                  {l.text}
                </span>
              </span>
            ))}
          </h1>

          {/* Action column */}
          <div className="v2-hero-meta flex flex-col items-start lg:items-end gap-6 lg:max-w-[320px]">
            <p className="text-[15px] md:text-[17px] leading-[1.55] lg:text-right" style={{ color: 'var(--v2-paper-ink-2)', maxWidth: '34ch' }}>
              Deploy a fleet of specialized agents. Watch them hand the work to
              each other. Resolve their conflicts. Approve what ships.
            </p>

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
          </div>
        </div>

        {/* Footer rule — specimen-book registration */}
        <div
          className="v2-hero-rule max-w-[1180px] mx-auto w-full mt-14 lg:mt-16 pt-4 flex flex-wrap items-center justify-between gap-4"
          style={{ borderTop: 'var(--v2-rule) solid var(--v2-paper-rule)' }}
        >
          <span className="v2-mono text-[11px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            set in Instrument Serif · Hanken Grotesk · JetBrains Mono
          </span>
          <span className="v2-label text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            scroll — strategy becomes live execution
          </span>
        </div>
      </div>
    </section>
  );
}