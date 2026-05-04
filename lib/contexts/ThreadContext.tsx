'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
    AuditThread,
    AuditArtifact,
    CreateThreadRequest,
    CreateArtifactRequest,
    ThreadStatus,
} from '@/lib/types/thread.types';
import { ArtifactPayload } from '@/lib/types/graph-events.types';
import { threadService } from '@/lib/services/threadService';

interface ThreadContextValue {
    threads: AuditThread[];
    currentThread: AuditThread | null;
    currentArtifacts: AuditArtifact[];
    isLoading: boolean;
    isSavingArtifact: boolean;
    error: string | null;

    fetchThreads: (workspaceId: string, moduleSlug?: string) => Promise<void>;
    createThreadFromStream: (params: { id: string; workspaceId: string; moduleSlug: string; title?: string; input: Record<string, unknown> }) => Promise<AuditThread>;
    fetchThread: (threadId: string) => Promise<void>;
    updateThreadStatus: (threadId: string, status: ThreadStatus, title?: string) => Promise<void>;
    saveArtifact: (threadId: string, artifact: ArtifactPayload) => Promise<void>;
    fetchArtifacts: (threadId: string) => Promise<void>;
    setCurrentThread: (thread: AuditThread | null) => void;
    clearError: () => void;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

export function ThreadProvider({ children }: { children: React.ReactNode }) {
    const [threads, setThreads] = useState<AuditThread[]>([]);
    const [currentThread, setCurrentThread] = useState<AuditThread | null>(null);
    const [currentArtifacts, setCurrentArtifacts] = useState<AuditArtifact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingArtifact, setIsSavingArtifact] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saveQueueRef = useRef<Map<string, ArtifactPayload>>(new Map());
    const isProcessingQueueRef = useRef(false);
    const threadCreatedRef = useRef(false);

    const processSaveQueue = useCallback(async (threadId: string) => {
        if (isProcessingQueueRef.current) return;
        isProcessingQueueRef.current = true;

        try {
            while (saveQueueRef.current.size > 0) {
                const entry = saveQueueRef.current.entries().next().value;
                if (!entry) break;
                const [artifactId, artifact] = entry;
                saveQueueRef.current.delete(artifactId);

                try {
                    await threadService.createArtifact({
                        threadId,
                        artifactId: artifact.artifactId,
                        artifactType: artifact.artifactType,
                        title: artifact.title,
                        description: artifact.description,
                        content: artifact.content,
                        metadata: artifact.metadata,
                    } as CreateArtifactRequest);
                } catch (err) {
                    console.error(`[ThreadProvider] Failed to save artifact ${artifactId}:`, err);
                    saveQueueRef.current.set(artifactId, artifact);
                }
            }
        } finally {
            isProcessingQueueRef.current = false;
        }
    }, []);

    const fetchThreads = useCallback(async (workspaceId: string, moduleSlug?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await threadService.listThreads({ workspaceId, moduleSlug });
            setThreads(response.threads);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch threads';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createThreadFromStream = useCallback(async (params: { id: string; workspaceId: string; moduleSlug: string; title?: string; input: Record<string, unknown> }): Promise<AuditThread> => {
        if (threadCreatedRef.current) return currentThread!;
        threadCreatedRef.current = true;

        setError(null);
        try {
            const thread = await threadService.createThread({
                id: params.id,
                workspaceId: params.workspaceId,
                moduleSlug: params.moduleSlug,
                title: params.title,
                input: params.input,
            });
            setThreads(prev => [thread, ...prev]);
            setCurrentThread(thread);
            return thread;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create thread';
            setError(message);
            throw err;
        }
    }, [currentThread]);

    const fetchThread = useCallback(async (threadId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const thread = await threadService.getThread(threadId);
            setCurrentThread(thread);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch thread';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateThreadStatus = useCallback(async (threadId: string, status: ThreadStatus, title?: string) => {
        try {
            const updates: { status: ThreadStatus; title?: string } = { status };
            if (title) updates.title = title;
            const updated = await threadService.updateThread(threadId, updates);
            setCurrentThread(updated);
            setThreads(prev => prev.map(t => t.id === threadId ? updated : t));
        } catch (err) {
            console.error('[ThreadProvider] Failed to update thread status:', err);
        }
    }, []);

    const saveArtifact = useCallback(async (threadId: string, artifact: ArtifactPayload) => {
        if (saveQueueRef.current.has(artifact.artifactId)) return;

        saveQueueRef.current.set(artifact.artifactId, artifact);
        setIsSavingArtifact(true);

        processSaveQueue(threadId).then(async () => {
            try {
                const refreshed = await threadService.getThread(threadId);
                setThreads(prev => prev.map(t => t.id === threadId ? refreshed : t));
                setCurrentThread(prev => prev?.id === threadId ? refreshed : prev);
            } catch {}
        }).finally(() => {
            setIsSavingArtifact(false);
        });
    }, [processSaveQueue]);

    const fetchArtifacts = useCallback(async (threadId: string) => {
        setError(null);
        try {
            const response = await threadService.listArtifacts(threadId);
            setCurrentArtifacts(response.artifacts);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch artifacts';
            setError(message);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <ThreadContext.Provider
            value={{
                threads,
                currentThread,
                currentArtifacts,
                isLoading,
                isSavingArtifact,
                error,
                fetchThreads,
                createThreadFromStream,
                fetchThread,
                updateThreadStatus,
                saveArtifact,
                fetchArtifacts,
                setCurrentThread,
                clearError,
            }}
        >
            {children}
        </ThreadContext.Provider>
    );
}

export function useThread(): ThreadContextValue {
    const context = useContext(ThreadContext);
    if (!context) {
        throw new Error('useThread must be used within a ThreadProvider');
    }
    return context;
}
