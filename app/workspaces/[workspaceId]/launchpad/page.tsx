'use client';
import { useParams } from 'next/navigation';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Bot, Hash, Play, RotateCcw, Terminal, TerminalSquare, XOctagon } from 'lucide-react';
import { runCost, useOS } from '@/lib/demo/osStore';
import { abortRun, killThread, startRun } from '@/lib/demo/engine';
import { AGENTS, DEFAULT_RUN_PROMPT, SQL_ARTIFACT } from '@/lib/demo/data';
import { DemoIcon } from '@/lib/demo/icons';
import { ProgressBar, SwarmBadge } from '@/components/workspace/primitives';
import type { FeedEntry, LogEntry, ThreadState } from '@/lib/demo/types';

const threadInk: Record<string, string> = {
  infra: 'var(--line-cobalt)',
  sec: 'var(--line-amber)',
  data: 'var(--line-green)',
};

function ThreadBlock({ t, active }: { t: ThreadState; active: boolean }) {
  const setActiveThread = useOS((s) => s.setActiveThread);
  const agent = AGENTS[t.agentId];
  const cls =
    t.status === 'running' ? 'is-running'
    : t.status === 'done' ? 'is-done'
    : t.status === 'failed' ? 'is-failed'
    : t.status === 'aborted' ? 'is-aborted'
    : '';
  return (
    <button
      type="button"
      onClick={() => setActiveThread(t.id)}
      className={`thread-block ${cls} ${active ? 'is-active' : ''}`}
    >
      <span className="flex justify-between items-start mb-1">
        <span className="flex items-center gap-2">
          <span className="line-dot" style={{ ['--dot' as string]: threadInk[t.id] }} aria-hidden="true" />
          <span className="text-xs font-bold font-mono">{t.title}</span>
        </span>
        <span
          className="text-[9px] font-bold font-mono uppercase tracking-wide"
          style={{ color: t.status === 'running' ? 'var(--line-cobalt)' : t.status === 'done' ? 'var(--line-green)' : t.status === 'failed' ? 'var(--line-scarlet)' : t.status === 'aborted' ? 'var(--line-amber)' : 'var(--ink-faint)' }}
        >
          {t.status}
        </span>
      </span>
      <p className="text-[10px] text-[var(--ink-dim)] font-mono">{agent?.handle}</p>
      <span className="block mt-2">
        <ProgressBar pct={t.progress} status={t.status} />
      </span>
    </button>
  );
}

function FeedAvatar({ children, ink }: { children: React.ReactNode; ink?: string }) {
  return (
    <span className="feed-avatar" style={ink ? { borderColor: ink } : undefined}>
      {children}
    </span>
  );
}

function GateBubble({ entry }: { entry: Extract<FeedEntry, { kind: 'gate' }> }) {
  const triage = useOS((s) => s.triage);
  const resolveTriage = useOS((s) => s.resolveTriage);
  const resolved = !triage.some((t) => t.id === entry.triageId);
  const [showPreview, setShowPreview] = useState(false);

  if (resolved) {
    return (
      <div className="feed-bubble text-[11px] font-mono" style={{ color: 'var(--line-green)' }}>
        ✓ resolved by operator — scope granted
      </div>
    );
  }
  return (
    <div className="feed-bubble">
      <span
        className="inline-block mb-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded-[3px] border"
        style={{ color: 'var(--line-amber)', borderColor: 'color-mix(in srgb, var(--line-amber) 45%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 10%, transparent)' }}
      >
        APPROVAL_REQ · human_in_loop
      </span>
      <p className="text-xs mb-3">{entry.text}</p>
      {showPreview && <pre className="terminal-container text-[10px] mb-3"><code>{entry.preview}</code></pre>}
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 btn-outline !py-1.5"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? 'Collapse' : 'Review'}
        </button>
        <button
          type="button"
          className="flex-1 py-1.5 rounded-[3px] text-xs font-bold font-mono text-white hover:brightness-110"
          style={{ background: 'var(--line-amber)' }}
          onClick={() => resolveTriage(entry.triageId, 'approved')}
        >
          approve()
        </button>
        <button
          type="button"
          className="flex-1 py-1.5 rounded-[3px] text-xs font-bold font-mono hover:brightness-110"
          style={{ border: '1px solid color-mix(in srgb, var(--line-scarlet) 45%, transparent)', color: 'var(--line-scarlet)' }}
          onClick={() => resolveTriage(entry.triageId, 'rejected')}
        >
          reject()
        </button>
      </div>
    </div>
  );
}

function FeedEntryView({ entry }: { entry: FeedEntry }) {
  const { user: authUser } = useAuth();
  const threads = useOS((s) => s.threads);
  const activeThreadId = useOS((s) => s.activeThreadId);

  if (entry.kind === 'user') {
    return (
      <div className="feed-row">
        <FeedAvatar><span className="text-[11px] font-bold font-mono">{(authUser?.name || 'Operator').split(' ')[0][0]}</span></FeedAvatar>
        <div className="flex-1 min-w-0">
          <p className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-bold font-mono">{(authUser?.name || 'Operator')}</span>
            <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">{entry.ts}</span>
          </p>
          <div className="feed-bubble font-mono">{entry.text}</div>
        </div>
      </div>
    );
  }
  if (entry.kind === 'system' || entry.kind === 'summary') {
    const ok = entry.kind === 'system' || entry.ok;
    return (
      <div className="feed-row">
        <FeedAvatar ink={entry.kind === 'summary' ? (ok ? 'var(--line-green)' : 'var(--line-scarlet)') : undefined}>
          <DemoIcon name={entry.kind === 'summary' ? (ok ? 'check-circle' : 'alert-triangle') : 'bot'} className="w-3.5 h-3.5" />
        </FeedAvatar>
        <div className="flex-1 min-w-0">
          <p className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-bold font-mono">@Dod_Orchestrator</span>
            <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">{entry.ts}</span>
          </p>
          <div className="feed-bubble">
            {entry.kind === 'summary' && (
              <span className="font-bold font-mono mr-1" style={{ color: ok ? 'var(--line-green)' : 'var(--line-scarlet)' }}>
                {ok ? '> Success:' : '> Halted:'}
              </span>
            )}
            {entry.text}
          </div>
        </div>
      </div>
    );
  }
  if (entry.kind === 'threads') {
    return (
      <div className="feed-row">
        <FeedAvatar><Bot className="w-3.5 h-3.5" /></FeedAvatar>
        <div className="flex-1 min-w-0">
          <p className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-bold font-mono">@Dod_Orchestrator</span>
            <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">{entry.ts}</span>
          </p>
          <div className="feed-bubble mb-2">Pipeline decomposed into 3 parallel threads.</div>
          <div className="space-y-2 max-w-sm">
            {Object.values(threads).map((t) => (
              <ThreadBlock key={t.id} t={t} active={activeThreadId === t.id} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="feed-row">
      <FeedAvatar ink="var(--line-amber)"><DemoIcon name="shield" className="w-3.5 h-3.5" /></FeedAvatar>
      <div className="flex-1 min-w-0">
        <p className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-bold font-mono">@Sec_Sentinel → operator</span>
          <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">{entry.ts}</span>
        </p>
        <GateBubble entry={entry} />
      </div>
    </div>
  );
}

function MissionFeed() {
  const feed = useOS((s) => s.feed);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [feed.length]);

  if (feed.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-faint)]">
        <Bot className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-xs font-mono">Workspace loaded. Awaiting launch command.</p>
        {!runStartedAt && <p className="text-[10px] font-mono mt-1.5 opacity-70">type below or press init to spawn the GSC MCP swarm.</p>}
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {feed.map((entry) => <FeedEntryView key={entry.id} entry={entry} />)}
      <div ref={bottomRef} />
    </div>
  );
}

const LOG_CLASS: Record<string, string> = {
  prompt: 'text-prompt', success: 'text-success', warn: 'text-warn', error: 'text-error',
};

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="term-copy"
      title="copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        }).catch(() => useOS.getState().pushToast('Clipboard unavailable', 'warn'));
      }}
    >
      {done ? <DemoIcon name="check" className="w-3 h-3" /> : <DemoIcon name="copy" className="w-3 h-3" />}
    </button>
  );
}

function Stdout({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 60) el.scrollTop = el.scrollHeight;
  }, [logs.length]);
  return (
    <div className="term-wrap relative flex-1 min-h-[200px] flex">
      <div ref={ref} className="terminal-container flex-1">
        {logs.length === 0 && <p className="opacity-50">stdout empty — thread awaiting dispatch.</p>}
        {logs.map((l, i) => (
          <div key={i} className="terminal-line">
            <span className="terminal-ts">[{l.ts}]</span>&gt; <span className={LOG_CLASS[l.type] ?? ''}>{l.msg}</span>
          </div>
        ))}
      </div>
      <CopyButton text={logs.map((l) => l.msg).join('\n')} />
    </div>
  );
}

function Timeline() {
  const threads = useOS((s) => s.threads);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const runActive = useOS((s) => s.runActive);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!runActive) return;
    const id = setInterval(() => setNow(Date.now()), 600);
    return () => clearInterval(id);
  }, [runActive]);

  if (!runStartedAt) {
    return <p className="text-[9px] font-mono text-[var(--ink-faint)]">timeline_idle — execute a run to visualize parallelism.</p>;
  }
  const list = Object.values(threads);
  const t1 = Math.max(...list.map((t) => t.endedAt ?? now));
  const span = Math.max(1, t1 - runStartedAt);
  const fill = (t: ThreadState) =>
    t.status === 'done' ? 'var(--line-green)'
    : t.status === 'running' ? 'var(--line-cobalt)'
    : t.status === 'failed' ? 'var(--line-scarlet)'
    : t.status === 'aborted' ? 'var(--line-amber)'
    : 'var(--ink-faint)';

  return (
    <div className="plate p-3 space-y-1.5">
      {list.map((t) => {
        const start = (((t.startedAt ?? runStartedAt) - runStartedAt) / span) * 100;
        const end = (((t.endedAt ?? now) - runStartedAt) / span) * 100;
        return (
          <div key={t.id} className="flex items-center gap-2">
            <span className="w-[4.5rem] text-right text-[8px] font-mono text-[var(--ink-dim)] truncate">{t.title}</span>
            <span className="flex-1 h-2 rounded-full relative overflow-hidden" style={{ background: 'var(--hairline)' }}>
              <span
                className={`absolute h-full rounded-full ${t.status === 'running' ? 'tl-live' : ''}`}
                style={{ left: `${Math.min(97, start)}%`, width: `${Math.max(1.5, end - start)}%`, background: fill(t) }}
              />
            </span>
          </div>
        );
      })}
      <p className="text-right text-[8px] font-mono text-[var(--ink-faint)] tnum">window {((t1 - runStartedAt) / 1000).toFixed(1)}s</p>
    </div>
  );
}

function ExecutionCanvas() {
  const threads = useOS((s) => s.threads);
  const activeId = useOS((s) => s.activeThreadId);
  const t = activeId ? threads[activeId] : null;

  if (!t) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--ink-faint)]">
        <TerminalSquare className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-xs font-mono">Select a thread to view its output.</p>
      </div>
    );
  }
  const agent = AGENTS[t.agentId];
  const ink = threadInk[t.id] ?? 'var(--ink)';
  return (
    <div className="absolute inset-0 flex flex-col slide-in">
      <div className="h-14 px-5 md:px-7 border-b agency-border flex items-center justify-between shrink-0">
        <span className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[6px] flex items-center justify-center" style={{ border: `1.5px solid ${ink}` }}>
            <DemoIcon name={agent?.icon ?? 'bot'} className="w-4 h-4" />
          </span>
          <span>
            <span className="block text-sm font-bold font-mono">{t.title}</span>
            <span className="block text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">{agent?.handle}</span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          {t.tokens > 0 && (
            <span className="hidden md:inline text-[9px] font-mono text-[var(--ink-dim)] tnum">
              ${runCost(t.tokens).toFixed(2)} · {(t.tokens / 1000).toFixed(1)}k tok
            </span>
          )}
          {t.status === 'running' && (
            <button type="button" className="btn-outline !py-1 !px-2" style={{ borderColor: 'color-mix(in srgb, var(--line-scarlet) 50%, transparent)', color: 'var(--line-scarlet)' }} onClick={() => killThread(t.id)}>
              <XOctagon className="w-3 h-3" /> kill
            </button>
          )}
          <SwarmBadge status={t.status} />
        </span>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col gap-6">
        <div className="rounded-[10px] p-4 border border-dashed" style={{ borderColor: 'var(--hairline-strong)' }}>
          <p className="label-rule mb-2">objective</p>
          <p className="text-xs leading-relaxed font-mono">&gt; {t.objective}</p>
        </div>

        <div className="flex flex-col">
          <p className="label-rule mb-2">Execution Timeline</p>
          <Timeline />
        </div>

        <div className="flex flex-col flex-1 min-h-[220px]">
          <p className="label-rule mb-2">stdout</p>
          <Stdout logs={t.logs} />
        </div>

        {t.status === 'done' && (
          <div className="flex flex-col min-h-[180px] slide-in">
            <p className="label-rule mb-2" style={{ color: 'var(--line-green)' }}>generated_artifact.sql</p>
            <div className="term-wrap relative flex-1 flex">
              <pre className="terminal-container flex-1 text-[11px] leading-relaxed"><code>{SQL_ARTIFACT}</code></pre>
              <CopyButton text={SQL_ARTIFACT} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Q4 campaign: static approval workflow feed (from the reference's triage seed). */
function Q4Feed() {
  const triage = useOS((s) => s.triage);
  const resolveTriage = useOS((s) => s.resolveTriage);
  const q4Item = triage.find((t) => t.id === 'seed-q4-assets');
  const resolved = !q4Item;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="feed-row">
        <span className="feed-avatar"><span className="text-[11px] font-bold font-mono">V</span></span>
        <div className="flex-1 min-w-0">
          <p className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-bold font-mono">Vivek</span>
            <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">09:14</span>
          </p>
          <div className="feed-bubble font-mono">Draft the Q4 campaign landing page — hero, features, pricing sections.</div>
        </div>
      </div>

      <div className="feed-row">
        <span className="feed-avatar" style={{ borderColor: 'var(--line-scarlet)' }}>
          <DemoIcon name="pen-tool" className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-bold font-mono">@glob_Writer</span>
            <span className="text-[9px] font-mono text-[var(--ink-faint)] tnum">09:22</span>
          </p>
          <div className="feed-bubble mb-2">Draft complete. Landing page ready for review — awaiting approval to initiate Vercel deployment.</div>
          {resolved ? (
            <div className="feed-bubble text-[11px] font-mono" style={{ color: 'var(--line-green)' }}>
              ✓ approved by operator — deployment queued
            </div>
          ) : (
            <div className="feed-bubble">
              <span className="inline-block mb-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded-[3px] border" style={{ color: 'var(--line-amber)', borderColor: 'color-mix(in srgb, var(--line-amber) 45%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 10%, transparent)' }}>
                APPROVAL_REQ
              </span>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  className="flex-1 py-1.5 rounded-[3px] text-xs font-bold font-mono text-white hover:brightness-110"
                  style={{ background: 'var(--line-amber)' }}
                  onClick={() => resolveTriage('seed-q4-assets', 'approved')}
                >
                  approve()
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 rounded-[3px] text-xs font-bold font-mono hover:brightness-110"
                  style={{ border: '1px solid color-mix(in srgb, var(--line-scarlet) 45%, transparent)', color: 'var(--line-scarlet)' }}
                  onClick={() => resolveTriage('seed-q4-assets', 'rejected')}
                >
                  reject()
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Q4 campaign canvas: the landing page artifact. */
function Q4Canvas() {
  return (
    <div className="absolute inset-0 flex flex-col slide-in">
      <div className="h-14 px-5 md:px-7 border-b agency-border flex items-center justify-between shrink-0">
        <span className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[6px] flex items-center justify-center" style={{ border: '1.5px solid var(--line-scarlet)' }}>
            <DemoIcon name="pen-tool" className="w-4 h-4" />
          </span>
          <span>
            <span className="block text-sm font-bold font-mono">q4_landing_page</span>
            <span className="block text-[10px] text-[var(--ink-dim)] font-mono mt-0.5">@glob_Writer</span>
          </span>
        </span>
        <SwarmBadge status="completed" />
      </div>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col gap-6">
        <div className="rounded-[10px] p-4 border border-dashed" style={{ borderColor: 'var(--hairline-strong)' }}>
          <p className="label-rule mb-2">objective</p>
          <p className="text-xs leading-relaxed font-mono">&gt; Draft the Q4 campaign landing page for Vercel deployment.</p>
        </div>
        <div className="flex flex-col flex-1 min-h-[220px]">
          <p className="label-rule mb-2" style={{ color: 'var(--line-green)' }}>generated_artifact.html</p>
          <div className="term-wrap relative flex-1 flex">
            <pre className="terminal-container flex-1 text-[11px] leading-relaxed"><code>{`<section class="hero">
  <h1>Ship agents, not chores.</h1>
  <p>Doddle OS — Q4 campaign landing</p>
  <button data-deploy="vercel">Request demo</button>
</section>`}</code></pre>
            <CopyButton text={'<section class="hero">...'} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoLaunchpadPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { user } = useAuth();

  const runActive = useOS((s) => s.runActive);
  const runStartedAt = useOS((s) => s.runStartedAt);
  const threads = useOS((s) => s.threads);
  const [campaign, setCampaign] = useState<'gsc-mcp' | 'q4-assets'>('gsc-mcp');
  const [cmd, setCmd] = useState('');
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokens = Object.values(threads).reduce((a, t) => a + t.tokens, 0);

  const submit = () => {
    if (runActive) return;
    void startRun(cmd.trim() || DEFAULT_RUN_PROMPT);
    setCmd('');
  };

  const onAbort = () => {
    if (!armed) {
      setArmed(true);
      useOS.getState().pushToast('Press abort_all again to confirm', 'warn');
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 2600);
      return;
    }
    setArmed(false);
    abortRun();
  };

  const bad = Object.values(threads).some((t) => t.status === 'failed' || t.status === 'aborted');
  const engineDot = runActive
    ? { bg: 'var(--line-cobalt)', pulse: true }
    : runStartedAt
      ? { bg: bad ? 'var(--line-scarlet)' : 'var(--line-green)', pulse: false }
      : { bg: 'var(--hairline-strong)', pulse: false };

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-4 md:px-10 py-4 md:py-5 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Terminal className="w-6 h-6 md:w-7 md:h-7" style={{ color: 'var(--line-scarlet)' }} /> Launchpad
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* active campaigns */}
        <aside className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r agency-border agency-panel z-30">
          <div className="hidden lg:flex h-14 px-4 border-b agency-border items-center shrink-0">
            <p className="label-rule">Active Campaigns</p>
          </div>
          <div className="flex lg:flex-col gap-2 p-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCampaign('gsc-mcp')}
              className={`thread-block min-w-[170px] lg:min-w-0 ${campaign === 'gsc-mcp' ? 'is-active' : ''}`}
            >
              <span className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: campaign === 'gsc-mcp' ? 'var(--line-scarlet)' : 'var(--ink-faint)' }} />
                <span className="text-xs font-bold font-mono">gsc-mcp</span>
              </span>
              <p className="text-[10px] font-mono mt-1.5 flex items-center gap-1.5" style={{ color: runActive ? 'var(--line-cobalt)' : 'var(--ink-faint)' }}>
                <span className={`w-1.5 h-1.5 rounded-full ${runActive ? 'bg-current animate-pulse' : 'border border-current'}`} />
                {runActive ? 'running' : 'idle'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setCampaign('q4-assets')}
              className={`thread-block min-w-[170px] lg:min-w-0 ${campaign === 'q4-assets' ? 'is-active' : ''} opacity-80`}
            >
              <span className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: campaign === 'q4-assets' ? 'var(--line-amber)' : 'var(--ink-faint)' }} />
                <span className="text-xs font-bold font-mono">q4-assets</span>
              </span>
              <p className="text-[10px] font-mono mt-1.5" style={{ color: 'var(--line-amber)' }}>Approval Required</p>
            </button>
          </div>
        </aside>

        {/* mission control feed */}
        <section className="lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r agency-border flex flex-col min-h-[380px] lg:min-h-0 relative z-20">
          <div className="h-14 px-5 border-b agency-border flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-bold font-mono"># {campaign === 'gsc-mcp' ? 'gsc-mcp-integration' : 'q4-assets'}</h2>
              <p className="text-[9px] text-[var(--ink-faint)] font-mono mt-0.5">Mission Control Feed</p>
            </div>
            <div className="flex items-center gap-3">
              {runActive && tokens > 0 && (
                <span className="hidden sm:inline text-[9px] font-mono tnum" style={{ color: 'var(--line-green)' }}>
                  ${runCost(tokens).toFixed(2)} · {(tokens / 1000).toFixed(1)}k tok
                </span>
              )}
              {runActive && (
                <button
                  type="button"
                  className="btn-outline !py-1 !px-2"
                  style={armed ? { borderColor: 'var(--line-scarlet)', color: 'var(--line-scarlet)' } : undefined}
                  onClick={onAbort}
                >
                  <XOctagon className="w-3 h-3" /> {armed ? 'Confirm abort?' : 'Abort All'}
                </button>
              )}
              <span className={`w-2 h-2 rounded-full ${engineDot.pulse ? 'animate-pulse' : ''}`} style={{ background: engineDot.bg }} />
            </div>
          </div>

          {campaign === 'gsc-mcp' ? <MissionFeed /> : <Q4Feed />}

          {campaign === 'gsc-mcp' && (
          <div className="p-3.5 border-t agency-border shrink-0">
            <div className="cli-input-wrapper">
              <span className="font-mono text-xs mb-0.5" style={{ color: 'var(--line-green)' }}>&gt;</span>
              <textarea
                rows={1}
                value={cmd}
                placeholder="Type orchestrator command..."
                className="cli-input"
                onChange={(e) => {
                  setCmd(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                }}
              />
              <button type="button" className="btn-primary !py-1.5 !px-3 shrink-0" onClick={submit} disabled={runActive}>
                {runStartedAt && !runActive ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {runStartedAt && !runActive ? 'New Run' : 'init'}
              </button>
            </div>
          </div>
          )}
        </section>

        {/* execution canvas */}
        <section className="flex-1 relative min-h-[420px] lg:min-h-0 overflow-hidden">
          {campaign === 'gsc-mcp' ? <ExecutionCanvas /> : <Q4Canvas />}
        </section>
      </div>
    </div>
  );
}
