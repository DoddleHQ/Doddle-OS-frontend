'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { WORKSPACE_MODULES as MODULES } from '@/components/v2/dashboard/modules';
import type { ModuleId } from '@/lib/types/thread.types';

/*
 * Workspace landing — health-aware module list.
 *
 * Previously a static 3-col grid of link cards with no data. Redesigned as
 * a denser row list: each row shows the module name, description, and a
 * right-aligned thread count (fetched per module, falls back to — gracefully).
 *
 * Operate mode: no cards (use spacing + hairlines instead), one primary
 * action per row (click to open the module), hover = subtle vermilion tint.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

// Map WORKSPACE_MODULES paths to the backend's ModuleId union.
// Modules without a backend module get undefined (thread count hidden).
const MODULE_ID_MAP: Partial<Record<string, ModuleId>> = {
  'modules/business-audit': 'business-audit',
  'modules/seo-cluster': 'seo-cluster',
  'modules/content-factory': 'content-factory',
  'modules/social-growth': 'social-growth',
  'modules/saas-launch-ops': 'saas-launch-ops',
  'modules/analytics-action': 'analytics-action',
};

interface ThreadCount {
  count: number | null; // null = fetch failed or no backend module
  loading: boolean;
}

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [threadCounts, setThreadCounts] = useState<Record<string, ThreadCount>>({});

  useEffect(() => {
    // Fetch thread counts in parallel for modules with a backend ID.
    // Failures are swallowed (count shows —) so a single module's backend
    // issue doesn't break the whole grid.
    const entries = MODULES.filter((m) => MODULE_ID_MAP[m.path]);
    if (entries.length === 0) return;

    // Mark all as loading
    setThreadCounts((prev) => {
      const next = { ...prev };
      entries.forEach((m) => {
        next[m.path] = { count: null, loading: true };
      });
      return next;
    });

    entries.forEach(async (m) => {
      const moduleId = MODULE_ID_MAP[m.path];
      if (!moduleId) return;
      try {
        // threadService is imported dynamically to keep this page thin and
        // avoid pulling ThreadContext into the module grid.
        const { threadService } = await import('@/lib/services/threadService');
        const threads = await threadService.listThreads(workspaceId, {
          moduleId,
          skip: 0,
          limit: 100,
        });
        setThreadCounts((prev) => ({
          ...prev,
          [m.path]: { count: threads.length, loading: false },
        }));
      } catch {
        setThreadCounts((prev) => ({
          ...prev,
          [m.path]: { count: null, loading: false },
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <div className="p-5 md:p-6">
      <motion.h2
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        style={{
          fontFamily: 'var(--v2-font-sans)',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--v2-paper-ink)',
          letterSpacing: '-0.01em',
          marginBottom: '0.25rem',
        }}
      >
        Modules
      </motion.h2>
      <p
        className="v2-mono"
        style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1.25rem' }}
      >
        {MODULES.length} available
      </p>

      {/* Module list — rows, not cards. Hairline separators. */}
      <div>
        {MODULES.map((mod, i) => {
          const Icon = mod.icon;
          const tc = threadCounts[mod.path];
          const showCount = MODULE_ID_MAP[mod.path] && tc && !tc.loading && tc.count !== null;

          return (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.1), ease: EASE }}
            >
              <Link
                href={`/workspaces/${workspaceId}/${mod.path}`}
                className="flex items-center gap-3 px-3 py-3 rounded-[8px] transition-colors group"
                style={{
                  borderBottom:
                    i < MODULES.length - 1 ? '1px solid var(--v2-paper-rule)' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(200,50,27,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                >
                  <Icon
                    className="w-4 h-4"
                    strokeWidth={1.75}
                    style={{ color: 'var(--v2-paper-ink-2)' }}
                  />
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div
                    style={{
                      fontFamily: 'var(--v2-font-sans)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: 'var(--v2-paper-ink)',
                      lineHeight: 1.3,
                    }}
                  >
                    {mod.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v2-font-sans)',
                      fontSize: '0.72rem',
                      color: 'var(--v2-paper-ink-2)',
                      lineHeight: 1.3,
                      marginTop: '0.125rem',
                    }}
                  >
                    {mod.desc}
                  </div>
                </div>

                {/* Thread count (right-aligned) */}
                {MODULE_ID_MAP[mod.path] && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tc?.loading ? (
                      <span
                        className="v2-mono tabular-nums"
                        style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)', opacity: 0.5 }}
                      >
                        ···
                      </span>
                    ) : showCount ? (
                      <span className="v2-mono tabular-nums" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                        {tc!.count === 0 ? 'No threads' : `${tc!.count} thread${tc!.count !== 1 ? 's' : ''}`}
                      </span>
                    ) : tc && !tc.loading && tc.count === null ? (
                      <span className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)', opacity: 0.4 }}>
                        —
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Arrow (appears on hover) */}
                <ArrowRight
                  className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--v2-vermilion)' }}
                />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
