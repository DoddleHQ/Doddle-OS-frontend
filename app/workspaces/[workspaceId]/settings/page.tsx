'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Save,
    AlertCircle,
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Trash2,
    Plus,
    Crown,
    Edit3,
    Eye,
    Mail,
    Calendar,
    Globe,
    User as UserIcon,
    ShieldCheck,
    ShieldAlert,
} from 'lucide-react';
import {
    workspaceService,
    inviteLinkService,
    memberService,
    InviteLinkConflictError,
} from '@/lib/services/workspaceService';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAuthStore } from '@/lib/stores/authStore';
import { useCurrentWorkspace, updateCachedWorkspace } from '@/lib/hooks/useCurrentWorkspace';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { InfoTooltip } from '@/components/v2/dashboard/primitives';
import { DataSyncSection } from './DataSyncSection';
import type {
    WorkspaceMember,
    InviteLink,
    WorkspaceRole,
} from '@/lib/types/workspace.types';
import { toast } from 'react-toastify';

/*
 * Settings — unified workspace + account view, v2 token system.
 *
 * Previously a tabbed page using the legacy v1 UI (Card, Button, Badge, Input
 * + text-muted-foreground / border-primary). Redesigned per impeccable Operate:
 * - Single scrollable view (no tabs) — all details visible together
 * - No cards for basic layout — sections grouped by proximity + hairlines
 * - Surfaces BOTH workspace data and the signed-in account/org info
 * - Hanken Grotesk + JetBrains Mono, vermilion accent reserved for state
 * - Every input has a label + helper text; immutable fields are visually distinct
 *
 * API integration for inline edits is stubbed (save handler wired for name;
 * other fields will be wired as endpoints land).
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type SettingsTab = 'general' | 'sync';

export default function SettingsPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const { logout } = useAuth();
    const org = useAuthStore((s) => s.org);
    const authStatus = useAuthStore((s) => s.status);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    // Workspace — use the cached hook so we don't fire a concurrent fetch
    // that races with the auth bootstrap's getMe() refresh.
    const { workspace, isLoading: loading } = useCurrentWorkspace(workspaceId);
    // List context refresh — called after a name change so the icon rail
    // (which reads the list) updates alongside the detail cache.
    const { refresh: refreshWorkspaceList } = useWorkspaces();

    // Edit name
    const [editName, setEditName] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Members
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    // Invite links
    const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [newInviteRole, setNewInviteRole] = useState<'editor' | 'viewer'>('viewer');
    const [newInviteMaxUses, setNewInviteMaxUses] = useState(10);
    const [newInviteExpiresIn, setNewInviteExpiresIn] = useState(15);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // === Fetchers ===
    const fetchMembers = useCallback(async () => {
        try {
            setMembersLoading(true);
            const data = await memberService.listMembers(workspaceId);
            setMembers(data);
        } catch {
            toast.error('Failed to load members');
        } finally {
            setMembersLoading(false);
        }
    }, [workspaceId]);

    const fetchInviteLinks = useCallback(async () => {
        try {
            setInvitesLoading(true);
            const data = await inviteLinkService.listInviteLinks(workspaceId);
            setInviteLinks(data);
        } catch {
            toast.error('Failed to load invite links');
        } finally {
            setInvitesLoading(false);
        }
    }, [workspaceId]);

    // Sync editName when workspace loads from the cache
    useEffect(() => {
        if (workspace) setEditName(workspace.name || '');
    }, [workspace]);

    // Fetch members + invites on mount
    useEffect(() => {
        fetchMembers();
        fetchInviteLinks();
    }, [fetchMembers, fetchInviteLinks]);

    // === Actions ===
    const handleSaveName = async () => {
        try {
            setSavingName(true);
            await workspaceService.updateWorkspace(workspaceId, {
                name: editName || null,
            });
            // Propagate the new name to every surface that reads the workspace
            // (sidebar nav, icon rail tile, layout header) via the cache pub/sub.
            if (workspace) {
                updateCachedWorkspace({ ...workspace, name: editName || null, updatedAt: new Date().toISOString() });
            }
            // Also refresh the workspace LIST so the icon rail tile (which
            // derives its initial + tooltip from the list) stays in sync.
            refreshWorkspaceList();
            toast.success('Workspace name updated');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update name');
        } finally {
            setSavingName(false);
        }
    };

    const copyToken = async (token: string) => {
        const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopiedToken(token);
            toast.success('Invite link copied');
            setTimeout(() => setCopiedToken(null), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleCreateInvite = async () => {
        try {
            setCreatingInvite(true);
            const link = await inviteLinkService.createInviteLink(workspaceId, {
                role: newInviteRole,
                max_uses: newInviteMaxUses,
                expires_in: newInviteExpiresIn,
            });
            setInviteLinks((prev) => [...prev, link]);
            toast.success('Invite link created');
        } catch (err) {
            if (err instanceof InviteLinkConflictError) {
                // 409: an active link already exists for this role.
                // The backend returns it — surface it in the list so the user
                // can copy/regenerate/revoke without a refetch.
                setInviteLinks((prev) =>
                    prev.some((l) => l.id === err.link.id) ? prev : [...prev, err.link],
                );
                toast.warning(`An active ${err.link.role} link already exists`);
            } else {
                toast.error(err instanceof Error ? err.message : 'Failed to create invite link');
            }
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleRegenerateInvite = async (link: InviteLink) => {
        try {
            // The regenerate endpoint replaces the link for a given ROLE — pass
            // the link's own role + config, not the create-form's current state.
            const newLink = await inviteLinkService.regenerateInviteLink(workspaceId, {
                role: link.role as 'editor' | 'viewer',
                max_uses: link.maxUses,
                expires_in: Math.max(
                    1,
                    Math.ceil((new Date(link.expiresAt).getTime() - new Date(link.createdAt).getTime()) / 86_400_000),
                ),
            });
            setInviteLinks((prev) => prev.map((l) => (l.id === link.id ? newLink : l)));
            toast.success('Invite link regenerated');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to regenerate');
        }
    };

    const handleRevokeInvite = async (linkId: string) => {
        if (!confirm('Revoke this invite link?')) return;
        try {
            await inviteLinkService.revokeInviteLink(workspaceId, linkId);
            setInviteLinks((prev) => prev.filter((l) => l.id !== linkId));
            toast.success('Invite link revoked');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to revoke');
        }
    };

    const handleUpdateRole = async (orgId: string, newRole: WorkspaceRole) => {
        try {
            const updated = await memberService.updateMemberRole(workspaceId, orgId, {
                role: newRole as 'editor' | 'viewer',
            });
            setMembers((prev) => prev.map((m) => (m.orgId === orgId ? updated : m)));
            toast.success(`Role updated to ${newRole}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    const handleRemoveMember = async (orgId: string, orgName: string) => {
        if (!confirm(`Remove ${orgName} from this workspace?`)) return;
        try {
            await memberService.removeMember(workspaceId, orgId);
            setMembers((prev) => prev.filter((m) => m.orgId !== orgId));
            toast.success(`${orgName} removed`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove member');
        }
    };

    // === Loading ===
    if (loading) {
        return (
            <div className="p-6 max-w-[640px] mx-auto space-y-6">
                <div className="h-8 rounded" style={{ background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                <div className="h-32 rounded" style={{ background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                <div className="h-32 rounded" style={{ background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
            </div>
        );
    }

    if (!loading && !workspace) {
        return (
            <div className="p-6 max-w-[640px] mx-auto">
                <div className="flex flex-col items-center py-16 text-center">
                    <AlertCircle className="w-8 h-8 mb-3" style={{ color: 'var(--v2-vermilion)' }} />
                    <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.9rem', color: 'var(--v2-paper-ink)', fontWeight: 500, marginBottom: '0.25rem' }}>
                        Failed to load settings
                    </p>
                    <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1rem' }}>
                        Workspace could not be loaded
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-[8px] v2-label text-[10px]"
                        style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // After both guards, workspace is loaded
    const ws = workspace!;

    return (
        <div className="p-6 max-w-[640px] mx-auto">
            {/* Page title */}
            <motion.h1
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                style={{
                    fontFamily: 'var(--v2-font-sans)',
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: 'var(--v2-paper-ink)',
                    letterSpacing: '-0.01em',
                    marginBottom: '1.5rem',
                }}
            >
                Settings
            </motion.h1>

            {/* Tab navigation */}
            <div className="flex gap-1 mb-6">
                <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="General" />
                <TabButton active={activeTab === 'sync'} onClick={() => setActiveTab('sync')} label="Data Sync" />
            </div>

            {activeTab === 'general' && (
                <>
            {/* ====================================================
                SECTION 1: Account (the signed-in org/user)
            ==================================================== */}
            <Section title="Account">
                {authStatus === 'loading' ? (
                    // Loading skeleton
                    <div className="space-y-2.5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="h-3 rounded" style={{ width: '40%', background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                                <div className="h-3 rounded" style={{ width: '30%', background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                            </div>
                        ))}
                    </div>
                ) : authStatus === 'authenticated' && org ? (
                    <div className="space-y-3">
                        <DetailRow icon={<UserIcon className="w-3.5 h-3.5" />} label="Organization" value={org.orgName} />
                        <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={org.email} mono />
                        <DetailRow
                            icon={org.emailVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                            label="Email verified"
                            value={org.emailVerified ? 'Yes' : 'No'}
                            valueColor={org.emailVerified ? 'var(--v2-sage)' : 'var(--v2-vermilion)'}
                        />
                        <DetailRow
                            icon={<ShieldCheck className="w-3.5 h-3.5" />}
                            label="Status"
                            value={org.isActive ? 'Active' : 'Inactive'}
                            valueColor={org.isActive ? 'var(--v2-sage)' : 'var(--v2-vermilion)'}
                        />
                        <DetailRow
                            icon={<Calendar className="w-3.5 h-3.5" />}
                            label="Joined"
                            value={new Date(org.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            mono
                        />
                    </div>
                ) : (
                    <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)' }}>
                        Sign in to view account details
                    </p>
                )}
                {/* Sign out */}
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--v2-paper-rule)' }}>
                    <button
                        onClick={() => logout()}
                        className="v2-label text-[10px] px-3 py-1.5 rounded-[6px] transition-colors"
                        style={{ color: 'var(--v2-vermilion)', border: '1px solid rgba(200,50,27,0.2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,50,27,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Sign out
                    </button>
                </div>
            </Section>

            {/* ====================================================
                SECTION 2: Workspace details
            ==================================================== */}
            <Section title="Workspace">
                <div className="space-y-4">
                    {/* Workspace name — editable */}
                    <div>
                        <FieldLabel>Name</FieldLabel>
                        <div className="flex gap-2">
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter workspace name"
                                className="flex-1 px-3 py-2 rounded-[6px] outline-none transition-colors"
                                style={{
                                    fontFamily: 'var(--v2-font-sans)',
                                    fontSize: '0.82rem',
                                    color: 'var(--v2-paper-ink)',
                                    background: 'rgba(255,255,255,0.4)',
                                    border: '1px solid var(--v2-paper-rule)',
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--v2-vermilion);'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,50,27,0.12)'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--v2-paper-rule)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                            <button
                                onClick={handleSaveName}
                                disabled={savingName || editName === ws.name}
                                className="px-3 py-2 rounded-[6px] flex items-center justify-center transition-opacity"
                                style={{
                                    background: 'var(--v2-vermilion)',
                                    color: 'var(--v2-vermilion-ink)',
                                    opacity: savingName || editName === ws.name ? 0.4 : 1,
                                }}
                                aria-label="Save name"
                            >
                                {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Immutable fields */}
                    <DetailRow icon={<Globe className="w-3.5 h-3.5" />} label="Domain" value={ws.websiteDomain || 'Not set'} mono />
                    <DetailRow
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        label="Created"
                        value={new Date(ws.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        mono
                    />
                    {ws.updatedAt && (
                        <DetailRow
                            icon={<RefreshCw className="w-3.5 h-3.5" />}
                            label="Updated"
                            value={new Date(ws.updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            mono
                        />
                    )}
                </div>
            </Section>

            {/* ====================================================
                SECTION 3: Members
            ==================================================== */}
            <Section
                title="Members"
                action={
                    <button
                        onClick={fetchMembers}
                        className="p-1 rounded-[4px]"
                        style={{ color: 'var(--v2-paper-ink-2)' }}
                        aria-label="Refresh members"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${membersLoading ? 'animate-spin' : ''}`} />
                    </button>
                }
            >
                {membersLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--v2-paper-ink-2)' }} />
                    </div>
                ) : members.length === 0 ? (
                    <p className="v2-mono py-4" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)' }}>
                        No members. Create an invite link below to add collaborators.
                    </p>
                ) : (
                    <div>
                        {members.map((member, i) => (
                            <div
                                key={member.orgId}
                                className="flex items-center justify-between py-2.5"
                                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--v2-paper-rule)' }}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: 'rgba(200,50,27,0.06)',
                                            border: '1px solid rgba(200,50,27,0.12)',
                                            color: 'var(--v2-vermilion)',
                                            fontFamily: 'var(--v2-font-sans)',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {member.orgName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="truncate"
                                                style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.8rem', fontWeight: 500, color: 'var(--v2-paper-ink)' }}
                                            >
                                                {member.orgName}
                                            </span>
                                            {member.role === 'admin' && (
                                                <span className="flex items-center gap-0.5 v2-label text-[7px] px-1.5 py-0.5 rounded" style={{ color: 'var(--v2-vermilion)', border: '1px solid rgba(200,50,27,0.2)' }}>
                                                    <Crown className="w-2.5 h-2.5" /> Owner
                                                </span>
                                            )}
                                        </div>
                                        <span className="v2-mono truncate block" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                                            {member.email}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {member.role === 'admin' ? (
                                        <span className="flex items-center gap-1 v2-label text-[8px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                            Admin
                                            <InfoTooltip text="Admins have full control over the workspace, members, and settings." />
                                        </span>
                                    ) : (
                                        <>
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleUpdateRole(member.orgId, e.target.value as WorkspaceRole)}
                                                className="px-2 py-1 rounded-[4px] outline-none"
                                                style={{
                                                    fontFamily: 'var(--v2-font-sans)',
                                                    fontSize: '0.72rem',
                                                    color: 'var(--v2-paper-ink)',
                                                    background: 'rgba(255,255,255,0.4)',
                                                    border: '1px solid var(--v2-paper-rule)',
                                                }}
                                            >
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                            <InfoTooltip text="Editor: can modify content. Viewer: read-only access." />
                                            <button
                                                onClick={() => handleRemoveMember(member.orgId, member.orgName)}
                                                className="p-1 rounded-[4px]"
                                                style={{ color: 'var(--v2-vermilion)', opacity: 0.6 }}
                                                aria-label={`Remove ${member.orgName}`}
                                                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ====================================================
                SECTION 4: Invite links
            ==================================================== */}
            <Section
                title="Invite Links"
                action={
                    <button
                        onClick={fetchInviteLinks}
                        className="p-1 rounded-[4px]"
                        style={{ color: 'var(--v2-paper-ink-2)' }}
                        aria-label="Refresh invite links"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${invitesLoading ? 'animate-spin' : ''}`} />
                    </button>
                }
            >
                {/* Create new link */}
                <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <label style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.7rem', fontWeight: 500, color: 'var(--v2-paper-ink-2)' }}>
                                    Role
                                </label>
                                <InfoTooltip text="Viewer: read-only access. Editor: can modify content." />
                            </div>
                            <select
                                value={newInviteRole}
                                onChange={(e) => setNewInviteRole(e.target.value as 'editor' | 'viewer')}
                                className="w-full px-2 py-1.5 rounded-[6px] outline-none"
                                style={{
                                    fontFamily: 'var(--v2-font-sans)',
                                    fontSize: '0.75rem',
                                    color: 'var(--v2-paper-ink)',
                                    background: 'rgba(255,255,255,0.4)',
                                    border: '1px solid var(--v2-paper-rule)',
                                }}
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Max uses (1–10)</FieldLabel>
                            <input
                                type="number"
                                value={newInviteMaxUses}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value) || 1;
                                    setNewInviteMaxUses(Math.min(Math.max(v, 1), 10));
                                }}
                                min={1}
                                max={10}
                                className="w-full px-2 py-1.5 rounded-[6px] outline-none"
                                style={{
                                    fontFamily: 'var(--v2-font-mono)',
                                    fontSize: '0.75rem',
                                    color: 'var(--v2-paper-ink)',
                                    background: 'rgba(255,255,255,0.4)',
                                    border: '1px solid var(--v2-paper-rule)',
                                }}
                            />
                        </div>
                        <div>
                            <FieldLabel>Expires (days)</FieldLabel>
                            <input
                                type="number"
                                value={newInviteExpiresIn}
                                onChange={(e) => setNewInviteExpiresIn(parseInt(e.target.value) || 1)}
                                min={1}
                                max={90}
                                className="w-full px-2 py-1.5 rounded-[6px] outline-none"
                                style={{
                                    fontFamily: 'var(--v2-font-mono)',
                                    fontSize: '0.75rem',
                                    color: 'var(--v2-paper-ink)',
                                    background: 'rgba(255,255,255,0.4)',
                                    border: '1px solid var(--v2-paper-rule)',
                                }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleCreateInvite}
                        disabled={creatingInvite}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] v2-label text-[10px] transition-opacity"
                        style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', opacity: creatingInvite ? 0.5 : 1 }}
                    >
                        {creatingInvite ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Generate link
                    </button>
                </div>

                {/* Active links */}
                {invitesLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--v2-paper-ink-2)' }} />
                    </div>
                ) : inviteLinks.length === 0 ? (
                    <p className="v2-mono py-3" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)' }}>
                        No active invite links.
                    </p>
                ) : (
                    <div>
                        {inviteLinks.map((link, i) => (
                            <div
                                key={link.id}
                                className="py-3"
                                style={{ borderTop: i === 0 ? '1px solid var(--v2-paper-rule)' : '1px solid var(--v2-paper-rule)' }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 v2-label text-[8px] px-1.5 py-0.5 rounded" style={{ color: 'var(--v2-paper-ink)', border: '1px solid var(--v2-paper-rule)' }}>
                                            {link.role === 'editor' ? <Edit3 className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                            {link.role}
                                        </span>
                                        <span className="v2-mono tabular-nums" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                                            {link.currentUses}/{link.maxUses} uses
                                        </span>
                                        <span className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                                            · expires {new Date(link.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code
                                        className="flex-1 v2-mono px-2.5 py-1.5 rounded-[4px] overflow-x-auto"
                                        style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)', background: 'rgba(0,0,0,0.03)' }}
                                    >
                                        {window.location.origin}/accept-invite?token={link.token}
                                    </code>
                                    <button
                                        onClick={() => copyToken(link.token)}
                                        className="p-1.5 rounded-[4px]"
                                        style={{ color: copiedToken === link.token ? 'var(--v2-sage)' : 'var(--v2-paper-ink-2)' }}
                                        aria-label="Copy invite link"
                                    >
                                        {copiedToken === link.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        onClick={() => handleRegenerateInvite(link)}
                                        className="v2-label text-[8px] transition-colors"
                                        style={{ color: 'var(--v2-paper-ink-2)' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--v2-paper-ink)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--v2-paper-ink-2)'; }}
                                    >
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={() => handleRevokeInvite(link.id)}
                                        className="v2-label text-[8px] transition-colors"
                                        style={{ color: 'var(--v2-vermilion)', opacity: 0.7 }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                                    >
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
                </>
            )}

            {/* ====================================================
                DATA SYNC TAB
            ==================================================== */}
            {activeTab === 'sync' && (
                <DataSyncSection workspaceId={workspaceId} />
            )}
        </div>
    );
}

/* === Tab button === */
function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className="px-3 py-1.5 rounded-[8px] transition-colors"
            style={{
                fontFamily: 'var(--v2-font-sans)',
                fontSize: '0.78rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)',
                background: active ? 'rgba(200,50,27,0.06)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
            {label}
        </button>
    );
}

/* === Shared layout primitives (local to this page) === */

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="mb-8"
        >
            <div className="flex items-center justify-between mb-3">
                <h2
                    style={{
                        fontFamily: 'var(--v2-font-sans)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--v2-paper-ink-2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    }}
                >
                    {title}
                </h2>
                {action}
            </div>
            {children}
        </motion.section>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label
            className="block mb-1"
            style={{
                fontFamily: 'var(--v2-font-sans)',
                fontSize: '0.7rem',
                fontWeight: 500,
                color: 'var(--v2-paper-ink-2)',
            }}
        >
            {children}
        </label>
    );
}

function DetailRow({
    icon,
    label,
    value,
    mono = false,
    valueColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
    valueColor?: string;
}) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
                <span style={{ color: 'var(--v2-paper-ink-2)' }}>{icon}</span>
                <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.78rem', color: 'var(--v2-paper-ink-2)' }}>
                    {label}
                </span>
            </div>
            <span
                className="truncate ml-3 text-right"
                style={{
                    fontFamily: mono ? 'var(--v2-font-mono)' : 'var(--v2-font-sans)',
                    fontSize: mono ? '0.72rem' : '0.78rem',
                    color: valueColor || 'var(--v2-paper-ink)',
                    maxWidth: '60%',
                }}
            >
                {value}
              </span>
        </div>
    );
}
