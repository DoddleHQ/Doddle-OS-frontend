'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Play, Inbox, SunMoon, Building2, BarChart3, ListChecks, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useV3OS, type WindowId } from '@/lib/v3/osStore';
import { LayoutDashboard, Terminal, Layers, Bot } from 'lucide-react';
import { isV3SessionUnread } from '@/lib/v3/data';

const APP_BUTTONS: { id: WindowId; title: string; icon: typeof Bot; color: string }[] = [
  { id: 'home', title: 'Home · full OS', icon: LayoutDashboard, color: '#1d4ed8' },
  { id: 'launchpad', title: 'Launchpad · define', icon: Terminal, color: 'var(--cyan)' },
  { id: 'assignments', title: 'Assignments · track', icon: Layers, color: 'var(--green)' },
  { id: 'agents', title: 'Agents · roster', icon: Bot, color: 'var(--violet)' },
];

interface SpotItem {
  key: string;
  label: string;
  icon: LucideIcon;
  color?: string;
  hint?: string;
  run(): void;
}

/** ⌘K spotlight: apps, actions, outcomes (reference #spot). */
export function Spotlight() {
  const router = useRouter();
  const open = useV3OS((s) => s.spotlightOpen);
  const [q, setQ] = useState('');

  const items = useMemo<SpotItem[]>(() => {
    const { toggleTheme } = useV3OS.getState();
    const go = (p: string) => () => router.push(p);
    const unreadCount = useV3OS.getState().sessionFeed.filter((x) => isV3SessionUnread(x)).length;
    const SPOT_KEYS: Record<WindowId, string> = {
      home: 'home dashboard status reviews',
      launchpad: 'launchpad choose graph agent describe outcome start',
      blueprints: 'blueprints library layers sops playbooks',
      agents: 'agents contextual roster helper writer data',
      assignments: 'assignments project task in progress review route',
      hub: 'hub settings billing workspace',
      reports: 'reports artefacts gallery analytics',
      tasks: 'tasks inventory route agent human',
      history: 'history all work search',
    };
    const apps: SpotItem[] = APP_BUTTONS.map((b) => ({
      key: SPOT_KEYS[b.id],
      label: `${b.title.split(' · ')[0]} — ${
        b.id === 'home' ? 'status & reviews' : b.id === 'launchpad' ? 'what to launch?' : b.id === 'agents' ? 'contextual roster' : 'in progress + review'
      }`,
      icon: b.icon,
      color: b.color,
      hint: b.title.split(' · ')[1],
      run: go(b.id === 'home' ? '/v3' : `/v3/${b.id === 'assignments' ? 'assignments' : b.id}`),
    }));
    apps.push(
      {
        key: 'hub settings billing workspace agency',
        label: 'Agency Hub',
        icon: Building2,
        hint: '⌘5',
        run: () => {}, // hub stays a floating-window extra
      },
      {
        key: 'report artefacts gallery analytics inbox',
        label: 'Artefacts — gallery + analytics',
        icon: BarChart3,
        hint: '⌘6',
        run: go('/v3/triage'),
      },
      {
        key: 'task assign agent human active inventory',
        label: 'Tasks — route to agent or human',
        icon: ListChecks,
        hint: '⌘7',
        run: go('/v3/assignments'),
      },
      {
        key: 'run new execute campaign start',
        label: '/run — start execution',
        icon: Play,
        run: go('/v3/launchpad'),
      },
      {
        key: 'blueprints library layers strategy structure execution review sops playbooks docs',
        label: 'Blueprints — the layered library',
        icon: BookOpen,
        run: go('/v3/blueprints'),
      },
      {
        key: 'triage queue review approve inbox needs',
        label: `Triage Queue — ${unreadCount} needs you`,
        icon: Inbox,
        run: go('/v3/triage'),
      },
      {
        key: 'theme dark light appearance toggle',
        label: 'Toggle appearance',
        icon: SunMoon,
        run: () => toggleTheme(),
      },
    );
    return apps;
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
