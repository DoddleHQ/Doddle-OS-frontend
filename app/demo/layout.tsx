import type { Metadata } from 'next';
import { Archivo, Fragment_Mono } from 'next/font/google';
import './demo.css';
import { DemoShell } from '@/components/demo/DemoShell';

const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700', '800'],
});

const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fragment',
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Doddle OS — Demo',
  description: 'Design exploration: the Doddle OS execution-engine board, rearranged.',
};

const DIRECTION_CONTRACT = `<!--
DIRECTION CONTRACT — Doddle OS demo (app/demo) · code-led build
THESIS: The execution-engine board from the reference HTML, practical and
legible — welcome desk, system telemetry, running processes, power agents —
refusing the agent-dashboard scaffold of floating cards and gradient chrome.
User pin: original HTML terminology and structure rule; the rolled transit
metaphor survives only as material, never as vocabulary or layout.
OWN-WORLD: paper timetable ground #ECEAE1 by default (the daytime board),
midnight enamel #0A1124 behind toggle_theme(), one 1px porcelain hairline
pen instead of shadows, ink accents (cobalt live, green done, amber triage,
scarlet alerts), Archivo UI + Fragment Mono data, dense hairline tables,
status badges in the source's own words.
STORY: the operator greets the desk, types what to execute, and watches the
state board's rows fill while approvals land in the triage queue.
FIRST VIEWPORT: an asymmetric split — the command desk left (greeting,
"What are we executing today?", execute search, quick actions as a ruled
stack), the state board right (System Telemetry with triage_queue REQ and
active_swarms, running_processes above active_power_agents).
FORM: practical board; rolled world wayfinding-cartography (seed 6e499c73
reroll 1 bolder) demoted to material by user pin.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying
its provenance.
-->`;

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${archivo.variable} ${fragmentMono.variable}`}>
      <span hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
      <DemoShell>{children}</DemoShell>
    </div>
  );
}
