'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
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
  const { workspaces } = useWorkspaces();
  const routes = buildDemoRoutes(workspaceId);
  const basePath = `/workspaces/${workspaceId}`;

  const isActive = (path: string) =>
    path === basePath ? pathname === basePath : pathname.startsWith(path);

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`agency-panel border-r agency-border py-4 flex flex-col items-center shrink-0 z-40 relative transition-[width] duration-200 ${dockOpen ? 'w-[208px] items-stretch px-3' : 'w-[76px] px-2'}`}
    >
      <div className={`flex flex-col ${dockOpen ? 'items-stretch gap-4' : 'items-center gap-4'} w-full`}>
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

        {/* workspace switcher: tiles for each workspace + create new */}
        <div className={`flex flex-col ${dockOpen ? 'gap-1' : 'gap-1.5'} w-full`}>
          {dockOpen && (
            <p className="label-rule !gap-2 !text-[9px] !mb-0 px-1">workspaces</p>
          )}
          <div className={`flex ${dockOpen ? 'flex-col gap-1' : 'flex-col gap-1'} w-full`}>
            {workspaces.slice(0, 6).map((ws) => {
              const active = ws.workspaceId === workspaceId;
              const initial = (ws.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';
              return (
                <Link
                  key={ws.workspaceId}
                  href={`/workspaces/${ws.workspaceId}`}
                  title={ws.name || 'Workspace'}
                  className={`relative group flex items-center ${dockOpen ? 'gap-2.5 h-9 px-2 rounded-[8px]' : 'w-full h-9 justify-center rounded-[10px]'} transition-all ${active ? 'bg-[var(--accent-soft)] border border-[var(--hairline-strong)] shadow-[inset_2px_0_0_var(--line-cobalt)]' : 'hover:bg-[var(--net-panel-2)] border border-transparent'}`}
                >
                  <span
                    className={`flex items-center justify-center shrink-0 font-bold font-mono text-[11px] rounded-[6px] transition-colors ${dockOpen ? 'w-6 h-6' : 'w-7 h-7'} ${active ? 'text-white' : 'text-[var(--ink-dim)] border border-[var(--hairline)]'}`}
                    style={active ? { background: 'var(--line-cobalt)' } : undefined}
                  >
                    {initial}
                  </span>
                  {dockOpen && (
                    <span className={`text-[11px] font-mono truncate ${active ? 'text-[var(--ink)] font-semibold' : 'text-[var(--ink-dim)]'}`}>
                      {ws.name || 'Workspace'}
                    </span>
                  )}
                  {!dockOpen && (
                    <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                      {ws.name || 'Workspace'}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* create new workspace */}
            <Link
              href="/onboarding"
              title="New workspace"
              className={`relative group flex items-center ${dockOpen ? 'gap-2.5 h-9 px-2 rounded-[8px]' : 'w-full h-9 justify-center rounded-[10px]'} border border-dashed border-[var(--hairline-strong)] hover:border-[var(--line-cobalt)] hover:bg-[var(--accent-soft)] transition-all`}
            >
              <Plus className="w-4 h-4 text-[var(--ink-faint)] group-hover:text-[var(--line-cobalt)] transition-colors shrink-0" />
              {dockOpen && (
                <span className="text-[11px] font-mono text-[var(--ink-faint)] group-hover:text-[var(--line-cobalt)] transition-colors">
                  new_workspace()
                </span>
              )}
              {!dockOpen && (
                <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  new workspace
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* divider between workspaces and nav */}
        <div className={`h-px bg-[var(--hairline)] mx-auto ${dockOpen ? 'w-full' : 'w-8'}`} aria-hidden="true" />

        <nav className={`flex flex-col ${dockOpen ? 'space-y-1' : 'space-y-2.5'} w-full`}>
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
