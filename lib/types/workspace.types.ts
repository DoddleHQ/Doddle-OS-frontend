export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface Workspace {
    workspaceId: string;
    name: string | null;
    websiteDomain: string | null;
    createdAt: string;
    updatedAt: string | null;
    organizationId?: string;
    organizationName?: string;
    yourRole?: WorkspaceRole;
}

export interface WorkspaceMember {
    userId: string;
    name: string;
    email: string;
    role: WorkspaceRole;
    joinedAt: string;
}

export interface InviteLink {
    id: string;
    workspaceId: string;
    token: string;
    role: WorkspaceRole;
    maxUses: number;
    currentUses: number;
    isExpired: boolean;
    expiresAt: string;
    createdAt: string;
}

export interface PaginatedWorkspaces {
    items: Workspace[];
    total: number;
    skip: number;
    limit: number;
}

export interface CreateWorkspaceRequest {
    name?: string;
    websiteDomain?: string;
    brandPersona?: string;
    organizationId: string;
}

export interface UpdateWorkspaceRequest {
    name?: string | null;
}

export interface CreateInviteLinkRequest {
    role?: 'editor' | 'viewer';
    max_uses?: number;
    expires_in?: number;
}

export interface UpdateMemberRoleRequest {
    role: 'editor' | 'viewer';
}

export interface ActiveInviteLinkExistsError {
    code: 'active_invite_link_exists';
    message: string;
    link: InviteLink;
}
