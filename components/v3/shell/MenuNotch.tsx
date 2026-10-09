'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, Terminal, Layers, Bot, Inbox, BarChart3, Search, Settings, Briefcase } from 'lucide-react';
import { useV3OS, type WindowId } from '@/lib/v3/osStore';
import { isV3SessionUnread } from '@/lib/v3/data';

/** v13 notch, exact: brandmark + wordmark + ws button, five section links
 *  (triage carries the badge), and the reports/spotlight/settings island. */
export function MenuNotch() {
  const windows = useV3OS((s) => s.windows);
  const menu = useV3OS((s) => s.menu);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const { openApp, setMenu, toggleSpot } = useV3OS.getState();

  const wsError = useV3OS((s) => s.workspacesError);
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const workspaceLabel = workspace ? workspace.name : wsError ? 'offline' : '…';
  const reviewCount = useV3OS((s) => s.sessionFeed.filter((x) => isV3SessionUnread(x)).length);
  const isOpen = (id: WindowId) => windows.some((w) => w.id === id && !w.minimized);

  const NAV: { id: WindowId; icon: typeof Bot; color: string; title: string }[] = [
    { id: 'home', icon: LayoutDashboard, color: '#1d4ed8', title: 'Home · full OS' },
    { id: 'launchpad', icon: Terminal, color: 'var(--cyan)', title: 'Launchpad · define' },
    { id: 'assignments', icon: Layers, color: 'var(--green)', title: 'Assignments · track' },
    { id: 'agents', icon: Bot, color: 'var(--violet)', title: 'Agents · roster' },
  ];

  return (
    <div id="menu-notch" className="no-select">
      <nav id="notch-left" className="glass island-nav no-select" aria-label="Sections">
        <span className="brandmark" aria-hidden="true">
          <span className="brandmark-in">›_</span>
        </span>
        <div className="font-bold text-sm tracking-tight px-2 hidden sm:block">DoddleOS</div>
        <div className="notch-sep hidden sm:block" />
        <button
          className="notch-btn"
          title="Workspace"
          onClick={() => setMenu(menu === 'ws' ? null : 'ws')}
          style={{ width: 'auto', padding: '0 10px', gap: 6, fontFamily: 'var(--font-v3-jmono), monospace', fontSize: 11 }}
        >
          <Briefcase size={16} />
          <span>{workspaceLabel}</span>
        </button>
        <div className="notch-sep" />
        {NAV.map(({ id, icon: Icon, color, title }) => (
          <button key={id} className={`notch-btn${isOpen(id) ? ' active' : ''}`} title={title} onClick={() => openApp(id)}>
            <Icon size={20} style={{ color }} />
          </button>
        ))}
        <button className={`notch-btn${isOpen('reports') ? ' active' : ''}`} title="Triage · review" onClick={() => openApp('reports')}>
          <Inbox size={20} style={{ color: '#f87171' }} />
          {reviewCount > 0 && <span className="triage-badge">{reviewCount}</span>}
        </button>
      </nav>
      <nav id="notch-right" className="glass island-nav no-select" aria-label="System">
        <button className={`notch-btn${isOpen('history') ? ' active' : ''}`} title="Reports · progress" onClick={() => openApp('history')}>
          <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
        </button>
        <button className="notch-btn" title="Spotlight · ⌘K" onClick={() => toggleSpot(true)}>
          <Search size={20} />
        </button>
        <div className="notch-sep" />
        <button className="notch-btn" title="Settings" onClick={() => setMenu(menu === 'settings' ? null : 'settings')}>
          <Settings size={20} />
        </button>
        <Clock />
      </nav>
    </div>
  );
}

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
    <span id="clock" className="font-mono hidden lg:inline" style={{ fontSize: 11, color: 'var(--muted)' }}>
      {now || '--:--'}
    </span>
  );
}
