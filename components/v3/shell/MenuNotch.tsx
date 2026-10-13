'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Terminal, Layers, Bot, Inbox, BarChart3, Search, Settings, Briefcase } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3SessionStatus } from '@/lib/v3/data';

/** v13 notch, exact: brandmark + wordmark + ws button, five section links
 *  (triage carries the badge), and the reports/spotlight/settings island. */
export function MenuNotch() {
  const menu = useV3OS((s) => s.menu);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const { setMenu, toggleSpot } = useV3OS.getState();
  const pathname = usePathname();

  const wsError = useV3OS((s) => s.workspacesError);
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const workspaceLabel = workspace ? workspace.name : wsError ? 'offline' : '…';
  const reviewCount = useV3OS((s) => s.sessionFeed.filter((x) => v3SessionStatus(x) === 'attention').length);
  const isOn = (path: string) => (path === '/v3' ? pathname === '/v3' : pathname.startsWith(path));

  const NAV: { path: string; icon: typeof Bot; color: string; title: string }[] = [
    { path: '/v3', icon: LayoutDashboard, color: '#1d4ed8', title: 'Home · full OS' },
    { path: '/v3/launchpad', icon: Terminal, color: 'var(--cyan)', title: 'Launchpad · define' },
    { path: '/v3/assignments', icon: Layers, color: 'var(--green)', title: 'Assignments · track' },
    { path: '/v3/agents', icon: Bot, color: 'var(--violet)', title: 'Agents · roster' },
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
        {NAV.map(({ path, icon: Icon, color, title }) => (
          <Link key={path} className={`notch-btn${isOn(path) ? ' active' : ''}`} href={path} title={title}>
            <Icon size={20} style={{ color }} />
          </Link>
        ))}
        <Link className={`notch-btn${isOn('/v3/triage') ? ' active' : ''}`} href="/v3/triage" title="Triage · review">
          <Inbox size={20} style={{ color: '#f87171' }} />
          {reviewCount > 0 && <span className="triage-badge">{reviewCount}</span>}
        </Link>
      </nav>
      <nav id="notch-right" className="glass island-nav no-select" aria-label="System">
        <Link className={`notch-btn${isOn('/v3/reports') ? ' active' : ''}`} href="/v3/reports" title="Reports · progress">
          <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
        </Link>
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
