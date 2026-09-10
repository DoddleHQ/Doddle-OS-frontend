'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentWorkspace } from '@/lib/hooks/useCurrentWorkspace';
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
  const { workspace: currentWs } = useCurrentWorkspace(workspaceId);
  const [wsListOpen, setWsListOpen] = useState(false);
  const routes = buildDemoRoutes(workspaceId);
  const basePath = `/workspaces/${workspaceId}`;

  const isActive = (path: string) =>
    path === basePath ? pathname === basePath : pathname.startsWith(path);

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';
  const currentName = currentWs?.name || 'Workspace';
  const currentDomain = currentWs?.websiteDomain || '';
  const currentInitial = currentName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  // Split routes into logical groups
  const executionRoutes = routes.slice(0, 3); // dashboard, launchpad, power_agents
  const managementRoutes = routes.slice(3);   // graphs, agency_hub, settings

  return (
    <div
      className={`agency-panel border-r agency-border shrink-0 z-40 relative transition-[width] duration-200 flex flex-col ${dockOpen ? 'w-[224px] px-3 py-4' : 'w-[76px] px-2 py-4 items-center'}`}
    >
      {/* ── top: logo + collapse ── */}
      <div className={`flex items-center ${dockOpen ? 'justify-between mb-4' : 'justify-between w-full mb-3'}`}>
        <Link href="/" title="Doddle OS" className="hover:opacity-85 transition-opacity">
          <BrandMark className="w-9 h-9" />
        </Link>
        <button
          type="button"
          onClick={toggleDock}
          aria-label={dockOpen ? 'Collapse dock' : 'Expand dock'}
          className={`dock-icon flex items-center justify-center border border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-colors ${dockOpen ? 'w-[30px] h-[30px] rounded-[7px]' : 'w-7 h-7 rounded-[7px]'}`}
        >
          {dockOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* ── workspace card ── */}
      {dockOpen ? (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setWsListOpen((v) => !v)}
            className={`w-full flex items-center gap-3 rounded-[10px] border p-3 transition-colors text-left ${wsListOpen ? 'border-[var(--hairline-strong)] bg-[var(--accent-soft)]' : 'border-[var(--hairline)] bg-[var(--net-panel-2)] hover:border-[var(--hairline-strong)]'}`}
          >
            <span
              className="flex items-center justify-center shrink-0 font-bold font-mono text-[13px] text-white rounded-[8px]"
              style={{ background: 'var(--line-cobalt)', width: 36, height: 36 }}
            >
              {currentInitial}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold truncate leading-tight">{currentName}</span>
              {currentDomain && (
                <span className="block text-[10px] font-mono text-[var(--ink-faint)] truncate mt-0.5">{currentDomain}</span>
              )}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--ink-faint)] transition-transform shrink-0 ${wsListOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* workspace dropdown */}
          {wsListOpen && (
            <div className="mt-1.5 space-y-0.5 border border-[var(--hairline)] rounded-[8px] p-1.5 bg-[var(--net-panel)]">
              {workspaces.filter((w) => w.workspaceId !== workspaceId).slice(0, 6).map((ws) => (
                <Link
                  key={ws.workspaceId}
                  href={`/workspaces/${ws.workspaceId}`}
                  onClick={() => setWsListOpen(false)}
                  className="flex items-center gap-2.5 h-8 px-2 rounded-[6px] hover:bg-[var(--net-panel-2)] transition-colors group"
                >
                  <span
                    className="flex items-center justify-center shrink-0 font-bold font-mono text-[10px] text-[var(--ink-dim)] border border-[var(--hairline)] rounded-[5px]"
                    style={{ width: 22, height: 22 }}
                  >
                    {(ws.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono truncate flex-1">{ws.name || 'Workspace'}</span>
                </Link>
              ))}
              <Link
                href="/onboarding"
                onClick={() => setWsListOpen(false)}
                className="flex items-center gap-2.5 h-8 px-2 rounded-[6px] border border-dashed border-[var(--hairline-strong)] hover:border-[var(--line-cobalt)] hover:bg-[var(--accent-soft)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--ink-faint)] shrink-0" />
                <span className="text-[10px] font-mono text-[var(--ink-faint)]">New Workspace</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* collapsed: just the tile */
        <button
          type="button"
          onClick={() => setWsListOpen((v) => !v)}
          aria-label={`Switch workspace (current: ${currentName})`}
          className="relative group w-full h-11 flex items-center justify-center rounded-[10px] mb-3"
        >
          <span
            className="flex items-center justify-center font-bold font-mono text-[13px] text-white rounded-[8px]"
            style={{ background: 'var(--line-cobalt)', width: 32, height: 32 }}
          >
            {currentInitial}
          </span>
          <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            {currentName} ▾
          </span>
        </button>
      )}

      {/* workspace switcher list (collapsed mode) */}
      {!dockOpen && wsListOpen && (
        <div className="w-full space-y-1 mb-3 border border-[var(--hairline)] rounded-[8px] p-1.5 bg-[var(--net-panel)]">
          {workspaces.filter((w) => w.workspaceId !== workspaceId).slice(0, 6).map((ws) => (
            <Link
              key={ws.workspaceId}
              href={`/workspaces/${ws.workspaceId}`}
              onClick={() => setWsListOpen(false)}
              className="relative group w-full h-9 flex items-center justify-center rounded-[8px] hover:bg-[var(--net-panel-2)] transition-colors"
            >
              <span
                className="flex items-center justify-center font-bold font-mono text-[11px] text-[var(--ink-dim)] border border-[var(--hairline)] rounded-[6px]"
                style={{ width: 26, height: 26 }}
              >
                {(ws.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase()}
              </span>
              <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                {ws.name || 'Workspace'}
              </span>
            </Link>
          ))}
          <Link
            href="/onboarding"
            onClick={() => setWsListOpen(false)}
            className="relative group w-full h-9 flex items-center justify-center rounded-[8px] border border-dashed border-[var(--hairline-strong)] hover:border-[var(--line-cobalt)] transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--ink-faint)]" />
            <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
              new workspace
            </span>
          </Link>
        </div>
      )}

      {/* ── nav: grouped into Execution / Management ── */}
      {dockOpen ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* execution group */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono px-2 mb-1.5">execution</p>
            <div className="space-y-0.5">
              {executionRoutes.map((route) => (
                <NavLink key={route.path} route={route} dockOpen={dockOpen} isActive={isActive(route.path)} runActive={runActive} />
              ))}
            </div>
          </div>

          {/* management group */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono px-2 mb-1.5">management</p>
            <div className="space-y-0.5">
              {managementRoutes.map((route) => (
                <NavLink key={route.path} route={route} dockOpen={dockOpen} isActive={isActive(route.path)} runActive={runActive} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* collapsed nav */
        <div className="flex-1 flex flex-col gap-2.5 w-full min-h-0 overflow-y-auto overflow-x-hidden">
          {routes.map((route, i) => (
            <div key={route.path} className="contents">
              {i === 3 && <div className="h-px bg-[var(--hairline)] my-1 mx-auto w-8" aria-hidden="true" />}
              <NavLink route={route} dockOpen={dockOpen} isActive={isActive(route.path)} runActive={runActive} />
            </div>
          ))}
        </div>
      )}

      {/* ── footer: user ── */}
      <div className={`shrink-0 pt-3 border-t border-[var(--hairline)] mt-3 ${dockOpen ? 'px-1' : ''}`}>
        <Link
          href={`${basePath}/settings`}
          className={`flex items-center gap-2.5 rounded-[8px] transition-colors ${dockOpen ? 'h-10 px-2 hover:bg-[var(--net-panel-2)]' : 'w-full h-10 justify-center'}`}
          title={userName}
        >
          <span className="w-8 h-8 rounded-full border border-[var(--hairline)] flex items-center justify-center text-[11px] font-bold font-mono bg-[var(--net-panel-2)] shrink-0">
            {userInitial}
          </span>
          {dockOpen && (
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-semibold truncate">{userName}</span>
              <span className="block text-[9px] font-mono text-[var(--ink-faint)] truncate">{user?.email || ''}</span>
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

/** Individual nav link — shared between collapsed and expanded states */
function NavLink({ route, dockOpen, isActive, runActive }: {
  route: { path: string; label: string; icon: string };
  dockOpen: boolean;
  isActive: boolean;
  runActive: boolean;
}) {
  return (
    <Link
      href={route.path}
      className={`dock-icon relative group ${dockOpen ? 'h-9 flex items-center gap-2.5 px-2.5 rounded-[8px]' : 'w-full h-11 flex items-center justify-center rounded-[10px]'}`}
      title={route.label}
    >
      <DemoIcon name={route.icon} className={dockOpen ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0'} />
      {dockOpen && (
        <span className={`text-[12px] font-mono whitespace-nowrap ${isActive ? 'text-[var(--ink)] font-semibold' : ''}`}>
          {route.label}
        </span>
      )}
      {route.label === 'launchpad' && runActive && (
        <span className={`absolute bg-[var(--line-scarlet)] animate-pulse ${dockOpen ? 'top-1/2 -translate-y-1/2 right-2.5 w-1.5 h-1.5 rounded-full' : 'top-1.5 right-1.5 w-2 h-2 rounded-full'}`} />
      )}
      {!dockOpen && (
        <span className="absolute left-16 agency-panel agency-border border text-[10px] text-[var(--ink)] font-mono px-2 py-1 rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          {route.label}
        </span>
      )}
    </Link>
  );
}
