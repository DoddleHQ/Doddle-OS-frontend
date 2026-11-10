'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3Workspaces, useV3Fetch } from '@/lib/v3/data';
import { fetchV3Sessions, type V3Session } from '@/lib/v3/powerAgents';
import { Wallpaper } from './Wallpaper';
import { MenuNotch } from './MenuNotch';
import { NotchMenus } from './NotchMenus';
import { Dashboard } from './Dashboard';
import { ActivityRail } from './ActivityRail';
import { Spotlight } from './Spotlight';
import { Notifications } from './Notifications';
import { ControlCenter } from './ControlCenter';
import { SettingsPanel } from './SettingsPanel';

const SHORTCUT_PATHS = ['/', '/launchpad', '/agents', '/assignments', '/triage', '/blueprints'];

export function OSRoot({ children }: { children?: React.ReactNode }) {
  const theme = useV3OS((s) => s.theme);
  const router = useRouter();
  const hydrate = useV3OS((s) => s.hydrate);
  const setWorkspaces = useV3OS((s) => s.setWorkspaces);
  const setSessionFeed = useV3OS((s) => s.setSessionFeed);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const workspaces = useV3Fetch(fetchV3Workspaces, []);
  const feed = useV3Fetch(
    () => (workspaceId ? fetchV3Sessions(workspaceId) : new Promise<V3Session[]>((resolve) => undefined)),
    [workspaceId],
  );

  useEffect(() => {
    if (!workspaceId || feed.loading) return;
    setSessionFeed(feed.data ?? [], feed.error);
  }, [feed.data, feed.error, feed.loading, workspaceId, setSessionFeed]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (workspaces.data) setWorkspaces(workspaces.data);
    else if (workspaces.error) setWorkspaces([], workspaces.error);
  }, [workspaces.data, workspaces.error, setWorkspaces]);

  useEffect(() => {
    if (workspaces.loading || workspaces.error) return;
    if ((workspaces.data ?? []).length === 0) router.replace('/onboarding');
  }, [workspaces.data, workspaces.loading, workspaces.error, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { toggleSpot, closeTopOverlay } = useV3OS.getState();
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
      if (n >= 1 && n <= SHORTCUT_PATHS.length) router.push(SHORTCUT_PATHS[n - 1]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`v3-scope${theme === 'dark' ? ' dark' : ''}`} style={{ height: '100vh', overflow: 'hidden' }}>
      <Wallpaper />
      <MenuNotch />
      <NotchMenus />
      {children ?? <Dashboard />}
      <ActivityRail />
      <Spotlight />
      <Notifications />
      <ControlCenter />
      <SettingsPanel />
    </div>
  );
}
