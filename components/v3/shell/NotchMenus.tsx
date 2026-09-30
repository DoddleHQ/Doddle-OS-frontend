'use client';

import { Building2, SlidersHorizontal, SunMoon } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';

/** Workspace switcher + settings dropdowns hanging off the menu notch. */
export function NotchMenus() {
  const menu = useV3OS((s) => s.menu);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const theme = useV3OS((s) => s.theme);
  const { setMenu, setWorkspace, openApp, toggleCC, toggleTheme } = useV3OS.getState();

  if (menu === 'ws') {
    return (
      <div className="glass v3-ws-menu no-select" role="menu" aria-label="Workspace">
        {v3Data.getWorkspaces().map((w) => (
          <button key={w.id} className="spot-item" onClick={() => setWorkspace(w.id)}>
            <w.icon size={16} /> {w.name} workspace
            {w.id === workspaceId ? <span className="chip ml-auto">on</span> : null}
          </button>
        ))}
      </div>
    );
  }

  if (menu === 'settings') {
    return (
      <div className="glass v3-settings-menu no-select" role="menu" aria-label="Settings">
        <button className="spot-item" onClick={() => { setMenu(null); openApp('hub'); }}>
          <Building2 size={16} style={{ color: 'var(--amber)' }} /> Agency Hub <span className="chip ml-auto">⌘5</span>
        </button>
        <button className="spot-item" onClick={() => { setMenu(null); toggleCC(); }}>
          <SlidersHorizontal size={16} /> Control Center
        </button>
        <button className="spot-item" onClick={toggleTheme}>
          <SunMoon size={16} /> Appearance: {theme}
        </button>
      </div>
    );
  }

  return null;
}
