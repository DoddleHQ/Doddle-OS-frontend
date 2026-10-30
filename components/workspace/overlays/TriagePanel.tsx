'use client';

import { useRouter } from 'next/navigation';
import { Inbox, X } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { threadHref, useAttentionThreads } from '@/lib/hooks/usePanelData';
import type { AuditThread } from '@/lib/types/thread.types';

function TriageCard({ thread, workspaceId }: { thread: AuditThread; workspaceId: string }) {
  const router = useRouter();
  const date = thread.updatedAt ?? thread.createdAt;

  return (
    <div
      className="agency-card p-5 !cursor-default slide-in"
      style={{
        borderColor: 'color-mix(in srgb, var(--line-scarlet) 35%, transparent)',
        background: 'color-mix(in srgb, var(--line-scarlet) 4%, transparent)',
      }}
    >
      <span
        className="inline-block mb-3 text-[10px] font-bold font-mono px-2 py-0.5 rounded-[3px] border"
        style={{
          color: 'var(--line-scarlet)',
          borderColor: 'color-mix(in srgb, var(--line-scarlet) 45%, transparent)',
          background: 'color-mix(in srgb, var(--line-scarlet) 10%, transparent)',
        }}
      >
        HALTED
      </span>
      <h3 className="text-sm font-bold mb-1 font-mono">{thread.title || 'Untitled'}</h3>
      <p className="text-xs text-[var(--ink-dim)] mb-4 leading-relaxed">
        {thread.moduleId} · {date ? new Date(date).toLocaleDateString() : 'date unknown'}
      </p>
      <button
        type="button"
        className="w-full py-1.5 rounded-[3px] text-xs font-bold font-mono text-white transition-transform hover:brightness-110"
        style={{ background: 'var(--line-scarlet)' }}
        onClick={() => router.push(threadHref(workspaceId, thread))}
      >
        Open Thread
      </button>
    </div>
  );
}

export function TriagePanel({ workspaceId }: { workspaceId: string }) {
  const open = useOS((s) => s.triageOpen);
  const setOverlay = useOS((s) => s.setOverlay);
  const { threads, loading } = useAttentionThreads(workspaceId, open);

  return (
    <div className={`side-panel ${open ? 'open' : ''} absolute top-0 right-0 bottom-0 w-[420px] agency-panel z-[70] flex flex-col`}>
      <div className="p-6 border-b agency-border flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 font-mono">
          <Inbox className="w-4 h-4" style={{ color: 'var(--line-scarlet)' }} /> Triage
        </h2>
        <button type="button" onClick={() => setOverlay('triageOpen', false)} className="text-[var(--ink-dim)] hover:text-[var(--ink)]" aria-label="Close triage">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <>
            <div className="agency-card p-5"><div className="skeleton h-4 rounded mb-3" style={{ width: '40%' }} /><div className="skeleton h-3 rounded" /></div>
            <div className="agency-card p-5"><div className="skeleton h-4 rounded mb-3" style={{ width: '55%' }} /><div className="skeleton h-3 rounded" /></div>
          </>
        ) : threads.length === 0 ? (
          <div className="text-center text-[var(--ink-faint)] mt-10">
            <Inbox className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-xs font-mono px-4 leading-relaxed">All clear.<br />Threads that halt with an error will land here for review.</p>
          </div>
        ) : (
          threads.map((t) => <TriageCard key={t.id} thread={t} workspaceId={workspaceId} />)
        )}
      </div>
    </div>
  );
}
