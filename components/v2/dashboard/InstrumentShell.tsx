'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Logo } from '@/components/v2/Logo';
import { UserMenu } from '@/components/layout/UserMenu';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { WORKSPACE_MODULES as MODULES } from './modules';
import { NavItem, StatusDot } from './primitives';
import type { Workspace } from '@/lib/types/workspace.types';
import { type LiveActivity } from '@/data/missionControl';
import { threadService } from '@/lib/services/threadService';
import type { AuditThread, ModuleId } from '@/lib/types/thread.types';
import { AGENT_LIST } from '@/components/v2/content-factory/agents';
import { workspaceService } from '@/lib/services/workspaceService';

/*
 * InstrumentShell — Operate-mode dashboard layout.
 *
 * Four zones, refined for scanability and consistency (impeccable Operate):
 *   1. Icon rail (56px, ink): workspace switcher tiles
 *   2. Module nav (220px, paper): orientation + navigation
 *   3. Content (flex-1, paper): top bar + scrollable page
 *   4. Live feed (288px, ink): agent activity, wired to mock data
 *
 * Operate-mode compliance:
 * - No Instrument Serif in the interior (Hanken Grotesk throughout)
 * - No eyebrow/kicker labels above content
 * - Active nav = solid fill, NOT border-left (hard ban)
 * - Accent reserved for state/selection only
 * - Motion: 150-250ms functional, cubic-bezier(0.16,1,0.3,1)
 */

const EASE = [0.16, 1, 0.3, 1] as const;

interface InstrumentShellProps {
  workspaceId: string;
  workspace: Workspace | null;
  children: React.ReactNode;
}

export function InstrumentShell({ workspaceId, workspace, children }: InstrumentShellProps) {
  const pathname = usePathname();
  const [feedOpen, setFeedOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { workspaces } = useWorkspaces();
  const [needsPersona, setNeedsPersona] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const activeModule = pathname.includes('/settings')
    ? { name: 'Settings' }
    : pathname.includes('/brand-persona')
      ? { name: 'Brand Persona' }
      : MODULES.find((m) => pathname.includes(m.path)) || MODULES[0];
  const isOnPersonaPage = pathname.includes('/brand-persona');

  // Check if workspace has a brand persona — re-checks on route changes so
  // the banner hides after the user saves a persona (from Brand Guardrails
  // editor or the Brand Persona setup page) and navigates anywhere else.
  useEffect(() => {
    workspaceService.getPersona(workspaceId).then((persona) => {
      setNeedsPersona(!persona || !persona.content || persona.content.trim().length === 0);
    }).catch(() => setNeedsPersona(false));
  }, [workspaceId, pathname]);

  const showBanner = needsPersona && !bannerDismissed && !isOnPersonaPage;

  return (
    <div className="v2-scope flex h-screen overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
      {/* === ZONE 1: ICON RAIL === */}
      <IconRail workspaceId={workspaceId} workspaces={workspaces} />

      {/* === ZONE 2: MODULE NAV === */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 w-[220px]"
        style={{ background: 'var(--v2-paper-ground)', borderRight: '1px solid var(--v2-paper-rule)' }}
      >
        <ModuleNavList workspaceId={workspaceId} workspace={workspace} pathname={pathname} />
      </aside>

      {/* === ZONE 3: CENTER CONTENT === */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-1.5 -ml-1"
              style={{ color: 'var(--v2-paper-ink-2)' }}
              aria-label="Open navigation"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h1
              className="truncate"
              style={{
                fontFamily: 'var(--v2-font-sans)',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--v2-paper-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {activeModule.name}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <UserMenu />
            {!feedOpen && (
              <button
                onClick={() => setFeedOpen(true)}
                className="p-1.5 rounded-[6px]"
                style={{ color: 'var(--v2-paper-ink-2)' }}
                aria-label="Open activity feed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Setup banner — shown when brand persona is not configured */}
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex-shrink-0 overflow-hidden"
          >
            <Link
              href={`/workspaces/${workspaceId}/brand-persona`}
              className="flex items-center gap-2.5 px-5 py-2.5 transition-colors group"
              style={{ background: 'rgba(200,50,27,0.05)', borderBottom: '1px solid var(--v2-paper-rule)' }}
            >
              <span
                className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(200,50,27,0.08)' }}
              >
                <Settings className="w-3.5 h-3.5" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.75} />
              </span>
              <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.78rem', color: 'var(--v2-paper-ink)', fontWeight: 500 }}>
                Set up your brand persona
              </span>
              <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                · Help your agents understand your brand
              </span>
              <span
                className="ml-auto v2-label text-[8px] transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--v2-vermilion)' }}
              >
                Start →
              </span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBannerDismissed(true); }}
                className="flex-shrink-0 ml-2 transition-opacity"
                style={{ color: 'var(--v2-paper-ink-2)', opacity: 0.4 }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </Link>
          </motion.div>
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* === ZONE 4: LIVE FEED === */}
      <FeedWrapper workspaceId={workspaceId} open={feedOpen} onClose={() => setFeedOpen(false)} />

      {/* === MOBILE DRAWER === */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[260px] overflow-y-auto md:hidden"
              style={{ background: 'var(--v2-ink-ground)' }}
            >
              <MobileNavContent
                workspaceId={workspaceId}
                workspace={workspace}
                pathname={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* === Module nav list (sidebar) === */
function ModuleNavList({
  workspaceId,
  workspace,
  pathname,
}: {
  workspaceId: string;
  workspace: Workspace | null;
  pathname: string;
}) {
  const [coreModules, moduleEntries] = [MODULES.slice(0, 1), MODULES.slice(1)];

  return (
    <div className="flex flex-col h-full">
      {/* Orientation: workspace name + domain (replaces banned eyebrow) */}
      <div className="px-3 py-3.5" style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}>
        <div
          className="truncate"
          style={{
            fontFamily: 'var(--v2-font-sans)',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--v2-paper-ink)',
            lineHeight: 1.3,
          }}
        >
          {workspace?.name || 'Workspace'}
        </div>
        {workspace?.websiteDomain && (
          <div
            className="v2-mono truncate mt-0.5"
            style={{ fontSize: '0.7rem', color: 'var(--v2-paper-ink-2)' }}
          >
            {workspace.websiteDomain}
          </div>
        )}
      </div>

      {/* Core section (Mission Control) */}
      <nav className="p-2 space-y-0.5">
        {coreModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <NavItem
              key={mod.path}
              href={`/workspaces/${workspaceId}/${mod.path}`}
              active={pathname.includes(mod.path)}
              icon={<Icon className="w-4 h-4" strokeWidth={1.75} />}
              label={mod.name}
            />
          );
        })}
      </nav>

      {/* Hairline separator between sections */}
      <div className="mx-3 my-1" style={{ borderTop: '1px solid var(--v2-paper-rule)' }} />

      {/* Modules section */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {moduleEntries.map((mod) => {
          const Icon = mod.icon;
          return (
            <NavItem
              key={mod.path}
              href={`/workspaces/${workspaceId}/${mod.path}`}
              active={pathname.includes(mod.path)}
              icon={<Icon className="w-4 h-4" strokeWidth={1.75} />}
              label={mod.name}
            />
          );
        })}
      </nav>

      {/* Settings pinned at bottom */}
      <div className="p-2" style={{ borderTop: '1px solid var(--v2-paper-rule)' }}>
        <NavItem
          href={`/workspaces/${workspaceId}/settings`}
          active={pathname.includes('/settings')}
          icon={<Settings className="w-4 h-4" strokeWidth={1.75} />}
          label="Settings"
        />
      </div>
    </div>
  );
}

/* === Icon rail (workspace switcher) === */
function IconRail({ workspaceId, workspaces }: { workspaceId: string; workspaces: Workspace[] }) {
  return (
    <aside
      className="hidden md:flex flex-col items-center py-3 gap-1.5 flex-shrink-0 w-[56px]"
      style={{ background: 'var(--v2-ink-ground)', borderRight: '1px solid var(--v2-ink-rule)' }}
    >
      <Link
        href="/"
        className="v2-rail-home w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors"
        style={{
          background: 'rgba(232,68,46,0.12)',
          border: '1px solid rgba(232,68,46,0.25)',
        }}
        title="Back to home"
        aria-label="Back to home"
      >
        <Logo variant="monogram" theme="dark" size={24} />
      </Link>
      <span className="w-7 h-px my-1" style={{ background: 'var(--v2-ink-rule)' }} />
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
        {workspaces.slice(0, 8).map((ws) => {
          const isActive = ws.workspaceId === workspaceId;
          return (
            <Link
              key={ws.workspaceId}
              href={`/workspaces/${ws.workspaceId}/mission-control`}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              style={{
                borderRadius: 10,
                background: isActive ? 'rgba(232,68,46,0.15)' : 'transparent',
                border: isActive
                  ? '1px solid var(--v2-vermilion-lift)'
                  : '1px solid var(--v2-ink-rule)',
                color: isActive ? 'var(--v2-ink-text)' : 'var(--v2-ink-text-2)',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
              title={ws.name || 'Workspace'}
            >
              {(ws.name || 'W').charAt(0).toUpperCase()}
            </Link>
          );
        })}
        <Link
          href="/workspaces"
          className="w-9 h-9 flex items-center justify-center flex-shrink-0"
          style={{ color: 'var(--v2-ink-text-2)' }}
          title="All workspaces"
        >
          <Plus className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}

/* === Feed panel (real recent threads, no mock data) === */

// Modules whose recent threads feed the activity panel: the base modules plus
// every v2 agent's module (registry-driven — new agents appear automatically).
const FEED_MODULE_IDS: ModuleId[] = [
  'content-factory', 'seo-cluster', 'social-growth', 'business-audit', 'analytics-action',
  ...AGENT_LIST.map((a) => a.moduleId),
];

function FeedPanel({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FEED_MODULE_IDS.map((m) =>
        threadService.listThreads(workspaceId, { moduleId: m, limit: 5 }).catch(() => [] as AuditThread[]),
      ),
    )
      .then((perModule) => {
        if (cancelled) return;
        const threads = perModule
          .flat()
          .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
          .slice(0, 10)
          .map((t): LiveActivity => {
            const agentCfg = AGENT_LIST.find((a) => a.moduleId === t.moduleId);
            return {
              id: t.id,
              type: t.status === 'complete' ? 'resolution' : 'system',
              timestamp: t.updatedAt || t.createdAt,
              agent: {
                name: agentCfg?.name ?? t.moduleId,
                role: agentCfg?.role ?? t.status,
                avatar: agentCfg?.initials ?? t.moduleId.slice(0, 1).toUpperCase(),
              },
              content: t.title || 'Untitled thread',
              meta: { domain: t.moduleId },
            };
          });
        setActivities(threads);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  return (
    <div className="w-[288px] flex flex-col h-full">
      {/* Header: pulsing dot + "Activity" (no eyebrow label) */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--v2-ink-rule)' }}
      >
        <div className="flex items-center gap-2">
          <StatusDot variant="active" onInk pulse size={6} />
          <span
            style={{
              fontFamily: 'var(--v2-font-sans)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--v2-ink-text)',
            }}
          >
            Activity
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-[4px]"
          style={{ color: 'var(--v2-ink-text-2)' }}
          aria-label="Close activity feed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Activity entries — denser, spacing not borders between items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
        {loaded && activities.length === 0 && (
          <p className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-ink-text-2)' }}>
            No activity yet — run an agent to see it here.
          </p>
        )}
        {activities.map((act) => {
          const isResolution = act.type === 'resolution';
          const isSystem = act.type === 'system';
          return (
            <div key={act.id} className="flex gap-2.5">
              {/* Type indicator dot */}
              <div className="flex-shrink-0 pt-1">
                <StatusDot
                  variant={isResolution ? 'active' : isSystem ? 'warning' : 'neutral'}
                  onInk
                  size={5}
                />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  {act.agent && (
                    <span
                      className="truncate"
                      style={{
                        fontFamily: 'var(--v2-font-sans)',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        color: 'var(--v2-ink-text)',
                      }}
                    >
                      {act.agent.name}
                    </span>
                  )}
                  <span className="v2-mono tabular-nums flex-shrink-0" style={{ fontSize: '0.62rem', color: 'var(--v2-ink-text-2)' }}>
                    {formatRelativeTime(act.timestamp)}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.72rem', lineHeight: 1.4, color: 'var(--v2-ink-text-2)' }}>
                  {act.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* === Mobile nav content === */
function MobileNavContent({
  workspaceId,
  workspace,
  pathname,
  onNavigate,
}: {
  workspaceId: string;
  workspace: Workspace | null;
  pathname: string;
  onNavigate: () => void;
}) {
  const [coreModules, moduleEntries] = [MODULES.slice(0, 1), MODULES.slice(1)];

  return (
    <div className="flex flex-col h-full">
      {/* Orientation */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--v2-ink-rule)' }}>
        <div
          className="truncate"
          style={{
            fontFamily: 'var(--v2-font-sans)',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--v2-ink-text)',
          }}
        >
          {workspace?.name || 'Workspace'}
        </div>
        {workspace?.websiteDomain && (
          <div className="v2-mono truncate mt-0.5" style={{ fontSize: '0.7rem', color: 'var(--v2-ink-text-2)' }}>
            {workspace.websiteDomain}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Core */}
        <div className="space-y-0.5 mb-2">
          {coreModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <NavItem
                key={mod.path}
                href={`/workspaces/${workspaceId}/${mod.path}`}
                active={pathname.includes(mod.path)}
                onClick={onNavigate}
                onInk
                icon={<Icon className="w-4 h-4" strokeWidth={1.75} />}
                label={mod.name}
              />
            );
          })}
        </div>

        <div className="mx-1 my-2" style={{ borderTop: '1px solid var(--v2-ink-rule)' }} />

        {/* Modules */}
        <div className="space-y-0.5">
          {moduleEntries.map((mod) => {
            const Icon = mod.icon;
            return (
              <NavItem
                key={mod.path}
                href={`/workspaces/${workspaceId}/${mod.path}`}
                active={pathname.includes(mod.path)}
                onClick={onNavigate}
                onInk
                icon={<Icon className="w-4 h-4" strokeWidth={1.75} />}
                label={mod.name}
              />
            );
          })}
          <div className="mx-1 my-2" style={{ borderTop: '1px solid var(--v2-ink-rule)' }} />
          <NavItem
            href={`/workspaces/${workspaceId}/settings`}
            active={pathname.includes('/settings')}
            onClick={onNavigate}
            onInk
            icon={<Settings className="w-4 h-4" strokeWidth={1.75} />}
            label="Settings"
          />
        </div>
      </div>
    </div>
  );
}

/* === Feed wrapper — lg breakpoint visibility === */
function FeedWrapper({ workspaceId, open, onClose }: { workspaceId: string; open: boolean; onClose: () => void }) {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!isLg) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0 }}
          animate={{ width: 288 }}
          exit={{ width: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--v2-ink-ground)' }}
        >
          <FeedPanel workspaceId={workspaceId} onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* === Relative time formatter (shared) === */
function formatRelativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
