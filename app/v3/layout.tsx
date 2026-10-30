import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/components/v3/v3.css';
import '@/components/v3/v13.css';

const inter = localFont({
  display: 'swap',
  variable: '--font-v3-inter',
  src: [{ path: './fonts/inter-var.woff2', style: 'normal' }],
});

const jet = localFont({
  display: 'swap',
  variable: '--font-v3-jmono',
  src: [{ path: './fonts/jmono-var.woff2', style: 'normal' }],
});

export const metadata: Metadata = {
  title: 'DoddleOS v3',
  description: 'Agentic execution engine for marketing operators.',
};

const CONTRACT = [
  'v3 DIRECTION CONTRACT (seed: doddle-os-v7-lively.html, user-pinned)',
  "THESIS: The operator's marketing OS as a lively glass desktop — floating windows over an aurora sky — refusing the document-scroll dashboard.",
  'OWN-WORLD: Silver/graphite glass (blur 36 saturate 180, per-edge specular), one blue accent, category colors as the only saturation, Inter over JetBrains Mono, 8px radius, hairline edges.',
  'STORY: An operator lands on a calm desktop, asks one question in the hero bar, and work becomes windows they supervise — nothing ships without them.',
  'FIRST VIEWPORT: Aurora wallpaper; notch pills top-left/right; centered greeting + morph headline + ask bar; four bento cards; telemetry below the fold.',
  'FORM: Desktop-OS metaphor ported from the locked v7 reference; screens ship one at a time, dashboard first.',
  'FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN-v3.md.',
].join('\n');

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${jet.variable}`}>
      <aside hidden dangerouslySetInnerHTML={{ __html: `<!--\n${CONTRACT}\n-->` }} />
      {children}
    </div>
  );
}
