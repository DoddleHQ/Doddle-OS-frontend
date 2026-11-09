'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { threadService } from '@/lib/services/threadService';
import type { AuditThread } from '@/lib/types/thread.types';
import { SwarmBadge } from '../primitives';

export function RunningProcesses({ workspaceId }: { workspaceId: string }) {
  const [threads, setThreads] = useState<AuditThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    threadService.listThreads(workspaceId, { moduleId: 'content-factory', limit: 20 })
      .then((list) => { if (mounted) setThreads(list); })
      .catch(() => { if (mounted) setThreads([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [workspaceId]);

  return (
    <div className="flex flex-col lg:flex-[2.5] plate">
      <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between shrink-0">
        <h3 className="text-xs font-semibold flex items-center gap-2.5 font-mono tracking-wide">
          <FileText className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> Threads
        </h3>
        <Link
          href={`/legacy/workspaces/${workspaceId}/modules/content-factory`}
          className="text-[11px] font-mono text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors"
        >
          View All
        </Link>
      </div>
      <div>
        {loading && threads.length === 0 ? (
          <div className="dense-row !cursor-default">
            <span className="flex-1"><span className="block h-4 w-40 rounded skeleton" /></span>
          </div>
        ) : threads.length === 0 ? (
          <div className="dense-row !cursor-default">
            <span className="flex-1 text-xs text-[var(--ink-faint)]">
              No threads yet — start a conversation with an agent above
            </span>
          </div>
        ) : (
          threads.slice(0, 8).map((t) => (
            <Link
              key={t.id}
              href={`/legacy/workspaces/${workspaceId}/modules/${t.moduleId}`}
              className="dense-row"
            >
              <span className="w-[38%] flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">{t.title || 'Untitled'}</span>
                <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-1 truncate">{t.moduleId}</span>
              </span>
              <span className="w-[22%]">
                <SwarmBadge status={t.status === 'error' ? 'halted' : t.status === 'complete' ? 'completed' : t.status} />
              </span>
              <span className="w-[20%] text-[10px] font-mono text-[var(--ink-dim)]">
                {t.docCount} artifacts
              </span>
              <span className="w-[20%] text-[10px] font-mono text-[var(--ink-faint)] text-right truncate">
                {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
