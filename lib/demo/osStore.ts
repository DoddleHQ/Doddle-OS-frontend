import { create } from 'zustand';
import { GSC_THREAD_SEEDS, PRICE_PER_TOK } from './data';
import type {
  FeedEntry,
  LogType,
  ThreadState,
  ThreadStatus,
  Toast,
  ToastType,
  TriageItem,
  VaultRun,
} from './types';

export const runCost = (tokens: number): number => tokens * PRICE_PER_TOK;

export function progressPct(logs: number, steps: number, status: ThreadStatus): number {
  if (status === 'done') return 100;
  if (logs === 0) return 0;
  return Math.min(95, Math.round((logs / steps) * 100));
}

export type SwarmStatus = 'idle' | 'running' | 'completed' | 'halted';

export function aggregateStatus(threads: ThreadState[]): SwarmStatus {
  if (threads.length === 0) return 'idle';
  if (threads.some((t) => t.status === 'running')) return 'running';
  if (threads.every((t) => t.status === 'done')) return 'completed';
  if (threads.some((t) => t.status === 'failed' || t.status === 'aborted')) return 'halted';
  return 'idle';
}

const clock = () =>
  new Date().toLocaleTimeString([], { hour12: false });

const makeThreads = (): Record<string, ThreadState> => {
  const out: Record<string, ThreadState> = {};
  for (const seed of GSC_THREAD_SEEDS) {
    out[seed.id] = { ...seed, status: 'queued', progress: 0, tokens: 0, logs: [], startedAt: null, endedAt: null };
  }
  return out;
};

interface OSState {
  theme: 'light' | 'dark';
  triageOpen: boolean;
  vaultOpen: boolean;
  paletteOpen: boolean;
  userMenuOpen: boolean;

  runActive: boolean;
  runStartedAt: number | null;
  lastPrompt: string;
  lastRunHadFailure: boolean;
  threads: Record<string, ThreadState>;
  feed: FeedEntry[];
  activeThreadId: string | null;

  triage: TriageItem[];
  vault: VaultRun[];
  toasts: Toast[];

  setOverlay: (key: 'triageOpen' | 'vaultOpen' | 'paletteOpen' | 'userMenuOpen', open?: boolean) => void;
  closeTopOverlay: () => boolean;

  pushToast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;

  addTriage: (item: TriageItem) => void;
  resolveTriage: (id: string, outcome: 'approved' | 'rejected' | 'restarted' | 'dismissed') => void;

  beginRun: (prompt: string) => void;
  endRun: (hadFailure: boolean) => void;
  setThreadStatus: (id: string, status: ThreadStatus) => void;
  setActiveThread: (id: string | null) => void;
  pushFeed: (entry: FeedEntry) => void;
  pushThreadLog: (id: string, msg: string, type?: LogType) => void;
  archiveRun: () => void;
}

let toastSeq = 0;

export const useOS = create<OSState>((set, get) => ({
  theme: 'light',
  triageOpen: false,
  vaultOpen: false,
  paletteOpen: false,
  userMenuOpen: false,

  runActive: false,
  runStartedAt: null,
  lastPrompt: '',
  lastRunHadFailure: false,
  threads: makeThreads(),
  feed: [],
  activeThreadId: null,

  triage: [],
  vault: [],
  toasts: [],

  setOverlay: (key, open) => set({ [key]: open ?? !get()[key] } as Partial<OSState>),

  closeTopOverlay: () => {
    const s = get();
    if (s.paletteOpen) { set({ paletteOpen: false }); return true; }
    if (s.vaultOpen) { set({ vaultOpen: false }); return true; }
    if (s.triageOpen) { set({ triageOpen: false }); return true; }
    if (s.userMenuOpen) { set({ userMenuOpen: false }); return true; }
    return false;
  },

  pushToast: (msg, type = 'info') => {
    const toast: Toast = { id: `t-${Date.now()}-${toastSeq++}`, msg, type };
    set({ toasts: [...get().toasts, toast].slice(-4) });
    setTimeout(() => get().dismissToast(toast.id), 3800);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  addTriage: (item) => {
    set({ triage: [item, ...get().triage] });
    if (!get().triageOpen) {
      get().pushToast('Thread halted and pushed to triage', 'error');
    }
  },

  resolveTriage: (id, outcome) => {
    const item = get().triage.find((t) => t.id === id);
    set({ triage: get().triage.filter((t) => t.id !== id) });
    if (!item) return;
    if (outcome === 'approved' && item.onApprove) item.onApprove();
    if (outcome === 'rejected' && item.onReject) item.onReject();
    if (outcome === 'restarted' && item.onRestart) item.onRestart();
  },

  beginRun: (prompt) => {
    set({
      runActive: true,
      runStartedAt: Date.now(),
      lastPrompt: prompt,
      lastRunHadFailure: false,
      threads: makeThreads(),
      feed: [{
        kind: 'user',
        id: `f-user-${Date.now()}`,
        text: prompt,
        ts: clock(),
      }],
      activeThreadId: null,
    });
  },

  endRun: (hadFailure) => set({ runActive: false, lastRunHadFailure: hadFailure }),

  setThreadStatus: (id, status) => {
    const t = get().threads[id];
    if (!t) return;
    set({
      threads: {
        ...get().threads,
        [id]: {
          ...t,
          status,
          startedAt: status === 'running' ? Date.now() : t.startedAt,
          endedAt: status === 'done' || status === 'failed' || status === 'aborted' ? Date.now() : t.endedAt,
        },
      },
    });
  },

  setActiveThread: (id) => set({ activeThreadId: id }),

  pushFeed: (entry) => set({ feed: [...get().feed, entry] }),

  pushThreadLog: (id, msg, type = 'info') => {
    const s = get();
    const t = s.threads[id];
    if (!t) return;
    const logs = [...t.logs, { msg, type, ts: clock() }];
    const tokens = t.tokens + Math.round(140 + Math.random() * 280);
    set({
      threads: {
        ...s.threads,
        [id]: { ...t, logs, tokens, progress: progressPct(logs.length, t.steps, t.status) },
      },
    });
  },

  archiveRun: () => {
    const s = get();
    if (!s.runStartedAt) return;
    const run: VaultRun = {
      id: `run-${s.runStartedAt}`,
      ts: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      prompt: s.lastPrompt,
      results: Object.fromEntries(Object.values(s.threads).map((t) => [t.id, t.status])),
      artifact: '',
    };
    set({ vault: [run, ...s.vault].slice(0, 25) });
    s.pushToast('Run archived to the artifact vault', 'success');
  },
}));
