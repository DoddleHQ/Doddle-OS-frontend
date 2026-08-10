'use client';

import { useEffect, useState } from 'react';
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
 * Selection itself (which workspace is "current") intentionally stays in the
 * URL via useParams() — the URL is the most robust source of truth for that.
 */

interface CacheEntry {
    workspace: Workspace;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 minute
const cache = new Map<string, CacheEntry>();

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

    useEffect(() => {
        if (!workspaceId) {
            setWorkspace(null);
            setIsLoading(false);
            return;
        }

        // Serve from cache synchronously, skip the network
        const cached = cache.get(workspaceId);
        if (cached && Date.now() < cached.expiresAt) {
            setWorkspace(cached.workspace);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        (async () => {
            try {
                const ws = await workspaceService.getWorkspace(workspaceId);
                if (cancelled) return;
                cache.set(workspaceId, { workspace: ws, expiresAt: Date.now() + CACHE_TTL_MS });
                setWorkspace(ws);
            } catch {
                if (cancelled) return;
                // Fallback placeholder (design review / no backend)
                const fallback: Workspace = {
                    workspaceId,
                    name: 'Workspace',
                    websiteDomain: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: null,
                };
                setWorkspace(fallback);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [workspaceId]);

    return { workspace, isLoading };
}
