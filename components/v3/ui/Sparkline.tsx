'use client';

import { useEffect, useRef } from 'react';

/** Small accent polyline. Null-context safe (jsdom/tests). */
export function Sparkline({ series, height = 34 }: { series: number[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = cv.width;
    const h = cv.height;
    const max = Math.max(...series);
    const min = Math.min(...series);
    const span = max - min || 1;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    series.forEach((v, n) => {
      const x = (n / (series.length - 1)) * w;
      const y = h - 4 - ((v - min) / span) * (h - 8);
      if (n === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    const accent = getComputedStyle(cv).getPropertyValue('--accent').trim();
    ctx.strokeStyle = accent || '#1d4ed8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [series]);
  return <canvas ref={ref} width={400} height={height} style={{ width: '100%', height }} aria-hidden="true" />;
}
