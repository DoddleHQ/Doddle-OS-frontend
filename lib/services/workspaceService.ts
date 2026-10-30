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

function workspacesUrl(...segments: string[]): string {
    const base = '/api/v1/workspaces';
    return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
}

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

export interface OrganizationEntry {
    organizationId: string;
    name: string;
    status: string;
    isOwner: boolean;
    memberCount: number;
}

export const organizationService = {
    async listOrganizations(): Promise<OrganizationEntry[]> {
        const raw = (await apiGet('/api/v1/organizations')) as Record<string, unknown>;
        return ((raw.items as Record<string, unknown>[]) || []).map((o) => ({
            organizationId: o.organizationId as string,
            name: (o.name as string) ?? '',
            status: (o.status as string) ?? 'active',
            isOwner: Boolean(o.isOwner),
            memberCount: (o.memberCount as number) ?? 0,
        }));
    },
};

export const workspaceService = {
    async createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
        const raw: Record<string, unknown> = await apiPost(workspacesUrl(), request);
        return toWorkspace(raw);
    },

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

    async getWorkspace(workspaceId: string): Promise<Workspace> {
        const raw: Record<string, unknown> = await apiGet(
            workspacesUrl(workspaceId),
        );
        return toWorkspace(raw);
    },

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

    async deleteWorkspace(workspaceId: string): Promise<void> {
        await apiDelete(workspacesUrl(workspaceId));
    },

    async upsertPersona(workspaceId: string, content: string): Promise<void> {
        await apiPut(workspacesUrl(workspaceId, 'persona'), { content });
    },

    async getPersona(workspaceId: string): Promise<{ content: string } | null> {
        try {
            const raw = (await apiGet(workspacesUrl(workspaceId, 'persona'))) as Record<string, unknown>;
            return { content: (raw.content as string) ?? '' };
        } catch {
            return null;
        }
    },
};

export const inviteLinkService = {
    async acceptInvite(token: string): Promise<{ message: string }> {
        return apiPost(
            `${workspacesUrl('invite-links', 'accept')}?token=${encodeURIComponent(token)}`,
        );
    },

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
            let message = 'Failed to create invite link';
            try {
                const body = await res.json();
                message = body?.error?.message || body?.detail || body?.message || message;
            } catch {
            }
            throw new Error(message);
        }

        const raw: Record<string, unknown> = await res.json();
        return toInviteLink(raw);
    },

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

    async listInviteLinks(workspaceId: string): Promise<InviteLink[]> {
        const raw: Record<string, unknown>[] = await apiGet(
            workspacesUrl(workspaceId, 'invite-links'),
        );
        return raw.map(toInviteLink);
    },

    async revokeInviteLink(
        workspaceId: string,
        linkId: string,
    ): Promise<void> {
        await apiDelete(
            workspacesUrl(workspaceId, 'invite-links', linkId),
        );
    },
};

export const memberService = {
    async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
        const raw: Record<string, unknown>[] = await apiGet(
            workspacesUrl(workspaceId, 'members'),
        );
        return raw.map(toMember);
    },

    async updateMemberRole(
        workspaceId: string,
        userId: string,
        request: UpdateMemberRoleRequest,
    ): Promise<WorkspaceMember> {
        const raw: Record<string, unknown> = await apiPatch(
            workspacesUrl(workspaceId, 'members', userId),
            request,
        );
        return toMember(raw);
    },

    async removeMember(
        workspaceId: string,
        userId: string,
    ): Promise<void> {
        await apiDelete(
            workspacesUrl(workspaceId, 'members', userId),
        );
    },
};

function toWorkspace(raw: Record<string, unknown>): Workspace {
    return {
        workspaceId: raw.workspaceId as string,
        name: (raw.name as string) ?? null,
        websiteDomain: (raw.websiteDomain as string) ?? null,
        createdAt: raw.createdAt as string,
        updatedAt: (raw.updatedAt as string) ?? null,
        organizationId: (raw.organizationId as string) ?? undefined,
        organizationName: (raw.organizationName as string) ?? undefined,
        yourRole: (raw.yourRole as Workspace['yourRole']) ?? undefined,
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
        userId: raw.user_id as string,
        name: raw.name as string,
        email: raw.email as string,
        role: raw.role as WorkspaceRole,
        joinedAt: raw.joined_at as string,
    };
}
