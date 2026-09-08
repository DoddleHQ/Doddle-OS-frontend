'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, Copy, CreditCard, Database, Link2, Plug, Plus, RefreshCw, Settings, ShieldAlert, Trash2, User, Users } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentWorkspace, invalidateWorkspace } from '@/lib/hooks/useCurrentWorkspace';
import { workspaceService, inviteLinkService, memberService, InviteLinkConflictError } from '@/lib/services/workspaceService';
import { editProfile } from '@/lib/services/authService';
import { notify } from '@/lib/stores/notificationStore';
import { useOS } from '@/lib/demo/osStore';
import { DataSyncSection } from '@/components/demo/settings/DataSyncSection';
import { BrandPersonaEditor } from '@/components/demo/settings/BrandPersonaEditor';
import type { WorkspaceMember, InviteLink } from '@/lib/types/workspace.types';

const TABS = [
  { group: 'Personal', items: [
    { id: 'profile', label: 'profile', icon: User },
    { id: 'workspace', label: 'workspace', icon: Settings },
  ] },
  { group: 'Team', items: [
    { id: 'members', label: 'members', icon: Users },
    { id: 'invites', label: 'invite_links', icon: Link2 },
  ] },
  { group: 'Organization', items: [
    { id: 'billing', label: 'billing', icon: CreditCard },
    { id: 'brand_persona', label: 'brand_persona', icon: ShieldAlert },
    { id: 'analytics', label: 'analytics', icon: Activity },
  ] },
  { group: 'System & Core', items: [
    { id: 'data_sync', label: 'data_sync', icon: Database },
    { id: 'integrations', label: 'integrations', icon: Plug },
  ] },
] as const;

type TabId = (typeof TABS)[number]['items'][number]['id'];

const field = 'w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[5px] px-3 py-2 text-xs font-mono text-[var(--ink)] transition-colors';

// ---------------------------------------------------------------------------
// Profile tab — real account data, editable via PATCH /user/edit-profile
// ---------------------------------------------------------------------------
function ProfileTab() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [expertise, setExpertise] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await editProfile(name.trim());
      notify('Profile updated', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl slide-in">
      <h3 className="text-lg font-bold mb-6 font-mono">config_profile()</h3>

      <div className="agency-card p-6 mb-6 flex flex-col sm:flex-row gap-6 items-start !cursor-default">
        <span className="w-20 h-20 rounded-[10px] border border-[var(--hairline-strong)] flex items-center justify-center text-2xl font-bold font-mono shrink-0">
          {(user?.name || '?').trim().split(' ')[0]?.[0]?.toUpperCase()}
        </span>
        <div className="flex-1 w-full space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1.5">Display Name</label>
            <input id="display-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1.5">Email</label>
            <input type="text" value={user?.email || ''} readOnly className={`${field} opacity-60 cursor-not-allowed`} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-primary !py-2 !px-4" onClick={save} disabled={saving || name === user?.name}>
              {saving ? 'Saving…' : 'Update Profile'}
            </button>
          </div>
        </div>
      </div>

      <div className="agency-card p-6 !cursor-default">
        <label htmlFor="expertise" className="block text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-wider mb-2 font-mono">
          Contextual Expertise <span className="normal-case font-normal">(agents defer to you here)</span>
        </label>
        <textarea
          id="expertise"
          rows={3}
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder="e.g. Enterprise Architecture, ClickHouse optimization, Multi-tenant DB design…"
          className={`${field} resize-none`}
        />
        <p className="text-[10px] font-mono text-[var(--ink-faint)] mt-2">
          Expertise is stored as part of the workspace brand persona (edit in guardrails).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace tab — real workspace data, editable name, immutable domain
// ---------------------------------------------------------------------------
function WorkspaceTab({ workspaceId }: { workspaceId: string }) {
  const { workspace } = useCurrentWorkspace(workspaceId);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.name) setName(workspace.name);
  }, [workspace?.name]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await workspaceService.updateWorkspace(workspaceId, { name: name.trim() });
      invalidateWorkspace(workspaceId);
      notify('Workspace updated', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update workspace', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl slide-in">
      <h3 className="text-lg font-bold mb-6 font-mono">workspace_config()</h3>

      <div className="agency-card p-6 mb-6 !cursor-default space-y-4">
        <div>
          <label htmlFor="ws-name" className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1.5">Workspace Name</label>
          <div className="flex gap-2">
            <input id="ws-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            <button type="button" className="btn-primary !py-2 !px-4 shrink-0" onClick={save} disabled={saving || name === workspace?.name}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1.5">Website Domain <span className="text-[var(--ink-faint)]">(immutable)</span></label>
          <input
            type="text"
            value={workspace?.websiteDomain || ''}
            readOnly
            className={`${field} opacity-60 cursor-not-allowed`}
            style={{ borderStyle: 'dashed' }}
          />
        </div>
        {workspace?.createdAt && (
          <p className="text-[10px] font-mono text-[var(--ink-faint)]">
            created: {new Date(workspace.createdAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="agency-card p-6 !cursor-default" style={{ borderColor: 'color-mix(in srgb, var(--line-scarlet) 25%, transparent)' }}>
        <h4 className="text-sm font-bold font-mono mb-2" style={{ color: 'var(--line-scarlet)' }}>danger_zone()</h4>
        <p className="text-xs text-[var(--ink-dim)] mb-4">Delete this workspace and all associated data. This cannot be undone.</p>
        <button
          type="button"
          className="btn-outline !py-2 !px-4"
          style={{ borderColor: 'color-mix(in srgb, var(--line-scarlet) 45%, transparent)', color: 'var(--line-scarlet)' }}
          onClick={() => {
            if (!confirm(`Delete "${workspace?.name}"? All data will be removed. This cannot be undone.`)) return;
            workspaceService.deleteWorkspace(workspaceId)
              .then(() => { notify('Workspace deleted', 'success'); window.location.href = '/workspaces'; })
              .catch((err) => notify(err instanceof Error ? err.message : 'Failed to delete workspace', 'error'));
          }}
        >
          <Trash2 className="w-3 h-3" /> Delete Workspace
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members tab — real member list with role management
// ---------------------------------------------------------------------------
function MembersTab({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await memberService.listMembers(workspaceId);
      setMembers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (userId: string, role: 'editor' | 'viewer') => {
    try {
      await memberService.updateMemberRole(workspaceId, userId, { role });
      await load();
      notify('Role updated', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update role', 'error');
    }
  };

  const removeMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    try {
      await memberService.removeMember(workspaceId, userId);
      await load();
      notify('Member removed', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to remove member', 'error');
    }
  };

  const isAdmin = (m: WorkspaceMember) => m.role === 'admin';
  const isMe = (m: WorkspaceMember) => m.email === user?.email;

  return (
    <div className="max-w-2xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">user_management()</h3>
        <button type="button" onClick={load} className="text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && members.length === 0 ? (
        <div className="agency-card p-6 !cursor-default">
          <div className="skeleton h-4 rounded mb-3" style={{ width: '40%' }} />
          <div className="skeleton h-4 rounded" style={{ width: '60%' }} />
        </div>
      ) : error ? (
        <div className="agency-card p-6 !cursor-default">
          <p className="text-xs font-mono" style={{ color: 'var(--line-scarlet)' }}>{error}</p>
          <button type="button" className="btn-outline mt-3 !py-1.5 !px-3" onClick={load}>Retry</button>
        </div>
      ) : (
        <div className="plate overflow-hidden">
          {members.map((m) => (
            <div key={m.userId} className="dense-row !cursor-default">
              <span className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-8 h-8 rounded-[6px] border border-[var(--hairline)] flex items-center justify-center text-[11px] font-bold font-mono shrink-0">
                  {m.name.trim().split(' ')[0]?.[0]?.toUpperCase()}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-xs font-bold font-mono truncate">
                    {m.name} {isMe(m) && <span className="text-[var(--ink-faint)] font-normal">(you)</span>}
                  </span>
                  <span className="text-[10px] text-[var(--ink-dim)] truncate">{m.email}</span>
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {isAdmin(m) ? (
                  <span className="service-chip" style={{ ['--chip' as string]: 'var(--line-cobalt)' }}>admin</span>
                ) : isMe(m) ? (
                  <span className="service-chip" style={{ ['--chip' as string]: 'var(--ink-faint)' }}>{m.role}</span>
                ) : (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.userId, e.target.value as 'editor' | 'viewer')}
                      className="bg-transparent border border-[var(--hairline)] rounded-[4px] text-[10px] font-mono px-1.5 py-0.5 text-[var(--ink)] outline-none cursor-pointer"
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMember(m.userId, m.name)}
                      className="text-[var(--ink-faint)] hover:text-[var(--line-scarlet)] transition-colors p-1"
                      title="Remove member"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite links tab — create, copy, regenerate, revoke
// ---------------------------------------------------------------------------
function InvitesTab({ workspaceId }: { workspaceId: string }) {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await inviteLinkService.listInviteLinks(workspaceId);
      setLinks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite links');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const createLink = async (role: 'editor' | 'viewer') => {
    setCreating(true);
    try {
      await inviteLinkService.createInviteLink(workspaceId, { role });
      await load();
      notify(`Invite link created (${role})`, 'success');
    } catch (err) {
      if (err instanceof InviteLinkConflictError) {
        notify('An active link already exists for this role', 'info');
      } else {
        notify(err instanceof Error ? err.message : 'Failed to create link', 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (link: InviteLink) => {
    const url = `${window.location.origin}/accept-invite?token=${link.token}`;
    navigator.clipboard?.writeText(url).then(() => notify('Invite URL copied', 'success'));
  };

  const revokeLink = async (linkId: string) => {
    if (!confirm('Revoke this invite link? It will stop working immediately.')) return;
    try {
      await inviteLinkService.revokeInviteLink(workspaceId, linkId);
      await load();
      notify('Link revoked', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to revoke', 'error');
    }
  };

  const regenerate = async (link: InviteLink) => {
    try {
      await inviteLinkService.regenerateInviteLink(workspaceId, { role: link.role as 'editor' | 'viewer' });
      await load();
      notify('Link regenerated', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to regenerate', 'error');
    }
  };

  const activeLinks = links.filter((l) => !l.isExpired && new Date(l.expiresAt) > new Date());
  const expiredLinks = links.filter((l) => l.isExpired || new Date(l.expiresAt) <= new Date());

  return (
    <div className="max-w-2xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">invite_links()</h3>
        <div className="flex gap-2">
          <button type="button" className="btn-outline !py-1.5 !px-3 !text-[10px]" onClick={() => createLink('editor')} disabled={creating}>
            <Plus className="w-3 h-3" /> editor link
          </button>
          <button type="button" className="btn-outline !py-1.5 !px-3 !text-[10px]" onClick={() => createLink('viewer')} disabled={creating}>
            <Plus className="w-3 h-3" /> viewer link
          </button>
        </div>
      </div>

      {loading && links.length === 0 ? (
        <div className="agency-card p-6 !cursor-default">
          <div className="skeleton h-4 rounded" style={{ width: '50%' }} />
        </div>
      ) : error ? (
        <div className="agency-card p-6 !cursor-default">
          <p className="text-xs font-mono" style={{ color: 'var(--line-scarlet)' }}>{error}</p>
        </div>
      ) : activeLinks.length === 0 ? (
        <div className="agency-card p-6 !cursor-default text-center">
          <Link2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-xs font-mono text-[var(--ink-faint)]">no_active_links()</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLinks.map((link) => (
            <div key={link.id} className="agency-card p-4 !cursor-default">
              <div className="flex items-center justify-between mb-2">
                <span className="service-chip" style={{ ['--chip' as string]: link.role === 'admin' ? 'var(--line-cobalt)' : 'var(--line-green)' }}>
                  {link.role}
                </span>
                <span className="text-[10px] font-mono text-[var(--ink-faint)] tnum">
                  {link.currentUses}/{link.maxUses} used · expires {new Date(link.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] font-mono text-[var(--ink-dim)] truncate border border-[var(--hairline)] rounded-[4px] px-2 py-1.5 bg-[var(--net-tunnel)] text-[var(--terminal-text)]">
                  /accept-invite?token={link.token}
                </code>
                <button type="button" onClick={() => copyLink(link)} className="dock-icon w-7 h-7 flex items-center justify-center border border-[var(--hairline)] rounded-[5px]" title="Copy invite URL">
                  <Copy className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => regenerate(link)} className="dock-icon w-7 h-7 flex items-center justify-center border border-[var(--hairline)] rounded-[5px]" title="Regenerate">
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => revokeLink(link.id)} className="dock-icon w-7 h-7 flex items-center justify-center border border-[var(--hairline)] rounded-[5px] hover:text-[var(--line-scarlet)]" title="Revoke">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page — tabs + static demo tabs (billing, guardrails, analytics, integrations)
// ---------------------------------------------------------------------------
export default function DemoSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-8 md:px-10 py-5 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="w-6 h-6 md:w-7 md:h-7" /> Platform Settings
          </h1>
          <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-2">Manage your account, workspace, team, and preferences.</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
        <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r agency-border agency-panel p-4">
          <div className="flex md:flex-col gap-1 overflow-x-auto">
            {TABS.map((group) => (
              <div key={group.group} className="flex md:flex-col gap-1 md:mt-5 first:md:mt-1">
                <p className="hidden md:block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono mb-1.5 px-3">{group.group}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`hub-tab flex items-center gap-3 px-3 py-2 text-xs whitespace-nowrap ${tab === item.id ? 'active' : ''}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 md:overflow-y-auto p-8 md:p-10">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'workspace' && <WorkspaceTab workspaceId={workspaceId} />}
          {tab === 'members' && <MembersTab workspaceId={workspaceId} />}
          {tab === 'invites' && <InvitesTab workspaceId={workspaceId} />}

          {tab === 'billing' && (
            <div className="max-w-4xl slide-in">
              <h3 className="text-lg font-bold mb-2 font-mono">billing_info()</h3>
              <p className="text-xs text-[var(--ink-dim)] mb-6">Managed in the Agency Hub.</p>
              <div className="agency-card p-6 !cursor-default max-w-sm relative">
                <span className="absolute top-0 right-0 text-[9px] font-bold font-mono px-2 py-1 text-white rounded-bl-[8px]" style={{ background: 'var(--line-cobalt)' }}>ACTIVE</span>
                <h4 className="text-sm font-bold font-mono" style={{ color: 'var(--line-cobalt)' }}>Agency Pro</h4>
                <div className="my-4">
                  <span className="text-2xl font-bold font-mono tnum">$499</span>
                  <span className="text-xs font-mono ml-1 text-[var(--ink-dim)]">/mo</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'brand_persona' && <BrandPersonaEditor workspaceId={workspaceId} />}

          {tab === 'analytics' && (
            <div className="max-w-4xl slide-in">
              <h3 className="text-lg font-bold mb-6 font-mono">swarm_analytics()</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="agency-card p-5 !cursor-default">
                  <p className="label-rule mb-2">total_tasks_executed</p>
                  <p className="text-2xl font-bold tnum" style={{ color: 'var(--line-cobalt)' }}>1,248</p>
                  <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--line-green)' }}>↑ 12% this week</p>
                </div>
                <div className="agency-card p-5 !cursor-default">
                  <p className="label-rule mb-2">hitl_intervention_rate</p>
                  <p className="text-2xl font-bold tnum" style={{ color: 'var(--line-amber)' }}>8.4%</p>
                  <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--line-green)' }}>↓ 2.1%</p>
                </div>
                <div className="agency-card p-5 !cursor-default">
                  <p className="label-rule mb-2">compute_tokens_mtd</p>
                  <p className="text-2xl font-bold tnum">4.2M</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'data_sync' && <DataSyncSection workspaceId={workspaceId} />}

          {tab === 'integrations' && (
            <div className="max-w-4xl slide-in">
              <h3 className="text-lg font-bold mb-6 font-mono">integrations_mcp()</h3>
              <div className="agency-card p-5 flex items-center justify-between max-w-md !cursor-default">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-[6px] border border-[var(--hairline-strong)] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.05.78 2.13v3.16c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
                  </span>
                  <div>
                    <h4 className="text-sm font-bold font-mono">GitHub</h4>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--line-green)' }}>status: connected</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
