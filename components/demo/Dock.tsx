'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useOS } from '@/lib/demo/osStore';
import { DemoIcon } from '@/lib/demo/icons';
import { BrandMark } from './primitives';
import { buildDemoRoutes } from './routes';

interface DockProps {
  workspaceId: string;
}

export function Dock({ workspaceId }: DockProps) {
  const pathname = usePathname();
  const runActive = useOS((s) => s.runActive);
  const dockOpen = useOS((s) => s.dockOpen);
  const toggleDock = useOS((s) => s.toggleDock);
  const { user } = useAuth();
  const routes = buildDemoRoutes(workspaceId);
  const basePath = `/demo/${workspaceId}`;

  const isActive = (path: string) =>
    path === basePath ? pathname === basePath : pathname.startsWith(path);

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`agency-panel border-r agency-border py-4 flex flex-col items-center shrink-0 z-40 relative transition-[width] duration-200 ${dockOpen ? 'w-[208px] items-stretch px-3' : 'w-[76px] px-2'}`}
    >
      <div className={`flex flex-col ${dockOpen ? 'items-stretch gap-6' : 'items-center gap-6'} w-full`}>
        {/* header row: logo + collapse control side by side in both states */}
        <div className={`flex items-center mt-1 ${dockOpen ? 'justify-between' : 'justify-between w-full'}`}>
          <Link href={basePath} title="Doddle OS" className="hover:opacity-85 transition-opacity">
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
          {routes.map((route, i) => (
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
                {route.label === 'launchpad' && runActive && (
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
        href={`${basePath}/settings`}
        title={userName}
        className="shrink-0 rounded-full border border-[var(--hairline)] hover:border-[var(--hairline-strong)] overflow-hidden transition-colors w-9 h-9"
      >
        <span className="w-full h-full flex items-center justify-center text-[11px] font-bold font-mono bg-[var(--net-panel-2)]">
          {userInitial}
        </span>
      </Link>
    </div>
  );
}
