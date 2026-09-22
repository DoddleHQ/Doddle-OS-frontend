'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOS } from '@/lib/demo/osStore';
import { Dock } from './Dock';
import { TriagePanel } from './overlays/TriagePanel';
import { VaultPanel } from './overlays/VaultPanel';
import { CommandPalette } from './overlays/CommandPalette';
import { ToastStack } from './overlays/ToastStack';
import { buildDemoRoutes } from './routes';

interface DemoShellProps {
  children: React.ReactNode;
  workspaceId: string;
}

export function DemoShell({ children, workspaceId }: DemoShellProps) {
  const setOverlay = useOS((s) => s.setOverlay);
  const closeTopOverlay = useOS((s) => s.closeTopOverlay);
  const router = useRouter();
  const routes = buildDemoRoutes(workspaceId);
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
        const route = routes[Number(e.key) - 1];
        if (route) router.push(route.path);
        gPressed.current = false;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router, setOverlay, closeTopOverlay, routes]);

  return (
    <div
      className="h-screen w-screen relative flex flex-col overflow-x-hidden overflow-y-hidden antialiased"
      style={{ background: 'var(--net-ground)', color: 'var(--ink)', fontFamily: "var(--font-archivo), 'Archivo', system-ui, sans-serif", textRendering: 'optimizeLegibility' }}
    >
      {/* base-map linework beneath the board */}
      <div className="base-map absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="flex-1 flex overflow-hidden relative z-10">
        <Dock workspaceId={workspaceId} />
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          {children}
          <TriagePanel workspaceId={workspaceId} />
          <VaultPanel workspaceId={workspaceId} />
        </div>
      </div>
      <CommandPalette workspaceId={workspaceId} />
      <ToastStack />
    </div>
  );
}

export const WorkspaceShell = DemoShell;

