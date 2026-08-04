'use client';

import { useEffect, useRef } from 'react';

/*
 * AgentConstellation — the live system behind the auth form.
 *
 * Full-viewport ink canvas. Named agent nodes drift slowly in a loose cluster.
 * Connection lines between nearby nodes pulse faintly. Every ~2.5s a vermilion
 * handoff pulse fires — it travels along a connection from one node to another,
 * lighting the target briefly. This is the product's core mechanism (agents
 * handing work) rendered as ambient motion.
 *
 * Pure Canvas2D, no library. The energy of a particle field, but grounded in
 * real agent names. The form floats above (z-index), barely there.
 */

const AGENTS = [
  { name: 'Content Architect', x: 0.18, y: 0.22 },
  { name: 'Technical Architect', x: 0.82, y: 0.18 },
  { name: 'operator', x: 0.50, y: 0.50 },
  { name: 'research', x: 0.15, y: 0.78 },
  { name: 'review', x: 0.85, y: 0.75 },
  { name: 'GTM Strategy', x: 0.40, y: 0.12 },
  { name: 'Content Architect', x: 0.72, y: 0.88 },
];

interface Node {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  litUntil: number; // timestamp until which the node glows from a pulse arrival
  radius: number;
}

interface Pulse {
  fromIdx: number;
  toIdx: number;
  progress: number; // 0→1
  active: boolean;
}

export function AgentConstellation() {
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

    // Build nodes from the agent list
    const nodes: Node[] = AGENTS.map((a) => {
      const bx = a.x * w;
      const by = a.y * h;
      return {
        baseX: bx,
        baseY: by,
        x: bx,
        y: by,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        name: a.name,
        litUntil: 0,
        radius: 3 + Math.random() * 2,
      };
    });

    // Connection distance threshold (in px, relative to viewport)
    const connectDist = () => Math.min(w, h) * 0.38;

    // Handoff pulses
    const pulses: Pulse[] = [];
    let lastPulseTime = 0;
    const PULSE_INTERVAL = 2200;

    const spawnPulse = (now: number) => {
      // Pick a random source node, then a nearby target
      const src = Math.floor(Math.random() * nodes.length);
      const threshold = connectDist();
      const candidates: number[] = [];
      nodes.forEach((n, i) => {
        if (i === src) return;
        const dx = n.x - nodes[src].x;
        const dy = n.y - nodes[src].y;
        if (Math.hypot(dx, dy) < threshold) candidates.push(i);
      });
      if (candidates.length === 0) return;
      const tgt = candidates[Math.floor(Math.random() * candidates.length)];
      pulses.push({ fromIdx: src, toIdx: tgt, progress: 0, active: true });
    };

    let raf = 0;
    let lastFrame = performance.now();

    const render = (now: number) => {
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;
      const time = now / 1000;
      const cd = connectDist();

      ctx.clearRect(0, 0, w, h);

      // Update node positions (drift around base + velocity + gentle return)
      nodes.forEach((n) => {
        // Gentle attraction to base position
        n.vx += (n.baseX - n.x) * 0.0003;
        n.vy += (n.baseY - n.y) * 0.0003;
        // Damping
        n.vx *= 0.99;
        n.vy *= 0.99;
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);
      });

      // Draw connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist < cd) {
            const alpha = (1 - dist / cd) * 0.12;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(237,231,219,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Spawn pulses
      if (!prefersReduced && now - lastPulseTime > PULSE_INTERVAL) {
        spawnPulse(now);
        lastPulseTime = now;
      }

      // Update + draw pulses
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        if (!pulse.active) {
          pulses.splice(p, 1);
          continue;
        }
        pulse.progress += 0.012 * (dt / 16);
        if (pulse.progress >= 1) {
          // Light the target
          nodes[pulse.toIdx].litUntil = now + 1200;
          pulse.active = false;
          continue;
        }
        const from = nodes[pulse.fromIdx];
        const to = nodes[pulse.toIdx];
        const px = from.x + (to.x - from.x) * pulse.progress;
        const py = from.y + (to.y - from.y) * pulse.progress;

        // Draw trail
        const trailLen = 5;
        for (let t = 0; t < trailLen; t++) {
          const tp = Math.max(0, pulse.progress - t * 0.03);
          const tx = from.x + (to.x - from.x) * tp;
          const ty = from.y + (to.y - from.y) * tp;
          const ta = (1 - t / trailLen) * 0.7;
          ctx.beginPath();
          ctx.arc(tx, ty, (1 - t / trailLen) * 2.5 + 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,68,46,${ta})`;
          ctx.shadowColor = 'rgba(232,68,46,0.6)';
          ctx.shadowBlur = 6;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // Draw nodes
      nodes.forEach((n) => {
        const isLit = now < n.litUntil;
        const litFade = isLit ? Math.max(0, (n.litUntil - now) / 1200) : 0;

        // Glow ring when lit
        if (litFade > 0) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8 * litFade, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,68,46,${litFade * 0.08})`;
          ctx.fill();
        }

        // Node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        if (n.name === 'operator') {
          ctx.fillStyle = `rgba(232,68,46,${0.8 + litFade * 0.2})`;
        } else if (litFade > 0) {
          ctx.fillStyle = `rgba(232,68,46,${0.5 + litFade * 0.5})`;
        } else {
          ctx.fillStyle = 'rgba(237,231,219,0.35)';
        }
        ctx.fill();

        // Node label (faint)
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = isLit ? `rgba(237,231,219,${0.5 + litFade * 0.4})` : 'rgba(237,231,219,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y - n.radius - 6);
      });

      raf = requestAnimationFrame(render);
    };

    if (prefersReduced) {
      // Static frame: nodes + connections, no pulses
      const cd = connectDist();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist < cd) {
            const alpha = (1 - dist / cd) * 0.1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(237,231,219,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.name === 'operator' ? 'rgba(232,68,46,0.7)' : 'rgba(237,231,219,0.3)';
        ctx.fill();
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = 'rgba(237,231,219,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y - n.radius - 6);
      });
    } else {
      raf = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
