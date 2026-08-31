'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const isActive = (path: string) =>
    path === '/demo' ? pathname === '/demo' : pathname.startsWith(path);

  return (
    <div className="agency-panel w-[88px] border-r agency-border p-4 flex flex-col items-center justify-between shrink-0 z-40 relative">
      <div className="flex flex-col items-center gap-6 w-full">
        <Link href="/demo" title="Doddle OS" className="hover:opacity-85 transition-opacity mt-1">
          <BrandMark className="w-12 h-12" />
        </Link>

        <div className="space-y-2.5 mt-3 w-full">
          {DEMO_ROUTES.map((route, i) => (
            <div key={route.path} className="contents">
              {i === 3 && <div className="w-8 h-px bg-[var(--hairline)] mx-auto my-2" />}
              <Link
                href={route.path}
                className={`dock-icon w-full h-12 flex items-center justify-center relative group ${isActive(route.path) ? 'active' : ''}`}
              >
                <DemoIcon name={route.icon} className="w-5 h-5" />
                {route.path === '/demo/launchpad' && runActive && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--line-scarlet)] animate-pulse" />
                )}
                <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {route.label}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
