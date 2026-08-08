/**
 * Workspace Types
 *
 * Types for the Workspace API. The backend returns obfuscated UUIDs
 * (22-char URL-safe strings) for all ID fields, and uses camelCase
 * for JSON response keys.
 *
 * @see /api/v1/workspaces
 */

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export interface Workspace {
    /** Obfuscated UUID (22-char string). */
    workspaceId: string;
    name: string | null;
    websiteDomain: string | null;
    createdAt: string;
    updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Workspace Member
// ---------------------------------------------------------------------------

export interface WorkspaceMember {
    /** Obfuscated UUID of the member's organization. */
    orgId: string;
    orgName: string;
    email: string;
    role: WorkspaceRole;
    joinedAt: string;
}

// ---------------------------------------------------------------------------
// Invite Link
// ---------------------------------------------------------------------------

export interface InviteLink {
    /** Obfuscated UUID of the invite link. */
    id: string;
    /** Obfuscated UUID of the workspace. */
    workspaceId: string;
    /** URL-safe token for the invite link. */
    token: string;
    /** Role assigned to accepters. */
    role: WorkspaceRole;
    /** Maximum number of times the link can be used. */
    maxUses: number;
    /** Number of times the link has been used. */
    currentUses: number;
    /** Whether the link has been manually expired. */
    isExpired: boolean;
    /** Expiration timestamp. */
    expiresAt: string;
    /** Creation timestamp. */
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Paginated List Response
// ---------------------------------------------------------------------------

export interface PaginatedWorkspaces {
    items: Workspace[];
    total: number;
    skip: number;
    limit: number;
}

// ---------------------------------------------------------------------------
// Request Types
// ---------------------------------------------------------------------------

export interface CreateWorkspaceRequest {
    name?: string;
    websiteDomain?: string;
    /** Initial brand persona markdown. Optional. */
    brandPersona?: string;
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

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export interface ActiveInviteLinkExistsError {
    code: 'active_invite_link_exists';
    message: string;
    link: InviteLink;
}
