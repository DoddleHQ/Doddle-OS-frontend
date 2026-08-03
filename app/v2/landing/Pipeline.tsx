'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PIPELINE_STEPS, HITL_STEPS } from './content';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * Pipeline — the real 12-step workflow every graph agent runs
 * (BROWSING_ARCHITECT_STEPS from lib/types/graph-events.types.ts).
 *
 * An ink-register vertical timeline. As you scroll, a vermilion progress line
 * fills down and each step lights up in sequence, HITL steps flagged. This is
 * what the integrated agents ACTUALLY do — not a marketing claim.
 */

export function Pipeline() {
  const root = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: 'top 70%',
          end: 'bottom 30%',
          scrub: 0.8,
          onUpdate: (self) => {
            if (fillRef.current) {
              gsap.set(fillRef.current, { scaleY: self.progress, transformOrigin: 'top center' } as gsap.TweenVars);
            }
            // Light up steps based on progress
            const steps = gsap.utils.toArray<HTMLElement>('.v2-step');
            const activeCount = Math.ceil(self.progress * steps.length);
            steps.forEach((step, i) => {
              const isActive = i < activeCount;
              gsap.set(step, {
                opacity: isActive ? 1 : 0.35,
                color: isActive ? 'var(--v2-ink-text)' : 'var(--v2-ink-text-2)',
              });
              const num = step.querySelector('.v2-step-num');
              if (num) {
                gsap.set(num, { color: isActive ? 'var(--v2-vermilion-lift)' : 'var(--v2-ink-rule-strong)' });
              }
            });
          },
        });
        return () => st.kill();
      });
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      className="v2-ink px-6 md:px-10 py-20 md:py-28"
    >
      <div className="max-w-[1000px] mx-auto w-full">
        {/* Lead */}
        <div className="mb-16 md:mb-24">
          <div className="v2-label text-[10px] mb-3" style={{ color: 'var(--v2-ink-text-2)' }}>
            the pipeline <span style={{ color: 'var(--v2-vermilion-lift)' }}>·</span> every agent runs this
          </div>
          <h2 className="v2-display text-[clamp(2rem,5vw,3.75rem)]" style={{ color: 'var(--v2-ink-text)' }}>
            Twelve steps from a URL
            <br />
            to published content.
          </h2>
          <p className="mt-6 text-[15px] md:text-[17px] leading-[1.6] max-w-[52ch]" style={{ color: 'var(--v2-ink-text-2)' }}>
            Every graph agent — content, technical, GTM — shares one pipeline.
            It scrapes, extracts context, confirms the stack with you, audits
            before it writes, then generates and reports. Three steps pause for
            your call. That&rsquo;s the whole contract.
          </p>
        </div>

        {/* The timeline */}
        <div className="relative pl-8 md:pl-12">
          {/* Track */}
          <div
            className="absolute left-[3px] md:left-[5px] top-2 bottom-2 w-px"
            style={{ background: 'var(--v2-ink-rule)' }}
          />
          {/* Vermilion fill */}
          <div
            ref={fillRef}
            className="absolute left-[3px] md:left-[5px] top-2 bottom-2 w-px"
            style={{ background: 'var(--v2-vermilion-lift)', transform: 'scaleY(0)', transformOrigin: 'top center' }}
          />

          <ol className="space-y-4 md:space-y-5">
            {PIPELINE_STEPS.map((step) => {
              const hitl = HITL_STEPS[step.id];
              return (
                <li key={step.id} className="v2-step relative" style={{ opacity: 0.35 }}>
                  {/* Node */}
                  <span
                    className="v2-step-num v2-mono absolute -left-8 md:-left-12 top-0 text-[11px] font-bold"
                    style={{ color: 'var(--v2-ink-rule-strong)', background: 'var(--v2-ink-ground)', paddingRight: '0.5rem' }}
                  >
                    {step.num}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="v2-display text-[1.5rem] md:text-[1.75rem] leading-tight" style={{ color: 'var(--v2-ink-text)' }}>
                      {step.name}
                    </h3>
                    {hitl && (
                      <span
                        className="v2-label text-[9px] px-2 py-0.5"
                        style={{ border: '1px solid var(--v2-vermilion-lift)', color: 'var(--v2-vermilion-lift)' }}
                      >
                        operator gate
                      </span>
                    )}
                  </div>
                  <p className="v2-mono text-[12px] md:text-[13px] mt-1.5 max-w-[56ch]" style={{ color: 'var(--v2-ink-text-2)' }}>
                    {step.description}
                    {hitl && (
                      <span style={{ color: 'var(--v2-vermilion-lift)' }}> — {hitl.message}.</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
