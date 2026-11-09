'use client';

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
    agentName: string;
    agentInitials: string;
    status: RunStatus;
    threadId: string | null;
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
    openingMessage?: Omit<ChatMessage, 'id' | 'timestamp'>;
}

const actionsBridge = new Map<string, RunActions>();
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

interface RunRegistryState {
    runs: Record<string, RunSnapshot>;
    order: string[];
    createRun: (spec: RunStartSpec) => string;
    patchRun: (runId: string, patch: Partial<RunSnapshot>) => void;
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

export function isRunLive(status: RunStatus): boolean {
    return status === 'connecting' || status === 'running' || status === 'hitl_pending';
}

export function liveRunUrl(workspaceId: string, agentSlug: string, runId: string): string {
    return `/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/live/${runId}`;
}
