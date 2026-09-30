'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, TerminalSquare, Bot, Layers, Search, Inbox, ListChecks, Settings, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useV3OS, type WindowId } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';

export const APP_BUTTONS: { id: WindowId; icon: LucideIcon; color: string; title: string }[] = [
  { id: 'home', icon: LayoutDashboard, color: '#1d4ed8', title: 'Home · ⌘1' },
  { id: 'launchpad', icon: TerminalSquare, color: '#0891b2', title: 'Launchpad · ⌘2' },
  { id: 'agents', icon: Bot, color: '#9333ea', title: 'Agents · ⌘3' },
  { id: 'assignments', icon: Layers, color: '#059669', title: 'Assignments · ⌘4' },
];

function Clock() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleDateString([], { weekday: 'short' }) +
          ' ' +
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono hidden lg:inline" style={{ fontSize: 11, color: 'var(--muted)' }}>
      {now || '--:--'}
    </span>
  );
}

export function MenuNotch() {
  const windows = useV3OS((s) => s.windows);
  const menu = useV3OS((s) => s.menu);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const { openApp, setMenu, toggleSpot } = useV3OS.getState();

  const wsError = useV3OS((s) => s.workspacesError);
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const workspaceLabel = workspace ? workspace.name : wsError ? 'offline' : '…';
  const reviewCount = v3Data.getReviewQueue().length;
  const isOpen = (id: WindowId) => windows.some((w) => w.id === id && !w.minimized);

  return (
    <div className="menu-notch no-select">
      <nav className="glass island-nav" aria-label="Navigation">
        <div className="font-bold text-sm tracking-tight px-2 hidden sm:block">DoddleOS</div>
        <div className="notch-sep hidden sm:block" />
        <button
          className="notch-btn"
          style={{ width: 'auto', padding: '0 10px', gap: 6, fontFamily: 'var(--font-v3-jmono), monospace', fontSize: 11 }}
          title="Workspace"
          onClick={() => setMenu(menu === 'ws' ? null : 'ws')}
        >
          <Briefcase size={16} /> <span>{workspaceLabel}</span>
        </button>
        <div className="notch-sep" />
        {APP_BUTTONS.map(({ id, icon: Icon, color, title }) => (
          <button key={id} className={`notch-btn${isOpen(id) ? ' active' : ''}`} style={{ color }} title={title} onClick={() => openApp(id)}>
            <Icon size={20} />
          </button>
        ))}
        <div className="notch-sep" />
      </nav>
      <nav className="glass island-nav" aria-label="System">
        <button className="notch-btn" title="Spotlight · ⌘K" onClick={() => toggleSpot(true)}>
          <Search size={20} />
        </button>
        <button className="notch-btn" title="Artefacts · ⌘6" onClick={() => openApp('reports')}>
          <Inbox size={20} />
          {reviewCount > 0 && <span className="triage-badge">{reviewCount}</span>}
        </button>
        <button className="notch-btn" title="Tasks · ⌘7" onClick={() => openApp('tasks')}>
          <ListChecks size={20} />
        </button>
        <button className="notch-btn" title="Settings" onClick={() => setMenu(menu === 'settings' ? null : 'settings')}>
          <Settings size={20} />
        </button>
        <Clock />
      </nav>
    </div>
  );
}
