'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GRAPH_AGENTS, REAL_CONFLICTS, KPIS, MODULES, artifactLabel } from './content';

/*
 * Fleet (paper register) — the five real graph-streaming agents as specimens.
 * Each shows its real graphId, module, job, and the ArtifactType values it
 * ships. Followed by count-up KPIs, the real conflicts, and the module marquee.
 */

function useCountUp(target: number, inView: boolean, duration = 1100) {
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
  const m = raw.match(/^([€$£]?)([\d.,]+)(.*)$/);
  if (!m) return { num: 0, suffix: raw, prefix: '' };
  const num = parseFloat(m[2].replace(/,/g, ''));
  return { num: isNaN(num) ? 0 : num, suffix: m[3], prefix: m[1] };
}

function KpiChip({ kpi, inView }: { kpi: { label: string; value: string; trend: string }; inView: boolean }) {
  const { num, suffix, prefix } = parseKpi(kpi.value);
  const v = useCountUp(num, inView);
  const display =
    kpi.value.includes(',') ? Math.round(v).toLocaleString() : Number.isInteger(num) ? Math.round(v).toString() : v.toFixed(0);
  const trendColor = kpi.trend === 'up' ? 'var(--v2-sage)' : kpi.trend === 'down' ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink-2)';

  return (
    <div className="py-3" style={{ borderTop: 'var(--v2-rule) solid var(--v2-paper-rule)' }}>
      <div className="v2-display text-[2rem] md:text-[2.5rem] leading-none" style={{ color: 'var(--v2-paper-ink)' }}>
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="v2-label text-[9px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
          {kpi.label}
        </span>
        <span className="v2-mono text-[10px]" style={{ color: trendColor }}>
          {kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—'}
        </span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const kpiRef = useRef<HTMLDivElement>(null);
  const [kpiInView, setKpiInView] = useState(false);

  useEffect(() => {
    if (!kpiRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setKpiInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(kpiRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      className="px-6 md:px-10 py-24 md:py-36"
      style={{ background: 'var(--v2-paper-ground)', color: 'var(--v2-paper-ink)' }}
    >
      <div className="max-w-[1180px] mx-auto w-full">
        {/* Lead */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 mb-16 md:mb-20 items-end">
          <motion.h2
            className="v2-display text-[clamp(2rem,5vw,3.75rem)]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            The fleet, running live.
            <br />
            Each agent, a full pipeline.
          </motion.h2>
          <motion.p
            className="text-[15px] md:text-[17px] leading-[1.6]"
            style={{ color: 'var(--v2-paper-ink-2)', maxWidth: '46ch' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Five graph agents stream their work through LangGraph. They crawl,
            audit, confirm with you, then generate and ship artifacts. Below is
            exactly what each one does, and the real artifact types it produces.
          </motion.p>
        </div>

        {/* KPI strip */}
        <div ref={kpiRef} className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 mb-20 md:mb-28">
          {KPIS.map((k, i) => (
            <KpiChip key={i} kpi={k} inView={kpiInView} />
          ))}
        </div>

        {/* The fleet — real graph agents as specimens */}
        <div className="mb-20 md:mb-28">
          <div className="v2-label text-[10px] mb-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
            the fleet · five graph agents
          </div>
          <div className="space-y-px" style={{ background: 'var(--v2-paper-rule)' }}>
            {GRAPH_AGENTS.map((a, i) => {
              const accent = a.tone === 'vermilion' ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink)';
              return (
                <motion.article
                  key={a.graphId}
                  className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-6 md:gap-8 items-start"
                  style={{ background: 'var(--v2-paper-ground)' }}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Name + module — column 1.
                      A shared mono top-label establishes a common baseline across all
                      three columns, so the rows align as a registry regardless of the
                      differing display/body/label sizes below it. */}
                  <div>
                    <div className="v2-mono text-[10px] mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      agent
                    </div>
                    <div className="v2-display text-[1.75rem] md:text-[2rem] leading-tight" style={{ color: accent }}>
                      {a.name}
                    </div>
                    <div className="v2-label text-[9px] mt-2" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      {a.module}
                    </div>
                  </div>

                  {/* Job + input hint — column 2.
                      Same mono top-label height as columns 1 and 3. */}
                  <div>
                    <div className="v2-mono text-[10px] mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      does
                    </div>
                    <p className="text-[14px] leading-[1.55]" style={{ color: 'var(--v2-paper-ink)' }}>
                      {a.job}
                    </p>
                    <p className="v2-mono text-[11px] mt-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      <span style={{ color: 'var(--v2-vermilion)' }}>›</span> {a.inputHint}
                    </p>
                  </div>

                  {/* Artifacts it ships — column 3.
                      Same mono top-label height; chips wrap right-aligned. */}
                  <div className="md:text-right">
                    <div className="v2-mono text-[10px] mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      ships
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {a.artifacts.map((art) => (
                        <span
                          key={art}
                          className="v2-mono text-[10px] px-2 py-1"
                          style={{ border: '1px solid var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}
                        >
                          {artifactLabel(art)}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>

        {/* Real conflicts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="v2-label text-[10px] mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
            conflicts the operator resolves
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REAL_CONFLICTS.map((c, i) => (
              <div key={i} className="p-6" style={{ border: '1px solid var(--v2-paper-rule-strong)' }}>
                <div className="v2-mono text-[10px] mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>
                  {c.module}
                </div>
                <div className="v2-display text-[1.5rem] leading-tight mb-1" style={{ color: 'var(--v2-paper-ink)' }}>
                  {c.thread}
                </div>
                <div className="v2-mono text-[11px] mb-4" style={{ color: 'var(--v2-vermilion)' }}>
                  {c.reason}
                </div>
                <div className="space-y-3">
                  {c.sides.map((side, j) => (
                    <div key={j} className="v2-mono text-[11px] leading-[1.5]" style={{ color: 'var(--v2-paper-ink)' }}>
                      <span style={{ color: j === 0 ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink-2)' }}>
                        {side.agent}
                      </span>{' '}
                      — {side.label}
                      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--v2-paper-ink-2)' }}>
                        {side.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Module marquee */}
        <motion.div
          className="mt-20 md:mt-24 pt-6 overflow-hidden"
          style={{ borderTop: 'var(--v2-rule) solid var(--v2-paper-rule)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8 }}
        >
          <div className="v2-label text-[10px] mb-4" style={{ color: 'var(--v2-paper-ink-2)' }}>
            nine modules, one operator
          </div>
          <div className="relative overflow-hidden">
            <div className="flex w-max gap-8 py-2" style={{ animation: 'v2-tape-scroll 40s linear infinite' }}>
              {[...MODULES, ...MODULES].map((m, i) => (
                <span key={i} className="v2-display text-[1.5rem] md:text-[2rem] whitespace-nowrap" style={{ color: i % 2 ? 'var(--v2-paper-ink-2)' : 'var(--v2-paper-ink)' }}>
                  {m.replace(/_/g, ' ')}
                  <span style={{ color: 'var(--v2-vermilion)' }}> ·</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
