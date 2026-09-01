'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { OPERATOR } from '@/lib/demo/data';
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
      className={`agency-panel border-r agency-border py-4 flex flex-col items-center shrink-0 z-40 relative transition-[width] duration-200 ${dockOpen ? 'w-[208px] items-stretch px-3' : 'w-[76px] px-2'}`}
    >
      <div className={`flex flex-col ${dockOpen ? 'items-stretch gap-6' : 'items-center gap-6'} w-full`}>
        {/* header row: logo + collapse control side by side in both states */}
        <div className={`flex items-center mt-1 ${dockOpen ? 'justify-between' : 'justify-between w-full'}`}>
          <Link href="/demo" title="Doddle OS" className="hover:opacity-85 transition-opacity">
            <BrandMark className={dockOpen ? 'w-10 h-10' : 'w-9 h-9'} />
          </Link>
          <button
            type="button"
            onClick={toggleDock}
            aria-label={dockOpen ? 'Collapse dock' : 'Expand dock'}
            className={`dock-icon group relative flex items-center justify-center border border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-colors ${dockOpen ? 'w-[34px] h-[34px] rounded-[8px]' : 'w-7 h-7 rounded-[7px]'}`}
          >
            {dockOpen
              ? <ChevronLeft className="w-5 h-5" />
              : <ChevronRight className="w-4 h-4" />}
            <span className="absolute left-12 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
              {dockOpen ? 'collapse' : 'expand'}
            </span>
          </button>
        </div>

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

      {/* operator avatar at the rail's foot */}
      <Link
        href="/demo/settings"
        title={OPERATOR.name}
        className={`shrink-0 rounded-full border border-[var(--hairline)] hover:border-[var(--hairline-strong)] overflow-hidden transition-colors ${dockOpen ? 'w-9 h-9' : 'w-9 h-9'}`}
      >
        <span className="w-full h-full flex items-center justify-center text-[11px] font-bold font-mono bg-[var(--net-panel-2)]">
          {OPERATOR.name.split(' ')[0][0]}
        </span>
      </Link>
    </div>
  );
}
