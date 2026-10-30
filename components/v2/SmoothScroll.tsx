'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

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
      (lenis as any).__rafId = rafId;
    }

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
