'use client';

import { useMemo, useState } from 'react';
import { Search, Copy, Check, Lock, Unlock, Download, Layers } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, isV3SessionUnread } from '@/lib/v3/data';
import { SUITE_TINT, fetchV3PowerAgents, v3AgentByKey } from '@/lib/v3/powerAgents';
import type { V3Session } from '@/lib/v3/powerAgents';

/** Deterministic demo risk score for the design (backend has none yet). */
function riskOf(s: V3Session): number {
  let h = 0;
  for (const c of s.id + s.title) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 12 + (h % 78);
}

/**
 * History — the v13 artefacts gallery over the real finished sessions:
 * zebra rows with category badges, risk bars (design-forward), seal/export
 * reactors. Export writes a real .md file; copy is the clipboard.
 */
export function HistoryWindow() {
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const agents = useV3Fetch(fetchV3PowerAgents, []);
  const roster = agents.data ?? [];
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sealed, setSealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return feed.filter((s) => {
      if (!needle) return true;
      const a = v3AgentByKey(roster, s.agentKey ?? null);
      return `${s.title} ${a?.handle ?? ''} ${a?.suite ?? ''}`.toLowerCase().includes(needle);
    });
  }, [feed, q, roster]);

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleSeal = (id: string) =>
    setSealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Real export: a markdown record of the finished run. */
  function exportArtifact(s: V3Session) {
    const a = v3AgentByKey(roster, s.agentKey ?? null);
    const md = [
      `# ${s.title}`,
      '',
      `- agent: ${a ? `${a.handle} (${a.suite})` : 'unknown'}`,
      `- thread: ${s.id}`,
      `- created: ${s.createdAt ?? '—'}`,
      `- updated: ${s.updatedAt ?? '—'}`,
      `- state: ${isV3SessionUnread(s) ? 'awaiting review' : 'reviewed'}${sealed.has(s.id) ? ' · sealed' : ''}`,
      '',
      'Exported from DoddleOS v3 · History.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${s.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyArtifact(s: V3Session) {
    try {
      navigator.clipboard?.writeText(s.id);
      setCopied(s.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (feedError) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--amber)', padding: 24 }}>
        session feed unavailable ({feedError}) — finished work lands here when it returns.
      </p>
    );
  }

  return (
    <div>
      <div className="askbar" style={{ marginBottom: 10 }}>
        <Search size={16} style={{ color: 'var(--muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search finished work…" aria-label="Search finished work" />
        <span className="chip font-mono">
          {selected.size > 0 ? `${selected.size} selected` : `${visible.length} item${visible.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {visible.length === 0 ? (
        <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          Nothing completed here yet. Finished runs land in this gallery with their artefacts.
        </p>
      ) : (
        visible.map((s) => {
          const a = v3AgentByKey(roster, s.agentKey ?? null);
          const tint = a ? SUITE_TINT[a.suite] : undefined;
          const risk = riskOf(s);
          const rc = risk > 66 ? '#ef4444' : risk > 33 ? 'var(--amber)' : '#10b981';
          return (
            <div key={s.id} className="hrow v3-hrow" style={{ cursor: 'default' }}>
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggleSel(s.id)}
                aria-label={`Select ${s.title}`}
                style={{ accentColor: 'var(--accent)' }}
              />
              <Layers size={14} style={{ color: tint?.color ?? 'var(--muted)', flexShrink: 0 }} />
              <div className="meta">
                <p className="font-mono font-bold text-xs">
                  {s.title}
                  <span className="v3-cat-badge font-mono" style={{ background: tint?.color ?? 'var(--muted)' }}>
                    {a?.suite.replace(' Suite', '') ?? 'session'}
                  </span>
                </p>
                <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                  {v3Ago(s.updatedAt ?? s.createdAt)}
                  {a ? ` · ${a.handle}` : ''}
                  {isV3SessionUnread(s) ? ' · awaiting review' : ' · reviewed'}
                </p>
                <div className="v3-risk" aria-label="demo risk score">
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>RISK</span>
                  <span className="bar">
                    <span style={{ width: `${risk}%`, background: rc }} />
                  </span>
                  <span className="font-mono" style={{ fontSize: 9 }}>{risk}</span>
                </div>
              </div>
              <button className="chip shrink-0" onClick={() => exportArtifact(s)} aria-label={`Export ${s.title}`}>
                <Download size={10} /> export
              </button>
              <button
                className={`v3-lockbtn shrink-0${sealed.has(s.id) ? ' locked' : ''}`}
                onClick={() => toggleSeal(s.id)}
                aria-label={sealed.has(s.id) ? `Unseal ${s.title}` : `Seal ${s.title}`}
                aria-pressed={sealed.has(s.id)}
              >
                {sealed.has(s.id) ? <Lock size={10} /> : <Unlock size={10} />} {sealed.has(s.id) ? 'sealed' : 'seal'}
              </button>
              <button className="chip shrink-0" onClick={() => copyArtifact(s)} aria-label={`Copy ${s.title} thread id`}>
                {copied === s.id ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
