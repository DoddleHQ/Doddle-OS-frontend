'use client';

import { create } from 'zustand';
import type { V3Workspace } from '@/lib/v3/data';
import type { V3Session } from '@/lib/v3/powerAgents';
import { isV3SessionUnread } from '@/lib/v3/data';

export type ThemeMode = 'light' | 'dark';
export type Backdrop = 'aurora' | 'lattice' | 'halo' | 'calm';
export type WindowId =
  | 'home'
  | 'launchpad'
  | 'blueprints'
  | 'agents'
  | 'assignments'
  | 'hub'
  | 'reports'
  | 'tasks'
  | 'history';
export type WindowMode = 'window' | 'page';

/** Section pages, the v13 navigation model: one visible at a time. */
const SECTION_PAGES: WindowId[] = ['launchpad', 'blueprints', 'agents', 'assignments', 'reports', 'tasks', 'hub'];

export interface V3WindowState {
  id: WindowId;
  mode: WindowMode;
  minimized: boolean;
  /** px offsets inside the windows layer (window mode only) */
  x: number;
  y: number;
  /** px width (window mode only) */
  width: number;
}

const DEFAULT_GEOMETRY: Record<WindowId, Pick<V3WindowState, 'mode' | 'x' | 'y' | 'width'>> = {
  home: { mode: 'window', x: 56, y: 16, width: 430 },
  launchpad: { mode: 'page', x: 0, y: 0, width: 0 },
  blueprints: { mode: 'page', x: 0, y: 0, width: 0 },
  agents: { mode: 'page', x: 0, y: 0, width: 0 },
  assignments: { mode: 'page', x: 0, y: 0, width: 0 },
  hub: { mode: 'page', x: 0, y: 0, width: 0 },
  reports: { mode: 'page', x: 0, y: 0, width: 0 },
  tasks: { mode: 'page', x: 0, y: 0, width: 0 },
  history: { mode: 'window', x: 96, y: 24, width: 560 },
};

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

interface V3OSState {
  theme: ThemeMode;
  backdrop: Backdrop;
  workspaceId: string;
  /** render order = z-order (last = top) */
  windows: V3WindowState[];
  spotlightOpen: boolean;
  notifsOpen: boolean;
  ccOpen: boolean;
  menu: 'ws' | 'settings' | null;
  railPinned: boolean;
  hydrated: boolean;
  /** Real workspace list (fetched once, kept for the switcher + guards). */
  workspaces: V3Workspace[];
  /** Non-null when the workspace list fetch failed (shown in the switcher). */
  workspacesError: string | null;
  /** Selected agent in the Agents window; null = roster view. */
  selectedAgentKey: string | null;
  /** Deep-linked thread: set by triage/assignments, consumed (and cleared)
   *  by the exec view on mount — opens that session's history. */
  selectedThreadKey: string | null;
  /** Workspace-wide session feed, fetched once by the shell for every
   *  consumer (dashboard, notch menus + badge, triage, assignments). */
  sessionFeed: V3Session[];
  sessionFeedError: string | null;
  /** true once a feed fetch has resolved — guards wait for this, never guess */
  sessionFeedLoaded: boolean;
  hydrate(): void;
  setTheme(t: ThemeMode): void;
  toggleTheme(): void;
  setBackdrop(b: Backdrop): void;
  setWorkspace(id: string): void;
  setWorkspaces(list: V3Workspace[], error?: string | null): void;
  selectAgent(slug: string | null): void;
  viewThread(agentKey: string, threadId: string): void;
  setSessionFeed(list: V3Session[], error?: string | null): void;
  openApp(id: WindowId, opts?: { mode?: WindowMode }): void;
  goHome(): void;
  closeWin(id: WindowId): void;
  closeTopPage(): void;
  minWin(id: WindowId): void;
  focusWin(id: WindowId): void;
  setWinPos(id: WindowId, x: number, y: number): void;
  setMode(id: WindowId, mode: WindowMode): void;
  toggleSpot(force?: boolean): void;
  toggleNotifs(force?: boolean): void;
  toggleCC(force?: boolean): void;
  setMenu(m: 'ws' | 'settings' | null): void;
  closeTopOverlay(): void;
  pinRail(v: boolean): void;
}

export const useV3OS = create<V3OSState>((set, get) => ({
  theme: 'light',
  backdrop: 'aurora',
  workspaceId: '',
  windows: [],
  spotlightOpen: false,
  notifsOpen: false,
  ccOpen: false,
  menu: null,
  railPinned: false,
  hydrated: false,
  workspaces: [],
  workspacesError: null,
  selectedAgentKey: null,
  selectedThreadKey: null,
  sessionFeed: [],
  sessionFeedError: null,
  sessionFeedLoaded: false,

  hydrate: () => {
    const theme = read('v3.theme');
    const backdrop = read('v3.backdrop');
    const ws = read('v3.workspace');
    const rail = read('v3.railPinned');
    set({
      hydrated: true,
      theme: theme === 'dark' ? 'dark' : 'light',
      backdrop: (['aurora', 'lattice', 'halo', 'calm'] as const).includes(backdrop as Backdrop)
        ? (backdrop as Backdrop)
        : 'aurora',
      workspaceId: ws ?? get().workspaceId,
      railPinned: rail === '1',
    });
  },
  setTheme: (t) => {
    write('v3.theme', t);
    set({ theme: t });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setBackdrop: (b) => {
    write('v3.backdrop', b);
    set({ backdrop: b });
  },
  setWorkspace: (id) => {
    write('v3.workspace', id);
    set({ workspaceId: id, menu: null });
  },
  setWorkspaces: (list, error = null) =>
    set((st) => ({
      workspaces: list,
      workspacesError: error,
      // guard: a stored selection that no longer exists falls back to the first real workspace
      workspaceId: list.some((w) => w.id === st.workspaceId) || list.length === 0 ? st.workspaceId : list[0].id,
    })),
  selectAgent: (slug) => set({ selectedAgentKey: slug, selectedThreadKey: null }),
  /** Deep-link: select the agent + thread; the caller navigates to /v3/agents. */
  viewThread: (agentKey, threadId) => {
    set({ selectedAgentKey: agentKey, selectedThreadKey: threadId });
  },
  setSessionFeed: (list, error = null) => set({ sessionFeed: list, sessionFeedError: error, sessionFeedLoaded: true }),
  // v13 navigation model: section pages are exclusive — opening one closes
  // the others, exactly like navigating between the reference's HTML pages
  openApp: (id, opts) => {
    // v13's empty-triage guard: nothing waiting → land on assignments instead
    if (id === 'reports' && !get().sessionFeed.some((s) => isV3SessionUnread(s))) {
      id = 'assignments';
    }
    set((st) => {
      const existing = st.windows.find((w) => w.id === id);
      // leaving a section page closes it, like a real page navigation
      const rest = st.windows.filter((w) => w.id !== id && !(SECTION_PAGES.includes(w.id) && SECTION_PAGES.includes(id)));
      if (existing) {
        return { windows: [...rest, { ...existing, minimized: false, mode: opts?.mode ?? existing.mode }] };
      }
      return {
        windows: [...rest, { id, minimized: false, ...DEFAULT_GEOMETRY[id], ...(opts?.mode ? { mode: opts.mode } : {}) }],
      };
    });
  },
  /** v13 Home · full OS: back to the desktop — every section page closes. */
  goHome: () =>
    set((st) => ({ windows: st.windows.filter((w) => !SECTION_PAGES.includes(w.id)) })),
  closeWin: (id) => set((st) => ({ windows: st.windows.filter((w) => w.id !== id) })),
  closeTopPage: () => {
    const top = [...get().windows].reverse().find((w) => w.mode === 'page' && !w.minimized);
    if (top) get().closeWin(top.id);
  },
  minWin: (id) =>
    set((st) => ({ windows: st.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) })),
  focusWin: (id) =>
    set((st) => {
      const w = st.windows.find((x) => x.id === id);
      if (!w || st.windows[st.windows.length - 1]?.id === id) return {};
      return { windows: [...st.windows.filter((x) => x.id !== id), w] };
    }),
  setWinPos: (id, x, y) =>
    set((st) => ({ windows: st.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  setMode: (id, mode) =>
    set((st) => ({
      windows: st.windows.map((w) => {
        if (w.id !== id) return w;
        // apps that default to page mode carry width 0 — give them a sane
        // floating width when zoomed back out to window mode
        if (mode === 'window' && w.width === 0) return { ...w, mode, width: 560, x: w.x || 56, y: w.y || 16 };
        return { ...w, mode };
      }),
    })),
  toggleSpot: (force) =>
    set((st) => ({ spotlightOpen: force ?? !st.spotlightOpen, notifsOpen: false, ccOpen: false, menu: null })),
  toggleNotifs: (force) =>
    set((st) => ({ notifsOpen: force ?? !st.notifsOpen, spotlightOpen: false, ccOpen: false, menu: null })),
  toggleCC: (force) =>
    set((st) => ({ ccOpen: force ?? !st.ccOpen, spotlightOpen: false, notifsOpen: false, menu: null })),
  setMenu: (m) =>
    set((st) => ({ menu: m, spotlightOpen: false, notifsOpen: false, ccOpen: false })),
  closeTopOverlay: () => {
    const st = get();
    if (st.spotlightOpen) return set({ spotlightOpen: false });
    if (st.notifsOpen) return set({ notifsOpen: false });
    if (st.ccOpen) return set({ ccOpen: false });
    if (st.menu) return set({ menu: null });
  },
  pinRail: (v) => {
    write('v3.railPinned', v ? '1' : '0');
    set({ railPinned: v });
  },
}));
