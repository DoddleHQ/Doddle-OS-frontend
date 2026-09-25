'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuthStore } from '@/lib/stores/authStore';
import { organizationService } from '@/lib/services/workspaceService';
import { groupWorkspacesByOrg } from '@/lib/utils/groupByOrg';
import type { Workspace } from '@/lib/types/workspace.types';
import { Logo } from '@/components/v2/Logo';

/*
 * /workspaces — the workspace list page.
 *
 * Workspaces are grouped under the organizations they belong to: the user's
 * own org plus any organizations they were invited to. If the user has NO
 * workspaces at all, redirect to /onboarding.
 */

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

export default function WorkspacesPage() {
  const router = useRouter();
  const { workspaces, isLoading } = useWorkspaces();
  const status = useAuthStore((s) => s.status);
  // Orgs the user owns — groups outside this set are orgs they were invited to.
  const [ownOrgIds, setOwnOrgIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    organizationService
      .listOrganizations()
      .then((orgs) => setOwnOrgIds(new Set(orgs.filter((o) => o.isOwner).map((o) => o.organizationId))))
      .catch(() => setOwnOrgIds(null));
  }, [status]);

  // No workspaces → go to onboarding (the agent creates the workspace)
  useEffect(() => {
    if (!isLoading && status === 'authenticated' && workspaces.length === 0) {
      router.replace('/onboarding');
    }
  }, [isLoading, status, workspaces.length, router]);

  // Auth loading
  if (status === 'loading' || isLoading) {
    return (
      <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
      </div>
    );
  }

  // Redirecting to onboarding
  if (workspaces.length === 0) {
    return (
      <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
      </div>
    );
  }

  const groups = groupWorkspacesByOrg(workspaces);

  return (
    <div className="v2-scope min-h-screen" style={{ background: 'var(--v2-paper-ground)' }}>
      {/* Header */}
      <header className="px-6 md:px-10 pt-12 pb-8">
        <div className="max-w-[720px] mx-auto">
          <Link href="/" className="v2-display text-[1.25rem] block mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
            <Logo variant="wordmark" theme="light" />
          </Link>
          <h1 className="v2-display text-[clamp(1.75rem,4vw,2.5rem)]" style={{ color: 'var(--v2-paper-ink)' }}>
            Your Workspaces
          </h1>
          <p className="v2-mono text-[12px] mt-1" style={{ color: 'var(--v2-paper-ink-2)' }}>
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} · select one to enter
          </p>
        </div>
      </header>

      {/* Workspace cards, grouped by organization */}
      <main className="px-6 md:px-10 pb-20">
        <div className="max-w-[720px] mx-auto">
          {groups.map((group) => {
            const invited = ownOrgIds !== null && !ownOrgIds.has(group.organizationId);
            // A lone org needs no header — it would only detach the section
            // from the "Your Workspaces" title above it.
            const singleOrg = groups.length === 1;
            return (
              <section key={group.organizationId} className="mb-8">
                <div className={`flex items-center gap-2.5 mb-3 ${singleOrg ? 'hidden' : ''}`}>
                  <h2 className="v2-mono text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                    {group.organizationName}
                  </h2>
                  {invited && (
                    <span
                      className="v2-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[4px]"
                      style={{ color: 'var(--v2-vermilion)', border: '1px solid rgba(200,50,27,0.25)' }}
                    >
                      Invited
                    </span>
                  )}
                  <span className="flex-1 h-px" style={{ background: 'var(--v2-paper-rule)' }} aria-hidden="true" />
                  <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                    {group.workspaces.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.workspaces.map((ws, i) => (
                    <WorkspaceCard key={ws.workspaceId} ws={ws} index={i} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Create another workspace */}
          <Link
            href="/onboarding"
            className="flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-colors mt-4 group"
            style={{ border: '1px dashed var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink-2)' }}
          >
            <span className="v2-mono text-[13px]">Create new workspace</span>
            <ArrowRight className="w-4 h-4 ml-auto transition-transform group-hover:translate-x-1" style={{ color: 'var(--v2-vermilion)' }} />
          </Link>
        </div>
      </main>
    </div>
  );
}

/* === Workspace Card === */
function WorkspaceCard({ ws, index }: { ws: Workspace; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: PREMIUM_EASE }}
    >
      <Link
        href={`/workspaces/${ws.workspaceId}`}
        className="flex items-center justify-between gap-4 p-4 rounded-[10px] transition-all hover:translate-y-[-1px] group"
        style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid var(--v2-paper-rule)' }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 font-semibold text-[14px]"
            style={{ background: 'rgba(200,50,27,0.06)', border: '1px solid rgba(200,50,27,0.12)', color: 'var(--v2-vermilion)' }}
          >
            {(ws.name || 'W').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--v2-paper-ink)' }}>
              {ws.name || 'Untitled Workspace'}
            </h3>
            <div className="flex items-center gap-2 min-w-0">
              {ws.websiteDomain && (
                <p className="v2-mono text-[11px] truncate" style={{ color: 'var(--v2-paper-ink-2)' }}>
                  {ws.websiteDomain}
                </p>
              )}
              {ws.yourRole && (
                <span
                  className="v2-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[4px] shrink-0"
                  style={{ color: 'var(--v2-paper-ink-2)', border: '1px solid var(--v2-paper-rule)' }}
                >
                  {ws.yourRole}
                </span>
              )}
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: 'var(--v2-vermilion)' }} />
      </Link>
    </motion.div>
  );
}
