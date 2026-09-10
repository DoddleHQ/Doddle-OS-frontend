'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { startRun } from '@/lib/demo/engine';
import { DEFAULT_RUN_PROMPT } from '@/lib/demo/data';
import { DemoIcon } from '@/lib/demo/icons';

interface Cmd {
  icon: string;
  ink?: string;
  label: string;
  run: () => void;
}

function buildCommands(navigate: (path: string) => void, workspaceId: string): Cmd[] {
  const base = `/workspaces/${workspaceId}`;
  const routes: Cmd[] = [
    { icon: 'layout-dashboard', label: 'go: dashboard', run: () => navigate(base) },
    { icon: 'terminal', label: 'go: launchpad', run: () => navigate(`${base}/launchpad`) },
    { icon: 'zap', label: 'go: power_agents', run: () => navigate(`${base}/power-agents`) },
    { icon: 'folder-tree', label: 'go: graphs', run: () => navigate(`${base}/graphs`) },
    { icon: 'building-2', label: 'go: agency_hub', run: () => navigate(`${base}/agency-hub`) },
    { icon: 'settings', label: 'go: platform_settings', run: () => navigate(`${base}/settings`) },
    { icon: 'inbox', label: 'Open Triage Queue', run: () => useOS.getState().setOverlay('triageOpen', true) },
    { icon: 'folder-archive', label: 'Open Artifact Vault', run: () => useOS.getState().setOverlay('vaultOpen', true) },
    { icon: 'play', label: 'Run Demo Swarm', run: () => { void startRun(DEFAULT_RUN_PROMPT); } },
  ];
  const s = useOS.getState();
  if (s.runStartedAt) {
    for (const t of Object.values(s.threads)) {
      routes.push({
        icon: 'route',
        label: `thread: ${t.title} · ${t.status}`,
        run: () => navigate(`/workspaces/${workspaceId}/launchpad`),
      });
    }
  }
  return routes;
}

interface CommandPaletteProps {
  workspaceId: string;
}

export function CommandPalette({ workspaceId }: CommandPaletteProps) {
  const open = useOS((s) => s.paletteOpen);
  const setOverlay = useOS((s) => s.setOverlay);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const threads = useOS((s) => s.threads);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = (path: string) => router.push(path);

  const items = useMemo(() => {
    const all = buildCommands(navigate, workspaceId);
    const q = query.trim().toLowerCase();
    return q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, runStartedAt, threads, workspaceId]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => { setIndex(0); }, [query]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = items.length;
      if (!n) return;
      setIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = items[index];
      if (cmd) {
        setOverlay('paletteOpen', false);
        setTimeout(cmd.run, 60);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24"
      style={{ background: 'rgba(6, 11, 26, 0.6)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOverlay('paletteOpen', false); }}
    >
      <div className="plate w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b agency-border">
          <Command className="w-4 h-4 text-[var(--ink-dim)]" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-4 text-sm font-mono outline-none text-[var(--ink)] placeholder-[var(--ink-faint)]"
            placeholder="Type a command…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
          <kbd className="text-[9px] font-mono text-[var(--ink-faint)] border agency-border rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs font-mono text-[var(--ink-faint)]">No matching commands</div>
          ) : (
            items.map((c, i) => (
              <button
                key={c.label + i}
                type="button"
                className={`cmdk-item ${i === index ? 'sel' : ''} w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-colors`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => { setOverlay('paletteOpen', false); setTimeout(c.run, 60); }}
              >
                <span className="w-4 flex justify-center shrink-0">
                  {c.ink ? <span className="w-2 h-2 rounded-full" style={{ background: c.ink }} /> : <DemoIcon name={c.icon} className="w-3.5 h-3.5 text-[var(--ink-dim)]" />}
                </span>
                <span className="text-xs font-mono text-[var(--ink)]">{c.label}</span>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t agency-border flex gap-4 text-[9px] font-mono text-[var(--ink-faint)]">
          <span>↑↓ navigate</span><span>↵ run</span><span>g+1…6 views</span><span>⌘K palette</span>
        </div>
      </div>
    </div>
  );
}
