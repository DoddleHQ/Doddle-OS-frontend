'use client';

import type { V3AppMeta } from '@/lib/v3/apps';

/** Placeholder body for apps whose screen hasn't shipped yet. */
export function EmptyWindow({ app }: { app: V3AppMeta }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 320 }}>
      <p className="font-bold text-lg">{app.name}</p>
      <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
        {app.blurb}
      </p>
      <span className="chip mt-3">Arriving in screen {app.arrivesScreen}</span>
    </div>
  );
}
