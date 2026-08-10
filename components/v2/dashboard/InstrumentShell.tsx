'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, ChevronLeft, ChevronRight, Bell, Plus,
} from 'lucide-react';
import { UserMenu } from '@/components/layout/UserMenu';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { WORKSPACE_MODULES as MODULES } from './modules';
import type { Workspace } from '@/lib/types/workspace.types';

/*
 * InstrumentShell — the professional dashboard layout.
 *
 * Zone 1 (ink rail, 56px): workspace switcher tiles
 * Zone 2 (paper nav, 220px): module navigation list
 * Zone 3 (paper, flex-1): top bar + scrollable content
 * Zone 4 (ink feed, 288px): collapsible live activity
 *
 * Mobile: rail + nav hidden, hamburger drawer replaces both.
 */

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

  const activeModule = MODULES.find(m => pathname.includes(m.path)) || MODULES[0];

  return (
    <div className="v2-scope flex h-screen overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
      {/* === ZONE 1: ICON RAIL === */}
      <IconRail workspaceId={workspaceId} workspaces={workspaces} />

      {/* === ZONE 2: MODULE NAV (hidden on mobile, shown md+) === */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 w-[220px]"
        style={{ background: 'var(--v2-paper-ground)', borderRight: '1px solid var(--v2-paper-rule)' }}
      >
        <ModuleNavList workspaceId={workspaceId} pathname={pathname} />
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
            <h1 className="v2-display text-[1.25rem] truncate" style={{ color: 'var(--v2-paper-ink)' }}>
              {activeModule.name}
            </h1>
            {workspace?.websiteDomain && (
              <span className="v2-mono text-[11px] hidden lg:block" style={{ color: 'var(--v2-paper-ink-2)' }}>
                · {workspace.websiteDomain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5" style={{ color: 'var(--v2-paper-ink-2)' }} aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <UserMenu />
            {!feedOpen && (
              <button onClick={() => setFeedOpen(true)} className="p-1.5" style={{ color: 'var(--v2-paper-ink-2)' }} aria-label="Open feed">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* === ZONE 4: LIVE FEED === */}
      <FeedWrapper open={feedOpen} onClose={() => setFeedOpen(false)} />

      {/* === MOBILE DRAWER === */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed left-0 top-0 bottom-0 z-50 w-[260px] overflow-y-auto md:hidden" style={{ background: 'var(--v2-ink-ground)' }}>
              <MobileNavContent workspaceId={workspaceId} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* === Module nav list (used in both sidebar + mobile drawer) === */
function ModuleNavList({ workspaceId, pathname }: { workspaceId: string; pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}>
        <span className="v2-label text-[8px]" style={{ color: 'var(--v2-paper-ink-2)' }}>Navigate</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {MODULES.map((mod) => {
          const fullPath = `/workspaces/${workspaceId}/${mod.path}`;
          const isActive = pathname.includes(mod.path);
          const Icon = mod.icon;
          return (
            <Link
              key={mod.path}
              href={fullPath}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] transition-colors group"
              style={{
                background: isActive ? 'rgba(200,50,27,0.06)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--v2-vermilion)' : '2px solid transparent',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink-2)' }} />
              <span className="text-[13px] truncate" style={{ color: isActive ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)', fontWeight: isActive ? 500 : 400 }}>
                {mod.name}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="p-2" style={{ borderTop: '1px solid var(--v2-paper-rule)' }}>
        <Link
          href={`/workspaces/${workspaceId}/settings`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] transition-colors"
          style={{
            background: pathname.includes('/settings') ? 'rgba(200,50,27,0.06)' : 'transparent',
            borderLeft: pathname.includes('/settings') ? '2px solid var(--v2-vermilion)' : '2px solid transparent',
          }}
        >
          <Settings className="w-4 h-4" style={{ color: pathname.includes('/settings') ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink-2)' }} />
          <span className="text-[13px]" style={{ color: pathname.includes('/settings') ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)' }}>Settings</span>
        </Link>
      </div>
    </div>
  );
}

/* === Icon rail === */
function IconRail({ workspaceId, workspaces }: { workspaceId: string; workspaces: Workspace[] }) {
  return (
    <aside className="flex flex-col items-center py-3 gap-1.5 flex-shrink-0 w-[56px] hidden md:flex" style={{ background: 'var(--v2-ink-ground)', borderRight: '1px solid var(--v2-ink-rule)' }}>
      <Link href="/" className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-transform hover:scale-105" style={{ background: 'var(--v2-vermilion)' }} title="Doddle OS">
        <span className="v2-display text-[0.9rem]" style={{ color: 'var(--v2-vermilion-ink)' }}>D</span>
      </Link>
      <span className="w-7 h-px my-1" style={{ background: 'var(--v2-ink-rule)' }} />
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
        {workspaces.slice(0, 8).map((ws) => {
          const isActive = ws.workspaceId === workspaceId;
          return (
            <Link key={ws.workspaceId} href={`/workspaces/${ws.workspaceId}/mission-control`} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[11px] font-semibold transition-all hover:rounded-[8px] flex-shrink-0" style={{ background: isActive ? 'rgba(232,68,46,0.15)' : 'transparent', border: isActive ? '1px solid var(--v2-vermilion-lift)' : '1px solid var(--v2-ink-rule)', color: isActive ? 'var(--v2-ink-text)' : 'var(--v2-ink-text-2)' }} title={ws.name || 'Workspace'}>
              {(ws.name || 'W').charAt(0).toUpperCase()}
            </Link>
          );
        })}
        <Link href="/workspaces" className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors hover:rounded-[8px] flex-shrink-0" style={{ color: 'var(--v2-ink-text-2)' }} title="All workspaces">
          <Plus className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}

/* === Feed panel === */
function FeedPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-[288px] flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--v2-ink-rule)' }}>
        <div className="flex items-center gap-2">
          <motion.span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--v2-vermilion-lift)' }} animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
          <span className="v2-label text-[9px]" style={{ color: 'var(--v2-ink-text-2)' }}>Live · System</span>
        </div>
        <button onClick={onClose} className="p-1" style={{ color: 'var(--v2-ink-text-2)' }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {[
          { time: '14:02', agent: 'Content Architect', action: '→ research · crawling site', type: 'running' },
          { time: '14:03', agent: 'Technical Architect', action: '→ operator · CONFLICT', type: 'conflict' },
          { time: '14:05', agent: 'operator', action: '→ Content Architect · approved', type: 'resolved' },
          { time: '14:06', agent: 'Content Architect', action: '→ review · blueprint drafted', type: 'artifact' },
          { time: '14:08', agent: 'Content Architect', action: '→ done · content shipped', type: 'complete' },
        ].map((e, i) => {
          const color = e.type === 'conflict' ? 'var(--v2-vermilion-lift)' : e.type === 'complete' ? 'var(--v2-sage)' : 'var(--v2-ink-text-2)';
          return (
            <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.1 }} className="v2-mono text-[11px] py-2" style={{ borderBottom: i < 4 ? '1px solid var(--v2-ink-rule)' : 'none' }}>
              <span style={{ color: 'var(--v2-ink-text-2)' }}>{e.time} </span>
              <span style={{ color: 'var(--v2-ink-text)' }}>{e.agent}</span>
              <span style={{ color }}> {e.action}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* === Mobile nav content === */
function MobileNavContent({ workspaceId, pathname, onNavigate }: { workspaceId: string; pathname: string; onNavigate: () => void }) {
  return (
    <div className="p-4">
      <Link href="/" onClick={onNavigate} className="v2-display text-[1.25rem] block mb-4" style={{ color: 'var(--v2-ink-text)' }}>Doddle OS</Link>
      <span className="w-full h-px block mb-3" style={{ background: 'var(--v2-ink-rule)' }} />
      <nav className="space-y-1">
        {MODULES.map((mod) => {
          const fullPath = `/workspaces/${workspaceId}/${mod.path}`;
          const isActive = pathname.includes(mod.path);
          const Icon = mod.icon;
          return (
            <Link key={mod.path} href={fullPath} onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors" style={{ background: isActive ? 'rgba(232,68,46,0.1)' : 'transparent', borderLeft: isActive ? '2px solid var(--v2-vermilion-lift)' : '2px solid transparent' }}>
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? 'var(--v2-vermilion-lift)' : 'var(--v2-ink-text-2)' }} />
              <span className="text-[13px]" style={{ color: isActive ? 'var(--v2-ink-text)' : 'var(--v2-ink-text-2)' }}>{mod.name}</span>
            </Link>
          );
        })}
        <span className="w-full h-px block my-3" style={{ background: 'var(--v2-ink-rule)' }} />
        <Link href={`/workspaces/${workspaceId}/settings`} onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors" style={{ borderLeft: pathname.includes('/settings') ? '2px solid var(--v2-vermilion-lift)' : '2px solid transparent' }}>
          <Settings className="w-4 h-4" style={{ color: 'var(--v2-ink-text-2)' }} />
          <span className="text-[13px]" style={{ color: 'var(--v2-ink-text-2)' }}>Settings</span>
        </Link>
      </nav>
    </div>
  );
}

/* === Feed wrapper — handles lg breakpoint visibility without breaking AnimatePresence === */
function FeedWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--v2-ink-ground)' }}
        >
          <FeedPanel onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
