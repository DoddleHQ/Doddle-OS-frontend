'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

/*
 * InkGenesis — the generative motion piece on the ink side of the auth page.
 *
 * Two layers, both Canvas2D (no library):
 *  1. A breathing grid of faint dots that drifts slowly — the "instrument
 *     panel" energy, the feeling of a live system underneath.
 *  2. The product wordmark assembling from scattered glyphs into place, then
 *     holding, then occasionally re-scattering and re-assembling on a slow
 *     loop — generative typography.
 *
 * The vermilion accent fires sparingly: a node lights vermilion when a
 * handoff "event" crosses it (every ~2.5s a vermilion pulse travels across
 * the grid along a random path).
 */

const WORDMARK = 'AMOS';

export function InkGenesis() {
  const gridCanvas = useRef<HTMLCanvasElement>(null);
  const pulseCanvas = useRef<HTMLCanvasElement>(null);

  // --- Layer 1: breathing dot grid + vermilion pulse ---
  useEffect(() => {
    const canvas = gridCanvas.current;
    const pulse = pulseCanvas.current;
    if (!canvas || !pulse) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setup = (c: HTMLCanvasElement) => {
      const rect = c.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      return { ctx, w: rect.width, h: rect.height };
    };

    let { ctx, w, h } = setup(canvas);
    let pCtx = setup(pulse).ctx;

    // Grid of dots
    const SPACING = 32;
    let dots: { x: number; y: number; phase: number }[] = [];
    const buildDots = () => {
      dots = [];
      for (let x = SPACING / 2; x < w; x += SPACING) {
        for (let y = SPACING / 2; y < h; y += SPACING) {
          dots.push({ x, y, phase: Math.random() * Math.PI * 2 });
        }
      }
    };
    buildDots();

    // Pulse — a vermilion wave traveling along a path
    let pulsePath: { x: number; y: number }[] = [];
    let pulseProgress = 0;
    const generatePath = () => {
      const startSide = Math.random() < 0.5 ? 'top' : 'left';
      const pts: { x: number; y: number }[] = [];
      let cx = startSide === 'top' ? Math.random() * w : 0;
      let cy = startSide === 'top' ? 0 : Math.random() * h;
      pts.push({ x: cx, y: cy });
      for (let i = 0; i < 6; i++) {
        cx += (Math.random() - 0.3) * w * 0.3;
        cy += (Math.random() - 0.3) * h * 0.3;
        cx = Math.max(0, Math.min(w, cx));
        cy = Math.max(0, Math.min(h, cy));
        pts.push({ x: cx, y: cy });
      }
      return pts;
    };
    pulsePath = generatePath();

    let raf = 0;
    let time = 0;
    let pulseTimer = 0;

    const render = () => {
      time += 0.008;
      pulseTimer += 1;

      // Grid layer
      const gctx = ctx;
      if (gctx) {
        gctx.clearRect(0, 0, w, h);
        const breath = 0.5 + Math.sin(time * 0.5) * 0.15;
        dots.forEach((d) => {
          const a = 0.08 + Math.sin(time + d.phase) * 0.04 + breath * 0.04;
          gctx.beginPath();
          gctx.arc(d.x + Math.sin(time * 0.3 + d.phase) * 1.5, d.y + Math.cos(time * 0.2 + d.phase) * 1.5, 1, 0, Math.PI * 2);
          gctx.fillStyle = `rgba(237,231,219,${Math.max(0, a)})`;
          gctx.fill();
        });
      }

      // Pulse layer
      if (pCtx) {
        pCtx.clearRect(0, 0, w, h);
        if (!prefersReduced) {
          pulseProgress += 0.012;
          if (pulseProgress >= 1) {
            pulseProgress = 0;
            pulsePath = generatePath();
          }
          // Draw the pulse as a series of glowing segments along the path
          const totalLen = pulsePath.length;
          const head = pulseProgress * (totalLen - 1);
          const headIdx = Math.floor(head);
          const frac = head - headIdx;

          for (let i = 0; i < 8; i++) {
            const trailIdx = headIdx - i;
            if (trailIdx < 0 || trailIdx >= totalLen - 1) continue;
            const p1 = pulsePath[trailIdx];
            const p2 = pulsePath[trailIdx + 1];
            const segFrac = i === 0 ? frac : 1;
            const x = p1.x + (p2.x - p1.x) * segFrac;
            const y = p1.y + (p2.y - p1.y) * segFrac;
            const alpha = (1 - i / 8) * 0.6;
            const size = (1 - i / 8) * 3 + 1;
            pCtx.beginPath();
            pCtx.arc(x, y, size, 0, Math.PI * 2);
            pCtx.fillStyle = `rgba(232,68,46,${alpha})`;
            pCtx.shadowColor = 'rgba(232,68,46,0.8)';
            pCtx.shadowBlur = 8;
            pCtx.fill();
          }
          pCtx.shadowBlur = 0;
        }
      }

      raf = requestAnimationFrame(render);
    };

    if (prefersReduced) {
      // Static render — just the grid, no pulse
      const sctx = ctx;
      if (sctx) {
        dots.forEach((d) => {
          sctx.beginPath();
          sctx.arc(d.x, d.y, 1, 0, Math.PI * 2);
          sctx.fillStyle = 'rgba(237,231,219,0.1)';
          sctx.fill();
        });
      }
    } else {
      raf = requestAnimationFrame(render);
    }

    const onResize = () => {
      const s1 = setup(canvas);
      ctx = s1.ctx; w = s1.w; h = s1.h;
      pCtx = setup(pulse).ctx;
      buildDots();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Layer 1: breathing grid */}
      <canvas ref={gridCanvas} className="absolute inset-0 w-full h-full" />
      {/* Layer 2: vermilion pulse */}
      <canvas ref={pulseCanvas} className="absolute inset-0 w-full h-full" />

      {/* Layer 3: assembling wordmark — framer-motion generative type */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="flex"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.4 } } }}
        >
          {WORDMARK.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="v2-display"
              style={{
                fontSize: 'clamp(5rem, 12vw, 9rem)',
                color: 'var(--v2-ink-text)',
                opacity: 0.12,
                marginRight: i < WORDMARK.length - 1 ? '0.05em' : 0,
              }}
              variants={{
                hidden: { opacity: 0, y: 60, filter: 'blur(20px)', rotate: Math.random() * 30 - 15 },
                show: { opacity: 0.12, y: 0, filter: 'blur(0px)', rotate: 0 },
              }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
