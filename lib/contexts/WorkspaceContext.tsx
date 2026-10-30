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

type WorkspaceContextValue = {
    workspaces: Workspace[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    createWorkspace: (name: string, websiteDomain?: string, brandPersona?: string, organizationId?: string) => Promise<Workspace>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const authStatus = useAuthStore((s) => s.status);
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
        if (authStatus === 'authenticated') {
            fetchWorkspaces();
        } else if (authStatus === 'unauthenticated') {
            setWorkspaces([]);
            setIsLoading(false);
            setError(null);
        }
    }, [authStatus, fetchWorkspaces]);

    const createWorkspace = useCallback(
        async (name: string, websiteDomain?: string, brandPersona?: string, organizationId?: string): Promise<Workspace> => {
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

export function useWorkspaces(): WorkspaceContextValue {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) {
        throw new Error('useWorkspaces must be used within a <WorkspaceProvider>.');
    }
    return ctx;
}
