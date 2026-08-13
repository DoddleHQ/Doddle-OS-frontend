/**
 * Workspace Service
 *
 * Client-side service for workspace CRUD, invite link management,
 * and member management. Uses the apiClient wrapper which handles
 * auth token refresh automatically.
 *
 * @see /api/v1/workspaces
 */

import {
    Workspace,
    PaginatedWorkspaces,
    WorkspaceMember,
    InviteLink,
    CreateWorkspaceRequest,
    UpdateWorkspaceRequest,
    CreateInviteLinkRequest,
    UpdateMemberRoleRequest,
    ActiveInviteLinkExistsError,
    WorkspaceRole,
} from '@/lib/types/workspace.types';
import { apiGet, apiPost, apiPatch, apiDelete, apiPut, apiFetch } from '@/lib/services/apiClient';

// ---------------------------------------------------------------------------
// URL helper
// ---------------------------------------------------------------------------

function workspacesUrl(...segments: string[]): string {
    const base = '/api/v1/workspaces';
    return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
}

// ---------------------------------------------------------------------------
// Custom error for 409 Conflict on invite link creation
// ---------------------------------------------------------------------------

export class InviteLinkConflictError extends Error {
    code: string;
    link: InviteLink;

    constructor(detail: ActiveInviteLinkExistsError) {
        super(detail.message);
        this.name = 'InviteLinkConflictError';
        this.code = detail.code;
        this.link = detail.link;
    }
}

// ---------------------------------------------------------------------------
// Workspace CRUD
// ---------------------------------------------------------------------------

export const workspaceService = {
    /**
     * POST /api/v1/workspaces
     * Create a new workspace. The creating org automatically becomes admin.
     */
    async createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
        const raw: Record<string, unknown> = await apiPost(workspacesUrl(), request);
        return toWorkspace(raw);
    },

    /**
     * GET /api/v1/workspaces?skip=0&limit=100
     * List all workspaces the authenticated org belongs to.
     */
    async listWorkspaces(skip = 0, limit = 100): Promise<PaginatedWorkspaces> {
        const params = new URLSearchParams({
            skip: String(skip),
            limit: String(limit),
        });
        const raw: Record<string, unknown> = await apiGet(
            `${workspacesUrl()}?${params.toString()}`,
        );
        return {
            items: ((raw.items as Record<string, unknown>[]) || []).map(toWorkspace),
            total: (raw.total as number) ?? 0,
            skip: (raw.skip as number) ?? 0,
            limit: (raw.limit as number) ?? 100,
        };
    },

    /**
     * GET /api/v1/workspaces/{workspaceId}
     * Fetch a single workspace by its obfuscated UUID.
     */
    async getWorkspace(workspaceId: string): Promise<Workspace> {
        const raw: Record<string, unknown> = await apiGet(
            workspacesUrl(workspaceId),
        );
        return toWorkspace(raw);
    },

    /**
     * PATCH /api/v1/workspaces/{workspaceId}
     * Update workspace name. websiteDomain is immutable.
     */
    async updateWorkspace(
        workspaceId: string,
        request: UpdateWorkspaceRequest,
    ): Promise<Workspace> {
        const raw: Record<string, unknown> = await apiPatch(
            workspacesUrl(workspaceId),
            request,
        );
        return toWorkspace(raw);
    },

    /**
     * DELETE /api/v1/workspaces/{workspaceId}
     * Delete a workspace and all associated data (cascade).
     */
    async deleteWorkspace(workspaceId: string): Promise<void> {
        await apiDelete(workspacesUrl(workspaceId));
    },

    /**
     * PUT /api/v1/workspaces/{workspaceId}/persona
     * Create or replace the brand persona. Admin only.
     */
    async upsertPersona(workspaceId: string, content: string): Promise<void> {
        await apiPut(workspacesUrl(workspaceId, 'persona'), { content });
    },

    /**
     * GET /api/v1/workspaces/{workspaceId}/persona
     * Get the brand persona. Any workspace member.
     */
    async getPersona(workspaceId: string): Promise<{ content: string } | null> {
        try {
            const raw = (await apiGet(workspacesUrl(workspaceId, 'persona'))) as Record<string, unknown>;
            return { content: (raw.content as string) ?? '' };
        } catch {
            return null;
        }
    },
};

// ---------------------------------------------------------------------------
// Invite Links
// ---------------------------------------------------------------------------

export const inviteLinkService = {
    /**
     * POST /api/v1/workspaces/invite-links/accept?token=<token>
     * Accept an invite link to join a workspace.
     */
    async acceptInvite(token: string): Promise<{ message: string }> {
        return apiPost(
            `${workspacesUrl('invite-links', 'accept')}?token=${encodeURIComponent(token)}`,
        );
    },

    /**
     * POST /api/v1/workspaces/{workspaceId}/invite-links
     * Create a new invite link for a workspace.
     * Throws InviteLinkConflictError if an active link already exists for the role.
     */
    async createInviteLink(
        workspaceId: string,
        request: CreateInviteLinkRequest = {},
    ): Promise<InviteLink> {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        const url = `${API_BASE_URL}${workspacesUrl(workspaceId, 'invite-links')}`;

        const res = await apiFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: request.role || 'viewer',
                max_uses: request.max_uses ?? 10,
                expires_in: request.expires_in ?? 15,
            }),
        });

        if (!res.ok) {
            if (res.status === 409) {
                const body = await res.json().catch(() => ({}));
                throw new InviteLinkConflictError(body as ActiveInviteLinkExistsError);
            }
            // Try to extract a human-readable message from the error body
            let message = 'Failed to create invite link';
            try {
                const body = await res.json();
                message = body?.error?.message || body?.detail || body?.message || message;
            } catch {
                // body wasn't JSON — keep the default message
            }
            throw new Error(message);
        }

        const raw: Record<string, unknown> = await res.json();
        return toInviteLink(raw);
    },

    /**
     * POST /api/v1/workspaces/{workspaceId}/invite-links/regenerate
     * Regenerate (replace) an invite link for a role.
     */
    async regenerateInviteLink(
        workspaceId: string,
        request: CreateInviteLinkRequest = {},
    ): Promise<InviteLink> {
        const raw: Record<string, unknown> = await apiPost(
            workspacesUrl(workspaceId, 'invite-links', 'regenerate'),
            {
                role: request.role || 'viewer',
                max_uses: request.max_uses ?? 10,
                expires_in: request.expires_in ?? 15,
            },
        );
        return toInviteLink(raw);
    },

    /**
     * GET /api/v1/workspaces/{workspaceId}/invite-links
     * List all active (non-expired) invite links for a workspace.
     */
    async listInviteLinks(workspaceId: string): Promise<InviteLink[]> {
        const raw: Record<string, unknown>[] = await apiGet(
            workspacesUrl(workspaceId, 'invite-links'),
        );
        return raw.map(toInviteLink);
    },

    /**
     * DELETE /api/v1/workspaces/{workspaceId}/invite-links/{linkId}
     * Revoke (delete) an invite link.
     */
    async revokeInviteLink(
        workspaceId: string,
        linkId: string,
    ): Promise<void> {
        await apiDelete(
            workspacesUrl(workspaceId, 'invite-links', linkId),
        );
    },
};

// ---------------------------------------------------------------------------
// Member Management
// ---------------------------------------------------------------------------

export const memberService = {
    /**
     * GET /api/v1/workspaces/{workspaceId}/members
     * List all members of a workspace.
     */
    async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
        const raw: Record<string, unknown>[] = await apiGet(
            workspacesUrl(workspaceId, 'members'),
        );
        return raw.map(toMember);
    },

    /**
     * PATCH /api/v1/workspaces/{workspaceId}/members/{orgId}
     * Update a member's role.
     */
    async updateMemberRole(
        workspaceId: string,
        orgId: string,
        request: UpdateMemberRoleRequest,
    ): Promise<WorkspaceMember> {
        const raw: Record<string, unknown> = await apiPatch(
            workspacesUrl(workspaceId, 'members', orgId),
            request,
        );
        return toMember(raw);
    },

    /**
     * DELETE /api/v1/workspaces/{workspaceId}/members/{orgId}
     * Remove a member from the workspace.
     */
    async removeMember(
        workspaceId: string,
        orgId: string,
    ): Promise<void> {
        await apiDelete(
            workspacesUrl(workspaceId, 'members', orgId),
        );
    },
};

// ---------------------------------------------------------------------------
// Mappers — backend returns camelCase, we map to our frontend types
// ---------------------------------------------------------------------------

function toWorkspace(raw: Record<string, unknown>): Workspace {
    return {
        workspaceId: raw.workspaceId as string,
        name: (raw.name as string) ?? null,
        websiteDomain: (raw.websiteDomain as string) ?? null,
        createdAt: raw.createdAt as string,
        updatedAt: (raw.updatedAt as string) ?? null,
    };
}

function toInviteLink(raw: Record<string, unknown>): InviteLink {
    return {
        id: raw.id as string,
        workspaceId: raw.workspace_id as string,
        token: raw.token as string,
        role: raw.role as WorkspaceRole,
        maxUses: raw.max_uses as number,
        currentUses: raw.current_uses as number,
        isExpired: raw.is_expired as boolean,
        expiresAt: raw.expires_at as string,
        createdAt: raw.created_at as string,
    };
}

function toMember(raw: Record<string, unknown>): WorkspaceMember {
    return {
        orgId: raw.org_id as string,
        orgName: raw.org_name as string,
        email: raw.email as string,
        role: raw.role as WorkspaceRole,
        joinedAt: raw.joined_at as string,
    };
}
