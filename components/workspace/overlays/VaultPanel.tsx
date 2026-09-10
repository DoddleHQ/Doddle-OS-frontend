'use client';

import { useState } from 'react';
import { FolderArchive, X } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import type { ThreadStatus } from '@/lib/demo/types';

const STATUS_DOT: Record<ThreadStatus, string> = {
  done: 'var(--line-green)',
  failed: 'var(--line-scarlet)',
  aborted: 'var(--line-amber)',
  running: 'var(--line-cobalt)',
  queued: 'var(--ink-faint)',
};

function VaultCard({ run }: { run: { id: string; ts: string; prompt: string; results: Record<string, ThreadStatus>; artifact: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="agency-card p-5 !cursor-default">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">{run.ts}</span>
        <div className="flex gap-1.5">
          {Object.values(run.results).map((s, i) => (
            <span key={i} className="w-2 h-2 rounded-full" style={{ background: STATUS_DOT[s] }} />
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed mb-3">{run.prompt}</p>
      <button type="button" className="btn-outline !py-1 !px-2 !rounded-[3px]" onClick={() => setOpen((v) => !v)}>
        Inspect Artifact
      </button>
      {open && (
        <pre className="terminal-container mt-3 text-[10px]"><code>{run.artifact}</code></pre>
      )}
    </div>
  );
}

export function VaultPanel() {
  const open = useOS((s) => s.vaultOpen);
  const vault = useOS((s) => s.vault);
  const setOverlay = useOS((s) => s.setOverlay);

  return (
    <div className={`side-panel ${open ? 'open' : ''} absolute top-0 right-0 bottom-0 w-[420px] agency-panel z-[70] flex flex-col`}>
      <div className="p-6 border-b agency-border flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 font-mono">
          <FolderArchive className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> artifact_vault
        </h2>
        <button type="button" onClick={() => setOverlay('vaultOpen', false)} className="text-[var(--ink-dim)] hover:text-[var(--ink)]" aria-label="Close vault">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {vault.length === 0 ? (
          <div className="text-center text-[var(--ink-faint)] mt-10">
            <FolderArchive className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-xs font-mono px-4 leading-relaxed">
              No archived runs yet.<br />Execute a campaign, then press new_run — every run lands here.
            </p>
          </div>
        ) : (
          vault.map((run) => <VaultCard key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
