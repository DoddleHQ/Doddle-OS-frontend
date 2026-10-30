'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentWorkspace } from '@/lib/hooks/useCurrentWorkspace';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useOS } from '@/lib/demo/osStore';
import { DemoIcon } from '@/lib/demo/icons';
import { BrandMark } from './primitives';
import { buildDemoRoutes } from './routes';
import { groupWorkspacesByOrg } from '@/lib/utils/groupByOrg';

interface DockProps {
  workspaceId: string;
}

const CLOSE_DELAY_MS = 150;

const EASE = [0.16, 1, 0.3, 1] as const;

const RAIL_W = 72;
const OPEN_W = 224;

function labelAnim(expanded: boolean) {
  return {
    width: expanded ? ('auto' as const) : 0,
    marginLeft: expanded ? 10 : 0,
  };
}

export function Dock({ workspaceId }: DockProps) {
  const pathname = usePathname();
  const runActive = useOS((s) => s.runActive);
  const { user } = useAuth();
  const { workspaces } = useWorkspaces();
  const { workspace: currentWs } = useCurrentWorkspace(workspaceId);
  const [expanded, setExpanded] = useState(false);
  const [wsListOpen, setWsListOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routes = buildDemoRoutes(workspaceId);
  const basePath = `/workspaces/${workspaceId}`;

  const isActive = (path: string) =>
    path === basePath ? pathname === basePath : pathname.startsWith(path);

  const openDock = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setExpanded(true);
  };

  const closeDock = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setExpanded(false);
      setWsListOpen(false);
    }, CLOSE_DELAY_MS);
  };

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';
  const currentName = currentWs?.name || 'Workspace';
  const currentDomain = currentWs?.websiteDomain || '';
  const currentInitial = currentName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  const executionRoutes = routes.slice(0, 3);
  const managementRoutes = routes.slice(3);

  return (
    <div className="relative shrink-0 z-40 w-[72px]">
      <motion.div
        onMouseEnter={openDock}
        onMouseLeave={closeDock}
        onFocus={openDock}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) closeDock();
        }}
        initial={false}
        animate={{ width: expanded ? OPEN_W : RAIL_W }}
        transition={{ duration: 0.3, ease: EASE }}
        className="agency-panel border-r agency-border absolute inset-y-0 left-0 flex flex-col px-3 py-4 overflow-hidden"
      >
        <div className="flex items-center mb-3.5">
          <Link href="/" title="Doddle OS" className="hover:opacity-85 transition-opacity">
            <BrandMark className="w-9 h-9" />
          </Link>
        </div>

        <div className="mb-3">
          <button
            type="button"
            onClick={() => setWsListOpen((v) => !v)}
            aria-label={`Switch workspace (current: ${currentName})`}
            className={`w-full flex items-center rounded-[10px] border p-1.5 transition-colors text-left ${wsListOpen ? 'border-[var(--hairline-strong)] bg-[var(--accent-soft)]' : 'border-[var(--hairline)] bg-[var(--net-panel-2)] hover:border-[var(--hairline-strong)]'}`}
          >
            <span
              className="flex items-center justify-center shrink-0 font-bold font-mono text-[13px] text-white rounded-[8px]"
              style={{ background: 'var(--line-cobalt)', width: 36, height: 36 }}
            >
              {currentInitial}
            </span>
            <motion.span
              initial={false}
              animate={labelAnim(expanded)}
              transition={{ duration: 0.16, ease: EASE }}
              className="overflow-hidden shrink-0"
            >
              <span className="block w-[92px]">
                <span className="block text-[13px] font-semibold truncate leading-tight">{currentName}</span>
                {currentDomain && (
                  <span className="block text-[10px] font-mono text-[var(--ink-faint)] truncate mt-0.5">{currentDomain}</span>
                )}
              </span>
            </motion.span>
            <motion.span
              initial={false}
              animate={{ width: expanded ? 'auto' : 0, marginLeft: expanded ? 6 : 0 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="overflow-hidden shrink-0"
            >
              <ChevronDown className={`w-3.5 h-3.5 text-[var(--ink-faint)] transition-transform ${wsListOpen ? 'rotate-180' : ''}`} />
            </motion.span>
          </button>

          {wsListOpen && expanded && (
            <div className="mt-1.5 space-y-1 border border-[var(--hairline)] rounded-[8px] p-1.5 bg-[var(--net-panel)] max-h-[60vh] overflow-y-auto">
              {(() => {
                const groups = groupWorkspacesByOrg(workspaces);
                const singleOrg = groups.length === 1;
                return groups.map((group) => (
                  <div key={group.organizationId}>
                    {!singleOrg && (
                      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono px-2 pt-1.5 pb-1 truncate">
                        {group.organizationName}
                      </p>
                    )}
                    {group.workspaces.map((ws) => {
                      const isCurrent = ws.workspaceId === workspaceId;
                      return (
                        <Link
                          key={ws.workspaceId}
                          href={`/workspaces/${ws.workspaceId}`}
                          onClick={() => setWsListOpen(false)}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`flex items-center gap-2.5 h-8 px-2 rounded-[6px] transition-colors ${isCurrent ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--net-panel-2)]'}`}
                        >
                          <span
                            className="flex items-center justify-center shrink-0 font-bold font-mono text-[10px] text-[var(--ink-dim)] border border-[var(--hairline)] rounded-[5px]"
                            style={{ width: 22, height: 22 }}
                          >
                            {(ws.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase()}
                          </span>
                          <span className={`text-[11px] font-mono truncate flex-1 ${isCurrent ? 'text-[var(--ink)] font-semibold' : ''}`}>
                            {ws.name || 'Workspace'}
                          </span>
                          {isCurrent && <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--line-cobalt)' }} />}
                        </Link>
                      );
                    })}
                  </div>
                ));
              })()}
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

        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
          <div>
            <motion.p
              initial={false}
              animate={{ height: expanded ? 'auto' : 0, marginBottom: expanded ? 6 : 0 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="overflow-hidden text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono px-2 whitespace-nowrap"
            >
              execution
            </motion.p>
            <div className="space-y-0.5">
              {executionRoutes.map((route) => (
                <NavLink key={route.path} route={route} expanded={expanded} isActive={isActive(route.path)} runActive={runActive} />
              ))}
            </div>
          </div>

          <div className="h-px bg-[var(--hairline)] shrink-0" aria-hidden="true" />

          <div>
            <motion.p
              initial={false}
              animate={{ height: expanded ? 'auto' : 0, marginBottom: expanded ? 6 : 0 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="overflow-hidden text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono px-2 whitespace-nowrap"
            >
              management
            </motion.p>
            <div className="space-y-0.5">
              {managementRoutes.map((route) => (
                <NavLink key={route.path} route={route} expanded={expanded} isActive={isActive(route.path)} runActive={runActive} />
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-3 border-t border-[var(--hairline)] mt-3">
          <Link
            href={`${basePath}/settings`}
            title={userName}
            className="flex items-center h-10 px-1 rounded-[8px] hover:bg-[var(--net-panel-2)] transition-colors"
          >
            <span className="w-8 h-8 rounded-full border border-[var(--hairline)] flex items-center justify-center text-[11px] font-bold font-mono bg-[var(--net-panel-2)] shrink-0">
              {userInitial}
            </span>
            <motion.span
              initial={false}
              animate={labelAnim(expanded)}
              transition={{ duration: 0.16, ease: EASE }}
              className="overflow-hidden shrink-0"
            >
              <span className="block w-[104px]">
                <span className="block text-[11px] font-semibold truncate">{userName}</span>
                <span className="block text-[9px] font-mono text-[var(--ink-faint)] truncate">{user?.email || ''}</span>
              </span>
            </motion.span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function NavLink({ route, expanded, isActive, runActive }: {
  route: { path: string; label: string; icon: string };
  expanded: boolean;
  isActive: boolean;
  runActive: boolean;
}) {
  return (
    <Link
      href={route.path}
      className={`dock-icon relative flex items-center h-9 px-2.5 rounded-[8px] ${isActive ? 'active' : ''}`}
      title={route.label}
    >
      <DemoIcon name={route.icon} className="w-4 h-4 shrink-0" />
      <motion.span
        initial={false}
        animate={labelAnim(expanded)}
        transition={{ duration: 0.16, ease: EASE }}
        className={`overflow-hidden whitespace-nowrap shrink-0 text-[12px] font-mono ${isActive ? 'text-[var(--ink)] font-semibold' : ''}`}
      >
        {route.label}
      </motion.span>
      {route.label === 'launchpad' && runActive && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--line-scarlet)] animate-pulse" />
      )}
    </Link>
  );
}
