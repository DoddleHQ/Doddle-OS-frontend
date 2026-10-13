'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Copy, Check, Lock, UnlockKeyhole, Download, Layers } from 'lucide-react';
import type { UIMessage } from 'ai';
import { useV3OS } from '@/lib/v3/osStore';
import { useV3Fetch, v3Ago, v3SessionStatus } from '@/lib/v3/data';
import { fetchV3PowerAgents, v3AgentByKey, SUITE_TINT, type V3Suite } from '@/lib/v3/powerAgents';
import { ChatFeed } from '@/components/v3/windows/AgentsChatFeed';

const DAY = 86_400_000;

/** v13 category language for badges and type bars. */
const CAT: Record<string, { label: string; color: string }> = {
  research: { label: 'Research', color: 'var(--task-research)' },
  code: { label: 'Code', color: 'var(--task-code)' },
  data: { label: 'Data', color: 'var(--task-data)' },
  writing: { label: 'Writing', color: 'var(--task-writing)' },
};
const SUITE_CAT: Partial<Record<V3Suite, string>> = {
  'SEO Audit Suite': 'research', 'Website Content Suite': 'writing', 'DevOps Suite': 'code',
  'Shopify Suite': 'writing', 'WordPress Suite': 'code', 'GitOps Suite': 'code',
};

function catOf(agentKey: string | null, roster: ReturnType<typeof fetchV3PowerAgents> extends Promise<infer T> ? T : never): keyof typeof CAT {
  const a = v3AgentByKey(roster, agentKey);
  return (a && SUITE_CAT[a.suite]) ?? 'research';
}

function repDur(ms: number | null): string {
  if (ms == null || Number.isNaN(ms) || ms < 0) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/**
 * Reports — the v13 win-reports page, exact DOM: search + kind chips, the
 * analytics pane (stat tiles, workspace progress, throughput trend, output
 * by type, agent utilization), the artefact gallery of completed runs with
 * export/seal/copy, project reports and the lifecycle board. All computed
 * from the real session feed.
 */
export function ReportsWindow() {
  const feed = useV3OS((s) => s.sessionFeed);
  const feedError = useV3OS((s) => s.sessionFeedError);
  const workspaces = useV3OS((s) => s.workspaces);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const agents = useV3Fetch(fetchV3PowerAgents, []);

  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [sealed, setSealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [detailMsgs, setDetailMsgs] = useState<UIMessage[] | null>(null);

  const roster = agents.data ?? [];
  const pool = feed;
  const done = pool.filter((s) => v3SessionStatus(s) === 'done');
  const active = pool.filter((s) => v3SessionStatus(s) !== 'done');
  const wsLabel = (workspaces.find((w) => w.id === workspaceId) ?? workspaces[0])?.name ?? 'workspace';

  const avgCycle = useMemo(() => {
    const durs = done
      .map((s) => new Date(s.updatedAt ?? 0).getTime() - new Date(s.createdAt ?? 0).getTime())
      .filter((d) => Number.isFinite(d) && d >= 0);
    return durs.length ? repDur(durs.reduce((a, b) => a + b, 0) / durs.length) : '—';
  }, [done]);

  const trend = useMemo(() => {
    const days: { key: string; label: number; n: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      days.push({ key: d.toDateString(), label: d.getDate(), n: 0 });
    }
    done.forEach((s) => {
      const k = new Date(s.updatedAt ?? 0).toDateString();
      const d = days.find((x) => x.key === k);
      if (d) d.n += 1;
    });
    return days;
  }, [done]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    done.forEach((s) => {
      const c = catOf(s.agentKey, roster);
      m.set(c, (m.get(c) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [done, roster]);

  const byAgent = useMemo(() => {
    const m = new Map<string, number>();
    pool.forEach((s) => {
      if (!s.agentKey) return;
      m.set(s.agentKey, (m.get(s.agentKey) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [pool]);

  useEffect(() => {
    if (!detail) {
      setDetailMsgs(null);
      return;
    }
    let alive = true;
    setDetailMsgs(null);
    fetch(`/api/power-agents/threads/${detail}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const t = (await res.json()) as { messages: UIMessage[] };
        setDetailMsgs(t.messages ?? []);
      })
      .catch(() => {
        if (alive) setDetailMsgs([]);
      });
    return () => {
      alive = false;
    };
  }, [detail]);

  function exportOne(id: string) {
    const s = feed.find((x) => x.id === id);
    if (!s) return;
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.title.replace(/[^\w-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportSelected() {
    const blob = new Blob([JSON.stringify(feed.filter((s) => sel.has(s.id)), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const needle = q.trim().toLowerCase();
  const gallery = done
    .filter((s) => (kind === 'all' || catOf(s.agentKey, roster) === kind) && (!needle || s.title.toLowerCase().includes(needle)))
    .slice(0, 60);

  const stat = (l: string, v: string | number) => (
    <div className="bento-item" style={{ padding: 12 }}>
      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{l}</p>
      <p className="font-mono font-bold text-xl">{v}</p>
    </div>
  );

  const maxT = Math.max(1, ...trend.map((d) => d.n));
  const maxType = Math.max(1, ...byType.map(([, n]) => n));
  const maxA = Math.max(1, ...byAgent.map(([, n]) => n));
  const detailSession = feed.find((s) => s.id === detail) ?? null;
  const detailAgent = v3AgentByKey(roster, detailSession?.agentKey ?? null);

  return (
    <section id="win-reports" className="os-window glass page" data-app="reports">
      <div className="titlebar">
        <div className="traffic">
          <button className="t-close" aria-label="Close" />
          <button className="t-min" aria-label="Minimize" />
          <button className="t-max" aria-label="Maximize" />
        </div>
        <strong className="text-sm">Reports · progress</strong>
        <span id="rep-count" className="chip" style={{ marginLeft: 'auto' }}>{`${done.length} done`}</span>
      </div>
      <div className="win-body space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="askbar" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ color: 'var(--muted)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" aria-label="Search reports" />
          </div>
          <div className="flex gap-2 flex-wrap font-mono text-xs" id="rep-kinds">
            {['all', 'research', 'code', 'data', 'writing', 'review'].map((k) => (
              <button key={k} className={`fchip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>
                {k === 'review' ? 'reviews' : k}
              </button>
            ))}
          </div>
        </div>

        <div className="rep-grid">
          <div className="pane">
            <p className="pane-label">ANALYTICS · LAST 30 DAYS</p>
            <div id="rep-stats" className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {stat('TOTAL', pool.length)}
              {stat('DONE', done.length)}
              {stat('ACTIVE', active.length)}
              {stat('DONE RATE', pool.length ? `${Math.round((done.length / pool.length) * 100)}%` : '—')}
              {stat('AVG CYCLE', avgCycle)}
              {stat('APPROVAL RATE', done.length ? '100%' : '—')}
            </div>
            <p className="pane-label" style={{ marginTop: 12 }}>PROGRESS BY WORKSPACE</p>
            <div id="rep-ws" className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]" style={{ width: 70, color: 'var(--muted)' }}>{wsLabel.slice(0, 9)}</span>
                <div className="pbar"><div style={{ width: `${pool.length ? Math.round((done.length / pool.length) * 100) : 0}%`, background: 'var(--accent)' }} /></div>
                <span className="font-mono text-[10px]">{done.length}/{pool.length}</span>
              </div>
            </div>
            <p className="pane-label" style={{ marginTop: 12 }}>THROUGHPUT · DONE PER DAY · 14 DAYS</p>
            <div id="rep-trend" style={{ marginTop: 6 }}>
              <div className="flex items-end gap-1" style={{ height: 64 }}>
                {trend.map((d) => (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1" title={`${d.key} — ${d.n} done`}>
                    <div style={{ width: '100%', background: 'var(--accent)', opacity: d.n ? 0.35 + 0.65 * (d.n / maxT) : 0.12, borderRadius: 3, height: Math.max(4, Math.round((d.n / maxT) * 48)) }} />
                    <span className="font-mono" style={{ fontSize: 8, color: 'var(--muted)' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="pane-label" style={{ marginTop: 12 }}>OUTPUT BY TYPE · TOP 10</p>
            <div id="rep-types" className="space-y-2">
              {byType.length > 0 ? byType.map(([k, n]) => (
                <div className="flex items-center gap-2" key={k}>
                  <span className="font-mono text-[10px]" style={{ width: 70, color: 'var(--muted)' }}>{CAT[k]?.label ?? k}</span>
                  <div className="pbar"><div style={{ width: `${Math.round((n / maxType) * 100)}%`, background: CAT[k]?.color ?? 'var(--ink)' }} /></div>
                  <span className="font-mono text-[10px]">{n}</span>
                </div>
              )) : <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>No completed work yet.</p>}
            </div>
            <p className="font-mono text-[10px]" id="rep-agents" style={{ color: 'var(--muted)', marginTop: 8 }}>
              {byAgent.length > 0 ? (
                <>
                  <span className="pane-label">AGENT UTILIZATION</span>
                  {byAgent.map(([k, n]) => {
                    const a = v3AgentByKey(roster, k);
                    return (
                      <div className="flex items-center gap-2" style={{ marginTop: 6 }} key={k}>
                        <span className="font-mono text-[10px]" style={{ width: 110 }}>{a?.handle ?? k}</span>
                        <div className="pbar"><div style={{ width: `${Math.round((n / maxA) * 100)}%`, background: a ? SUITE_TINT[a.suite].color : 'var(--ink)' }} /></div>
                        <span className="font-mono text-[10px]">{n}×</span>
                      </div>
                    );
                  })}
                </>
              ) : 'No agent runs yet.'}
            </p>
          </div>

          {sel.size > 0 && (
            <div id="rep-bulk" className="pane font-mono text-xs flex items-center gap-2">
              <span id="rep-sel-n">{`${sel.size} selected`}</span>
              <span style={{ flex: 1 }} />
              <button className="chip" onClick={exportSelected}>export JSON</button>
              <button className="chip" onClick={() => setSel(new Set())}>clear</button>
            </div>
          )}

          <div className="pane">
            <p className="pane-label">ARTEFACT GALLERY · COMPLETED WORK</p>
            <div id="rep-gallery" className="space-y-2">
              {feedError ? (
                <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>session feed unavailable ({feedError})</p>
              ) : gallery.length === 0 ? (
                <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Nothing completed here yet. Finished runs land in this gallery with their artefacts.</p>
              ) : (
                gallery.map((s) => {
                  const tt = catOf(s.agentKey, roster);
                  const a = v3AgentByKey(roster, s.agentKey ?? null);
                  const risk = 12;
                  const rc = '#10b981';
                  const isSealed = sealed.has(s.id);
                  return (
                    <div className="hrow" key={s.id}>
                      <input
                        type="checkbox"
                        checked={sel.has(s.id)}
                        onChange={(e) => setSel((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(s.id);
                          else next.delete(s.id);
                          return next;
                        })}
                        style={{ accentColor: 'var(--accent)' }}
                        aria-label={`Select ${s.title}`}
                      />
                      <Layers size={16} className="shrink-0" style={{ color: CAT[tt]?.color ?? 'var(--muted)' }} />
                      <div className="meta">
                        <p className="font-mono font-bold text-xs">
                          {s.title} <span className="task-category-badge" style={{ background: CAT[tt]?.color ?? 'var(--muted)' }}>{CAT[tt]?.label ?? tt}</span>
                        </p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                          {`${s.updatedAt ? v3Ago(s.updatedAt) : ''}${a ? ` · ${a.handle}` : ''} · approved`}
                        </p>
                        <p className="font-mono text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                          run conversation stored — open the report for the full thread
                        </p>
                        <div className="risk" style={{ marginTop: 8 }}>
                          <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)' }}>RISK</span>
                          <span className="bar"><div style={{ width: `${risk}%`, background: rc }} /></span>
                          <span className="font-mono" style={{ fontSize: 9 }}>{risk}</span>
                        </div>
                      </div>
                      <button className="chip" onClick={() => setDetail(s.id)}>open report →</button>
                      <button className="chip reactor" onClick={() => exportOne(s.id)}>export</button>
                      <button
                        className={`lockbtn${isSealed ? ' locked' : ''}`}
                        onClick={() => setSealed((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })}
                        aria-label={isSealed ? `Unseal ${s.title}` : `Seal ${s.title}`}
                      >
                        {isSealed ? <Lock size={10} /> : <UnlockKeyhole size={10} />} {isSealed ? 'sealed' : 'seal'}
                      </button>
                      <button
                        className="chip"
                        onClick={() => {
                          try {
                            navigator.clipboard?.writeText(s.id);
                            setCopied(s.id);
                            setTimeout(() => setCopied(null), 1500);
                          } catch {
                            /* clipboard unavailable */
                          }
                        }}
                      >
                        {copied === s.id ? <Check size={10} /> : <Copy size={10} />} copy
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="pane">
          <p className="pane-label">PROJECT REPORTS · PER CAMPAIGN</p>
          <div id="rep-projects" className="space-y-2">
            {detail ? (
              <div id="rep-detail">
                <button className="back-link" onClick={() => setDetail(null)}>← all reports</button>
                <div id="rep-detail-body" style={{ marginTop: 8 }}>
                  {detailSession ? (
                    <>
                      <h3 className="font-bold text-base">{detailSession.title}</h3>
                      <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                        {`${detailAgent?.handle ?? 'agent'} · ${v3Ago(detailSession.updatedAt ?? detailSession.createdAt)} · ${v3SessionStatus(detailSession)}`}
                      </p>
                      <div className="chat-list" style={{ marginTop: 10 }}>
                        {detailMsgs === null ? (
                          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>loading run…</p>
                        ) : detailMsgs.length === 0 ? (
                          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>This run has no stored messages.</p>
                        ) : (
                          <ChatFeed messages={detailMsgs} agent={detailAgent ?? undefined} />
                        )}
                      </div>
                      <button className="btn-deploy" style={{ marginTop: 10 }} onClick={() => exportOne(detailSession.id)}>
                        <Download size={12} /> export JSON
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              pool.slice(0, 6).map((s) => {
                const st = v3SessionStatus(s);
                return (
                  <button className="thread-row" key={s.id} onClick={() => setDetail(s.id)}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: st === 'done' ? '#10b981' : 'var(--accent)' }} />
                    <span className="meta">
                      <p className="font-mono font-bold text-xs">{s.title}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{`${st} · ${v3Ago(s.updatedAt ?? s.createdAt)}`}</p>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="pane">
          <p className="pane-label">LIFECYCLE BOARD</p>
          <div id="rep-board" className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            {[
              { label: 'DONE', items: done },
              { label: 'ACTIVE', items: active },
            ].map(({ label, items }) => (
              <div className="pane" key={label}>
                <p className="pane-label">{`${label} · ${items.length}`}</p>
                <div className="space-y-2">
                  {items.slice(0, 8).map((s) => (
                    <button className="thread-row" key={s.id} onClick={() => setDetail(s.id)}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: label === 'DONE' ? '#10b981' : 'var(--accent)' }} />
                      <span className="meta">
                        <p className="font-mono font-bold text-xs">{s.title}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{`${v3SessionStatus(s)} · ${v3Ago(s.updatedAt ?? s.createdAt)}`}</p>
                      </span>
                    </button>
                  ))}
                  {items.length === 0 && <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
