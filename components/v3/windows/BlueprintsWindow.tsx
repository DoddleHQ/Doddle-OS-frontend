'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { V3_MODULES, v3ModuleHref, type V3ModuleDomain } from '@/lib/v3/modules';

/** v13 library layers — the four registers of the operating system. */
const LAYERS: { id: V3Layer; label: string }[] = [
  { id: 'strategy', label: 'STRATEGY · BOUNDARIES & OPTIONS' },
  { id: 'structure', label: 'STRUCTURE · BLUEPRINTS & DOCS' },
  { id: 'execution', label: 'EXECUTION · DAILY DOING' },
  { id: 'review', label: 'REVIEW · OPTIMIZATION LOOP' },
];
type V3Layer = 'strategy' | 'structure' | 'execution' | 'review';

/** which library layer each module domain belongs to. */
const LAYER_OF: Record<V3ModuleDomain, V3Layer> = {
  brand: 'strategy',
  ops: 'strategy',
  seo: 'structure',
  content: 'structure',
  social: 'execution',
  ads: 'execution',
  analytics: 'review',
};

/**
 * Blueprints — the v13 library page: layered catalog of the REAL module
 * routes with search and layer filters. Every card opens a live page.
 */
export function BlueprintsWindow() {
  const workspaceId = useV3OS((s) => s.workspaceId);
  const [q, setQ] = useState('');
  const [layer, setLayer] = useState<V3Layer | 'all'>('all');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return V3_MODULES.filter((m) => {
      if (layer !== 'all' && LAYER_OF[m.domain] !== layer) return false;
      if (!needle) return true;
      return `${m.name} ${m.blurb} ${m.tags.join(' ')}`.toLowerCase().includes(needle);
    });
  }, [q, layer]);

  const byLayer = useMemo(
    () => LAYERS.map(({ id, label }) => ({ id, label, items: visible.filter((m) => LAYER_OF[m.domain] === id) })),
    [visible],
  );

  return (
    <div>
      <p className="text-center font-bold text-lg">Blueprints · library</p>
      <p className="text-center font-mono text-xs mt-1" style={{ color: 'var(--muted)' }}>
        The layered operating system — every entry links to a live module route.
      </p>
      <div className="askbar" style={{ maxWidth: 560, margin: '14px auto 0' }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search blueprints, SOPs, playbooks…"
          aria-label="Search the library"
        />
        <span className="chip font-mono">{visible.length} item{visible.length === 1 ? '' : 's'}</span>
      </div>
      <div className="v3-fchips" role="group" aria-label="Filter by layer" style={{ justifyContent: 'center', marginTop: 10 }}>
        <button type="button" className={`fchip${layer === 'all' ? ' on' : ''}`} aria-pressed={layer === 'all'} onClick={() => setLayer('all')}>
          all · {V3_MODULES.length}
        </button>
        {LAYERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`fchip${layer === id ? ' on' : ''}`}
            aria-pressed={layer === id}
            onClick={() => setLayer(layer === id ? 'all' : id)}
          >
            {id} · {V3_MODULES.filter((m) => LAYER_OF[m.domain] === id).length}
          </button>
        ))}
      </div>

      {byLayer.map(({ id, label, items }) =>
        items.length === 0 ? null : (
          <div key={id} style={{ marginTop: 14 }}>
            <p className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: 'var(--muted)', marginBottom: 6 }}>
              {label}
            </p>
            <div className="roster-grid">
              {items.map((m) => (
                <a
                  key={m.slug}
                  className="bento-item v3-lib-card"
                  href={v3ModuleHref(m.slug, workspaceId)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${m.name} — ${m.blurb}`}
                >
                  <div className="flex items-center justify-between">
                    <m.icon size={24} className="mb-3" style={{ color: 'var(--accent)' }} />
                    <span className="task-category-badge" style={{ background: 'var(--accent)' }}>
                      {LAYER_OF[m.domain]}
                    </span>
                  </div>
                  <p className="font-bold">{m.name}</p>
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
                    {m.domain} module · {m.tags.length} steps
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {m.blurb}
                  </p>
                </a>
              ))}
            </div>
          </div>
        ),
      )}
      {visible.length === 0 && (
        <p className="font-mono text-xs text-center" style={{ color: 'var(--muted)', marginTop: 20 }}>
          Nothing in the library matches “{q}”.
        </p>
      )}
    </div>
  );
}
