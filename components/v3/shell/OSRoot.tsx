'use client';

import { useEffect } from 'react';
import { useV3OS, type WindowId } from '@/lib/v3/osStore';
import { fetchV3Workspaces, useV3Fetch } from '@/lib/v3/data';
import { Wallpaper } from './Wallpaper';
import { MenuNotch } from './MenuNotch';
import { NotchMenus } from './NotchMenus';
import { WindowsLayer } from './WindowsLayer';
import { Dashboard } from './Dashboard';
import { ActivityRail } from './ActivityRail';
import { Spotlight } from './Spotlight';
import { Notifications } from './Notifications';
import { ControlCenter } from './ControlCenter';

const SHORTCUT_APPS: WindowId[] = ['home', 'launchpad', 'agents', 'assignments', 'hub', 'reports', 'tasks'];

/** The v3 OS root: wallpaper, notch chrome, windows layer, dashboard, overlays. */
export function OSRoot() {
  const theme = useV3OS((s) => s.theme);
  const hydrate = useV3OS((s) => s.hydrate);
  const setWorkspaces = useV3OS((s) => s.setWorkspaces);
  const workspaces = useV3Fetch(fetchV3Workspaces, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (workspaces.data) setWorkspaces(workspaces.data.map((w) => ({ id: w.id, name: w.name })));
    else if (workspaces.error) setWorkspaces([], workspaces.error);
  }, [workspaces.data, workspaces.error, setWorkspaces]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { toggleSpot, closeTopOverlay, openApp } = useV3OS.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSpot(true);
        return;
      }
      if (e.key === 'Escape') {
        closeTopOverlay();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= SHORTCUT_APPS.length) openApp(SHORTCUT_APPS[n - 1]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`v3-scope${theme === 'dark' ? ' dark' : ''}`} style={{ height: '100vh', overflow: 'hidden' }}>
      <Wallpaper />
      <MenuNotch />
      <NotchMenus />
      <WindowsLayer />
      <Dashboard />
      <ActivityRail />
      <Spotlight />
      <Notifications />
      <ControlCenter />
    </div>
  );
}
