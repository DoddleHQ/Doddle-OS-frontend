'use client';

import { useEffect, useRef } from 'react';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import { useThread } from '@/lib/contexts/ThreadContext';
import {
    useRunRegistry,
    registerRunActions,
    unregisterRunActions,
    consumeRunStart,
    type RunStartSpec,
} from '@/lib/runs/runRegistry';
import type { AgentConfig } from './agents';

export function RunContainer({ runId, config, workspaceId }: {
    runId: string;
    config: AgentConfig;
    workspaceId: string;
}) {
    const { createThreadFromStream, saveArtifact, updateThread } = useThread();
    const patchRun = useRunRegistry((s) => s.patchRun);

    const {
        state,
        startStream,
        respondToHITL,
        cancelStream,
        addMessage,
        clearError,
        isRunning,
        isComplete,
    } = useLangGraphStream({
        graphId: config.graphId,
        workspaceId,
    });

    const startedRef = useRef(false);
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        const spec: RunStartSpec | undefined = consumeRunStart(runId);
        if (spec) {
            if (spec.openingMessage) {
                addMessage(spec.openingMessage);
            }
            startStream(spec.input);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runId]);

    const artifactList = Array.from(state.artifacts.values());
    useEffect(() => {
        patchRun(runId, {
            status: state.status === 'idle' ? 'connecting'
                : (state.status as 'connecting' | 'running' | 'hitl_pending' | 'complete' | 'error'),
            threadId: state.threadId ?? null,
            messages: state.messages,
            artifacts: artifactList,
            progress: state.progress,
            pendingHITL: state.pendingHITL,
            completeEvent: state.completeEvent,
            error: state.error,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, runId, patchRun]);

    useEffect(() => {
        registerRunActions(runId, {
            start: startStream,
            respond: respondToHITL,
            cancel: cancelStream,
            addMessage,
            clearError,
        });
        return () => unregisterRunActions(runId);
    }, [runId, startStream, respondToHITL, cancelStream, addMessage, clearError]);

    const threadCreatedRef = useRef(false);
    useEffect(() => {
        if (state.threadId && !threadCreatedRef.current && isRunning) {
            threadCreatedRef.current = true;
            createThreadFromStream({
                workspaceId,
                threadId: state.threadId,
                moduleId: config.moduleId,
                title: `${config.name} — ${new Date().toLocaleDateString()}`,
                description: `Started via ${config.name}`,
            }).then((dbThread) => {
                if (dbThread) {
                    patchRun(runId, { dbThreadId: dbThread.id });
                }
            }).catch(() => {});
        }
    }, [state.threadId, isRunning, workspaceId, config.moduleId, config.name, createThreadFromStream, patchRun, runId]);

    const savedArtifactIdsRef = useRef<Set<string>>(new Set());
    const dbThreadId = useRunRegistry((s) => s.runs[runId]?.dbThreadId ?? null);
    useEffect(() => {
        if (!dbThreadId || artifactList.length === 0) return;
        for (const artifact of artifactList) {
            if (savedArtifactIdsRef.current.has(artifact.artifactId)) continue;
            savedArtifactIdsRef.current.add(artifact.artifactId);
            saveArtifact(workspaceId, config.moduleId, dbThreadId, artifact).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artifactList, dbThreadId, config.moduleId, workspaceId, saveArtifact]);

    const completionMarkedRef = useRef(false);
    useEffect(() => {
        if (isComplete && dbThreadId && !completionMarkedRef.current) {
            completionMarkedRef.current = true;
            updateThread(workspaceId, config.moduleId, dbThreadId, { status: 'complete' }).catch(() => {});
        }
    }, [isComplete, dbThreadId, workspaceId, config.moduleId, updateThread]);

    return null;
}
