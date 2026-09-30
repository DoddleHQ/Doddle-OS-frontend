'use client';

import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type Backdrop = 'aurora' | 'lattice' | 'halo' | 'calm';
export type WindowId =
  | 'home'
  | 'launchpad'
  | 'agents'
  | 'assignments'
  | 'hub'
  | 'reports'
  | 'tasks'
  | 'history';
export type WindowMode = 'window' | 'page';

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
  workspaces: { id: string; name: string }[];
  /** Non-null when the workspace list fetch failed (shown in the switcher). */
  workspacesError: string | null;
  /** Selected agent in the Agents window; null = roster view. */
  selectedAgentKey: string | null;
  hydrate(): void;
  setTheme(t: ThemeMode): void;
  toggleTheme(): void;
  setBackdrop(b: Backdrop): void;
  setWorkspace(id: string): void;
  setWorkspaces(list: { id: string; name: string }[], error?: string | null): void;
  selectAgent(slug: string | null): void;
  openApp(id: WindowId, opts?: { mode?: WindowMode }): void;
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
  selectAgent: (slug) => set({ selectedAgentKey: slug }),
  openApp: (id, opts) =>
    set((st) => {
      const existing = st.windows.find((w) => w.id === id);
      const rest = st.windows.filter((w) => w.id !== id);
      if (existing) {
        return { windows: [...rest, { ...existing, minimized: false, mode: opts?.mode ?? existing.mode }] };
      }
      return {
        windows: [...rest, { id, minimized: false, ...DEFAULT_GEOMETRY[id], ...(opts?.mode ? { mode: opts.mode } : {}) }],
      };
    }),
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
    set((st) => ({ windows: st.windows.map((w) => (w.id === id ? { ...w, mode } : w)) })),
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
