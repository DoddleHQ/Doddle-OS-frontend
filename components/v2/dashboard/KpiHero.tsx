'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

/*
 * KpiHero — the workspace identity + KPI band at the top of the broadsheet.
 *
 * Full-width paper register. Workspace name in Instrument Serif display,
 * a v2 status pill, then 5 KPIs with count-up animation on mount.
 * Trend arrows in sage (up) / vermilion (down) / ink-2 (neutral).
 */

const KPI_DATA = [
  { label: 'System Health', value: '94%', trend: 'up' as const },
  { label: 'Active Agents', value: '8', trend: 'neutral' as const },
  { label: 'Pending Actions', value: '12', trend: 'down' as const },
  { label: 'Errors Today', value: '2', trend: 'down' as const },
  { label: 'Avg Latency', value: '420ms', trend: 'neutral' as const },
];

function useCountUp(target: number, inView: boolean, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, inView, duration]);
  return val;
}

function parseKpi(raw: string): { num: number; suffix: string; prefix: string } {
  const m = raw.match(/^([^\d]*)([\d,.]+)(.*)$/);
  if (!m) return { num: 0, suffix: raw, prefix: '' };
  const num = parseFloat(m[2].replace(/,/g, ''));
  return { num: isNaN(num) ? 0 : num, suffix: m[3], prefix: m[1] };
}

function KpiItem({ kpi, inView, index }: { kpi: typeof KPI_DATA[0]; inView: boolean; index: number }) {
  const { num, suffix, prefix } = parseKpi(kpi.value);
  const v = useCountUp(num, inView);
  const display = kpi.value.includes(',') ? Math.round(v).toLocaleString() : Number.isInteger(num) ? Math.round(v).toString() : v.toFixed(0);
  const trendColor = kpi.trend === 'up' ? 'var(--v2-sage)' : kpi.trend === 'down' ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink-2)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
    >
      <div className="v2-display text-[clamp(1.75rem,4vw,2.5rem)] leading-none" style={{ color: 'var(--v2-paper-ink)' }}>
        {prefix}{display}{suffix}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="v2-label text-[8px]" style={{ color: 'var(--v2-paper-ink-2)' }}>{kpi.label}</span>
        <span className="v2-mono text-[9px]" style={{ color: trendColor }}>
          {kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—'}
        </span>
      </div>
    </motion.div>
  );
}

export function KpiHero({ workspaceName }: { workspaceName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <header ref={ref} className="pt-24 pb-12 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1100px] mx-auto">
        {/* Workspace name + status */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <h1 className="v2-display text-[clamp(2rem,5vw,3.5rem)] leading-[1]" style={{ color: 'var(--v2-paper-ink)' }}>
              {workspaceName || 'Workspace'}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full v2-label text-[9px]"
              style={{ background: 'rgba(127,176,105,0.1)', color: 'var(--v2-sage)', border: '1px solid rgba(127,176,105,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--v2-sage)' }} />
              Active
            </span>
          </div>
          <p className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            Mission Control — autonomous agent orchestration
          </p>
        </motion.div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-8" style={{ borderTop: '1px solid var(--v2-paper-rule)' }}>
          {KPI_DATA.map((kpi, i) => (
            <KpiItem key={i} kpi={kpi} inView={inView} index={i} />
          ))}
        </div>
      </div>
    </header>
  );
}
