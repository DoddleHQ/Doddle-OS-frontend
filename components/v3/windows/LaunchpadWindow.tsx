'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Code2, Database, PenTool, FolderArchive, Palette, Layers } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { V3_MODULES, v3ModuleHref, v3SuggestModules, type V3ModuleDomain, type V3Module } from '@/lib/v3/modules';
import { v3Ago, v3SessionStatus } from '@/lib/v3/data';
import { fetchV3PowerAgents, v3AgentByKey, SUITE_TINT, type V3Suite } from '@/lib/v3/powerAgents';
import { useV3Fetch } from '@/lib/v3/data';
import { Glide } from '@/components/v3/ui/Glide';
import { COMPOSER_MODES } from '@/components/v3/ui/Composer';

/** v13's six task categories, exact markup. */
const CATS: { cat: string; icon: typeof Search; color: string; label: string; title: string; sub: string; to: V3ModuleDomain }[] = [
  { cat: 'research', icon: Search, color: 'var(--task-research)', label: 'Research', title: 'Research & articles', sub: 'Investigate, compare, summarize.', to: 'seo' },
  { cat: 'code', icon: Code2, color: 'var(--task-code)', label: 'Code', title: 'Code review & PRs', sub: 'Review, audit, fix plans.', to: 'ops' },
  { cat: 'data', icon: Database, color: 'var(--task-data)', label: 'Data', title: 'Data analysis & pipelines', sub: 'Connect, analyze, report.', to: 'analytics' },
  { cat: 'writing', icon: PenTool, color: 'var(--task-writing)', label: 'Writing', title: 'Draft & content', sub: 'Outline, draft, polish.', to: 'content' },
  { cat: 'admin', icon: FolderArchive, color: 'var(--task-admin)', label: 'Admin', title: 'Admin & organization', sub: 'Files, lists, tidy-ups.', to: 'brand' },
  { cat: 'design', icon: Palette, color: 'var(--task-design)', label: 'Design', title: 'Design & assets', sub: 'Briefs, packs, reviews.', to: 'social' },
];

const DOMAIN_CAT: Record<V3ModuleDomain, string> = {
  seo: 'research', content: 'writing', social: 'design', ads: 'design', analytics: 'data', ops: 'code', brand: 'admin',
};

/** Design-forward stage names until modules expose their real step plans. */
const DOMAIN_STAGES: Record<V3ModuleDomain, string[]> = {
  seo: ['keyword clusters', 'briefs drafted', 'pages interlinked'],
  content: ['outline', 'draft', 'assemble'],
  social: ['calendar', 'creatives', 'schedule'],
  ads: ['audience', 'copy variants', 'launch'],
  analytics: ['connect sources', 'model', 'report'],
  ops: ['audit', 'fix plan', 'verify'],
  brand: ['voice', 'audience', 'positioning'],
};

const DOMAIN_SUITES: Partial<Record<V3ModuleDomain, V3Suite[]>> = {
  seo: ['SEO Audit Suite'],
  content: ['Website Content Suite', 'Shopify Suite'],
  social: ['WordPress Suite'],
  ads: ['Shopify Suite'],
  analytics: ['DevOps Suite'],
  ops: ['GitOps Suite', 'DevOps Suite'],
  brand: ['Website Content Suite'],
};

/**
 * Launchpad — the v13 win-launchpad page, exact DOM: solo glass window with
 * the "choose to begin" state chip, the launcher composer (model/mode/
 * blueprint glides, >_ start), the vehicle pane (matched blueprint stages +
 * swarm + live task threads from the workspace feed) and the six category
 * cards. Suggestions rank the real module library; Launch opens the module.
 */
export function LaunchpadWindow() {
  const router = useRouter();
  const workspaceId = useV3OS((s) => s.workspaceId);
  const feed = useV3OS((s) => s.sessionFeed);
  const { viewThread, selectAgent } = useV3OS.getState();
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  // deep links: ?type=research preselects a flow; ?ask= carries the dashboard
  // brief (carryAsk); ?bp= the blueprint pick; ?agent= the solo-deploy pick
  const searchParams = useSearchParams();
  const deepType = searchParams.get('type');
  const [brief, setBrief] = useState(
    () => searchParams.get('ask') ?? (deepType ? CATS.find((c) => c.cat === deepType)?.title ?? '' : ''),
  );
  const [mode, setMode] = useState('default');
  const [pickedSlug, setPickedSlug] = useState<string | null>(() => searchParams.get('bp'));
  const [soloAgent, setSoloAgent] = useState<string | null>(() => searchParams.get('agent'));

  const suggestions = useMemo(() => v3SuggestModules(brief), [brief]);
  const vehicle: V3Module | null = useMemo(() => {
    if (pickedSlug) return V3_MODULES.find((m) => m.slug === pickedSlug) ?? null;
    return suggestions[0]?.module ?? null;
  }, [pickedSlug, suggestions]);
  const stages = vehicle ? DOMAIN_STAGES[vehicle.domain] : [];
  const swarm = useMemo(() => {
    const roster = agents.data ?? [];
    const suites = (vehicle && DOMAIN_SUITES[vehicle.domain]) || [];
    const picked = roster.filter((a) => suites.includes(a.suite));
    return (picked.length ? picked : roster).slice(0, 3);
  }, [agents.data, vehicle]);
  const matchedCat = vehicle ? DOMAIN_CAT[vehicle.domain] : null;
  const threads = feed.slice(0, 4);

  const launch = () => {
    if (!vehicle) return;
    window.open(v3ModuleHref(vehicle.slug, workspaceId), '_blank');
  };
  const send = () => {
    if (vehicle) launch();
    else router.push('/v3/agents');
  };

  const lpState = vehicle ? `matched · ${vehicle.name}` : 'choose to begin';

  return (
    <section id="win-launchpad" className="os-window glass" style={{ left: '2%', top: '1%', width: 'min(1180px,96%)', maxHeight: '94%' }} data-app="launchpad">
      <div className="titlebar">
        <div className="traffic">
          <button className="t-close" onClick={() => router.push('/v3')} aria-label="Close" />
          <button className="t-min" aria-label="Minimize" />
          <button className="t-max" aria-label="Maximize" />
        </div>
        <strong className="text-sm">Launchpad</strong>
        <span id="lp-state" className="chip" style={{ marginLeft: 'auto' }}>
          {lpState}
        </span>
      </div>

      <div className="win-body space-y-3">
        <div id="lp-launcher-view">
          <div className="text-center" style={{ padding: '26px 0 18px' }}>
            <h2 className="text-2xl font-bold">What are you working on?</h2>
            <p className="text-sm font-mono mt-1" style={{ color: 'var(--muted)' }}>
              Describe it — we match the blueprint + agent.
            </p>
          </div>

          <div className="composer" style={{ marginBottom: 12 }} id="task-creator">
            <textarea
              className="composer-input"
              rows={3}
              placeholder="Describe the outcome… e.g. Research AI articles on recent vulnerabilities"
              aria-label="Describe the outcome"
              value={brief}
              onChange={(e) => {
                setBrief(e.target.value);
                setPickedSlug(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="composer-bar">
              <button type="button" className="composer-icon" title="Attach files" aria-label="Attach files">
                +
              </button>
              <Glide value={mode} options={COMPOSER_MODES} onChange={setMode} ariaLabel="Mode" />
              <Glide
                value={vehicle?.name ?? 'Blueprint'}
                options={V3_MODULES.map((m) => ({ value: m.name, label: m.name }))}
                icon={Layers}
                ariaLabel="Pick a blueprint"
                onChange={(name) => {
                  const m = V3_MODULES.find((x) => x.name === name);
                  if (m) setPickedSlug(m.slug);
                }}
              />
              {soloAgent && (
                <span id="lp-agent-chip" className="chip" style={{ borderColor: 'rgba(16,185,129,.5)' }}>
                  {`@${soloAgent} · solo deploy`}
                </span>
              )}
              <button type="button" className="btn-deploy" style={{ marginLeft: 'auto' }} onClick={send} title="Start (⏎)">
                &gt;_
              </button>
            </div>
          </div>

          {/* VEHICLE: matched blueprint + swarm + threads, below the input */}
          <div id="lp-vehicle" className="pane" style={{ borderColor: 'rgba(29,78,216,.35)', marginBottom: 12 }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="pane-label" style={{ margin: 0 }}>
                LAUNCH CAMPAIGN · BLUEPRINT + SWARM
              </p>
              <button
                className="btn-deploy"
                id="vehicle-launch-btn"
                onClick={launch}
                disabled={!vehicle}
                style={{ opacity: vehicle ? undefined : 0.45, cursor: vehicle ? undefined : 'not-allowed' }}
              >
                Launch campaign →
              </button>
            </div>
            <div id="vehicle-stages" className="space-y-2" style={{ marginTop: 10 }}>
              {vehicle ? (
                <>
                  <p className="pane-label">BLUEPRINTS · SELECT FOR THIS CAMPAIGN</p>
                  <button
                    className="hrow w-full text-left"
                    style={{ width: '100%', cursor: 'pointer' }}
                    onClick={launch}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <div className="meta">
                      <p className="font-mono text-xs font-bold">{`Full run — ${vehicle.name}`}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {`${stages.length} stages · end to end · ${vehicle.blurb}`}
                      </p>
                    </div>
                  </button>
                  <p className="pane-label" style={{ marginTop: 10 }}>{`MATCHED BLUEPRINT · ${vehicle.name.toUpperCase()}`}</p>
                  {stages.map((s, i) => {
                    const a = swarm[i % Math.max(swarm.length, 1)];
                    return (
                      <div className="hrow" key={s}>
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--muted)' }}>{i + 1}</span>
                        <div className="meta">
                          <p className="font-mono text-xs font-bold">{s}</p>
                        </div>
                        {a ? (
                          <span className="task-category-badge" style={{ background: 'var(--accent)' }}>{a.handle}</span>
                        ) : (
                          <span className="task-category-badge" style={{ background: 'var(--muted)' }}>✋ human</span>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="font-mono text-xs" style={{ color: 'var(--muted)', padding: '6px 2px' }}>
                  No blueprint selected — pick one from <strong>Blueprint ▾</strong> above, or describe your outcome and we’ll match it. Stages, swarm and threads appear here.
                </p>
              )}
            </div>
            <div id="vehicle-swarm" className="flex gap-2 flex-wrap items-center" style={{ marginTop: 10 }}>
              {vehicle && swarm.length > 0 && (
                <>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>Swarm:</span>
                  {swarm.map((a) => (
                    <span className="chip" key={a.key}>{a.handle}</span>
                  ))}
                </>
              )}
            </div>
            <div className="table-glass" style={{ marginTop: 8 }}>
              <div id="vehicle-threads">
                <p className="pane-label">{`TASK THREADS · ${threads.length ? `${threads.length} RUNNING · individual + multi-agent swarm` : 'NOTHING LAUNCHED YET'}`}</p>
                {threads.length > 0 ? (
                  threads.map((s) => {
                    const st = v3SessionStatus(s);
                    const a = v3AgentByKey(agents.data ?? [], s.agentKey ?? null);
                    const dot = st === 'running' ? 'var(--accent)' : st === 'attention' ? 'var(--amber)' : '#10b981';
                    return (
                      <div className="hrow" key={s.id} style={{ cursor: 'pointer' }} onClick={() => { if (s.agentKey) { viewThread(s.agentKey, s.id); router.push('/v3/agents'); } }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                        <div className="meta">
                          <p className="font-mono font-bold text-xs">{s.title}</p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                            {`${st} · ${a ? a.handle : 'agent'} · ${v3Ago(s.updatedAt ?? s.createdAt)}`}
                          </p>
                        </div>
                        <button className="chip" onClick={(e) => e.stopPropagation()}>open →</button>
                      </div>
                    );
                  })
                ) : (
                  <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                    Press Launch swarm — one thread per stage.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="blueprint-grid cat-grid" id="lp-categories">
            {CATS.map(({ cat, icon: Icon, color, label, title, sub, to }) => {
              const target = V3_MODULES.find((m) => m.domain === to);
              const on = deepType === cat || (!pickedSlug && matchedCat === cat);
              return (
                <button
                  key={cat}
                  className={`bento-item text-left cat-card${on ? ' on' : ''}`}
                  data-cat={cat}
                  onClick={() => {
                    setBrief(title);
                    setPickedSlug(target?.slug ?? null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={24} className="mb-3" style={{ color }} />
                    <span className="task-category-badge" style={{ background: color }}>
                      {label}
                    </span>
                  </div>
                  <p className="font-bold">{title}</p>
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                    {sub}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
