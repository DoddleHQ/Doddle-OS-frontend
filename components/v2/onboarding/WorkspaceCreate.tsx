'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { FlowingThreads } from '@/components/v2/FlowingThreads';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { organizationService, type OrganizationEntry } from '@/lib/services/workspaceService';
import { normalizeDomain } from '@/lib/utils/domain';
import { Logo } from '@/components/v2/Logo';

const EASE = [0.4, 0, 0.2, 1] as const;

export function WorkspaceCreate() {
  const router = useRouter();
  const { createWorkspace } = useWorkspaces();
  const { refresh: refreshAuth } = useAuth();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrganizationEntry[]>([]);
  const [orgId, setOrgId] = useState<string>('');

  useEffect(() => {
    organizationService
      .listOrganizations()
      .then((list) => {
        const owned = list.filter((o) => o.isOwner);
        setOrgs(owned);
        if (owned[0]) setOrgId(owned[0].organizationId);
      })
      .catch(() => setOrgs([]));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a workspace name');
      return;
    }
    setError(null);
    setCreating(true);

    try {
      const domain = url.trim() ? normalizeDomain(url.trim()) : undefined;
      const ws = await createWorkspace(name.trim(), domain, undefined, orgId || undefined);

      try {
        await Promise.race([
          refreshAuth(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {}

      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      setCreating(false);
    }
  }, [name, url, orgId, createWorkspace, refreshAuth, router]);

  return (
    <div className="v2-scope min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
        <FlowingThreads />
      </div>
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ top: '-15%', right: '-10%', width: '40vw', height: '40vh', background: 'var(--v2-vermilion)', filter: 'blur(140px)' }}
        animate={{ opacity: [0.02, 0.04, 0.02] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <header className="flex-shrink-0 px-6 md:px-10 pt-8 relative z-10">
        <div className="max-w-[480px] mx-auto">
          <Link href="/" className="v2-display text-[1.125rem]" style={{ color: 'var(--v2-paper-ink)' }}>
            <Logo variant="wordmark" theme="light" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 md:px-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-[420px]"
        >
          <h1
            className="v2-display text-[clamp(1.75rem,4vw,2.5rem)] mb-2"
            style={{ color: 'var(--v2-paper-ink)' }}
          >
            Create your workspace.
          </h1>
          <p
            className="text-[14px] leading-[1.55] mb-8"
            style={{ color: 'var(--v2-paper-ink-2)' }}
          >
            Set up in seconds. You can configure your brand persona and data
            connections later from inside the workspace.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-[12px] font-medium mb-1.5"
                style={{ color: 'var(--v2-paper-ink)' }}
              >
                Workspace name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Marketing"
                disabled={creating}
                autoFocus
                className="w-full px-3.5 py-3 text-[14px] outline-none rounded-[10px] v2-auth-input"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid var(--v2-paper-rule)',
                  color: 'var(--v2-paper-ink)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-[12px] font-medium mb-1.5"
                style={{ color: 'var(--v2-paper-ink)' }}
              >
                Website URL <span style={{ color: 'var(--v2-paper-ink-2)' }}>(optional)</span>
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com"
                disabled={creating}
                className="w-full px-3.5 py-3 text-[14px] outline-none rounded-[10px] v2-auth-input"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid var(--v2-paper-rule)',
                  color: 'var(--v2-paper-ink)',
                }}
              />
              <p className="v2-mono text-[10px] mt-1.5" style={{ color: 'var(--v2-paper-ink-2)' }}>
                Any format works — we&apos;ll extract the domain automatically.
              </p>
            </div>

            {orgs.length > 1 && (
              <div>
                <label
                  className="block text-[12px] font-medium mb-1.5"
                  style={{ color: 'var(--v2-paper-ink)' }}
                >
                  Organization
                </label>
                <select
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  disabled={creating}
                  className="w-full px-3.5 py-3 text-[14px] outline-none rounded-[10px] v2-auth-input"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid var(--v2-paper-rule)',
                    color: 'var(--v2-paper-ink)',
                  }}
                >
                  {orgs.map((o) => (
                    <option key={o.organizationId} value={o.organizationId}>
                      {o.name}{o.isOwner ? '' : ' — invited'}
                    </option>
                  ))}
                </select>
                <p className="v2-mono text-[10px] mt-1.5" style={{ color: 'var(--v2-paper-ink-2)' }}>
                  The workspace will belong to the selected organization.
                </p>
              </div>
            )}

            {error && (
              <p className="text-[12px]" style={{ color: 'var(--v2-vermilion)' }}>{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={creating || !name.trim()}
              whileHover={{ scale: creating || !name.trim() ? 1 : 1.01 }}
              whileTap={{ scale: creating || !name.trim() ? 1 : 0.99 }}
              transition={{ duration: 0.15, ease: EASE }}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 v2-label text-[12px] rounded-[10px]"
              style={{
                background: name.trim() ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
                color: 'var(--v2-vermilion-ink)',
                opacity: creating ? 0.7 : 1,
                boxShadow: name.trim() ? '0 4px 14px rgba(200,50,27,0.2)' : 'none',
              }}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
