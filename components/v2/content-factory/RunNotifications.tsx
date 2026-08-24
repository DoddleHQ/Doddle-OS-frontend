'use client';

/*
 * RunNotifications — announces BACKGROUND run state changes.
 *
 * A run the user is currently watching already renders its HITL card and
 * completion inline; the dangerous case is the run they navigated away
 * from. This component watches the registry and toasts when a non-viewed
 * run (a) pauses for input or (b) completes or fails.
 *
 * Toasts are deliberately minimal and v2-styled: completion toasts
 * auto-dismiss; HITL toasts persist (with a subtle pulse) until visited
 * or dismissed — missing an interrupt silently stalls the run forever.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, MessageSquareWarning } from 'lucide-react';
import {
    useRunRegistry,
    liveRunUrl,
    type RunSnapshot,
} from '@/lib/runs/runRegistry';

interface Toast {
    id: string;
    runId: string;
    kind: 'hitl' | 'complete' | 'error';
    title: string;
    detail: string;
    /** Timestamp when the condition appeared — used to ignore pre-existing
     * states on mount (only transitions toast). */
    at: number;
}

const TOAST_MS = 6000;
const EASE = [0.16, 1, 0.3, 1] as const;

export function RunNotifications() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const order = useRunRegistry((s) => s.order);
    const runs = useRunRegistry((s) => s.runs);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const seenRef = useRef<Set<string>>(new Set());
    const mountedRef = useRef(false);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Which run is the user currently watching? Pathname carries /live/{runId}
    const watchedRunId = (() => {
        const m = pathname?.match(/\/live\/(run-[0-9]+-[0-9]+)/);
        return m ? m[1] : null;
    })();

    useEffect(() => {
        // Skip states that existed before this mount: only live transitions
        // deserve a toast.
        if (!mountedRef.current) {
            mountedRef.current = true;
            for (const runId of order) {
                const run = runs[runId];
                if (!run) continue;
                if (run.status === 'hitl_pending') seenRef.current.add(`${runId}:hitl`);
                if (run.status === 'complete') seenRef.current.add(`${runId}:complete`);
                if (run.status === 'error') seenRef.current.add(`${runId}:error`);
            }
            return;
        }

        for (const runId of order) {
            const run: RunSnapshot | undefined = runs[runId];
            if (!run) continue;

            const fire = (kind: Toast['kind'], key: string, title: string, detail: string) => {
                if (seenRef.current.has(key)) return;
                seenRef.current.add(key);
                if (runId === watchedRunId) return; // watching it: inline UI covers it
                setToasts((prev) => {
                    if (prev.some((t) => t.id === key)) return prev;
                    const next = [...prev, {
                        id: key, runId, kind, title, detail, at: Date.now(),
                    }];
                    return next.slice(-4); // cap: 4 visible toasts
                });
                if (kind !== 'hitl') {
                    const timer = setTimeout(() => dismiss(key), TOAST_MS);
                    timersRef.current.set(key, timer);
                }
            };

            if (run.status === 'hitl_pending' && run.pendingHITL) {
                const question = (run.pendingHITL as { message?: string; prompt?: string }).message
                    ?? (run.pendingHITL as { prompt?: string }).prompt
                    ?? 'Your input is required';
                fire('hitl', `${runId}:hitl`, `${run.agentName} needs input`, trim(question, 90));
            } else if (run.status === 'complete') {
                fire('complete', `${runId}:complete`, `${run.agentName} finished`,
                    run.completeEvent?.message ?? 'Run complete');
            } else if (run.status === 'error' && run.error) {
                fire('error', `${runId}:error`, `${run.agentName} failed`, run.error.message);
            }
        }
    }, [order, runs, watchedRunId]);

    // Cleanup timers on unmount
    useEffect(() => () => {
        for (const timer of timersRef.current.values()) clearTimeout(timer);
    }, []);

    const dismiss = (id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const visit = (toast: Toast) => {
        const run = runs[toast.runId];
        if (run) {
            router.push(liveRunUrl(workspaceId, run.agentSlug, toast.runId));
        }
        dismiss(toast.id);
    };

    return (
        <div
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
            style={{ pointerEvents: 'none', maxWidth: '320px' }}
        >
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: EASE }}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] shadow-lg cursor-pointer"
                        style={{
                            pointerEvents: 'auto',
                            background: 'var(--v2-paper, #fff)',
                            border: `1px solid ${toast.kind === 'hitl' ? 'var(--v2-vermilion, #c8321b)' : 'var(--v2-paper-rule, #e5e0d8)'}`,
                        }}
                        onClick={() => visit(toast)}
                    >
                        {toast.kind === 'hitl' ? (
                            <MessageSquareWarning
                                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                                style={{ color: 'var(--v2-vermilion, #c8321b)', animation: 'v2-metric-breath 1.4s ease-in-out infinite' }}
                            />
                        ) : toast.kind === 'complete' ? (
                            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--v2-sage, #4a7c59)' }} />
                        ) : (
                            <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--v2-vermilion, #c8321b)' }} />
                        )}
                        <div className="flex-1 min-w-0">
                            <p style={{
                                fontFamily: 'var(--v2-font-sans)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: toast.kind === 'hitl' ? 'var(--v2-vermilion, #c8321b)' : 'var(--v2-paper-ink, #1a1a1a)',
                                lineHeight: 1.3,
                            }}>
                                {toast.title}
                            </p>
                            <p className="v2-mono" style={{
                                fontSize: '0.62rem',
                                color: 'var(--v2-paper-ink-2, #6b6459)',
                                lineHeight: 1.4,
                                marginTop: '0.15rem',
                            }}>
                                {trim(toast.detail, 110)}
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}
                            className="flex-shrink-0 p-0.5 rounded transition-colors"
                            style={{ color: 'var(--v2-paper-ink-2, #6b6459)' }}
                            aria-label="Dismiss"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

function trim(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
