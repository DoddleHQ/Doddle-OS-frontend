'use client';

import { useEffect, useState, useCallback } from 'react';
import { workspaceService } from '@/lib/services/workspaceService';
import type { Workspace } from '@/lib/types/workspace.types';

interface CacheEntry {
    workspace: Workspace;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

interface Subscriber {
    workspaceId: string;
    refresh: () => void;
}
const subscribers = new Set<Subscriber>();

function subscribe(sub: Subscriber): () => void {
    subscribers.add(sub);
    return () => { subscribers.delete(sub); };
}

export function invalidateWorkspace(workspaceId: string): void {
    cache.delete(workspaceId);
    subscribers.forEach((sub) => {
        if (sub.workspaceId === workspaceId) sub.refresh();
    });
}

export function updateCachedWorkspace(workspace: Workspace): void {
    cache.set(workspace.workspaceId, {
        workspace,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
    subscribers.forEach((sub) => {
        if (sub.workspaceId === workspace.workspaceId) sub.refresh();
    });
}

export function useCurrentWorkspace(workspaceId: string | undefined) {
    const [workspace, setWorkspace] = useState<Workspace | null>(() => {
        if (!workspaceId) return null;
        const cached = cache.get(workspaceId);
        if (cached && Date.now() < cached.expiresAt) return cached.workspace;
        return null;
    });
    const [isLoading, setIsLoading] = useState(() => {
        if (!workspaceId) return false;
        const cached = cache.get(workspaceId);
        return !(cached && Date.now() < cached.expiresAt);
    });

    const fetchWorkspace = useCallback(async (id: string) => {
        const cached = cache.get(id);
        if (cached && Date.now() < cached.expiresAt) {
            setWorkspace(cached.workspace);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const ws = await workspaceService.getWorkspace(id);
            cache.set(id, { workspace: ws, expiresAt: Date.now() + CACHE_TTL_MS });
            setWorkspace(ws);
        } catch {
            const fallback: Workspace = {
                workspaceId: id,
                name: 'Workspace',
                websiteDomain: null,
                createdAt: new Date().toISOString(),
                updatedAt: null,
            };
            setWorkspace(fallback);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!workspaceId) {
            setWorkspace(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        const wrappedFetch = () => {
            if (cancelled) return;
            fetchWorkspace(workspaceId);
        };

        wrappedFetch();

        const unsubscribe = subscribe({ workspaceId, refresh: wrappedFetch });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [workspaceId, fetchWorkspace]);

    return { workspace, isLoading };
}
