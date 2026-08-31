'use client';

import Link from 'next/link';
import { DemoIcon } from '@/lib/demo/icons';

/** Stub for demo views that haven't been built yet — the source's own framing. */
export function StubView({ icon, ink, title, blurb, phase }: {
  icon: string;
  ink: string;
  title: string;
  blurb: string;
  phase: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-8 md:px-10 py-6 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <DemoIcon name={icon} className="w-7 h-7" style={{ color: ink }} /> {title}
          </h1>
          <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-2">{blurb}</p>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-faint)]">
        <div className="w-14 h-14 rounded-[10px] border border-dashed flex items-center justify-center mb-4" style={{ borderColor: 'var(--hairline-strong)' }}>
          <DemoIcon name={icon} className="w-6 h-6 opacity-50" />
        </div>
        <p className="text-xs font-mono">{phase} · under_construction — this view ships next.</p>
        <Link href="/demo" className="btn-outline mt-7">cd ~/dashboard</Link>
      </div>
    </div>
  );
}
