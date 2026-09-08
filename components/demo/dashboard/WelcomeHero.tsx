'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Bot, FolderArchive, Layers } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { startRun } from '@/lib/demo/engine';
import { DEFAULT_RUN_PROMPT } from '@/lib/demo/data';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BrandMark, greeting } from '../primitives';

function QuickCard({ icon, ink, title, copy, liveDot, onClick, href }: {
  icon: React.ReactNode;
  ink: string;
  title: string;
  copy: string;
  liveDot?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      {liveDot}
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ border: `1px solid ${ink}` }}>
          {icon}
        </span>
        <span className="line-dot" style={{ ['--dot' as string]: ink }} aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <p className="text-[11px] text-[var(--ink-dim)] mt-1.5 leading-relaxed">{copy}</p>
      </div>
    </>
  );
  const cls = 'agency-card p-5 text-left flex flex-col items-start gap-4 relative';
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

export function WelcomeHero({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const displayName = user?.name || 'Operator';
  const runActive = useOS((s) => s.runActive);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const lastRunHadFailure = useOS((s) => s.lastRunHadFailure);
  const setOverlay = useOS((s) => s.setOverlay);
  const [query, setQuery] = useState('');

  const execDot = runActive
    ? <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--line-green)] animate-pulse" />
    : runStartedAt
      ? <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${lastRunHadFailure ? 'bg-[var(--line-amber)]' : 'bg-[var(--line-green)]'}`} />
      : <span className="absolute top-4 right-4 w-2 h-2 rounded-full border border-[var(--hairline-strong)]" />;

  const execCopy = runActive
    ? 'GSC MCP swarm running — live telemetry streaming.'
    : runStartedAt && lastRunHadFailure
      ? 'Last run halted — check triage_queue.'
      : runStartedAt
        ? 'Last run archived to vault. Press to execute again.'
        : 'No active run. Spawn the GSC MCP pipeline to see live telemetry.';

  const submit = () => {
    if (runActive) return;
    void startRun(query.trim() || DEFAULT_RUN_PROMPT);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mb-10 mt-2 text-center rise">
      <BrandMark className="w-12 h-12 mb-4" />
      <h2 className="text-3xl font-bold tracking-tight mb-2.5 text-[var(--ink)]">
        {greeting()}, {displayName.split(' ')[0]}.
      </h2>
      <p className="text-[var(--ink-dim)] text-[13px] mb-8">What are we executing today?</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-4xl mb-8">
        <QuickCard
          href={`/workspaces/${workspaceId}/graphs`}
          icon={<Layers className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} />}
          ink="var(--line-cobalt)"
          title="Campaign Swarm"
          copy="Spawn a multi-agent blueprint for complex workflows."
        />
        <QuickCard
          href={`/workspaces/${workspaceId}/power-agents`}
          icon={<Bot className="w-4 h-4" style={{ color: 'var(--line-green)' }} />}
          ink="var(--line-green)"
          title="Direct Agent"
          copy="Assign a single expert agent to a targeted workspace task."
        />
        <QuickCard
          icon={<Activity className="w-4 h-4" style={{ color: 'var(--line-amber)' }} />}
          ink="var(--line-amber)"
          title="Active Execution"
          copy={execCopy}
          liveDot={execDot}
          onClick={() => { if (!runActive) void startRun(DEFAULT_RUN_PROMPT); }}
        />
        <QuickCard
          icon={<FolderArchive className="w-4 h-4" style={{ color: 'var(--line-scarlet)' }} />}
          ink="var(--line-scarlet)"
          title="Artifact Vault"
          copy="Access saved schemas, campaign copy, and audit reports."
          onClick={() => setOverlay('vaultOpen', true)}
        />
      </div>

      <div className="search-pill w-full max-w-2xl rounded-full p-2 flex items-center h-[50px]">
        <Activity className="w-5 h-5 ml-3 shrink-0" style={{ color: 'var(--line-cobalt)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Or just type what you want to execute right now..."
          className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-[var(--ink)] placeholder-[var(--ink-faint)] min-w-0"
        />
        <button
          type="button"
          onClick={submit}
          disabled={runActive}
          className="w-8 h-8 rounded-full bg-[var(--line-scarlet)] text-white flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mr-1 shrink-0"
          aria-label="Execute"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
