'use client';

/*
 * v3 real data layer — workspaces, operator, fetch plumbing.
 * Power agents + sessions live in lib/v3/powerAgents.ts.
 * Loading, empty, and error states are surfaced honestly — no seeded
 * substitutes for real entities.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { workspaceService } from '@/lib/services/workspaceService';
import { getMe } from '@/lib/services/authService';

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export interface V3Workspace {
  id: string;
  name: string;
  domain?: string | null;
  orgName?: string;
}

export async function fetchV3Workspaces(): Promise<V3Workspace[]> {
  const page = await workspaceService.listWorkspaces(0, 100);
  return page.items.map((w) => ({
    id: w.workspaceId,
    name: w.name || 'Untitled workspace',
    domain: w.websiteDomain ?? null,
    orgName: w.organizationName ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Operator
// ---------------------------------------------------------------------------

/** Operator display name for the greeting; null keeps the greeting generic. */
export async function fetchV3OperatorName(): Promise<string | null> {
  try {
    const me = await getMe();
    return me.name || null;
  } catch {
    return null;
  }
}

let operatorNamePromise: Promise<string | null> | null = null;

/** Greeting name, fetched once per session and shared by all consumers. */
export function useV3OperatorName(): string | null {
  const { data } = useV3Fetch(() => (operatorNamePromise ??= fetchV3OperatorName()), []);
  return data;
}

// ---------------------------------------------------------------------------
// Fetch hook — loading / error / retry, no silent fake data
// ---------------------------------------------------------------------------

export interface V3Fetch<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload(): void;
}

export function useV3Fetch<T>(fn: () => Promise<T>, deps: unknown[]): V3Fetch<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/** Relative "x ago" from an ISO timestamp, mono-short ("14m", "2h", "3d"). */
export function v3Ago(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Unread tracking — a thread is unread while it has been updated (updatedAt)
// more recently than the operator last viewed it. Per-thread, persisted.
// ---------------------------------------------------------------------------

const THREAD_SEEN_PREFIX = 'v3.seen.th.';

/** Epoch ms of the last view of a thread; 0 when never viewed. */
export function readThreadSeenAt(threadId: string): number {
  try {
    const v = localStorage.getItem(THREAD_SEEN_PREFIX + threadId);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

export function markThreadSeen(threadId: string): void {
  try {
    localStorage.setItem(THREAD_SEEN_PREFIX + threadId, String(Date.now()));
  } catch {
    /* private mode */
  }
}

/** Epoch ms of the operator's first v3 visit — stamped once. Activity from
 *  before you ever used the OS is never "new"; only updates since. */
function firstVisitMs(): number {
  try {
    const k = 'v3.firstVisit';
    let v = localStorage.getItem(k);
    if (!v) {
      v = String(Date.now());
      localStorage.setItem(k, v);
    }
    return Number(v) || 0;
  } catch {
    return 0;
  }
}

/** A session row is unread when its latest activity beats the last view
 *  (or the first-visit baseline for threads never viewed). */
export function isV3SessionUnread(s: { id: string; updatedAt?: string | null; createdAt?: string | null }): boolean {
  const t = s.updatedAt ?? s.createdAt;
  if (!t) return false;
  const ms = new Date(t).getTime();
  if (Number.isNaN(ms)) return false;
  const seenAt = readThreadSeenAt(s.id) || firstVisitMs();
  return ms > seenAt;
}

/** v13 status language: an unseen run updated moments ago reads live (blue
 *  IN PROGRESS), older unseen runs await review (red), seen runs are done
 *  (green). Design-forward until the API reports run state directly. */
export type V3SessionStatus = 'running' | 'attention' | 'done';

const V3_HOT_MS = 30 * 60_000;

export function v3SessionStatus(s: { id: string; updatedAt?: string | null; createdAt?: string | null }): V3SessionStatus {
  if (!isV3SessionUnread(s)) return 'done';
  const t = new Date(s.updatedAt ?? s.createdAt ?? 0).getTime();
  return Number.isFinite(t) && Date.now() - t < V3_HOT_MS ? 'running' : 'attention';
}
