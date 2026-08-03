'use client';

import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { TapeTicker } from './TapeTicker';
import { BOARD_THREAD, BOARD_HANDOFF, BOARD_COLUMNS, BOARD_RESIDENTS } from './content';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * LiveBoard — the signature moment (ink register).
 * Proves the mechanism with the project's REAL data: the Q1 Content Pipeline
 * thread, where content_architect drafts, technical_architect contests on
 * technical debt vs deadline, and the operator adjudicates. Scroll-pinned with
 * GSAP; the token leaves a fading trail at each handoff; the conflict surfaces
 * with weight and shows the real competing sides.
 *
 * SYNC CONTRACT: each step in BOARD_HANDOFF carries an explicit `col` index.
 * The token position, the owner/state/note copy, and the conflict panel all
 * read from the SAME step at the SAME scroll progress — so they can never
 * desync. Never reintroduce index-clamping (Math.min(i, n)) to derive columns;
 * that was the bug that showed COMPLETE while the token sat in Review.
 */

const STEPS = BOARD_HANDOFF;
// Column index per step is now explicit on each step (no clamping).
const colOf = (i: number) => STEPS[Math.min(i, STEPS.length - 1)].col;

export function LiveBoard() {
  const sectionRef = useRef<HTMLElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const noteRef = useRef<HTMLSpanElement>(null);
  const ownerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const conflictPanelRef = useRef<HTMLDivElement>(null);
  const conflictBorderRef = useRef<HTMLDivElement>(null);
  const [trailMarks, setTrailMarks] = useState<number[]>([]);

  const dropTrail = (col: number) => {
    setTrailMarks((prev) => (prev.includes(col) ? prev : [...prev, col]));
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Reduced-motion: no choreography. Show the resolved end state statically.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        const placeStatic = (stepIndex: number) => {
          const col = colOf(stepIndex);
          const target = colRefs.current[col];
          const token = tokenRef.current;
          if (!target || !token) return;
          const colRect = target.getBoundingClientRect();
          const board = target.parentElement?.parentElement;
          if (!board) return;
          const boardRect = board.getBoundingClientRect();
          gsap.set(token, {
            x: colRect.left - boardRect.left + colRect.width / 2 - token.offsetWidth / 2,
            y: colRect.top - boardRect.top + 24,
          });
        };
        placeStatic(STEPS.length - 1);
        const last = STEPS[STEPS.length - 1];
        if (noteRef.current) noteRef.current.textContent = last.note;
        if (ownerRef.current) ownerRef.current.textContent = last.agent;
        if (stateRef.current) stateRef.current.textContent = String(last.state).toUpperCase();
      });

      // ALL screen sizes with motion allowed get the scroll choreography.
      // The math uses getBoundingClientRect against actual column positions,
      // so it's layout-agnostic — it works for the 5-col desktop and the
      // 2-col mobile reflow identically.
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const placeToken = (stepIndex: number) => {
          const col = colOf(stepIndex);
          const target = colRefs.current[col];
          const token = tokenRef.current;
          if (!target || !token) return;
          const colRect = target.getBoundingClientRect();
          const board = target.parentElement?.parentElement;
          if (!board) return;
          const boardRect = board.getBoundingClientRect();
          gsap.set(token, {
            x: colRect.left - boardRect.left + colRect.width / 2 - token.offsetWidth / 2,
            y: colRect.top - boardRect.top + 24,
          });
        };

        placeToken(0);

        const st = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=260%',
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            const segCount = STEPS.length;
            const scaled = self.progress * (segCount - 1);
            const idx = Math.min(segCount - 1, Math.floor(scaled));
            const localP = scaled - idx;
            const step = STEPS[idx];
            const next = STEPS[Math.min(idx + 1, segCount - 1)];

            // Token position between current and next column.
            // Interpolates BOTH x and y — necessary on mobile where the 2-col
            // reflow places columns on different rows (different y), not just
            // different x like the desktop 5-col single row.
            const fromColI = colOf(idx);
            const toColI = colOf(Math.min(idx + 1, segCount - 1));
            const fromCol = colRefs.current[fromColI];
            const toCol = colRefs.current[toColI];
            const token = tokenRef.current;
            if (fromCol && toCol && token) {
              const board = fromCol.parentElement?.parentElement;
              if (board) {
                const boardRect = board.getBoundingClientRect();
                const fr = fromCol.getBoundingClientRect();
                const tr = toCol.getBoundingClientRect();
                const fromX = fr.left - boardRect.left + fr.width / 2 - token.offsetWidth / 2;
                const toX = tr.left - boardRect.left + tr.width / 2 - token.offsetWidth / 2;
                const fromY = fr.top - boardRect.top + 24;
                const toY = tr.top - boardRect.top + 24;
                const sameCol = fromColI === toColI;
                gsap.set(token, {
                  x: fromX + (sameCol ? 0 : (toX - fromX) * localP),
                  y: fromY + (sameCol ? 0 : (toY - fromY) * localP),
                });
              }
            }

            // Drop a trail mark when we cross into a new column
            if (localP > 0.5 && toColI !== fromColI) {
              dropTrail(fromColI);
            }

            // Copy / state — locked to the token's VISIBLE column.
            const sameCol = fromColI === toColI;
            const tokenFractionalCol = fromColI + (toColI - fromColI) * localP;
            const midpoint = fromColI + (toColI - fromColI) / 2;
            const showNext = sameCol ? localP >= 0.5 : tokenFractionalCol >= midpoint;
            const activeStep = showNext ? next : step;
            if (noteRef.current) noteRef.current.textContent = activeStep.note;
            if (ownerRef.current) ownerRef.current.textContent = activeStep.agent;
            if (stateRef.current) {
              stateRef.current.textContent = String(activeStep.state).toUpperCase();
              stateRef.current.style.color =
                activeStep.state === 'conflict' || activeStep.state === 'escalated'
                  ? 'var(--v2-vermilion-lift)'
                  : activeStep.state === 'complete'
                    ? 'var(--v2-sage)'
                    : 'var(--v2-ink-text)';
            }

            // Conflict panel: surfaces on steps 3 (conflict) and 4 (escalated)
            const conflictStep = idx >= 3 && idx <= 4;
            const sub = idx === 3 ? localP > 0.25 : idx === 4 ? localP < 0.65 : false;
            const conflictActive = conflictStep && sub;
            if (conflictPanelRef.current) {
              gsap.to(conflictPanelRef.current, {
                opacity: conflictActive ? 1 : 0,
                y: conflictActive ? 0 : 14,
                duration: 0.35,
                overwrite: true,
              });
            }
            if (conflictActive && conflictBorderRef.current) {
              conflictBorderRef.current.style.animation = 'v2-conflict-pulse 1.2s ease-out';
            }
          },
        });

        return () => st.kill();
      });
    },
    { scope: sectionRef }
  );

  // The real conflict from BOARD_THREAD (Tech_Lead vs Content_Strategist vs Crawl_Spider)
  const conflict = BOARD_THREAD.conflict ?? { id: 'conf-001', reason: '', options: [] };

  return (
    <section
      id="board"
      ref={sectionRef}
      className="v2-ink relative min-h-screen flex flex-col overflow-hidden"
    >
      <div className="px-6 md:px-10 pt-6">
        <div className="flex items-center justify-between">
          <span className="v2-label text-[11px]" style={{ color: 'var(--v2-ink-text-2)' }}>
            Live board
          </span>
          <span className="v2-mono text-[11px] hidden md:inline" style={{ color: 'var(--v2-ink-text-2)' }}>
            agents hand the work to each other
          </span>
        </div>
      </div>
      <div className="mt-4">
        <TapeTicker onInk />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 md:px-10 py-10">
        <div className="max-w-[1180px] mx-auto w-full">
          <div className="mb-8 md:mb-12 flex flex-wrap items-end justify-between gap-4">
            <h2 className="v2-display text-[clamp(1.75rem,4vw,3rem)]" style={{ color: 'var(--v2-ink-text)' }}>
              {BOARD_THREAD.title.split(' - ')[0]}
              <br />
              <span style={{ color: 'var(--v2-vermilion-lift)' }}>{BOARD_THREAD.status.replace(/_/g, ' ')}</span>
            </h2>
            <div className="v2-mono text-[12px] text-right" style={{ color: 'var(--v2-ink-text-2)' }}>
              <div>
                owner <span ref={ownerRef} style={{ color: 'var(--v2-ink-text)' }}>{STEPS[0].agent}</span>
              </div>
              <div className="mt-1">
                state <span ref={stateRef} style={{ color: 'var(--v2-ink-text)' }}>{String(STEPS[0].state).toUpperCase()}</span>
              </div>
              <div className="mt-1 max-w-[30ch]">
                <span ref={noteRef}>{STEPS[0].note}</span>
              </div>
            </div>
          </div>

          {/* The board — real Mission Control kanban columns */}
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {BOARD_COLUMNS.map((name, i) => (
                <div key={name} className="flex flex-col">
                  <div
                    className="v2-label text-[9px] md:text-[10px] pb-2 mb-3"
                    style={{ color: 'var(--v2-ink-text-2)', borderBottom: 'var(--v2-rule) solid var(--v2-ink-rule)' }}
                  >
                    {String(i + 1).padStart(2, '0')} {name}
                  </div>
                  <div
                    ref={(el) => { colRefs.current[i] = el; }}
                    className="min-h-[150px] md:min-h-[200px] relative"
                    style={{ border: 'var(--v2-rule) solid var(--v2-ink-rule)', background: 'rgba(255,255,255,0.012)' }}
                  >
                    {/* Faint resident agent label — real graph name for this column */}
                    <div className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none">
                      <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-ink-rule-strong)' }}>
                        {BOARD_RESIDENTS[i] ?? ''}
                      </span>
                    </div>
                    {/* Trail mark — the agent who handed off from this column */}
                    {trailMarks.includes(i) && (
                      <div
                        className="absolute top-9 left-1/2 -translate-x-1/2"
                        style={{ animation: 'v2-trail-fade 1.6s ease-out forwards' }}
                        aria-hidden
                      >
                        <div
                          className="px-2 py-1.5 v2-mono text-[10px]"
                          style={{ border: '1px solid var(--v2-ink-rule-strong)', color: 'var(--v2-ink-text-2)' }}
                        >
                          {BOARD_RESIDENTS[i] ?? ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* The traveling task token — real thread title */}
            <div
              ref={tokenRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: 'min(170px, 36vw)' }}
            >
              <div className="px-3 py-2.5" style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}>
                <div className="v2-label text-[9px] opacity-80 mb-0.5">thread</div>
                <div className="v2-mono text-[11px] leading-tight">
                  {BOARD_THREAD.title.split(' - ')[0]}
                </div>
              </div>
            </div>

            {/* Conflict panel — the REAL three-way conflict */}
            <div
              ref={conflictPanelRef}
              className="mt-5 md:mt-6 md:flex md:justify-end pointer-events-none"
              style={{ opacity: 0 }}
            >
              <div
                ref={conflictBorderRef}
                className="p-4 w-full md:w-[340px]"
                style={{ background: 'var(--v2-ink-ground)', border: '1px solid var(--v2-ink-rule-strong)' }}
              >
                <div className="v2-label text-[9px] mb-2" style={{ color: 'var(--v2-vermilion-lift)' }}>
                  ✕ conflict · {conflict.id}
                </div>
                <div className="v2-mono text-[10px] mb-3" style={{ color: 'var(--v2-ink-text-2)' }}>
                  {conflict.reason}
                </div>
                <div className="space-y-2 v2-mono text-[11px]" style={{ color: 'var(--v2-ink-text)' }}>
                  {conflict.options.map((o, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span style={{ color: idx === 0 ? 'var(--v2-vermilion-lift)' : 'var(--v2-ink-text-2)' }}>
                        {o.agent.name}
                      </span>
                      <span style={{ color: 'var(--v2-ink-text)' }}>{o.label}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2" style={{ borderTop: 'var(--v2-rule) solid var(--v2-ink-rule)' }}>
                    <span style={{ color: 'var(--v2-ink-text-2)' }}>→ operator</span> adjudicate
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 md:mt-14 v2-mono text-[11px]" style={{ color: 'var(--v2-ink-text-2)' }}>
            keep scrolling — the task travels the lane, a conflict rises, you resolve it.
          </div>
        </div>
      </div>
    </section>
  );
}
