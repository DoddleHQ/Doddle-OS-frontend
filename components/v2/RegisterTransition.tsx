'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function RegisterTransition() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const board = document.getElementById('board');
        if (!board || !line.current) return;

        gsap.set(line.current, { scaleY: 0, transformOrigin: 'top center', opacity: 0 });

        const st = ScrollTrigger.create({
          trigger: board,
          start: 'top 80%',
          end: 'top 20%',
          scrub: 0.6,
          onUpdate: (self) => {
            gsap.set(line.current, {
              scaleY: self.progress,
              opacity: self.progress > 0.05 && self.progress < 0.95 ? 0.9 : 0,
            });
          },
        });
        return () => st.kill();
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-40">
      <div
        ref={line}
        className="absolute left-0 right-0 top-0 h-px"
        style={{ background: 'var(--v2-vermilion)', boxShadow: '0 0 18px 2px rgba(200,50,27,0.5)' }}
      />
    </div>
  );
}
