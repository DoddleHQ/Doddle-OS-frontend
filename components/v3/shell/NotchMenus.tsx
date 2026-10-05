'use client';

import { Building2, SlidersHorizontal, SunMoon, Briefcase } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { isV3SessionUnread } from '@/lib/v3/data';

/** Workspace switcher + settings dropdowns hanging off the menu notch. */
export function NotchMenus() {
  const menu = useV3OS((s) => s.menu);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3OS((s) => s.workspaces);
  const theme = useV3OS((s) => s.theme);
  const sessionFeed = useV3OS((s) => s.sessionFeed);
  const { setMenu, setWorkspace, openApp, toggleCC, toggleTheme } = useV3OS.getState();

  if (menu === 'ws') {
    const sessions = sessionFeed;
    const unread = sessions.filter((s) => isV3SessionUnread(s)).length;
    return (
      <div className="glass v3-ws-menu no-select" role="menu" aria-label="Workspace">
        {workspaces.length === 0 && (
          <p className="font-mono text-xs px-4 py-3" style={{ color: useV3OS.getState().workspacesError ? 'var(--amber)' : 'var(--muted)' }}>
            {useV3OS.getState().workspacesError
              ? `workspaces unavailable (${useV3OS.getState().workspacesError}) — reload to retry`
              : 'loading workspaces…'}
          </p>
        )}
        {workspaces.map((w) => {
          const on = w.id === workspaceId;
          return (
            <button key={w.id} className="spot-item v3-ws-item" onClick={() => setWorkspace(w.id)}>
              <span className="v3-ws-ico" aria-hidden="true">
                <Briefcase size={14} />
              </span>
              <span className="min-w-0">
                <span className="block font-mono font-bold text-xs truncate">{w.name}</span>
                <span className="block font-mono text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                  {on
                    ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}${unread ? ` · ${unread} new` : ''}`
                    : w.domain ?? w.orgName ?? 'workspace'}
                </span>
              </span>
              {on ? <span className="chip ml-auto">on</span> : null}
            </button>
          );
        })}
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
