'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { workspaceService } from '@/lib/services/workspaceService';
import type { Workspace } from '@/lib/types/workspace.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkspaceContextValue = {
    /** All workspaces the authenticated org belongs to. */
    workspaces: Workspace[];
    /** Whether workspaces are currently being fetched. */
    isLoading: boolean;
    /** Error message if fetch failed. */
    error: string | null;
    /** Refetch the workspace list. */
    refresh: () => Promise<void>;
    /** Create a new workspace and refresh the list. */
    createWorkspace: (name: string, websiteDomain?: string) => Promise<Workspace>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkspaces = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await workspaceService.listWorkspaces(0, 100);
            setWorkspaces(result.items);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load workspaces';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const createWorkspace = useCallback(
        async (name: string, websiteDomain?: string): Promise<Workspace> => {
            const workspace = await workspaceService.createWorkspace({
                name,
                websiteDomain,
            });
            // Refresh the list to include the new workspace
            await fetchWorkspaces();
            return workspace;
        },
        [fetchWorkspaces],
    );

    return (
        <WorkspaceContext.Provider
            value={{ workspaces, isLoading, error, refresh: fetchWorkspaces, createWorkspace }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkspaces(): WorkspaceContextValue {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) {
        throw new Error('useWorkspaces must be used within a <WorkspaceProvider>.');
    }
    return ctx;
}
