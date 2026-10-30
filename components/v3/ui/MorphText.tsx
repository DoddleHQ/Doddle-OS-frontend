'use client';

import { useEffect, useState } from 'react';

export function MorphText({ options, intervalMs = 2600 }: { options: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % options.length), intervalMs);
    return () => clearInterval(t);
  }, [options.length, intervalMs]);
  return (
    <span className="morph" aria-live="off">
      {options.map((o, n) => (
        <span key={o} className={n === i ? 'on' : ''}>
          {o}
        </span>
      ))}
    </span>
  );
}
