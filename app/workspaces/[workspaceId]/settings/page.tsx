'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
    workspaceService,
    inviteLinkService,
    memberService,
    InviteLinkConflictError,
} from '@/lib/services/workspaceService';
import type {
    Workspace,
    WorkspaceMember,
    InviteLink,
    WorkspaceRole,
} from '@/lib/types/workspace.types';
import {
    Settings as SettingsIcon,
    Save,
    Shield,
    Zap,
    AlertCircle,
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Trash2,
    Users,
    Link as LinkIcon,
    Crown,
    Eye,
    Edit3,
    Plus,
} from 'lucide-react';
import { toast } from 'react-toastify';

type Tab = 'general' | 'members' | 'invites';

export default function SettingsPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const [activeTab, setActiveTab] = useState<Tab>('general');

    // Workspace state
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit name state
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);

    // Members state
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    // Invite links state
    const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
    const [invitesLoading, setInvitesLoading] = useState(false);

    // New invite link form
    const [newInviteRole, setNewInviteRole] = useState<'editor' | 'viewer'>('viewer');
    const [newInviteMaxUses, setNewInviteMaxUses] = useState(10);
    const [newInviteExpiresIn, setNewInviteExpiresIn] = useState(15);
    const [creatingInvite, setCreatingInvite] = useState(false);

    // Copied token state
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Fetch workspace data
    const fetchWorkspace = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await workspaceService.getWorkspace(workspaceId);
            setWorkspace(data);
            setEditName(data.name || '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    // Fetch members
    const fetchMembers = useCallback(async () => {
        try {
            setMembersLoading(true);
            const data = await memberService.listMembers(workspaceId);
            setMembers(data);
        } catch (err) {
            toast.error('Failed to load members');
        } finally {
            setMembersLoading(false);
        }
    }, [workspaceId]);

    // Fetch invite links
    const fetchInviteLinks = useCallback(async () => {
        try {
            setInvitesLoading(true);
            const data = await inviteLinkService.listInviteLinks(workspaceId);
            setInviteLinks(data);
        } catch (err) {
            toast.error('Failed to load invite links');
        } finally {
            setInvitesLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchWorkspace();
    }, [fetchWorkspace]);

    // Fetch members and invites when their tabs are activated
    useEffect(() => {
        if (activeTab === 'members' && members.length === 0 && !membersLoading) {
            fetchMembers();
        }
        if (activeTab === 'invites' && inviteLinks.length === 0 && !invitesLoading) {
            fetchInviteLinks();
        }
    }, [activeTab, members.length, inviteLinks.length, membersLoading, invitesLoading, fetchMembers, fetchInviteLinks]);

    // Save workspace name
    const handleSaveName = async () => {
        try {
            setSaving(true);
            const updated = await workspaceService.updateWorkspace(workspaceId, {
                name: editName || null,
            });
            setWorkspace(updated);
            toast.success('Workspace name updated');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update name');
        } finally {
            setSaving(false);
        }
    };

    // Copy invite token to clipboard
    const copyToken = async (token: string) => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopiedToken(token);
            toast.success('Invite link copied to clipboard');
            setTimeout(() => setCopiedToken(null), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    // Create invite link
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
                // An active link already exists — update the list and show it
                toast.warning(err.message);
                fetchInviteLinks();
            } else {
                toast.error(err instanceof Error ? err.message : 'Failed to create invite link');
            }
        } finally {
            setCreatingInvite(false);
        }
    };

    // Regenerate invite link
    const handleRegenerateInvite = async (linkId: string) => {
        try {
            const link = await inviteLinkService.regenerateInviteLink(workspaceId, {
                role: newInviteRole,
                max_uses: newInviteMaxUses,
                expires_in: newInviteExpiresIn,
            });
            setInviteLinks((prev) =>
                prev.map((l) => (l.id === linkId ? link : l)),
            );
            toast.success('Invite link regenerated');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to regenerate invite link');
        }
    };

    // Revoke invite link
    const handleRevokeInvite = async (linkId: string) => {
        if (!confirm('Are you sure you want to revoke this invite link?')) return;
        try {
            await inviteLinkService.revokeInviteLink(workspaceId, linkId);
            setInviteLinks((prev) => prev.filter((l) => l.id !== linkId));
            toast.success('Invite link revoked');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to revoke invite link');
        }
    };

    // Update member role
    const handleUpdateRole = async (orgId: string, newRole: WorkspaceRole) => {
        try {
            const updated = await memberService.updateMemberRole(workspaceId, orgId, {
                role: newRole as 'editor' | 'viewer',
            });
            setMembers((prev) =>
                prev.map((m) => (m.orgId === orgId ? updated : m)),
            );
            toast.success(`Role updated to ${newRole}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    // Remove member
    const handleRemoveMember = async (orgId: string, orgName: string) => {
        if (!confirm(`Remove ${orgName} from this workspace?`)) return;
        try {
            await memberService.removeMember(workspaceId, orgId);
            setMembers((prev) => prev.filter((m) => m.orgId !== orgId));
            toast.success(`${orgName} removed from workspace`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove member');
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
                <div className="h-64 bg-muted animate-pulse rounded" />
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="p-6">
                <Card className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Failed to load settings</h3>
                    <p className="text-muted-foreground mb-4">{error || 'Unknown error occurred'}</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SettingsIcon className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <h1 className="text-2xl font-bold">Workspace Settings</h1>
                        <p className="text-muted-foreground">Configure your workspace preferences</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                {([
                    { id: 'general' as Tab, label: 'General', icon: SettingsIcon },
                    { id: 'members' as Tab, label: 'Members', icon: Users },
                    { id: 'invites' as Tab, label: 'Invite Links', icon: LinkIcon },
                ]).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-primary text-foreground font-medium'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'general' && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">General Information</h2>
                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium mb-1">Workspace Name</label>
                            <div className="flex gap-2">
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter workspace name"
                                />
                                <Button onClick={handleSaveName} disabled={saving || editName === workspace.name}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Website Domain</label>
                            <Input value={workspace.websiteDomain || 'Not set'} disabled />
                            <p className="text-xs text-muted-foreground mt-1">
                                Domain is immutable after workspace creation.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Workspace ID</label>
                            <Input value={workspace.workspaceId} disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Created</label>
                            <p className="text-sm text-neutral-600">
                                {new Date(workspace.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'members' && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Workspace Members</h2>
                        <Button variant="outline" size="sm" onClick={fetchMembers}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh
                        </Button>
                    </div>

                    {membersLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                        </div>
                    ) : members.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No members found. Create invite links to add members.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div
                                    key={member.orgId}
                                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                                            {member.orgName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">{member.orgName}</h3>
                                                {member.role === 'admin' && (
                                                    <Badge variant="warning" size="sm">
                                                        <Crown className="w-3 h-3 mr-1" />
                                                        Owner
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {member.role === 'admin' ? (
                                            <Badge variant="primary">Admin</Badge>
                                        ) : (
                                            <>
                                                <select
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        handleUpdateRole(member.orgId, e.target.value as WorkspaceRole)
                                                    }
                                                    className="text-sm border border-border rounded-md px-2 py-1 bg-background"
                                                >
                                                    <option value="editor">Editor</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveMember(member.orgId, member.orgName)}
                                                    className="text-error hover:text-error-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                            <strong>Roles:</strong> Admins have full control. Editors can modify content. Viewers have read-only access.
                            Only the workspace owner can be an admin.
                        </p>
                    </div>
                </Card>
            )}

            {activeTab === 'invites' && (
                <div className="space-y-6">
                    {/* Create New Invite Link */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Create Invite Link</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    value={newInviteRole}
                                    onChange={(e) => setNewInviteRole(e.target.value as 'editor' | 'viewer')}
                                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max Uses</label>
                                <Input
                                    type="number"
                                    value={newInviteMaxUses}
                                    onChange={(e) => setNewInviteMaxUses(parseInt(e.target.value) || 1)}
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Expires In (days)</label>
                                <Input
                                    type="number"
                                    value={newInviteExpiresIn}
                                    onChange={(e) => setNewInviteExpiresIn(parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={90}
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleCreateInvite}
                            disabled={creatingInvite}
                            className="mt-4"
                        >
                            {creatingInvite ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Generate Invite Link
                        </Button>
                    </Card>

                    {/* Active Invite Links */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Active Invite Links</h2>
                            <Button variant="outline" size="sm" onClick={fetchInviteLinks}>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Refresh
                            </Button>
                        </div>

                        {invitesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                            </div>
                        ) : inviteLinks.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                No active invite links. Create one above to invite organizations.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {inviteLinks.map((link) => (
                                    <div
                                        key={link.id}
                                        className="p-4 border border-border rounded-lg space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={link.role === 'editor' ? 'primary' : 'secondary'}>
                                                    {link.role === 'editor' ? (
                                                        <Edit3 className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <Eye className="w-3 h-3 mr-1" />
                                                    )}
                                                    {link.role}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {link.currentUses}/{link.maxUses} uses
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    Expires: {new Date(link.expiresAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Token */}
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 text-xs bg-neutral-100 px-3 py-2 rounded-md overflow-x-auto">
                                                {window.location.origin}/accept-invite?token={link.token}
                                            </code>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyToken(link.token)}
                                            >
                                                {copiedToken === link.token ? (
                                                    <Check className="w-4 h-4 text-success" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRegenerateInvite(link.id)}
                                            >
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Regenerate
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRevokeInvite(link.id)}
                                                className="text-error hover:text-error-700"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Revoke
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
