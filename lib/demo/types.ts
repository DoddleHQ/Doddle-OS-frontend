export type ThreadStatus = 'queued' | 'running' | 'done' | 'failed' | 'aborted';
export type LogType = 'info' | 'prompt' | 'success' | 'warn' | 'error';

export interface Agent {
  id: string;
  handle: string;
  role: string;
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
  preview?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onRestart?: () => void;
}

export interface VaultRun {
  id: string;
  ts: string;
  prompt: string;
  results: Record<string, ThreadStatus>;
  artifact: string;
}

export type ToastType = 'info' | 'success' | 'error' | 'warn';

export interface Toast {
  id: string;
  msg: string;
  type: ToastType;
}

export type FeedEntry =
  | { kind: 'user'; id: string; text: string; ts: string }
  | { kind: 'system'; id: string; text: string; ts: string }
  | { kind: 'threads'; id: string; ts: string }
  | { kind: 'gate'; id: string; triageId: string; text: string; preview: string; ts: string }
  | { kind: 'summary'; id: string; ok: boolean; text: string; ts: string };
