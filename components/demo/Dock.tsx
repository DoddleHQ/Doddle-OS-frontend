'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
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
  const [wsListOpen, setWsListOpen] = useState(false);
  const routes = buildDemoRoutes(workspaceId);
  const basePath = `/workspaces/${workspaceId}`;

  const isActive = (path: string) =>
    path === basePath ? pathname === basePath : pathname.startsWith(path);

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';
  const currentWs = workspaces.find((w) => w.workspaceId === workspaceId);
  const currentInitial = (currentWs?.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`agency-panel border-r agency-border py-4 flex flex-col items-center shrink-0 z-40 relative transition-[width] duration-200 ${dockOpen ? 'w-[208px] items-stretch px-3' : 'w-[76px] px-2'}`}
    >
      <div className={`flex flex-col ${dockOpen ? 'items-stretch gap-3' : 'items-center gap-3'} w-full`}>
        {/* header row: logo + collapse control */}
        <div className={`flex items-center mt-1 ${dockOpen ? 'justify-between' : 'justify-between w-full'}`}>
          <Link href="/" title="Doddle OS" className="hover:opacity-85 transition-opacity">
            <BrandMark className={dockOpen ? 'w-9 h-9' : 'w-9 h-9'} />
          </Link>
          <button
            type="button"
            onClick={toggleDock}
            aria-label={dockOpen ? 'Collapse dock' : 'Expand dock'}
            className={`dock-icon group relative flex items-center justify-center border border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-colors ${dockOpen ? 'w-[30px] h-[30px] rounded-[7px]' : 'w-7 h-7 rounded-[7px]'}`}
          >
            {dockOpen
              ? <ChevronLeft className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* ── workspace header card + nav grouped beneath it ── */}
        <div
          className={`rounded-[10px] border transition-colors ${dockOpen ? 'border-[var(--hairline)] bg-[var(--net-panel-2)] p-1.5' : 'border-transparent'}`}
        >
          {/* current workspace button — click to toggle workspace list */}
          <button
            type="button"
            onClick={() => setWsListOpen((v) => !v)}
            aria-label={dockOpen ? `Switch workspace (current: ${currentWs?.name || 'Workspace'})` : 'Switch workspace'}
            className={`relative group w-full flex items-center gap-2 rounded-[8px] transition-colors ${dockOpen ? 'h-10 px-2' : 'h-11 justify-center'} ${wsListOpen ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--net-panel-2)]'}`}
          >
            <span
              className="flex items-center justify-center shrink-0 font-bold font-mono text-[11px] text-white rounded-[6px] transition-colors"
              style={{ background: 'var(--line-cobalt)', width: dockOpen ? 24 : 28, height: dockOpen ? 24 : 28 }}
            >
              {currentInitial}
            </span>
            {dockOpen && (
              <>
                <span className="text-[11px] font-mono font-semibold truncate flex-1 text-left">
                  {currentWs?.name || 'Workspace'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--ink-faint)] transition-transform shrink-0 ${wsListOpen ? 'rotate-180' : ''}`} />
              </>
            )}
            {!dockOpen && (
              <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                {currentWs?.name || 'Workspace'} ▾
              </span>
            )}
          </button>

          {/* workspace list (collapsible dropdown) */}
          {wsListOpen && (
            <div className={`mt-1 ${dockOpen ? 'space-y-0.5 border-t border-[var(--hairline)] pt-1' : 'space-y-1'}`}>
              {workspaces.filter((w) => w.workspaceId !== workspaceId).slice(0, 6).map((ws) => (
                <Link
                  key={ws.workspaceId}
                  href={`/workspaces/${ws.workspaceId}`}
                  onClick={() => setWsListOpen(false)}
                  className={`relative group flex items-center gap-2 rounded-[6px] transition-colors ${dockOpen ? 'h-8 px-2' : 'w-full h-9 justify-center'} hover:bg-[var(--net-panel-2)]`}
                >
                  <span
                    className="flex items-center justify-center shrink-0 font-bold font-mono text-[10px] text-[var(--ink-dim)] border border-[var(--hairline)] rounded-[5px]"
                    style={{ width: dockOpen ? 20 : 26, height: dockOpen ? 20 : 26 }}
                  >
                    {(ws.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase()}
                  </span>
                  {dockOpen && (
                    <span className="text-[10px] font-mono truncate">{ws.name || 'Workspace'}</span>
                  )}
                  {!dockOpen && (
                    <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                      {ws.name || 'Workspace'}
                    </span>
                  )}
                </Link>
              ))}
              {/* new workspace */}
              <Link
                href="/onboarding"
                onClick={() => setWsListOpen(false)}
                className={`relative group flex items-center gap-2 rounded-[6px] border border-dashed border-[var(--hairline-strong)] hover:border-[var(--line-cobalt)] transition-colors ${dockOpen ? 'h-8 px-2' : 'w-full h-9 justify-center'}`}
              >
                <Plus className="w-3 h-3 text-[var(--ink-faint)] shrink-0" />
                {dockOpen && (
                  <span className="text-[10px] font-mono text-[var(--ink-faint)]">new_workspace()</span>
                )}
                {!dockOpen && (
                  <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    new workspace
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* divider between workspace and its nav */}
          <div className={`h-px bg-[var(--hairline)] my-1.5 mx-auto ${dockOpen ? 'w-[calc(100%-8px)]' : 'w-8'}`} aria-hidden="true" />

          {/* nav items — visually inside the workspace container */}
          <nav className={`flex flex-col ${dockOpen ? 'space-y-0.5' : 'space-y-1'} w-full`}>
            {routes.map((route, i) => (
              <div key={route.path} className="contents">
                {i === 3 && (
                  <div className={`h-px bg-[var(--hairline)] my-1.5 mx-auto ${dockOpen ? 'w-[calc(100%-8px)]' : 'w-8'}`} aria-hidden="true" />
                )}
                <Link
                  href={route.path}
                  className={`dock-icon relative group ${dockOpen ? 'h-9 flex items-center gap-2.5 px-2 rounded-[7px]' : 'w-full h-10 flex items-center justify-center rounded-[9px]'}`}
                  title={route.label}
                >
                  <DemoIcon name={route.icon} className={dockOpen ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0'} />
                  {dockOpen && (
                    <span className={`text-[11px] font-mono whitespace-nowrap ${isActive(route.path) ? 'text-[var(--ink)] font-semibold' : ''}`}>
                      {route.label}
                    </span>
                  )}
                  {route.label === 'launchpad' && runActive && (
                    <span className={`absolute bg-[var(--line-scarlet)] animate-pulse ${dockOpen ? 'top-1/2 -translate-y-1/2 right-2 w-1.5 h-1.5 rounded-full' : 'top-1.5 right-1.5 w-2 h-2 rounded-full'}`} />
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
