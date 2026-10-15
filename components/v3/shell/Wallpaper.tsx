'use client';

import { useEffect, useRef } from 'react';
import { useV3OS } from '@/lib/v3/osStore';

/*
 * Lively wallpaper: theme-aware gradient ground + 3 slow aurora blobs on canvas.
 * Static under prefers-reduced-motion; null-context safe (jsdom/tests).
 */
export function Wallpaper() {
  const backdrop = useV3OS((s) => s.backdrop);
  const theme = useV3OS((s) => s.theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dark = theme === 'dark';
    const cols = dark
      ? [
          ['59,130,246', '34,211,238'],
          ['168,85,247', '236,72,153'],
          ['16,185,129', '34,211,238'],
        ]
      : [
          ['29,78,216', '34,211,238'],
          ['147,51,234', '236,72,153'],
          ['5,150,105', '34,211,238'],
        ];
    const blobs = Array.from({ length: 3 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.2 + Math.random() * 0.3,
      p: Math.random() * 10,
    }));

    const size = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    };
    size();
    window.addEventListener('resize', size);

    let raf = 0;
    // reference throttle: pause the aurora when the tab is hidden or the
    // operator has been idle for a minute (mouse/key/touch re-arms it)
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let isIdle = false;
    const armIdle = () => {
      isIdle = false;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isIdle = true;
      }, 60_000);
    };
    ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, armIdle, { passive: true }),
    );
    armIdle();
    const draw = () => {
      if (!document.hidden && !isIdle) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      blobs.forEach((b, i) => {
        b.p += 0.001;
        const x = (b.x + Math.sin(b.p) * 0.1) * cv.width;
        const y = (b.y + Math.cos(b.p) * 0.1) * cv.height;
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.r * cv.width);
        const c = cols[i % 3];
        g.addColorStop(0, `rgba(${c[0]},${dark ? '.35' : '.28'})`);
        g.addColorStop(0.55, `rgba(${c[1]},${dark ? '.14' : '.12'})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, b.r * cv.width, 0, 7);
        ctx.fill();
      });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      if (idleTimer) clearTimeout(idleTimer);
      ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach((ev) =>
        window.removeEventListener(ev, armIdle),
      );
      window.removeEventListener('resize', size);
    };
  }, [theme]);

  return (
    <div className="v3-wallpaper" data-bg={backdrop} aria-hidden="true">
      <canvas ref={canvasRef} className="v3-aurora" />
    </div>
  );
}
