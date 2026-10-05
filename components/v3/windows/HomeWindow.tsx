'use client';

import { ArrowRight, Bot, Inbox, Layers, Terminal, Zap } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { v3Data } from '@/lib/v3/adapter';
import { useV3OperatorName, isV3SessionUnread } from '@/lib/v3/data';
import { Sparkline } from '@/components/v3/ui/Sparkline';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Home floating window: ask bar + quick starts (reference win-home). */
export function HomeWindow() {
  const openApp = useV3OS((s) => s.openApp);
  const operator = useV3OperatorName();
  const triage = useV3OS((s) => s.sessionFeed.filter((x) => isV3SessionUnread(x)).length);

  const cards = [
    { icon: Terminal, label: 'Launchpad', sub: 'Pick a graph, agent, or describe.', onClick: () => openApp('launchpad') },
    { icon: Bot, label: 'Agents', sub: 'Contextual roster · pick one to run it', onClick: () => openApp('agents') },
    { icon: Layers, label: 'Assignments', sub: 'In-progress first, then review', onClick: () => openApp('assignments') },
    { icon: Inbox, label: `Triage Queue ${triage}`, sub: 'Finished runs awaiting your review.', onClick: () => openApp('reports') },
  ];

  return (
    <div className="space-y-4">
      <div className="widget glass-deep">
        <h2 className="text-2xl font-bold">
          {greeting()}
          {operator ? `, ${operator}` : ''}.
        </h2>
        <p className="text-sm font-mono mt-1" style={{ color: 'var(--muted)' }}>
          What are you working on?
        </p>
        <div className="askbar mt-3">
          <Zap size={16} style={{ color: 'var(--muted)' }} />
          <input
            placeholder="Describe what you're working on…"
            aria-label="Describe what you're working on"
            onKeyDown={(e) => e.key === 'Enter' && openApp('launchpad')}
          />
          <button className="btn-primary" style={{ minHeight: 36 }} onClick={() => openApp('launchpad')} aria-label="Open Launchpad">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ icon: Icon, label, sub, onClick }) => (
          <button key={label} className="widget glass-deep text-left hover:scale-[1.01] transition" onClick={onClick}>
            <Icon size={20} style={{ color: 'var(--ink)' }} />
            <p className="font-bold text-sm mt-2">{label}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {sub}
            </p>
          </button>
        ))}
      </div>
      <div className="widget glass-deep flex items-center gap-3">
        <Sparkline series={v3Data.getSparkSeries()} />
      </div>
      <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
        v3 preview — mock data. Live threads stream via LangGraph from Screen 3.
      </p>
    </div>
  );
}
