'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { DemoIcon } from '@/lib/demo/icons';
import { BrandMark } from './primitives';

export const DEMO_ROUTES = [
  { path: '/demo', label: 'dashboard', icon: 'layout-dashboard' },
  { path: '/demo/launchpad', label: 'launchpad', icon: 'terminal' },
  { path: '/demo/power-agents', label: 'power_agents', icon: 'zap' },
  { path: '/demo/graphs', label: 'graphs', icon: 'folder-tree' },
  { path: '/demo/agency-hub', label: 'agency_hub', icon: 'building-2' },
  { path: '/demo/settings', label: 'platform_settings', icon: 'settings' },
] as const;

export function Dock() {
  const pathname = usePathname();
  const runActive = useOS((s) => s.runActive);
  const dockOpen = useOS((s) => s.dockOpen);
  const toggleDock = useOS((s) => s.toggleDock);

  const isActive = (path: string) =>
    path === '/demo' ? pathname === '/demo' : pathname.startsWith(path);

  return (
    <div
      className={`agency-panel border-r agency-border py-4 flex flex-col items-center shrink-0 z-40 relative transition-[width] duration-200 ${dockOpen ? 'w-[208px] items-stretch px-3' : 'w-[72px] px-2'}`}
    >
      <div className={`flex flex-col ${dockOpen ? 'items-stretch gap-6' : 'items-center gap-6'} w-full`}>
        <Link href="/demo" title="Doddle OS" className={`hover:opacity-85 transition-opacity ${dockOpen ? 'self-center mt-1' : 'mt-1'}`}>
          <BrandMark className="w-11 h-11" />
        </Link>

        <nav className={`flex flex-col ${dockOpen ? 'space-y-1' : 'space-y-2.5'} mt-2 w-full`}>
          {DEMO_ROUTES.map((route, i) => (
            <div key={route.path} className="contents">
              {i === 3 && (
                <div className={`h-px bg-[var(--hairline)] my-2.5 mx-auto ${dockOpen ? 'w-full' : 'w-8'}`} aria-hidden="true" />
              )}
              <Link
                href={route.path}
                className={`dock-icon relative group ${dockOpen ? 'h-10 flex items-center gap-3 px-3 rounded-[8px]' : 'w-full h-12 flex items-center justify-center rounded-[10px]'}`}
                title={route.label}
              >
                <DemoIcon name={route.icon} className="w-5 h-5 shrink-0" />
                {dockOpen && (
                  <span className={`text-[11px] font-mono whitespace-nowrap ${isActive(route.path) ? 'text-[var(--ink)]' : ''}`}>
                    {route.label}
                  </span>
                )}
                {route.path === '/demo/launchpad' && runActive && (
                  <span className={`absolute bg-[var(--line-scarlet)] animate-pulse ${dockOpen ? 'top-1/2 -translate-y-1/2 right-3 w-1.5 h-1.5 rounded-full' : 'top-2 right-2 w-2 h-2 rounded-full'}`} />
                )}
                {!dockOpen && (
                  <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    {route.label}
                  </span>
                )}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={toggleDock}
        aria-label={dockOpen ? 'Collapse dock' : 'Expand dock'}
        title={dockOpen ? 'collapse' : 'expand'}
        className={`dock-icon mt-auto flex items-center justify-center h-10 shrink-0 ${dockOpen ? 'self-stretch rounded-[8px]' : 'w-full rounded-[10px]'}`}
      >
        {dockOpen ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
