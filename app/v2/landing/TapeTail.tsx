'use client';

import { useEffect, useState } from 'react';
import { TAPE_EVENTS } from './content';
import { TapeRow } from './TapeTicker';

/*
 * TapeTail — the live last-N event feed (client-only).
 *
 * Split from TapeTicker.tsx so the marquee can stay a pure server component.
 * The tail's content depends on client state (a rolling `head` index advanced
 * by an interval), which is a hydration-mismatch risk: if the interval ticks
 * between server render and client mount, the DOM differs.
 *
 * FIX: a `mounted` gate. Server and first client paint render a STABLE initial
 * view (TAPE_EVENTS[0..2], identical on both sides). The interval and dynamic
 * content only activate after mount. This makes a hydration mismatch
 * structurally impossible here.
 */
export function TapeTail({ onInk, className }: { onInk?: boolean; className?: string }) {
  const [head, setHead] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => {
      setHead((h) => (h + 1) % TAPE_EVENTS.length);
      setFlashKey((k) => k + 1);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // Stable initial view (server + first client paint): always the same 3 events.
  const visible = mounted
    ? [2, 1, 0].map((offset) => TAPE_EVENTS[(head - offset + TAPE_EVENTS.length) % TAPE_EVENTS.length])
    : [TAPE_EVENTS[2], TAPE_EVENTS[1], TAPE_EVENTS[0]];

  return (
    <div className={className} aria-label="Live agent activity tape" aria-live="polite">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: onInk ? 'var(--v2-vermilion-lift)' : 'var(--v2-vermilion)', animation: 'v2-pulse-dot 1.4s ease-in-out infinite' }}
        />
        <span className="v2-label text-[10px]" style={{ color: onInk ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)' }}>
          Live · tape
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map((e, i) => (
          <div
            key={mounted ? (i === 0 ? `head-${flashKey}` : `rest-${i}-${head}`) : `init-${i}`}
            className="v2-mono text-[12px] md:text-[13px] overflow-hidden"
            style={{
              opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.32,
              animation: mounted && i === 0 ? 'v2-flash-in 0.5s ease-out' : undefined,
            }}
          >
            <TapeRow e={e} onInk={onInk} />
          </div>
        ))}
      </div>
    </div>
  );
}
