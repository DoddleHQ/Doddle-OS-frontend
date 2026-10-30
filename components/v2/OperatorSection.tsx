'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SAMPLE_HITLS } from './content';

export function OperatorSection() {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const hitl = SAMPLE_HITLS[idx];

  const pick = (optId: string) => {
    setChoice(optId);
  };

  const next = () => {
    setChoice(null);
    setIdx((i) => (i + 1) % SAMPLE_HITLS.length);
  };

  return (
    <section
      className="px-6 md:px-10 py-24 md:py-36"
      style={{ background: 'var(--v2-paper-ground)', color: 'var(--v2-paper-ink)', borderTop: 'var(--v2-rule) solid var(--v2-paper-rule)' }}
    >
      <div className="max-w-[1000px] mx-auto w-full">
        <div className="mb-12 md:mb-16">
          <div className="v2-label text-[10px] mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
            the operator <span style={{ color: 'var(--v2-vermilion)' }}>·</span> human-in-the-loop
          </div>
          <h2 className="v2-display text-[clamp(2rem,5vw,3.75rem)]">
            The agents pause.
            <br />
            <span style={{ color: 'var(--v2-vermilion)' }}>You decide.</span>
          </h2>
          <p className="mt-6 text-[15px] md:text-[17px] leading-[1.6] max-w-[52ch]" style={{ color: 'var(--v2-paper-ink-2)' }}>
            Three steps in every pipeline are gates. The agent stops, surfaces a
            real interrupt, and waits for your call. Try one — pick an option and
            see what the pipeline does next.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-px" style={{ background: 'var(--v2-paper-rule)' }}>
          <div className="p-6 md:p-8" style={{ background: 'var(--v2-paper-ground)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="v2-label text-[9px]" style={{ color: 'var(--v2-vermilion)' }}>
                ✕ {hitl.typeLabel}
              </span>
              <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                {idx + 1} / {SAMPLE_HITLS.length}
              </span>
            </div>

            <div className="v2-mono text-[11px] mb-2" style={{ color: 'var(--v2-paper-ink-2)' }}>
              agent: {hitl.agent}
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={hitl.id}
                className="v2-display text-[1.25rem] md:text-[1.5rem] leading-snug mb-6"
                style={{ color: 'var(--v2-paper-ink)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                &ldquo;{hitl.message}&rdquo;
              </motion.p>
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              {hitl.options.map((opt) => {
                const selected = choice === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => pick(opt.id)}
                    className="text-left px-4 py-3 transition-colors v2-mono text-[12px] md:text-[13px]"
                    style={{
                      border: selected
                        ? '1px solid var(--v2-vermilion)'
                        : '1px solid var(--v2-paper-rule-strong)',
                      background: selected ? 'var(--v2-vermilion)' : 'transparent',
                      color: selected ? 'var(--v2-vermilion-ink)' : 'var(--v2-paper-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col" style={{ background: 'var(--v2-paper-ground)' }}>
            <div className="v2-label text-[9px] mb-4" style={{ color: 'var(--v2-paper-ink-2)' }}>
              pipeline consequence
            </div>

            <AnimatePresence mode="wait">
              {choice ? (
                <motion.div
                  key={choice}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="v2-mono text-[10px] mb-2" style={{ color: 'var(--v2-sage)' }}>
                    ✓ resolved · pipeline resumes
                  </div>
                  <p className="v2-mono text-[12px] md:text-[13px] leading-[1.6] flex-1" style={{ color: 'var(--v2-paper-ink)' }}>
                    {hitl.outcomes[choice]}
                  </p>
                  <button
                    onClick={next}
                    className="mt-6 self-start inline-flex items-center gap-2 px-5 py-2.5 transition-colors"
                    style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', cursor: 'pointer' }}
                  >
                    <span className="v2-label text-[11px]">Next interrupt</span>
                    <span aria-hidden>→</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <p className="v2-mono text-[12px] text-center" style={{ color: 'var(--v2-paper-ink-2)' }}>
                    ← pick an option to see what the pipeline does
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {SAMPLE_HITLS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setChoice(null); }}
              aria-label={`Interrupt ${i + 1}`}
              className="h-1.5 transition-all"
              style={{
                width: i === idx ? '2rem' : '0.375rem',
                background: i === idx ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
