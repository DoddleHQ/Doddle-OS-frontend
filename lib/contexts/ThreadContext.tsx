'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
    AuditThread,
    AuditArtifact,
    CreateArtifactRequest,
    ModuleId,
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

    fetchThreads: (workspaceId: string, moduleId: ModuleId) => Promise<void>;
    createThreadFromStream: (params: {
        workspaceId: string;
        threadId: string;
        moduleId: ModuleId;
        title: string;
        description: string;
    }) => Promise<AuditThread>;
    fetchThread: (workspaceId: string, moduleId: ModuleId, threadId: string) => Promise<void>;
    updateThread: (workspaceId: string, moduleId: ModuleId, threadId: string, updates: { title?: string; description?: string; status?: string }) => Promise<void>;
    saveArtifact: (workspaceId: string, moduleId: ModuleId, threadId: string, artifact: ArtifactPayload) => Promise<void>;
    fetchArtifacts: (workspaceId: string, moduleId: ModuleId, threadId: string) => Promise<void>;
    deleteThread: (workspaceId: string, moduleId: ModuleId, threadId: string) => Promise<void>;
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

    const saveQueueRef = useRef<Map<string, { artifact: ArtifactPayload; moduleId: ModuleId; workspaceId: string; retries: number }>>(new Map());
    const isProcessingQueueRef = useRef(false);
    const threadCreatedRef = useRef(false);

    const processSaveQueue = useCallback(async (workspaceId: string, threadId: string) => {
        if (isProcessingQueueRef.current) return;
        isProcessingQueueRef.current = true;

        try {
            while (saveQueueRef.current.size > 0) {
                const entry = saveQueueRef.current.entries().next().value;
                if (!entry) break;
                const [artifactId, { artifact, moduleId, workspaceId: wsId, retries }] = entry;
                saveQueueRef.current.delete(artifactId);

                try {
                    const content = typeof artifact.content === 'string'
                        ? artifact.content
                        : JSON.stringify(artifact.content);

                    await threadService.createArtifact(wsId, moduleId, threadId, {
                        content,
                        pageName: artifact.title || 'Untitled Artifact',
                        moduleId,
                        data: typeof artifact.content === 'object' && artifact.content !== null ? artifact.content as Record<string, unknown> : {},
                    });
                } catch (err) {
                    console.error(`[ThreadProvider] Failed to save artifact ${artifactId}:`, err);
                    if (retries < 3) {
                        saveQueueRef.current.set(artifactId, { artifact, moduleId, workspaceId: wsId, retries: retries + 1 });
                    } else {
                        console.error(`[ThreadProvider] Artifact ${artifactId} failed after 3 retries, discarding`);
                    }
                }
            }
        } finally {
            isProcessingQueueRef.current = false;
        }
    }, []);

    const fetchThreads = useCallback(async (workspaceId: string, moduleId: ModuleId) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await threadService.listThreads(workspaceId, { moduleId });
            setThreads(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch threads';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createThreadFromStream = useCallback(
        async (params: {
            workspaceId: string;
            threadId: string;
            moduleId: ModuleId;
            title: string;
            description: string;
        }): Promise<AuditThread> => {
            if (threadCreatedRef.current) return currentThread!;
            threadCreatedRef.current = true;

            setError(null);
            try {
                const thread = await threadService.createThread(params.workspaceId, {
                    threadId: params.threadId,
                    moduleId: params.moduleId,
                    title: params.title,
                    description: params.description,
                    status: 'running',
                });
                setThreads(prev => [thread, ...prev]);
                setCurrentThread(thread);
                return thread;
            } catch (err) {
                threadCreatedRef.current = false;
                const message = err instanceof Error ? err.message : 'Failed to create thread';
                setError(message);
                throw err;
            }
        },
        [currentThread]
    );

    const fetchThread = useCallback(async (workspaceId: string, moduleId: ModuleId, threadId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const thread = await threadService.getThread(workspaceId, moduleId, threadId);
            setCurrentThread(thread);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch thread';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateThreadFn = useCallback(
        async (workspaceId: string, moduleId: ModuleId, threadId: string, updates: { title?: string; description?: string; status?: string }) => {
            try {
                const updated = await threadService.updateThread(workspaceId, moduleId, threadId, updates);
                setCurrentThread(updated);
                setThreads(prev => prev.map(t => t.id === updated.id ? updated : t));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to update thread';
                setError(message);
            }
        },
        []
    );

    const saveArtifact = useCallback(
        async (workspaceId: string, moduleId: ModuleId, threadId: string, artifact: ArtifactPayload) => {
            if (saveQueueRef.current.has(artifact.artifactId)) return;

            saveQueueRef.current.set(artifact.artifactId, { artifact, moduleId, workspaceId, retries: 0 });
            setIsSavingArtifact(true);

            processSaveQueue(workspaceId, threadId)
                .then(async () => {
                    try {
                        const refreshed = await threadService.getThread(workspaceId, moduleId, threadId);
                        setThreads(prev => prev.map(t => t.id === refreshed.id ? refreshed : t));
                        setCurrentThread(prev => (prev?.id === threadId ? refreshed : prev));
                    } catch {}
                })
                .finally(() => {
                    if (saveQueueRef.current.size === 0 && !isProcessingQueueRef.current) {
                        setIsSavingArtifact(false);
                    }
                });
        },
        [processSaveQueue]
    );

    const fetchArtifacts = useCallback(async (workspaceId: string, moduleId: ModuleId, threadId: string) => {
        setError(null);
        try {
            const result = await threadService.listArtifacts(workspaceId, moduleId, threadId);
            setCurrentArtifacts(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch artifacts';
            setError(message);
        }
    }, []);

    const deleteThreadFn = useCallback(
        async (workspaceId: string, moduleId: ModuleId, threadId: string) => {
            try {
                await threadService.deleteThread(workspaceId, moduleId, threadId);
                setThreads(prev => prev.filter(t => t.id !== threadId));
                if (currentThread?.id === threadId) {
                    setCurrentThread(null);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to delete thread';
                setError(message);
            }
        },
        [currentThread]
    );

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
                updateThread: updateThreadFn,
                saveArtifact,
                fetchArtifacts,
                deleteThread: deleteThreadFn,
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
