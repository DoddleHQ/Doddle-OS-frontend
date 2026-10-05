'use client';

import { useMemo, useState } from 'react';
import { Search, ArrowUpRight, Sparkles } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { V3_DOMAINS, V3_MODULES, v3ModuleHref, v3SuggestModules, type V3ModuleDomain } from '@/lib/v3/modules';

/**
 * Launchpad — define work, we suggest the module (the v13 vehicle picker),
 * then the real module catalog: every card links to a live route of this
 * app. No seeded activity, no fake counts.
 */
export function LaunchpadWindow() {
  const workspaceId = useV3OS((s) => s.workspaceId);
  const [brief, setBrief] = useState('');
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState<V3ModuleDomain | 'all'>('all');

  const suggestions = useMemo(() => v3SuggestModules(brief), [brief]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return V3_MODULES.filter((m) => {
      if (domain !== 'all' && m.domain !== domain) return false;
      if (!needle) return true;
      return `${m.name} ${m.blurb} ${m.tags.join(' ')} ${V3_DOMAINS[m.domain]}`.toLowerCase().includes(needle);
    });
  }, [q, domain]);

  const domains = useMemo(() => {
    const by = new Map<V3ModuleDomain, number>();
    V3_MODULES.forEach((m) => by.set(m.domain, (by.get(m.domain) ?? 0) + 1));
    return [...by.entries()];
  }, []);

  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 6 }}>
        Define work — we pick the module
      </p>
      <div className="askbar" style={{ marginBottom: 10 }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe the outcome… e.g. keyword cluster for winter tires, audit the checkout funnel"
          aria-label="Describe the outcome"
        />
      </div>

      {/* vehicle picker: live ranked suggestions from the real catalog */}
      {suggestions.length > 0 && (
        <div className="v3-vehicle" role="list" aria-label="Suggested modules">
          {suggestions.map(({ module: m, score }, i) => (
            <a
              key={m.slug}
              role="listitem"
              className="v3-vehicle-pick"
              href={v3ModuleHref(m.slug, workspaceId)}
              target="_blank"
              rel="noreferrer"
            >
              <span className="v3-vehicle-rank font-mono">{i === 0 ? 'best' : `#${i + 1}`}</span>
              <m.icon size={16} />
              <span className="min-w-0">
                <span className="block font-mono font-bold text-xs truncate">{m.name}</span>
                <span className="block font-mono text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                  {V3_DOMAINS[m.domain]} · match {score}
                </span>
              </span>
              <ArrowUpRight size={12} className="ml-auto shrink-0" style={{ color: 'var(--muted)' }} />
            </a>
          ))}
        </div>
      )}

      <div className="askbar" style={{ marginBottom: 10, marginTop: suggestions.length ? 10 : 0 }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules… try 'audit', 'email', 'launch'"
          aria-label="Search modules"
        />
        <span className="chip font-mono">{visible.length}/{V3_MODULES.length}</span>
      </div>
      <div className="v3-fchips" role="group" aria-label="Filter modules by domain">
        <button
          type="button"
          className={`fchip${domain === 'all' ? ' on' : ''}`}
          aria-pressed={domain === 'all'}
          onClick={() => setDomain('all')}
        >
          all · {V3_MODULES.length}
        </button>
        {domains.map(([d, n]) => (
          <button
            key={d}
            type="button"
            className={`fchip${domain === d ? ' on' : ''}`}
            aria-pressed={domain === d}
            onClick={() => setDomain(domain === d ? 'all' : d)}
          >
            {V3_DOMAINS[d].toLowerCase()} · {n}
          </button>
        ))}
      </div>

      <div className="roster-grid v3-module-grid">
        {visible.map((m) => (
          <a
            key={m.slug}
            className="bento-item agent-card v3-module-card"
            href={v3ModuleHref(m.slug, workspaceId)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${m.name} — ${m.blurb}`}
          >
            <span className="profile-banner" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }} aria-hidden="true">
              <span className="profile-dot" style={{ background: 'var(--accent)' }} />
            </span>
            <span className="profile-avatar" aria-hidden="true">
              <m.icon size={22} />
            </span>
            <span className="profile-id min-w-0">
              <span className="block font-mono font-bold text-xs truncate">{m.name}</span>
              <span className="block font-mono text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                {V3_DOMAINS[m.domain]} module
              </span>
            </span>
            <span className="v3-module-blurb font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
              {m.blurb}
            </span>
            <span className="profile-stats font-mono">
              <span>
                <strong>{m.tags.slice(0, 3).join(' · ')}</strong>
              </span>
            </span>
            <span className="btn-deploy profile-deploy" aria-hidden="true">
              Open module <ArrowUpRight size={10} style={{ display: 'inline' }} />
            </span>
            <span className="back-link profile-open" aria-hidden="true">
              live route ↗
            </span>
          </a>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={12} /> No module matches “{q}” — try the deploy prompt above or the agents roster.
        </p>
      )}
    </div>
  );
}
