import { create } from 'zustand';
import {
  GSC_THREAD_SEEDS,
  PRICE_PER_TOK,
  TRIAGE_SEED,
  VAULT_SEED,
} from './data';
import type {
  LogType,
  ThreadState,
  ThreadStatus,
  Toast,
  ToastType,
  TriageItem,
  VaultRun,
} from './types';

/** USD cost for a token count (4e-6 per token, as in the sample). */
export const runCost = (tokens: number): number => tokens * PRICE_PER_TOK;

/** Progress from log count vs. expected steps, capped at 95 until done. */
export function progressPct(logs: number, steps: number, status: ThreadStatus): number {
  if (status === 'done') return 100;
  if (logs === 0) return 0;
  return Math.min(95, Math.round((logs / steps) * 100));
}

export type SwarmStatus = 'idle' | 'running' | 'completed' | 'halted';

/** Aggregate status across the swarm threads, for the dashboard GSC row. */
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
  dockOpen: boolean;
  triageOpen: boolean;
  vaultOpen: boolean;
  paletteOpen: boolean;
  userMenuOpen: boolean;

  runActive: boolean;
  runStartedAt: number | null;
  lastPrompt: string;
  lastRunHadFailure: boolean;
  threads: Record<string, ThreadState>;

  triage: TriageItem[];
  vault: VaultRun[];
  toasts: Toast[];

  initDock: () => void;
  toggleDock: () => void;
  setOverlay: (key: 'triageOpen' | 'vaultOpen' | 'paletteOpen' | 'userMenuOpen', open?: boolean) => void;
  closeTopOverlay: () => boolean;

  pushToast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;

  addTriage: (item: TriageItem) => void;
  resolveTriage: (id: string, outcome: 'approved' | 'rejected' | 'restarted' | 'dismissed') => void;

  beginRun: (prompt: string) => void;
  endRun: (hadFailure: boolean) => void;
  setThreadStatus: (id: string, status: ThreadStatus) => void;
  pushThreadLog: (id: string, msg: string, type?: LogType) => void;
  archiveRun: () => void;
}

let toastSeq = 0;

export const useOS = create<OSState>((set, get) => ({
  theme: 'light',
  dockOpen: false,
  triageOpen: false,
  vaultOpen: false,
  paletteOpen: false,
  userMenuOpen: false,

  runActive: false,
  runStartedAt: null,
  lastPrompt: '',
  lastRunHadFailure: false,
  threads: makeThreads(),

  triage: TRIAGE_SEED,
  vault: VAULT_SEED,
  toasts: [],

  initDock: () => {
    if (typeof window === 'undefined') return;
    try {
      set({ dockOpen: localStorage.getItem('doddle-dock') === 'open' });
    } catch {
      /* private mode — keep collapsed */
    }
  },

  toggleDock: () => {
    const open = !get().dockOpen;
    set({ dockOpen: open });
    try {
      localStorage.setItem('doddle-dock', open ? 'open' : 'closed');
    } catch {
      /* ignore */
    }
  },

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
      get().pushToast('Circuit breaker tripped — item pushed to triage_queue', 'error');
    }
  },

  resolveTriage: (id, outcome) => {
    const item = get().triage.find((t) => t.id === id);
    set({ triage: get().triage.filter((t) => t.id !== id) });
    if (!item) return;
    if (outcome === 'approved' && item.onApprove) item.onApprove();
    if (outcome === 'rejected' && item.onReject) item.onReject();
    if (outcome === 'restarted' && item.onRestart) item.onRestart();
    if (!item.onApprove && !item.onReject && !item.onRestart) {
      // Static seed card — own its toast locally.
      if (outcome === 'approved') get().pushToast('Approved — Vercel deployment queued', 'success');
      if (outcome === 'restarted') get().pushToast('Thread requeued — restart handed to orchestrator', 'warn');
    }
  },

  beginRun: (prompt) => {
    set({
      runActive: true,
      runStartedAt: Date.now(),
      lastPrompt: prompt,
      lastRunHadFailure: false,
      threads: makeThreads(),
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
      artifact: VAULT_SEED[0].artifact,
    };
    set({ vault: [run, ...s.vault].slice(0, 25) });
    s.pushToast('Run archived to artifact_vault', 'success');
  },
}));
