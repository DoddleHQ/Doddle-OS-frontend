'use client';

/*
 * Run Registry — process-lifetime ownership of agent runs.
 *
 * Problem it solves: useLangGraphStream lives inside the AgentStream page
 * component, and its unmount cleanup cancels the SSE stream. Navigating
 * away killed the client stream while the graph kept running server-side
 * (orphaned runs, lost artifacts) and only one run could ever be active.
 *
 * Design: headless RunContainer components (one per run) live at the
 * content-factory layout level, outliving route changes. Each wraps the
 * PROVEN useLangGraphStream hook unchanged and publishes snapshots here.
 * Views (AgentStream, sidebar) read snapshots; imperative actions
 * (start/respond/cancel) go through a module-level bridge that the
 * containers register — actions never trigger renders.
 *
 * Step 1 scope: registry survives navigation anywhere inside the content
 * factory module. Cross-module survival (and refresh survival) needs the
 * durable langgraph deployment + state polling (tracked separately).
 */

import { create } from 'zustand';
import type {
    ChatMessage,
    HITLRequestPayload,
    CompletePayload,
    ErrorPayload,
    ProgressPayload,
    ArtifactPayload,
} from '@/lib/types/graph-events.types';

export type RunStatus = 'connecting' | 'running' | 'hitl_pending' | 'complete' | 'error';

export interface RunSnapshot {
    runId: string;
    agentSlug: string;
    graphId: string;
    moduleId: string;
    workspaceId: string;
    /** Agent display name — snapshots must render without re-resolving config. */
    agentName: string;
    agentInitials: string;
    status: RunStatus;
    /** LangGraph thread id — set once the server assigns it. */
    threadId: string | null;
    /** Product DB thread id — set once createThreadFromStream resolves. */
    dbThreadId: string | null;
    messages: ChatMessage[];
    artifacts: ArtifactPayload[];
    progress: ProgressPayload | null;
    pendingHITL: HITLRequestPayload | null;
    completeEvent: CompletePayload | null;
    error: ErrorPayload | null;
    createdAt: number;
}

export interface RunActions {
    start: (input: Record<string, unknown>) => Promise<void>;
    respond: (requestId: string, response: unknown) => Promise<void>;
    cancel: () => void;
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    clearError: () => void;
}

export interface RunStartSpec {
    agentSlug: string;
    graphId: string;
    moduleId: string;
    agentName: string;
    agentInitials: string;
    workspaceId: string;
    input: Record<string, unknown>;
    /** User-visible first message, added by the container before the stream
     * starts (the view can't add it — the container isn't mounted yet). */
    openingMessage?: Omit<ChatMessage, 'id' | 'timestamp'>;
}

// --- Non-reactive bridges (module scope; never re-render subscribers) ---

const actionsBridge = new Map<string, RunActions>();
/** Start inputs wait here until the provider mounts the container. */
const startSpecs = new Map<string, RunStartSpec>();

export function registerRunActions(runId: string, actions: RunActions): void {
    actionsBridge.set(runId, actions);
}

export function unregisterRunActions(runId: string): void {
    actionsBridge.delete(runId);
}

export function getRunActions(runId: string): RunActions | undefined {
    return actionsBridge.get(runId);
}

export function consumeRunStart(runId: string): RunStartSpec | undefined {
    return startSpecs.get(runId);
}

// --- Store ---

interface RunRegistryState {
    runs: Record<string, RunSnapshot>;
    /** Newest first — the sidebar renders this order. */
    order: string[];
    createRun: (spec: RunStartSpec) => string;
    patchRun: (runId: string, patch: Partial<RunSnapshot>) => void;
    /** A completed/errored run leaves the registry (unmounts its container). */
    dismissRun: (runId: string) => void;
}

let runSeq = 0;

export const useRunRegistry = create<RunRegistryState>((set, get) => ({
    runs: {},
    order: [],

    createRun: (spec) => {
        const runId = `run-${Date.now()}-${++runSeq}`;
        startSpecs.set(runId, spec);
        const snapshot: RunSnapshot = {
            runId,
            agentSlug: spec.agentSlug,
            graphId: spec.graphId,
            moduleId: spec.moduleId,
            workspaceId: spec.workspaceId,
            agentName: spec.agentName,
            agentInitials: spec.agentInitials,
            status: 'connecting',
            threadId: null,
            dbThreadId: null,
            messages: [],
            artifacts: [],
            progress: null,
            pendingHITL: null,
            completeEvent: null,
            error: null,
            createdAt: Date.now(),
        };
        set((prev) => ({
            runs: { ...prev.runs, [runId]: snapshot },
            order: [runId, ...prev.order],
        }));
        return runId;
    },

    patchRun: (runId, patch) => {
        set((prev) => {
            const existing = prev.runs[runId];
            if (!existing) return prev;
            return { runs: { ...prev.runs, [runId]: { ...existing, ...patch } } };
        });
    },

    dismissRun: (runId) => {
        startSpecs.delete(runId);
        actionsBridge.delete(runId);
        set((prev) => {
            if (!prev.runs[runId]) return prev;
            const runs = { ...prev.runs };
            delete runs[runId];
            return { runs, order: prev.order.filter((id) => id !== runId) };
        });
    },
}));

// --- View helpers (pure selectors) ---

export function isRunLive(status: RunStatus): boolean {
    return status === 'connecting' || status === 'running' || status === 'hitl_pending';
}

export function liveRunUrl(workspaceId: string, agentSlug: string, runId: string): string {
    return `/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/live/${runId}`;
}
