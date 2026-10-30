'use client';

import { useEffect, useRef } from 'react';

interface Thread {
  baseY: number;
  amp1: number;
  amp2: number;
  freq1: number;
  freq2: number;
  phase1: number;
  phase2: number;
  driftSpeed: number;
  driftSpeed2: number;
}

function threadY(thread: Thread, x: number, t: number, w: number): number {
  const p1 = thread.phase1 + t * thread.driftSpeed;
  const p2 = thread.phase2 + t * thread.driftSpeed2;
  const nx = x / w;
  return thread.baseY
    + Math.sin(nx * thread.freq1 * Math.PI * 2 + p1) * thread.amp1
    + Math.sin(nx * thread.freq2 * Math.PI * 2 + p2) * thread.amp2;
}

function sampleThread(thread: Thread, t: number, w: number, samples: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let s = 0; s < samples; s++) {
    const x = (s / (samples - 1)) * w;
    result.push({ x, y: threadY(thread, x, t, w) });
  }
  return result;
}

export function FlowingThreads() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();

    const THREAD_COUNT = 14;
    let threads: Thread[] = [];

    const buildThreads = () => {
      threads = [];
      for (let i = 0; i < THREAD_COUNT; i++) {
        const baseY = (h / (THREAD_COUNT - 1)) * i + (Math.random() - 0.5) * 20;
        threads.push({
          baseY,
          amp1: 12 + Math.random() * 18,
          amp2: 4 + Math.random() * 8,
          freq1: 1 + Math.random() * 1.5,
          freq2: 2.5 + Math.random() * 2,
          phase1: Math.random() * Math.PI * 2,
          phase2: Math.random() * Math.PI * 2,
          driftSpeed: 0.00015 + Math.random() * 0.0002,
          driftSpeed2: 0.00025 + Math.random() * 0.0003,
        });
      }
    };
    buildThreads();

    interface Glow { threadIdx: number; progress: number; }
    const glows: Glow[] = [];
    let lastGlowTime = 0;
    const GLOW_INTERVAL = 2600;

    const calmRadius = () => Math.min(w, h) * 0.22;
    const cx = () => w / 2;
    const cy = () => h / 2;
    const PATH_SAMPLES = 120;

    const tracePath = (sampled: { x: number; y: number }[]) => {
      ctx.beginPath();
      ctx.moveTo(sampled[0].x, sampled[0].y);
      for (let i = 1; i < sampled.length; i++) ctx.lineTo(sampled[i].x, sampled[i].y);
    };

    let raf = 0;
    let lastFrame = performance.now();

    const render = (now: number) => {
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;
      const cr = calmRadius();
      const ccx = cx();
      const ccy = cy();

      ctx.clearRect(0, 0, w, h);

      threads.forEach((thread, ti) => {
        const sampled = sampleThread(thread, now, w, PATH_SAMPLES);
        let minDist = Infinity;
        for (const p of sampled) { const d = Math.hypot(p.x - ccx, p.y - ccy); if (d < minDist) minDist = d; }
        const calmFade = minDist < cr ? Math.max(0.05, minDist / cr) : 1;

        tracePath(sampled);
        ctx.strokeStyle = `rgba(26,22,18,${(0.05 + (ti % 3) * 0.01) * calmFade})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      if (now - lastGlowTime > GLOW_INTERVAL) {
        glows.push({ threadIdx: Math.floor(Math.random() * threads.length), progress: 0 });
        lastGlowTime = now;
      }

      for (let g = glows.length - 1; g >= 0; g--) {
        const glow = glows[g];
        glow.progress += 0.0028 * (dt / 16);
        if (glow.progress >= 1) { glows.splice(g, 1); continue; }

        const thread = threads[glow.threadIdx];
        const sampled = sampleThread(thread, now, w, PATH_SAMPLES);

        const GLOW_WIDTH = 0.15;
        const startProg = Math.max(0, glow.progress - GLOW_WIDTH / 2);
        const endProg = Math.min(1, glow.progress + GLOW_WIDTH / 2);
        const startIdx = Math.floor(startProg * (sampled.length - 1));
        const endIdx = Math.ceil(endProg * (sampled.length - 1));
        if (endIdx <= startIdx) continue;

        const glowSegment = sampled.slice(startIdx, endIdx + 1);

        const headIdx = Math.min(sampled.length - 1, Math.floor(glow.progress * (sampled.length - 1)));
        const headPoint = sampled[headIdx];
        if (!headPoint) continue;
        if (Math.hypot(headPoint.x - ccx, headPoint.y - ccy) < cr * 0.85) continue;

        const layers = [
          { width: 6, alpha: 0.035 },
          { width: 3, alpha: 0.07 },
          { width: 1.2, alpha: 0.14 },
        ];
        for (const layer of layers) {
          for (let i = 0; i < glowSegment.length - 1; i++) {
            const localT = i / Math.max(1, glowSegment.length - 1);
            const fade = Math.sin(localT * Math.PI);
            ctx.beginPath();
            ctx.moveTo(glowSegment[i].x, glowSegment[i].y);
            ctx.lineTo(glowSegment[i + 1].x, glowSegment[i + 1].y);
            ctx.strokeStyle = `rgba(200,50,27,${layer.alpha * fade})`;
            ctx.lineWidth = layer.width;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }
        ctx.lineCap = 'butt';
      }

      raf = requestAnimationFrame(render);
    };

    if (prefersReduced) {
      threads.forEach((thread, ti) => {
        const sampled = sampleThread(thread, 0, w, PATH_SAMPLES);
        tracePath(sampled);
        ctx.strokeStyle = `rgba(26,22,18,${0.04 + (ti % 3) * 0.008})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });
    } else {
      raf = requestAnimationFrame(render);
    }

    const onResize = () => { resize(); buildThreads(); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}