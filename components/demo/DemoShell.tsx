'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOS } from '@/lib/demo/osStore';
import { Dock, DEMO_ROUTES } from './Dock';
import { TriagePanel } from './overlays/TriagePanel';
import { VaultPanel } from './overlays/VaultPanel';
import { CommandPalette } from './overlays/CommandPalette';
import { ToastStack } from './overlays/ToastStack';

export function DemoShell({ children }: { children: React.ReactNode }) {
  const setOverlay = useOS((s) => s.setOverlay);
  const closeTopOverlay = useOS((s) => s.closeTopOverlay);
  const router = useRouter();
  const gPressed = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOverlay('paletteOpen');
        return;
      }
      if (e.key === 'Escape') {
        closeTopOverlay();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      if (e.key === 'g' || e.key === 'G') {
        gPressed.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => { gPressed.current = false; }, 1000);
        return;
      }
      if (gPressed.current && /^[1-6]$/.test(e.key)) {
        const route = DEMO_ROUTES[Number(e.key) - 1];
        if (route) router.push(route.path);
        gPressed.current = false;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router, setOverlay, closeTopOverlay]);

  return (
    <div className="demo-scope daypass h-screen w-screen relative flex flex-col overflow-hidden">
      {/* base-map linework beneath the board */}
      <div className="base-map absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="flex-1 flex overflow-hidden relative z-10">
        <Dock />
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          {children}
          <TriagePanel />
          <VaultPanel />
        </div>
      </div>
      <CommandPalette />
      <ToastStack />
    </div>
  );
}
