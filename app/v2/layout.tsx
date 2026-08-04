import type { Metadata } from 'next';
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/*
 * DIRECTION CONTRACT — Specimen Terminal (impeccable new-work)
 *
 * THESIS: An OS for autonomous marketing agents, where strategy reads like a
 *   specimen book and runs like a dealing floor. Refuses the near-black+neon+glass
 *   "AI dashboard" and the static cream+serif+red cluster both.
 * OWN-WORLD: Warm press paper and tinted near-black ink, one committed vermilion,
 *   Instrument Serif display over Hanken Grotesk UI over JetBrains Mono data,
 *   hairline rules and registered grids, a streaming mono tape as heartbeat.
 * STORY: A visitor lands on a specimen thesis, scrolls, and the page itself becomes
 *   live execution — agents handing a task across a terminal board, surfacing a
 *   conflict that only the operator can resolve. They leave knowing the mechanism.
 * FIRST VIEWPORT: paper ground, mono tape ticker top edge, Instrument Serif display
 *   left, single vermilion CTA right, no chrome, no eyebrow. The register shift to
 *   ink waits one scroll.
 * FORM: Two-register scroll, fused specimen(2)+blotter(3), seed 873cc4f5 idx 7.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 *
 * NOTE: This is a nested layout under the root app/layout.tsx, so it must not
 * render <html>/<body> (the App Router permits only one per route tree). Fonts
 * and tokens are scoped to the .v2-scope wrapper so v1 routes are untouched.
 */

const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-display',
});

const sans = Hanken_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-sans',
});

const mono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-mono',
});

export const metadata: Metadata = {
  title: 'Agentic Marketing OS — an operating system for autonomous agents',
  description:
    'Deploy a fleet of specialized marketing agents. Watch them hand the work to each other. Resolve their conflicts. Approve what ships.',
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    // Contract placed as the first child of the v2 wrapper (closest non-destructive
    // placement to body's first child; survives the production build).
    <div className={`v2-scope ${display.variable} ${sans.variable} ${mono.variable}`}>
      {children}
    </div>
  );
}