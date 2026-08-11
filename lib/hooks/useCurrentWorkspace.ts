'use client';

import { useEffect, useState, useCallback } from 'react';
import { workspaceService } from '@/lib/services/workspaceService';
import type { Workspace } from '@/lib/types/workspace.types';

/*
 * useCurrentWorkspace — fetch + cache a single workspace by ID.
 *
 * Previously the workspace object was fetched independently in both the
 * workspace layout and the settings page, with no shared cache — so opening
 * settings re-fetched and could show different data than the shell header.
 *
 * This hook holds a simple module-level cache keyed by workspaceId. The
 * cache is populated on first fetch and reused by any component in the same
 * browser session. The WorkspaceContext still owns the *list*; this hook
 * owns the *active workspace detail*.
 *
 * INVALIDATION: call `invalidateWorkspace(id)` (or `updateCachedWorkspace`)
 * after a mutation so every mounted subscriber re-renders with the new data.
 * This is how a settings-page name change propagates instantly to the sidebar,
 * icon rail, and anywhere else the workspace name appears.
 *
 * Selection itself (which workspace is "current") intentionally stays in the
 * URL via useParams() — the URL is the most robust source of truth for that.
 */

interface CacheEntry {
    workspace: Workspace;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 minute
const cache = new Map<string, CacheEntry>();

// Pub/sub: subscribers register their workspaceId + setter, and
// invalidateWorkspace() notifies all matching subscribers.
interface Subscriber {
    workspaceId: string;
    refresh: () => void;
}
const subscribers = new Set<Subscriber>();

function subscribe(sub: Subscriber): () => void {
    subscribers.add(sub);
    return () => { subscribers.delete(sub); };
}

/**
 * Force every mounted useCurrentWorkspace subscriber for the given ID to
 * re-fetch from the API. Call this after any mutation (e.g. name change).
 */
export function invalidateWorkspace(workspaceId: string): void {
    cache.delete(workspaceId);
    subscribers.forEach((sub) => {
        if (sub.workspaceId === workspaceId) sub.refresh();
    });
}

/**
 * Optimistically update the cached workspace WITHOUT a re-fetch, then notify
 * subscribers. Use when the mutation already returned the updated object and
 * a network round-trip would be redundant.
 */
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
        // Serve from cache synchronously if fresh
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
            // Fallback placeholder (design review / no backend)
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

        // Initial fetch
        wrappedFetch();

        // Subscribe to invalidation events
        const unsubscribe = subscribe({ workspaceId, refresh: wrappedFetch });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [workspaceId, fetchWorkspace]);

    return { workspace, isLoading };
}
