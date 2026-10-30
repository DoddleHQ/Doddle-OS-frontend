'use client';

import { useMemo, useState } from 'react';
import {
  Search, ShieldCheck, BookOpen, FolderTree, GitBranch, ListChecks, LayoutTemplate, Siren,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useV3OS } from '@/lib/v3/osStore';
import { V3_MODULES, v3ModuleHref, type V3Module, type V3ModuleDomain } from '@/lib/v3/modules';
import { useV3Fetch, v3Ago, v3SessionStatus } from '@/lib/v3/data';
import { fetchV3PowerAgents } from '@/lib/v3/powerAgents';

const LAYERS: { id: string; label: string }[] = [
  { id: 'strategy', label: 'STRATEGY · BOUNDARIES & OPTIONS' },
  { id: 'structure', label: 'STRUCTURE · BLUEPRINTS & DOCS' },
  { id: 'execution', label: 'EXECUTION · DAILY DOING' },
  { id: 'review', label: 'REVIEW · OPTIMIZATION & FEEDBACK' },
];

const LTYPE_ICON: Record<string, typeof Search> = {
  policy: ShieldCheck, playbook: BookOpen, blueprint: FolderTree, workflow: GitBranch,
  checklist: ListChecks, template: LayoutTemplate, runbook: Siren,
};
const LTYPE_LABEL: Record<string, string> = {
  policy: 'Policy', playbook: 'Playbook', blueprint: 'Blueprint', workflow: 'Workflow',
  checklist: 'Checklist', template: 'Template', runbook: 'Runbook',
};

const LIB_META: Record<string, { layer: string; ltype: string; steps: number }> = {
  'brand-persona': { layer: 'strategy', ltype: 'playbook', steps: 3 },
  'brand-guardrails': { layer: 'strategy', ltype: 'policy', steps: 2 },
  'business-audit': { layer: 'structure', ltype: 'runbook', steps: 4 },
  'seo-cluster': { layer: 'structure', ltype: 'blueprint', steps: 3 },
  'content-factory': { layer: 'structure', ltype: 'blueprint', steps: 3 },
  'email-nurture': { layer: 'execution', ltype: 'workflow', steps: 4 },
  'social-growth': { layer: 'execution', ltype: 'template', steps: 3 },
  'ads-execution': { layer: 'execution', ltype: 'workflow', steps: 3 },
  'saas-launch-ops': { layer: 'execution', ltype: 'checklist', steps: 5 },
  'analytics-action': { layer: 'review', ltype: 'checklist', steps: 3 },
};

const DOMAIN_SUITES: Partial<Record<V3ModuleDomain, string[]>> = {
  seo: ['SEO Audit Suite'], content: ['Website Content Suite', 'Shopify Suite'], social: ['WordPress Suite'],
  ads: ['Shopify Suite'], analytics: ['DevOps Suite'], ops: ['GitOps Suite', 'DevOps Suite'], brand: ['Website Content Suite'],
};

export function BlueprintsWindow() {
  const router = useRouter();
  const workspaceId = useV3OS((s) => s.workspaceId);
  const feed = useV3OS((s) => s.sessionFeed);
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [q, setQ] = useState('');
  const [layer, setLayer] = useState('all');
  const [detail, setDetail] = useState<string | null>(null);

  const statusOf = useMemo(() => {
    const roster = agents.data ?? [];
    const out = new Map<string, { st: 'running' | 'done' | null; pct: number }>();
    V3_MODULES.forEach((m) => {
      const suites = DOMAIN_SUITES[m.domain] ?? [];
      const keys = roster.filter((a) => suites.includes(a.suite)).map((a) => a.key);
      const statuses = feed.filter((s) => s.agentKey && keys.includes(s.agentKey)).map((s) => v3SessionStatus(s));
      if (statuses.includes('running')) out.set(m.slug, { st: 'running', pct: 40 });
      else if (statuses.includes('attention')) out.set(m.slug, { st: 'running', pct: 67 });
      else if (statuses.includes('done')) out.set(m.slug, { st: 'done', pct: 100 });
      else out.set(m.slug, { st: null, pct: 0 });
    });
    return out;
  }, [agents.data, feed]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return V3_MODULES.map((m) => ({ m, ...(LIB_META[m.slug] ?? { layer: 'execution', ltype: 'blueprint', steps: 3 }) }))
      .filter((x) => (layer === 'all' || x.layer === layer) &&
        (!needle || `${x.m.name} ${x.m.blurb} ${x.ltype}`.toLowerCase().includes(needle)));
  }, [q, layer]);

  const open: { m: V3Module; meta: { layer: string; ltype: string; steps: number } } | null = useMemo(() => {
    if (!detail) return null;
    const m = V3_MODULES.find((x) => x.slug === detail);
    return m ? { m, meta: LIB_META[m.slug] ?? { layer: 'execution', ltype: 'blueprint', steps: 3 } } : null;
  }, [detail]);

  const openRuns = useMemo(() => {
    if (!open) return [];
    const suites = DOMAIN_SUITES[open.m.domain] ?? [];
    const keys = (agents.data ?? []).filter((a) => suites.includes(a.suite)).map((a) => a.key);
    return feed.filter((s) => s.agentKey && keys.includes(s.agentKey)).slice(0, 5);
  }, [open, agents.data, feed]);

  return (
    <section id="win-library" className="os-window glass page" data-app="library">
      <div className="titlebar">
        <div className="traffic">
          <button className="t-close" onClick={() => router.push('/v3')} aria-label="Close" />
        </div>
        <strong className="text-sm">Blueprints</strong>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          catalog · pick a vehicle
        </span>
      </div>
      <div className="win-body space-y-3" id="lib-body">
        <div className="text-center" style={{ padding: '26px 0 6px' }}>
          <h2 className="text-2xl font-bold">Blueprint Library</h2>
          <p className="text-sm font-mono mt-1" style={{ color: 'var(--muted)' }}>
            Boundaries, pipelines, checklists — pick a vehicle to launch it.
          </p>
        </div>
        <div className="askbar" style={{ maxWidth: 560, margin: '14px auto 0' }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blueprints, SOPs, playbooks…"
            aria-label="Search the library"
          />
          <span className="chip" id="lib-count">{`${items.length} item${items.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-center font-mono text-xs" id="lib-layers" style={{ marginTop: 10 }}>
          {['all', ...LAYERS.map((l) => l.id)].map((l) => (
            <button key={l} className={`fchip${layer === l ? ' on' : ''}`} onClick={() => setLayer(l)}>
              {l}
            </button>
          ))}
        </div>

        {!open && (
          <div className="blueprint-grid cat-grid" id="lp-categories" style={{ marginTop: 14 }}>
            {LAYERS.map((L) => {
              const inLayer = items.filter((x) => x.layer === L.id);
              if (inLayer.length === 0) return null;
              return (
                <div key={L.id} style={{ gridColumn: '1 / -1' }}>
                  <p className="pane-label" style={{ margin: '14px 0 8px' }}>{L.label}</p>
                  <div className="blueprint-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    {inLayer.map(({ m, ltype, steps }) => {
                      const s = statusOf.get(m.slug);
                      const badge = s?.st === 'done'
                        ? <span className="task-category-badge" style={{ background: '#10b981' }}>done</span>
                        : s?.st === 'running'
                          ? <span className="task-category-badge" style={{ background: 'var(--accent)' }}>{`running ${s.pct}%`}</span>
                          : <span className="task-category-badge" style={{ background: 'var(--muted)' }}>idle</span>;
                      const Icon = LTYPE_ICON[ltype] ?? FolderTree;
                      return (
                        <button key={m.slug} className="bento-item text-left" onClick={() => setDetail(m.slug)}>
                          <div className="flex items-center justify-between">
                            <Icon size={24} className="mb-3" style={{ color: 'var(--accent)' }} />
                            {badge}
                          </div>
                          <p className="font-bold">{m.name}</p>
                          <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                            {`${LTYPE_LABEL[ltype] ?? ltype} · ${steps} steps`}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{m.blurb}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="font-mono text-xs" style={{ color: 'var(--muted)', marginTop: 12 }}>
                Nothing matches — clear search or pick another layer.
              </p>
            )}
          </div>
        )}

        {open && (
          <div id="lp-lib-detail" className="pane" style={{ marginBottom: 12 }}>
            <button className="back-link" onClick={() => setDetail(null)}>← library</button>
            <h3 id="libd-title" className="font-bold text-lg mt-2">{open.m.name}</h3>
            <p id="libd-desc" className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>{open.m.blurb}</p>
            <div id="libd-chips" className="flex gap-2 flex-wrap mt-2">
              <span className="task-category-badge" style={{ background: 'var(--accent)' }}>{LTYPE_LABEL[open.meta.ltype] ?? open.meta.ltype}</span>
              <span className="task-category-badge" style={{ background: 'var(--muted)' }}>engine · graph</span>
              <span className="task-category-badge" style={{ background: 'var(--muted)' }}>{`${open.meta.steps} stages`}</span>
            </div>
            <div id="libd-runs" className="mt-3">
              <div className="table-glass">
                <p className="pane-label" style={{ padding: '10px 12px 0' }}>RECENT RUNS · THIS VEHICLE&apos;S AGENTS</p>
                {openRuns.length > 0 ? openRuns.map((s) => (
                  <div className="hrow" key={s.id}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: v3SessionStatus(s) === 'running' ? 'var(--accent)' : v3SessionStatus(s) === 'attention' ? 'var(--amber)' : '#10b981', flexShrink: 0 }} />
                    <div className="meta">
                      <p className="font-mono font-bold text-xs">{s.title}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {`${v3SessionStatus(s)} · ${v3Ago(s.updatedAt ?? s.createdAt)}`}
                      </p>
                    </div>
                    <span className="chip">{v3SessionStatus(s)}</span>
                  </div>
                )) : (
                  <p className="font-mono text-xs" style={{ color: 'var(--muted)', padding: 10 }}>No runs yet — launch it to start the first.</p>
                )}
              </div>
            </div>
            <div id="libd-action" className="mt-3">
              <button className="btn-deploy" onClick={() => window.open(v3ModuleHref(open.m.slug, workspaceId), '_blank')}>
                Launch this vehicle →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
