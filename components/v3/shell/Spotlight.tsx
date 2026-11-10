'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Play, Inbox, Building2, BarChart3, ListChecks, BookOpen, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { LayoutDashboard, Terminal, Layers, Bot } from 'lucide-react';

interface SpotItem {
  key: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  hint?: string;
  run(): void;
}

export function Spotlight() {
  const router = useRouter();
  const open = useV3OS((s) => s.spotlightOpen);
  const [q, setQ] = useState('');

  const items = useMemo<SpotItem[]>(() => {
    const go = (p: string) => () => router.push(p);
    return [
      { key: 'home dashboard status reviews', label: 'Home — status & reviews', icon: LayoutDashboard, color: '#1d4ed8', hint: '1', run: go('/') },
      { key: 'launchpad choose graph agent describe outcome', label: 'Launchpad — what to launch?', icon: Terminal, color: 'var(--cyan)', hint: '2', run: go('/launchpad') },
      { key: 'blueprint library catalog playbook sop template', label: 'Blueprints — library', icon: BookOpen, color: 'var(--green)', run: go('/blueprints') },
      { key: 'agent contextual roster helper writer data', label: 'Agents — contextual roster', icon: Bot, color: 'var(--violet)', hint: '3', run: go('/agents') },
      { key: 'project task assignment review start', label: 'Assignments — in progress + review', icon: Layers, color: 'var(--green)', hint: '4', run: go('/assignments') },
      { key: 'hub settings billing workspace', label: 'Agency Hub', icon: Building2, color: 'var(--amber)', hint: '5', run: go('/?open=hub') },
      { key: 'run new execute campaign', label: '/run — start execution', icon: Play, color: '#10b981', run: go('/launchpad') },
      { key: 'triage queue review approve inbox active execution', label: 'Active Execution — everything in flight', icon: Activity, color: 'var(--accent)', run: go('/assignments') },
      { key: 'triage queue review approve inbox', label: 'Triage Queue (needs you)', icon: Inbox, color: '#f87171', run: go('/triage') },
      { key: 'report analytics gallery board export', label: 'Reports — gallery + analytics', icon: BarChart3, color: 'var(--accent)', hint: '6', run: go('/reports') },
      { key: 'task assign agent human active inventory', label: 'Tasks — route to agent or human', icon: ListChecks, color: 'var(--violet)', hint: '7', run: go('/assignments?open=assign') },
    ];
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => (it.key + ' ' + it.label).toLowerCase().includes(needle));
  }, [items, q]);

  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  if (!open) return null;

  const runItem = (it: SpotItem) => {
    it.run();
    useV3OS.getState().toggleSpot(false);
  };

  return (
    <div
      className="overlay"
      data-testid="spotlight-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) useV3OS.getState().toggleSpot(false);
      }}
    >
      <div className="spot glass p-2">
        <div className="flex items-center gap-2 px-2">
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && visible[0]) runItem(visible[0]);
            }}
            placeholder="Spotlight — apps, actions, outcomes…  (1–7 to jump)"
            aria-label="Spotlight search"
          />
        </div>
        <div className="p-2 space-y-1">
          {visible.map((it) => (
            <button key={it.label} className="spot-item" onClick={() => runItem(it)}>
              <it.icon size={16} style={{ color: it.color ?? 'var(--muted)' }} />
              {it.label}
              {it.hint ? <span className="chip ml-auto">{it.hint}</span> : null}
            </button>
          ))}
          {visible.length === 0 && (
            <p className="font-mono text-xs px-4 py-3" style={{ color: 'var(--muted)' }}>
              No matches — try “agent”, “run”, “review”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
