'use client';

import { useEffect } from 'react';
import { useV3OS, type WindowId } from '@/lib/v3/osStore';
import { Wallpaper } from './Wallpaper';
import { MenuNotch } from './MenuNotch';
import { NotchMenus } from './NotchMenus';
import { WindowsLayer } from './WindowsLayer';

const SHORTCUT_APPS: WindowId[] = ['home', 'launchpad', 'agents', 'assignments', 'hub', 'reports', 'tasks'];

/** The v3 OS root: wallpaper, notch chrome, windows layer, dashboard, overlays. */
export function OSRoot() {
  const theme = useV3OS((s) => s.theme);
  const hydrate = useV3OS((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
      {/* Task 6: <Dashboard /> and <ActivityRail /> */}
      {/* Task 6: <Dashboard /> */}
      {/* Task 7: <Spotlight /> <Notifications /> <ControlCenter /> */}
    </div>
  );
}
