/** Shared types for the Doddle OS demo (app/demo). */

export type ThreadStatus = 'queued' | 'running' | 'done' | 'failed' | 'aborted';
export type LogType = 'info' | 'prompt' | 'success' | 'warn' | 'error';

export interface Agent {
  id: string;
  /** Display handle, e.g. "@Data_Wrangler" */
  handle: string;
  role: string;
  /** lucide-react icon name, resolved via lib/demo/icons */
  icon: string;
}

export interface LogEntry {
  msg: string;
  type: LogType;
  ts: string;
}

export interface ThreadState {
  id: string;
  title: string;
  agentId: string;
  objective: string;
  status: ThreadStatus;
  /** 0–100, derived from log count vs. expected steps */
  progress: number;
  tokens: number;
  steps: number;
  logs: LogEntry[];
  startedAt: number | null;
  endedAt: number | null;
}

export type TriageKind = 'approval' | 'breaker';

export interface TriageItem {
  id: string;
  kind: TriageKind;
  tag: string;
  title: string;
  desc: string;
  /** Optional code preview toggled by review() */
  preview?: string;
  /** Engine-owned callbacks for live gates; absent on static seeds */
  onApprove?: () => void;
  onReject?: () => void;
  onRestart?: () => void;
}

export interface VaultRun {
  id: string;
  ts: string;
  prompt: string;
  /** threadId → final status */
  results: Record<string, ThreadStatus>;
  artifact: string;
}

export type ToastType = 'info' | 'success' | 'error' | 'warn';

export interface Toast {
  id: string;
  msg: string;
  type: ToastType;
}

/** Mission-control feed entries (launchpad). */
export type FeedEntry =
  | { kind: 'user'; id: string; text: string; ts: string }
  | { kind: 'system'; id: string; text: string; ts: string }
  | { kind: 'threads'; id: string; ts: string }
  | { kind: 'gate'; id: string; triageId: string; text: string; preview: string; ts: string }
  | { kind: 'summary'; id: string; ok: boolean; text: string; ts: string };
