'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { workspaceService, organizationService } from '@/lib/services/workspaceService';
import { useAuthStore } from '@/lib/stores/authStore';
import type { Workspace } from '@/lib/types/workspace.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkspaceContextValue = {
    /** All workspaces the authenticated user belongs to. */
    workspaces: Workspace[];
    /** Whether workspaces are currently being fetched. */
    isLoading: boolean;
    /** Error message if fetch failed. */
    error: string | null;
    /** Refetch the workspace list. */
    refresh: () => Promise<void>;
    /** Create a new workspace and refresh the list. Without an explicit
     *  organizationId it defaults to the user's own organization. */
    createWorkspace: (name: string, websiteDomain?: string, brandPersona?: string, organizationId?: string) => Promise<Workspace>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const authStatus = useAuthStore((s) => s.status);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    // Start as loading: until the first fetch completes, "empty" is unknown,
    // not real — guards that treat empty as "send to onboarding" would fire
    // during the first render otherwise (child effects run before this
    // provider's fetch effect on a full page load).
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

    // Only fetch workspaces when the user is authenticated.
    // This prevents 401/403 errors when the session hasn't been established yet.
    useEffect(() => {
        if (authStatus === 'authenticated') {
            fetchWorkspaces();
        } else if (authStatus === 'unauthenticated') {
            // Clear workspace data on logout. NOT while status is 'loading':
            // during bootstrap the empty list is unknown, not real, and guards
            // that treat empty as "go to onboarding" would fire before the
            // first fetch even starts (child effects run before this
            // provider's fetch effect on a full page load).
            setWorkspaces([]);
            setIsLoading(false);
            setError(null);
        }
    }, [authStatus, fetchWorkspaces]);

    const createWorkspace = useCallback(
        async (name: string, websiteDomain?: string, brandPersona?: string, organizationId?: string): Promise<Workspace> => {
            // The backend requires the target organization. Callers that
            // offer an org picker pass it explicitly; everyone else defaults
            // to the user's own organization (auto-created at signup).
            let orgId = organizationId;
            if (!orgId) {
                const orgs = await organizationService.listOrganizations().catch(() => []);
                const owned = orgs.find((o) => o.isOwner) ?? orgs[0];
                if (!owned) {
                    throw new Error('No organization available — cannot create a workspace');
                }
                orgId = owned.organizationId;
            }
            const workspace = await workspaceService.createWorkspace({
                name,
                websiteDomain,
                brandPersona,
                organizationId: orgId,
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
