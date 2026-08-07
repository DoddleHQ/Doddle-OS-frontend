'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowRight, Loader2, Globe } from 'lucide-react';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Workspace } from '@/lib/types/workspace.types';

/*
 * /workspaces — the workspace list + creation page.
 *
 * This is the landing page for users with no workspaces (or managing multiple).
 * Shows existing workspace cards + a prominent "Create Workspace" affordance.
 * In v2 Specimen Terminal design: paper register, vermilion accents.
 *
 * The login page redirects here when a user has no workspaces.
 */

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

export default function WorkspacesPage() {
  const router = useRouter();
  const { workspaces, isLoading, createWorkspace } = useWorkspaces();
  const { status } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [websiteDomain, setWebsiteDomain] = useState('');
  const [error, setError] = useState('');

  // If auth still loading, wait
  if (status === 'loading') {
    return (
      <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter a workspace name'); return; }
    setError('');
    setCreating(true);
    try {
      const ws = await createWorkspace(name.trim(), websiteDomain.trim() || undefined);
      router.push(`/workspaces/${ws.workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      setCreating(false);
    }
  };

  return (
    <div className="v2-scope min-h-screen" style={{ background: 'var(--v2-paper-ground)' }}>
      {/* Header */}
      <header className="px-6 md:px-10 pt-12 pb-8">
        <div className="max-w-[720px] mx-auto">
          <Link href="/" className="v2-display text-[1.25rem] block mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
            Doddle OS
          </Link>
          <h1 className="v2-display text-[clamp(1.75rem,4vw,2.5rem)]" style={{ color: 'var(--v2-paper-ink)' }}>
            Your Workspaces
          </h1>
          <p className="v2-mono text-[12px] mt-1" style={{ color: 'var(--v2-paper-ink-2)' }}>
            {workspaces.length > 0
              ? `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''} · select one or create a new strategic unit`
              : 'Create your first workspace to start deploying AI agents'}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 md:px-10 pb-20">
        <div className="max-w-[720px] mx-auto">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
            </div>
          )}

          {/* Workspace cards */}
          {!isLoading && workspaces.length > 0 && (
            <div className="space-y-2 mb-6">
              {workspaces.map((ws, i) => (
                <WorkspaceCard key={ws.workspaceId} ws={ws} index={i} />
              ))}
            </div>
          )}

          {/* Empty state or create button */}
          {!isLoading && (
            <>
              {workspaces.length === 0 && !showCreate && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: PREMIUM_EASE }}
                  className="text-center py-12"
                >
                  <div
                    className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(200,50,27,0.06)', border: '1px solid rgba(200,50,27,0.15)' }}
                  >
                    <Plus className="w-7 h-7" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />
                  </div>
                  <p className="text-[15px] mb-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
                    No workspaces yet. Create your first one to begin.
                  </p>
                </motion.div>
              )}

              {/* Create workspace form */}
              <AnimatePresence mode="wait">
                {showCreate ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: PREMIUM_EASE }}
                    className="overflow-hidden"
                  >
                    <form
                      onSubmit={handleCreate}
                      className="p-5 rounded-[12px] mb-4"
                      style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid var(--v2-paper-rule)' }}
                    >
                      {/* Name */}
                      <div className="mb-4">
                        <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--v2-paper-ink)' }}>
                          Workspace Name
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Acme Marketing, Q3 Launch"
                          disabled={creating}
                          autoFocus
                          className="w-full px-3.5 py-2.5 text-[14px] outline-none rounded-[8px] transition-all v2-auth-input"
                          style={{
                            color: 'var(--v2-paper-ink)',
                            background: 'rgba(255,255,255,0.4)',
                            border: '1px solid var(--v2-paper-rule-strong)',
                            borderRadius: '8px',
                          }}
                        />
                      </div>

                      {/* Domain */}
                      <div className="mb-4">
                        <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--v2-paper-ink)' }}>
                          Website Domain <span style={{ color: 'var(--v2-paper-ink-2)' }}>(optional)</span>
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--v2-paper-ink-2)' }} />
                          <input
                            value={websiteDomain}
                            onChange={(e) => setWebsiteDomain(e.target.value)}
                            placeholder="example.com"
                            disabled={creating}
                            className="w-full pl-9 pr-3.5 py-2.5 text-[14px] outline-none rounded-[8px] transition-all"
                            style={{
                              color: 'var(--v2-paper-ink)',
                              background: 'rgba(255,255,255,0.4)',
                              border: '1px solid var(--v2-paper-rule-strong)',
                              borderRadius: '8px',
                            }}
                          />
                        </div>
                        <p className="v2-mono text-[10px] mt-1" style={{ color: 'var(--v2-paper-ink-2)' }}>
                          Primary website domain. Cannot be changed after creation.
                        </p>
                      </div>

                      {/* Error */}
                      {error && (
                        <p className="text-[12px] mb-3" style={{ color: 'var(--v2-vermilion)' }}>{error}</p>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowCreate(false); setError(''); setName(''); setWebsiteDomain(''); }}
                          disabled={creating}
                          className="flex-1 px-4 py-2.5 text-[13px] font-medium rounded-[8px] transition-colors"
                          style={{ border: '1px solid var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creating || !name.trim()}
                          className="flex-1 px-4 py-2.5 v2-label text-[11px] rounded-[8px] transition-all"
                          style={{
                            background: 'var(--v2-vermilion)',
                            color: 'var(--v2-vermilion-ink)',
                            opacity: creating || !name.trim() ? 0.5 : 1,
                            cursor: creating || !name.trim() ? 'default' : 'pointer',
                          }}
                        >
                          {creating ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                            </span>
                          ) : 'Create Workspace'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.button
                    key="create-btn"
                    onClick={() => setShowCreate(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-colors"
                    style={{
                      border: '1px dashed var(--v2-paper-rule-strong)',
                      color: 'var(--v2-paper-ink-2)',
                    }}
                  >
                    <Plus className="w-4 h-4" style={{ color: 'var(--v2-vermilion)' }} />
                    <span className="text-[14px]">Create New Workspace</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </>
          )}
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
        href={`/workspaces/${ws.workspaceId}/mission-control`}
        className="flex items-center justify-between gap-4 p-4 rounded-[10px] transition-all hover:translate-y-[-1px] group"
        style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid var(--v2-paper-rule)' }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Initial */}
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
            {ws.websiteDomain && (
              <p className="v2-mono text-[11px] truncate" style={{ color: 'var(--v2-paper-ink-2)' }}>
                {ws.websiteDomain}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: 'var(--v2-vermilion)' }} />
      </Link>
    </motion.div>
  );
}
