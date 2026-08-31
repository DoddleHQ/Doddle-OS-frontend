'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';
import { startRun } from '@/lib/demo/engine';
import { DEFAULT_RUN_PROMPT, OPERATOR } from '@/lib/demo/data';
import { BrandMark, greeting } from '../primitives';

function ActionRow({ ink, title, copy, live, onClick, href, delay }: {
  ink: string;
  title: string;
  copy: string;
  live?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  delay: string;
}) {
  const inner = (
    <>
      <span className="line-dot shrink-0" style={{ ['--dot' as string]: ink }} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{title}</span>
          {live}
        </span>
        <span className="block text-[11px] text-[var(--ink-dim)] mt-1 leading-snug">{copy}</span>
      </span>
      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--ink-faint)] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </>
  );
  const cls = `group flex items-start gap-3.5 py-3.5 px-2 -mx-2 rounded-[4px] border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--net-panel-2)] transition-colors text-left rise ${delay}`;
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

/**
 * CommandDesk — the operator's side of the board: identity, intent, actions.
 * Everything here is a command; everything that reports state lives right.
 */
export function CommandDesk() {
  const runActive = useOS((s) => s.runActive);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const lastRunHadFailure = useOS((s) => s.lastRunHadFailure);
  const setOverlay = useOS((s) => s.setOverlay);
  const [query, setQuery] = useState('');

  const execDot = runActive
    ? <span className="w-2 h-2 rounded-full bg-[var(--line-green)] animate-pulse" />
    : runStartedAt
      ? <span className={`w-2 h-2 rounded-full ${lastRunHadFailure ? 'bg-[var(--line-amber)]' : 'bg-[var(--line-green)]'}`} />
      : <span className="w-2 h-2 rounded-full border border-[var(--hairline-strong)]" />;

  const execCopy = runActive
    ? 'GSC MCP swarm running — live telemetry on the board.'
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
    <section className="w-full lg:w-[400px] lg:border-r agency-border shrink-0 flex flex-col justify-start lg:justify-center px-8 md:px-10 py-10 lg:py-8 lg:overflow-y-auto">
      <div className="rise">
        <BrandMark className="w-12 h-12 mb-5" />
        <h1 className="text-[2rem] leading-[1.08] font-bold tracking-tight text-[var(--ink)]">
          {greeting()},<br />{OPERATOR.name.replace(' F.', '')}.
        </h1>
        <p className="text-[var(--ink-dim)] text-[13px] mt-3 mb-7">What are we executing today?</p>

        <div className="search-pill rounded-full p-2 flex items-center h-[48px] mb-9">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder="Or just type what you want to execute right now..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-[var(--ink)] placeholder-[var(--ink-faint)] min-w-0"
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

        <p className="label-rule mb-1">quick actions</p>
        <div>
          <ActionRow
            href="/demo/graphs"
            ink="var(--line-cobalt)"
            title="Campaign Swarm"
            copy="Spawn a multi-agent blueprint for complex workflows."
            delay="d1"
          />
          <ActionRow
            href="/demo/power-agents"
            ink="var(--line-green)"
            title="Direct Agent"
            copy="Assign a single expert agent to a targeted workspace task."
            delay="d2"
          />
          <ActionRow
            ink="var(--line-amber)"
            title="Active Execution"
            copy={execCopy}
            live={execDot}
            onClick={() => { if (!runActive) void startRun(DEFAULT_RUN_PROMPT); }}
            delay="d3"
          />
          <ActionRow
            ink="var(--line-scarlet)"
            title="Artifact Vault"
            copy="Access saved schemas, campaign copy, and audit reports."
            onClick={() => setOverlay('vaultOpen', true)}
            delay="d4"
          />
        </div>
      </div>
    </section>
  );
}
