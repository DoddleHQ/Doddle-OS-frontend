'use client';

import { useState } from 'react';
import { FolderArchive, X } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { useRecentArtifacts, type VaultArtifact } from '@/lib/hooks/usePanelData';

function VaultCard({ artifact }: { artifact: VaultArtifact }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="agency-card p-5 !cursor-default">
      <div className="flex justify-between items-baseline mb-2 gap-3">
        <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum shrink-0">
          {new Date(artifact.createdAt).toLocaleDateString()}
        </span>
        <span className="text-[9px] font-mono text-[var(--ink-dim)] truncate">{artifact.threadTitle}</span>
      </div>
      <p className="text-xs font-bold font-mono mb-1">{artifact.pageName || 'Artifact'}</p>
      <p className="text-[10px] font-mono text-[var(--ink-faint)] mb-3">{artifact.moduleId}</p>
      <button type="button" className="btn-outline !py-1 !px-2 !rounded-[3px]" onClick={() => setOpen((v) => !v)}>
        {open ? 'Collapse' : 'Inspect'}
      </button>
      {open && (
        <pre className="terminal-container mt-3 text-[10px]">
          <code>{artifact.content || JSON.stringify(artifact.data, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}

export function VaultPanel({ workspaceId }: { workspaceId: string }) {
  const open = useOS((s) => s.vaultOpen);
  const setOverlay = useOS((s) => s.setOverlay);
  const { artifacts, loading } = useRecentArtifacts(workspaceId, open);

  return (
    <div className={`side-panel ${open ? 'open' : ''} absolute top-0 right-0 bottom-0 w-[420px] agency-panel z-[70] flex flex-col`}>
      <div className="p-6 border-b agency-border flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 font-mono">
          <FolderArchive className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> Artifact Vault
        </h2>
        <button type="button" onClick={() => setOverlay('vaultOpen', false)} className="text-[var(--ink-dim)] hover:text-[var(--ink)]" aria-label="Close vault">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <>
            <div className="agency-card p-5"><div className="skeleton h-4 rounded mb-2" style={{ width: '50%' }} /><div className="skeleton h-3 rounded" /></div>
            <div className="agency-card p-5"><div className="skeleton h-4 rounded mb-2" style={{ width: '35%' }} /><div className="skeleton h-3 rounded" /></div>
          </>
        ) : artifacts.length === 0 ? (
          <div className="text-center text-[var(--ink-faint)] mt-10">
            <FolderArchive className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-xs font-mono px-4 leading-relaxed">No artifacts yet.<br />Completed agent runs will appear here.</p>
          </div>
        ) : (
          artifacts.map((a) => <VaultCard key={String(a.id)} artifact={a} />)
        )}
      </div>
    </div>
  );
}
