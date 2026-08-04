'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/*
 * SmoothScroll — Lenis inertia scroll, scoped to the v2 landing only.
 * The dashboard interiors (later sessions) keep native scroll; smooth scroll
 * fights dense data views.
 *
 * Also drives the register-aware document scrollbar: the v2 page spans two
 * registers (warm paper + tinted ink), so the scrollbar track/thumb should
 * follow whichever register currently dominates the viewport. This sets the
 * --st-track / --st-thumb CSS vars on :root based on the topmost section.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let lenis: Lenis | null = null;
    if (!prefersReduced) {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      let rafId = 0;
      const raf = (time: number) => {
        lenis!.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
      // stash cleanup
      (lenis as any).__rafId = rafId;
    }

    // --- Register-aware scrollbar ---
    // Detect whether the section at the viewport top is an ink (.v2-ink) or
    // paper section, and set the scrollbar vars on :root accordingly so the
    // document scrollbar's track matches the visible surface.
    const root = document.documentElement;
    const updateScrollbarRegister = () => {
      const probe = document.elementFromPoint(window.innerWidth - 5, 1);
      const onInk = !!(probe && probe.closest('.v2-ink'));
      if (onInk) {
        root.style.setProperty('--st-track', '#141210');
        root.style.setProperty('--st-thumb', '#3a342e');
        root.style.setProperty('--st-thumb-hover', '#e8442e');
      } else {
        root.style.setProperty('--st-track', '#efe7d6');
        root.style.setProperty('--st-thumb', '#c2b495');
        root.style.setProperty('--st-thumb-hover', '#c8321b');
      }
    };
    updateScrollbarRegister();
    window.addEventListener('scroll', updateScrollbarRegister, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollbarRegister);
      if (lenis) {
        cancelAnimationFrame((lenis as any).__rafId ?? 0);
        lenis.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
