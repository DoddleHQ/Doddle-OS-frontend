'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Package,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { threadService } from '@/lib/services/threadService';
import { connectionService } from '@/lib/services/connectionService';
import { workspaceService } from '@/lib/services/workspaceService';
import { AGENT_LIST } from '@/components/v2/content-factory/agents';
import type { AuditThread, AuditArtifact } from '@/lib/types/thread.types';
import type { DataSourceConnection } from '@/lib/types/connection.types';
import { BrandMark, greeting } from '../primitives';

interface DashboardData {
  threads: AuditThread[];
  artifacts: AuditArtifact[];
  connections: DataSourceConnection[];
  hasPersona: boolean;
}

function useDashboardData(workspaceId: string) {
  const [data, setData] = useState<DashboardData>({
    threads: [], artifacts: [], connections: [], hasPersona: false,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [threads, connections, persona] = await Promise.all([
        threadService.listThreads(workspaceId, { moduleId: 'content-factory', limit: 20 }).catch(() => []),
        connectionService.listConnections(workspaceId).catch(() => []),
        workspaceService.getPersona(workspaceId).catch(() => null),
      ]);

      // Fetch artifacts from the 3 most recent threads
      const recentThreads = threads.slice(0, 3);
      const artifactPromises = recentThreads.map((t) =>
        threadService.listArtifacts(workspaceId, 'content-factory', t.id).catch(() => [])
      );
      const artifactArrays = await Promise.all(artifactPromises);
      const artifacts = artifactArrays.flat().slice(0, 6);

      setData({
        threads,
        artifacts,
        connections,
        hasPersona: !!(persona && persona.content.trim()),
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

// ---------------------------------------------------------------------------
// Stats Row
// ---------------------------------------------------------------------------
function StatsRow({ data }: { data: DashboardData }) {
  const running = data.threads.filter((t) => t.status === 'running').length;
  const completed = data.threads.filter((t) => t.status === 'complete').length;
  const pendingApprovals = data.threads.filter((t) => t.status === 'error').length; // HITL or error
  const magentoOn = data.connections.some((c) => c.sourceType === 'magento' && c.isActive);
  const gscOn = data.connections.some((c) => c.sourceType === 'gsc' && c.isActive);
  const sourcesConnected = [magentoOn, gscOn].filter(Boolean).length;

  const stats = [
    { label: 'Active Threads', value: running, icon: <MessageSquare className="w-4 h-4" />, ink: 'var(--line-cobalt)', sub: running > 0 ? 'agents working' : 'idle' },
    { label: 'Artifacts', value: data.artifacts.length, icon: <Package className="w-4 h-4" />, ink: 'var(--line-green)', sub: 'generated' },
    { label: 'Completed', value: completed, icon: <CheckCircle2 className="w-4 h-4" />, ink: 'var(--line-green)', sub: 'threads finished' },
    { label: 'Data Sources', value: `${sourcesConnected}/2`, icon: <Sparkles className="w-4 h-4" />, ink: sourcesConnected > 0 ? 'var(--line-green)' : 'var(--line-amber)', sub: sourcesConnected > 0 ? 'connected' : 'none connected' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="plate p-4">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: s.ink }}>{s.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{s.label}</span>
          </div>
          <p className="text-2xl font-bold tnum leading-none" style={{ color: s.ink }}>{s.value}</p>
          <p className="text-[10px] font-mono text-[var(--ink-faint)] mt-1.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Start — agent picker + prompt input
// ---------------------------------------------------------------------------
function QuickStart({ workspaceId }: { workspaceId: string }) {
  const [prompt, setPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(AGENT_LIST[0]?.slug ?? '');

  const submit = () => {
    if (!prompt.trim()) return;
    const agent = AGENT_LIST.find((a) => a.slug === selectedAgent);
    if (!agent) return;
    const url = `/workspaces/${workspaceId}/modules/content-factory/v2/${selectedAgent}/new${prompt.trim() ? `?prompt=${encodeURIComponent(prompt.trim())}` : ''}`;
    window.location.href = url;
  };

  return (
    <div className="plate p-5 mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono mb-3">Quick Start</p>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder="Describe what you want — e.g. write SEO content for our pricing page"
            className="w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[8px] px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-faint)] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[8px] px-3 py-2.5 text-xs font-mono text-[var(--ink)] cursor-pointer"
          >
            {AGENT_LIST.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name} — {a.role}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={submit}
            disabled={!prompt.trim()}
            className="btn-primary !py-2.5 !px-4 !rounded-[8px] shrink-0"
          >
            Start <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Approvals
// ---------------------------------------------------------------------------
function PendingApprovals({ threads, workspaceId }: { threads: AuditThread[]; workspaceId: string }) {
  const pending = threads.filter((t) => t.status === 'running' || t.status === 'error');

  if (pending.length === 0) return null;

  return (
    <div className="plate overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <Clock className="w-4 h-4" style={{ color: 'var(--line-amber)' }} /> Pending Approvals
        </h3>
        <span className="service-chip" style={{ ['--chip' as string]: 'var(--line-amber)' }}>{pending.length} waiting</span>
      </div>
      {pending.slice(0, 3).map((t) => (
        <Link key={t.id} href={`/workspaces/${workspaceId}/modules/${t.moduleId}`} className="dense-row">
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-semibold truncate">{t.title || 'Untitled thread'}</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5">
              {t.moduleId} · {t.status === 'running' ? 'agent working' : 'needs attention'}
            </span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--ink-faint)] shrink-0" />
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Artifacts
// ---------------------------------------------------------------------------
function RecentArtifacts({ artifacts, workspaceId }: { artifacts: AuditArtifact[]; workspaceId: string }) {
  if (artifacts.length === 0) return null;

  return (
    <div className="plate overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b agency-border">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <Package className="w-4 h-4" style={{ color: 'var(--line-green)' }} /> Recent Artifacts
        </h3>
      </div>
      {artifacts.slice(0, 4).map((a) => (
        <div key={String(a.id)} className="dense-row !cursor-default">
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-semibold truncate">{a.pageName || 'Artifact'}</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5 truncate">
              {a.moduleId} · {new Date(a.createdAt).toLocaleDateString()}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Feed
// ---------------------------------------------------------------------------
function ActivityFeed({ threads, workspaceId }: { threads: AuditThread[]; workspaceId: string }) {
  const feed = threads.slice(0, 8);

  return (
    <div className="plate overflow-hidden">
      <div className="px-5 py-3.5 border-b agency-border">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <FileText className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> Activity
        </h3>
      </div>
      {feed.length === 0 ? (
        <div className="dense-row !cursor-default">
          <span className="flex-1 text-xs text-[var(--ink-faint)]">No activity yet — start a thread to see it here</span>
        </div>
      ) : (
        feed.map((t) => {
          const agent = AGENT_LIST.find((a) => a.moduleId === t.moduleId);
          const ink = t.status === 'running' ? 'var(--line-cobalt)' : t.status === 'complete' ? 'var(--line-green)' : 'var(--ink-faint)';
          return (
            <Link key={t.id} href={`/workspaces/${workspaceId}/modules/${t.moduleId}`} className="dense-row">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ink }} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-xs font-semibold truncate">{t.title || 'Untitled'}</span>
                <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5 truncate">
                  {agent ? `${agent.name} · ` : ''}{t.moduleId} · {t.docCount} artifacts
                </span>
              </span>
              <span className="text-[10px] font-mono text-[var(--ink-faint)] shrink-0">
                {t.updatedAt || t.createdAt ? new Date(t.updatedAt || t.createdAt).toLocaleDateString() : ''}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Power Agents — solo chat agents from the Power Agents page
// ---------------------------------------------------------------------------
const POWER_AGENTS = [
  { id: 'data', handle: '@Data_Wrangler', role: 'ETL Specialist', desc: 'Extracts, transforms, and loads data from connected sources into your warehouse', ink: 'var(--line-green)' },
  { id: 'writer', handle: '@glob_Writer', role: 'Marketing Copywriter', desc: 'Writes landing pages, product descriptions, and campaign copy in your brand voice', ink: 'var(--line-amber)' },
  { id: 'infra', handle: '@Infra_Titan', role: 'Infrastructure Engineer', desc: 'Manages database schemas, benchmarks performance, and handles deployments', ink: 'var(--line-cobalt)' },
];

function AgentDirectory({ workspaceId }: { workspaceId: string; magentoConnected: boolean }) {
  return (
    <div className="plate overflow-hidden">
      <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <Users className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> Power Agents
        </h3>
        <Link
          href={`/workspaces/${workspaceId}/power-agents`}
          className="text-[11px] font-mono text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors"
        >
          Open
        </Link>
      </div>
      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {POWER_AGENTS.map((agent) => (
          <Link
            key={agent.id}
            href={`/workspaces/${workspaceId}/power-agents`}
            className="agency-card p-4 text-left flex flex-col gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 text-[13px] font-bold font-mono"
                style={{ border: `1.5px solid ${agent.ink}`, color: agent.ink }}
              >
                {agent.handle.replace('@', '')[0]}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold font-mono truncate">{agent.handle}</p>
                <p className="text-[10px] text-[var(--ink-faint)] truncate">{agent.role}</p>
              </div>
            </div>
            <p className="text-[11px] text-[var(--ink-dim)] leading-relaxed line-clamp-2">{agent.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Section
// ---------------------------------------------------------------------------
function TeamSection({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<{ name: string; email: string; role: string }[]>([]);

  useEffect(() => {
    import('@/lib/services/workspaceService').then(({ memberService }) => {
      memberService.listMembers(workspaceId).then(setMembers).catch(() => setMembers([]));
    });
  }, [workspaceId]);

  return (
    <div className="plate overflow-hidden">
      <div className="px-5 py-3.5 border-b agency-border flex items-center justify-between">
        <h3 className="text-xs font-semibold font-mono tracking-wide">Team</h3>
        <Link href={`/workspaces/${workspaceId}/settings`} className="text-[11px] font-mono text-[var(--ink-dim)] hover:text-[var(--ink)]">
          Manage
        </Link>
      </div>
      {members.length === 0 ? (
        <div className="dense-row !cursor-default">
          <span className="flex-1 text-xs text-[var(--ink-faint)]">Just you</span>
        </div>
      ) : (
        members.slice(0, 4).map((m) => (
          <div key={m.email} className="dense-row !cursor-default">
            <span className="w-7 h-7 rounded-full border border-[var(--hairline)] flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
              {m.name.trim().split(' ')[0]?.[0]?.toUpperCase()}
            </span>
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-xs font-semibold truncate">{m.name}</span>
              <span className="text-[10px] text-[var(--ink-faint)] truncate">{m.email}</span>
            </span>
            <span className="text-[9px] font-mono text-[var(--ink-faint)] shrink-0">{m.role}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export function WelcomeHero({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const displayName = user?.name || 'Operator';
  const { data, loading } = useDashboardData(workspaceId);

  return (
    <div className="w-full flex flex-col mb-6">
      {/* Greeting */}
      <div className="flex flex-col items-center text-center mb-6 rise">
        <BrandMark className="w-12 h-12 mb-3" />
        <h2 className="text-2xl font-bold tracking-tight mb-1.5 text-[var(--ink)]">
          {greeting()}, {displayName.split(' ')[0]}.
        </h2>
        <p className="text-[var(--ink-dim)] text-[13px]">What are we working on today?</p>
      </div>

      {/* Stats */}
      {!loading && <StatsRow data={data} />}

      {/* Quick Start */}
      <QuickStart workspaceId={workspaceId} />

      {/* Main content: left (approvals + artifacts + agents) | right (activity) */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {!data.hasPersona && (
            <div
              className="agency-card p-4 mb-4 flex items-center justify-between"
              style={{ borderColor: 'color-mix(in srgb, var(--line-amber) 35%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 4%, transparent)' }}
            >
              <p className="text-xs text-[var(--ink-dim)]">
                <span className="font-bold" style={{ color: 'var(--line-amber)' }}>Brand Persona:</span>{' '}
                not configured — agents need your brand voice.
              </p>
              <Link href={`/workspaces/${workspaceId}/settings`} className="btn-outline !py-1.5 !px-3 !text-[10px] shrink-0 ml-4">
                Configure
              </Link>
            </div>
          )}
          <PendingApprovals threads={data.threads} workspaceId={workspaceId} />
          <RecentArtifacts artifacts={data.artifacts} workspaceId={workspaceId} />
          <AgentDirectory workspaceId={workspaceId} magentoConnected={data.connections.some((c) => c.sourceType === 'magento' && c.isActive)} />
        </div>

        <div className="lg:w-[320px] shrink-0 flex flex-col gap-4">
          <ActivityFeed threads={data.threads} workspaceId={workspaceId} />
          <TeamSection workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
