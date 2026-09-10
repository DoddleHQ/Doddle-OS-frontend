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
import { DemoIcon } from '@/lib/demo/icons';

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
  const magentoOn = data.connections.some((c) => c.sourceType === 'magento' && c.isActive);
  const gscOn = data.connections.some((c) => c.sourceType === 'gsc' && c.isActive);
  const sourcesConnected = [magentoOn, gscOn].filter(Boolean).length;

  const stats = [
    { label: 'Threads', value: running, icon: <MessageSquare className="w-3.5 h-3.5" />, ink: 'var(--line-cobalt)', sub: running > 0 ? 'active' : 'idle' },
    { label: 'Artifacts', value: data.artifacts.length, icon: <Package className="w-3.5 h-3.5" />, ink: 'var(--line-green)', sub: 'generated' },
    { label: 'Completed', value: completed, icon: <CheckCircle2 className="w-3.5 h-3.5" />, ink: 'var(--line-green)', sub: 'finished' },
    { label: 'Sources', value: `${sourcesConnected}/2`, icon: <Sparkles className="w-3.5 h-3.5" />, ink: sourcesConnected > 0 ? 'var(--line-green)' : 'var(--line-amber)', sub: 'connected' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
      {stats.map((s) => (
        <div key={s.label} className="plate p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <span style={{ color: s.ink }}>{s.icon}</span>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">{s.label}</span>
          </div>
          <p className="text-xl md:text-2xl font-bold tnum leading-none" style={{ color: s.ink }}>{s.value}</p>
          <p className="text-[9px] md:text-[10px] font-mono text-[var(--ink-faint)] mt-1 md:mt-1.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Start
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
    <div className="plate p-4 md:p-5 mb-4 md:mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono mb-3">Quick Start</p>
      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder="Describe what you want…"
            className="w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[8px] px-3 md:px-4 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--ink-faint)] transition-colors"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[8px] px-3 py-2.5 text-xs font-mono text-[var(--ink)] cursor-pointer w-full sm:w-auto"
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
      <div className="px-4 md:px-5 py-3 md:py-3.5 border-b agency-border flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <Clock className="w-4 h-4" style={{ color: 'var(--line-amber)' }} /> Approvals
        </h3>
        <span className="service-chip" style={{ ['--chip' as string]: 'var(--line-amber)' }}>{pending.length}</span>
      </div>
      {pending.slice(0, 3).map((t) => (
        <Link key={t.id} href={`/workspaces/${workspaceId}/modules/${t.moduleId}`} className="dense-row">
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-semibold truncate">{t.title || 'Untitled'}</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5">
              {t.status === 'running' ? 'agent working' : 'needs attention'}
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
function RecentArtifacts({ artifacts }: { artifacts: AuditArtifact[]; workspaceId: string }) {
  if (artifacts.length === 0) return null;

  return (
    <div className="plate overflow-hidden mb-4">
      <div className="px-4 md:px-5 py-3 md:py-3.5 border-b agency-border">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <Package className="w-4 h-4" style={{ color: 'var(--line-green)' }} /> Artifacts
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
// Power Agents
// ---------------------------------------------------------------------------
const ROLE_PRESETS: Record<string, { name: string; role: string; desc: string; icon: string }> = {
  crawlability_audit: { name: 'Crawlability', role: 'Crawler & Indexer', desc: 'Audits crawler access and indexation', icon: 'bot' },
  technical_foundations_audit: { name: 'Tech Foundations', role: 'Infra & Security', desc: 'Checks SSL, headers, and server infrastructure', icon: 'server' },
  on_page_audit: { name: 'On-Page', role: 'Meta & Content', desc: 'Reviews meta tags and content elements', icon: 'pen-tool' },
  content_quality_audit: { name: 'Content Quality', role: 'Readability & Depth', desc: 'Scores readability and content depth', icon: 'sparkles' },
  site_structure_audit: { name: 'Site Structure', role: 'Links & Hierarchy', desc: 'Analyzes internal linking and URL structure', icon: 'folder-tree' },
  performance_audit: { name: 'Performance', role: 'Lighthouse & Vitals', desc: 'Benchmarks Core Web Vitals', icon: 'activity' },
  product_content: { name: 'Product', role: 'PDP Copywriter', desc: 'Writes product detail page content', icon: 'database' },
  category_content: { name: 'Category', role: 'PLP Copywriter', desc: 'Writes category landing pages', icon: 'layers' },
  collection_content: { name: 'Collection', role: 'Curation Copywriter', desc: 'Writes collection page content', icon: 'bot' },
  brand_content: { name: 'Brand', role: 'Trust & Identity', desc: 'Crafts brand voice and trust signals', icon: 'shield' },
  home_content: { name: 'Home', role: 'Homepage Copy', desc: 'Writes homepage hero and sections', icon: 'layout-dashboard' },
  custom_page_content: { name: 'Custom', role: 'Any Page Type', desc: 'Writes content for any custom page', icon: 'terminal' },
};

interface LiveAgent {
  id: string;
  name: string;
  role: string;
  desc: string;
  icon: string;
  isContent: boolean;
}

function usePowerAgents() {
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  useEffect(() => {
    fetch('/api/power-agents')
      .then((r) => r.ok ? r.json() : [])
      .then((list: { id: string }[]) => {
        setAgents(list.map((a) => {
          const preset = ROLE_PRESETS[a.id];
          const isContent = a.id.endsWith('_content');
          const short = a.id.replace(/_(audit|content)$/, '');
          return {
            id: a.id,
            name: preset?.name ?? short.replace(/_/g, ' '),
            role: preset?.role ?? 'Specialist',
            desc: preset?.desc ?? 'Agent available for this task',
            icon: preset?.icon ?? 'bot',
            isContent,
          };
        }));
      })
      .catch(() => setAgents([]));
  }, []);
  return agents;
}

function AgentDirectory({ workspaceId }: { workspaceId: string; magentoConnected: boolean }) {
  const agents = usePowerAgents();
  const audit = agents.filter((a) => !a.isContent);
  const content = agents.filter((a) => a.isContent);

  const suites = [
    {
      label: 'SEO Audit Suite',
      count: audit.length,
      ink: 'var(--line-green)',
      icon: 'activity',
      desc: 'Performance, crawlability, site structure, on-page, content quality',
      preview: audit.slice(0, 3).map((a) => `@${a.name.replace(/\s/g, '_')}`).join('  '),
    },
    {
      label: 'Content Suite',
      count: content.length,
      ink: 'var(--line-amber)',
      icon: 'pen-tool',
      desc: 'Homepage, brand, product, category, collection, custom pages',
      preview: content.slice(0, 3).map((a) => `@${a.name.replace(/\s/g, '_')}`).join('  '),
    },
  ];

  return (
    <div className="plate overflow-hidden">
      <div className="px-4 md:px-5 py-3 md:py-3.5 border-b agency-border flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <Users className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> Power Agents
        </h3>
        <Link
          href={`/workspaces/${workspaceId}/power-agents`}
          className="text-[11px] font-mono text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors"
        >
          View All
        </Link>
      </div>
      <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suites.map((suite) => (
          <Link
            key={suite.label}
            href={`/workspaces/${workspaceId}/power-agents`}
            className="agency-card p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                  style={{ border: `1.5px solid ${suite.ink}`, color: suite.ink }}
                >
                  <DemoIcon name={suite.icon} className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">{suite.label}</p>
                  <p className="text-[10px] font-mono" style={{ color: suite.ink }}>{suite.count} agents</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--ink-faint)]" />
            </div>
            <p className="text-[11px] text-[var(--ink-dim)] leading-relaxed">{suite.desc}</p>
            {suite.preview && (
              <p className="text-[9px] font-mono text-[var(--ink-faint)] truncate">{suite.preview} …</p>
            )}
          </Link>
        ))}
        {agents.length === 0 && (
          <div className="col-span-full dense-row !cursor-default">
            <span className="flex-1 text-xs text-[var(--ink-faint)]">Loading agents…</span>
          </div>
        )}
      </div>
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
      <div className="px-4 md:px-5 py-3 md:py-3.5 border-b agency-border">
        <h3 className="text-xs font-semibold flex items-center gap-2 font-mono tracking-wide">
          <FileText className="w-4 h-4" style={{ color: 'var(--line-cobalt)' }} /> Activity
        </h3>
      </div>
      {feed.length === 0 ? (
        <div className="dense-row !cursor-default">
          <span className="flex-1 text-xs text-[var(--ink-faint)]">No activity yet</span>
        </div>
      ) : (
        feed.map((t) => {
          const ink = t.status === 'running' ? 'var(--line-cobalt)' : t.status === 'complete' ? 'var(--line-green)' : 'var(--ink-faint)';
          return (
            <Link key={t.id} href={`/workspaces/${workspaceId}/modules/${t.moduleId}`} className="dense-row">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ink }} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-xs font-semibold truncate">{t.title || 'Untitled'}</span>
                <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5 truncate">
                  {t.moduleId} · {t.docCount} artifacts
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
      <div className="px-4 md:px-5 py-3 md:py-3.5 border-b agency-border flex items-center justify-between">
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
    <div className="w-full flex flex-col pb-6">
      {/* Greeting */}
      <div className="flex flex-col items-center text-center mb-4 md:mb-6 rise">
        <BrandMark className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3" />
        <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-1 md:mb-1.5 text-[var(--ink)]">
          {greeting()}, {displayName.split(' ')[0]}.
        </h2>
        <p className="text-[var(--ink-dim)] text-xs md:text-[13px]">What are we working on today?</p>
      </div>

      {/* Stats */}
      {!loading && <StatsRow data={data} />}

      {/* Quick Start */}
      <QuickStart workspaceId={workspaceId} />

      {/* Main content: stacked on mobile, side-by-side on lg */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col min-w-0">
          {!data.hasPersona && (
            <div
              className="agency-card p-3 md:p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              style={{ borderColor: 'color-mix(in srgb, var(--line-amber) 35%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 4%, transparent)' }}
            >
              <p className="text-xs text-[var(--ink-dim)] flex-1">
                <span className="font-bold" style={{ color: 'var(--line-amber)' }}>Brand Persona:</span>{' '}
                not configured — agents need your brand voice.
              </p>
              <Link href={`/workspaces/${workspaceId}/settings`} className="btn-outline !py-1.5 !px-3 !text-[10px] shrink-0 self-start sm:self-auto">
                Configure
              </Link>
            </div>
          )}
          <PendingApprovals threads={data.threads} workspaceId={workspaceId} />
          <RecentArtifacts artifacts={data.artifacts} workspaceId={workspaceId} />
          <AgentDirectory workspaceId={workspaceId} magentoConnected={data.connections.some((c) => c.sourceType === 'magento' && c.isActive)} />
        </div>

        <div className="lg:w-[280px] xl:w-[320px] shrink-0 flex flex-col gap-4">
          <ActivityFeed threads={data.threads} workspaceId={workspaceId} />
          <TeamSection workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
