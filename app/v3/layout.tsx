import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/components/v3/v3.css';
import '@/components/v3/v13.css'; // exact-UI layer: reference values override our adaptations

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v3-inter',
  weight: ['400', '500', '600', '700', '800'],
});

const jet = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-v3-jmono',
  weight: ['400', '500', '700'],
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
      {/* Direction contract — survives the production build as a real comment node */}
      <aside hidden dangerouslySetInnerHTML={{ __html: `<!--\n${CONTRACT}\n-->` }} />
      {children}
    </div>
  );
}
