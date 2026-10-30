'use client';

import type { SwarmStatus } from '@/lib/demo/osStore';
import type { ThreadStatus } from '@/lib/demo/types';

export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/Doddle_Logo.jpeg"
      alt="Doddle OS"
      className={`object-contain ${className ?? ''}`}
      draggable={false}
    />
  );
}

function toService(status: SwarmStatus | ThreadStatus | 'idle'): SwarmStatus | 'idle' {
  if (status === 'done') return 'completed';
  if (status === 'failed' || status === 'aborted') return 'halted';
  if (status === 'running') return 'running';
  return 'idle';
}

export function SectionLabel({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className="label-rule" style={tone ? { color: tone } : undefined}>{children}</span>
  );
}

export function SwarmBadge({ status }: { status: SwarmStatus | ThreadStatus | 'idle' }) {
  const s = toService(status);
  if (s === 'running') {
    return <span className="agent-badge status-running"><span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> running</span>;
  }
  if (s === 'completed') {
    return <span className="agent-badge status-done"><span className="w-1.5 h-1.5 rounded-full bg-current" /> completed</span>;
  }
  if (s === 'halted') {
    return <span className="agent-badge status-triage"><span className="w-1.5 h-1.5 rounded-full bg-current" /> halted</span>;
  }
  return <span className="agent-badge"><span className="w-1.5 h-1.5 rounded-full border border-current" /> idle</span>;
}

export function ProgressBar({ pct, status }: { pct: number; status: SwarmStatus | ThreadStatus | 'idle' }) {
  const s = toService(status);
  const ink =
    s === 'completed' ? 'var(--line-green)'
    : s === 'halted' ? 'var(--line-amber)'
    : s === 'running' ? 'var(--line-cobalt)'
    : 'var(--ink-faint)';
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: ink }} />
    </div>
  );
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
