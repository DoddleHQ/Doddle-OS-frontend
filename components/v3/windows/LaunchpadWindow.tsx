'use client';

import { useMemo, useState } from 'react';
import { Search, Code2, Database, PenTool, FolderArchive, Palette, Layers, Plus, Cpu } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { V3_MODULES, v3ModuleHref, v3SuggestModules, type V3ModuleDomain } from '@/lib/v3/modules';
import { v3Ago } from '@/lib/v3/data';
import { Glide } from '@/components/v3/ui/Glide';
import { COMPOSER_MODELS, COMPOSER_MODES } from '@/components/v3/ui/Composer';

/** v13's six task categories, exact — each routes to a real module page. */
const CATS: { cat: string; icon: typeof Search; color: string; label: string; title: string; sub: string; to: V3ModuleDomain }[] = [
  { cat: 'research', icon: Search, color: 'var(--task-research)', label: 'Research', title: 'Research & articles', sub: 'Investigate, compare, summarize.', to: 'seo' },
  { cat: 'code', icon: Code2, color: 'var(--task-code)', label: 'Code', title: 'Code review & PRs', sub: 'Review, audit, fix plans.', to: 'ops' },
  { cat: 'data', icon: Database, color: 'var(--task-data)', label: 'Data', title: 'Data analysis & pipelines', sub: 'Connect, analyze, report.', to: 'analytics' },
  { cat: 'writing', icon: PenTool, color: 'var(--task-writing)', label: 'Writing', title: 'Draft & content', sub: 'Outline, draft, polish.', to: 'content' },
  { cat: 'admin', icon: FolderArchive, color: 'var(--task-admin)', label: 'Admin', title: 'Admin & organization', sub: 'Files, lists, tidy-ups.', to: 'brand' },
  { cat: 'design', icon: Palette, color: 'var(--task-design)', label: 'Design', title: 'Design & assets', sub: 'Briefs, packs, reviews.', to: 'social' },
];

/**
 * Launchpad — the v13 launcher view, exact DOM: centered hero, the composer
 * (model + mode + blueprint glides, >_ start), the vehicle pane (matched
 * blueprint + swarm + recent threads), and the six category cards.
 */
export function LaunchpadWindow() {
  const workspaceId = useV3OS((s) => s.workspaceId);
  const feed = useV3OS((s) => s.sessionFeed);
  const { viewThread } = useV3OS.getState();
  const [brief, setBrief] = useState('');

  const suggestions = useMemo(() => v3SuggestModules(brief), [brief]);
  const best = suggestions[0]?.module ?? null;
  const recent = feed.slice(0, 4);

  function launch() {
    if (!best) return;
    window.open(v3ModuleHref(best.slug, workspaceId), '_blank');
  }

  return (
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
          onChange={(e) => setBrief(e.target.value)}
        />
        <div className="composer-bar">
          <button className="composer-icon" title="Attach files" aria-label="Attach files">
            <Plus size={16} />
          </button>
          <Glide value="GPT-5" options={COMPOSER_MODELS} icon={Cpu} ariaLabel="Model" onChange={() => {}} />
          <Glide value="default" options={COMPOSER_MODES} ariaLabel="Mode" onChange={() => {}} />
          <Glide
            value={best?.slug ?? 'blueprint'}
            options={V3_MODULES.map((m) => ({ value: m.slug, label: m.name }))}
            icon={Layers}
            ariaLabel="Pick a blueprint"
            onChange={() => {}}
          />
          <button className="btn-deploy" style={{ marginLeft: 'auto' }} title="Start (⏎)" onClick={launch}>
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
          <button className="btn-deploy" id="vehicle-launch-btn" onClick={launch}>
            Launch campaign →
          </button>
        </div>
        <div className="space-y-2" style={{ marginTop: 10 }}>
          {suggestions.length > 0 ? (
            suggestions.map(({ module: m, score }, i) => (
              <div key={m.slug} className="hrow" style={{ cursor: 'pointer' }} onClick={() => window.open(v3ModuleHref(m.slug, workspaceId), '_blank')}>
                <div className="min-w-0" style={{ flex: 1 }}>
                  <p className="font-mono font-bold text-xs">
                    {i === 0 ? '◆ ' : ''}
                    {m.name}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    {m.blurb}
                  </p>
                </div>
                <span className="task-category-badge" style={{ background: 'var(--accent)' }}>
                  match {score}
                </span>
              </div>
            ))
          ) : (
            <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
              Type above — the matched blueprint and its agent swarm appear here.
            </p>
          )}
        </div>
        <div className="table-glass" style={{ marginTop: 8 }}>
          <div>
            {recent.length > 0 ? (
              recent.map((s) => (
                <div key={s.id} className="hrow" style={{ cursor: 'pointer' }} onClick={() => s.agentKey && viewThread(s.agentKey, s.id)}>
                  <div className="min-w-0" style={{ flex: 1 }}>
                    <p className="font-mono font-bold text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title}
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      session · {v3Ago(s.updatedAt ?? s.createdAt)}
                    </p>
                  </div>
                  <span className="chip">open</span>
                </div>
              ))
            ) : (
              <p className="font-mono text-[10px]" style={{ color: 'var(--muted)', padding: 8 }}>
                recent workspace threads land here
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="blueprint-grid cat-grid" id="lp-categories">
        {CATS.map(({ cat, icon: Icon, color, label, title, sub, to }) => {
          const target = V3_MODULES.find((m) => m.domain === to);
          return (
            <button
              key={cat}
              className="bento-item text-left cat-card"
              data-cat={cat}
              onClick={() => target && window.open(v3ModuleHref(target.slug, workspaceId), '_blank')}
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
  );
}
