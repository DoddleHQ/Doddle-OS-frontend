'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMissionControlData } from '@/lib/apiMock';
import { mockMissionControlData as initialData } from '@/data/missionControl';
import { MetricItem, StatusDot, KanbanCard, SkeletonBlock } from '@/components/v2/dashboard/primitives';

/*
 * Mission Control — the main dashboard, redesigned for Operate mode.
 *
 * Surfaces three datasets that were previously mocked but unused:
 * - domainHealth: per-domain health chips
 * - activeAgents: agent status pills
 * - (liveActivity is surfaced in the InstrumentShell feed)
 *
 * KPI strip → metric rail (no hero-metric template).
 * Kanban: keeps the accordion (good UX), fixes the cards (no ghost, no border-top).
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  'in-progress': 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
};

// Status dot variant per column (Operate: accent for state only)
const COLUMN_STATUS: Record<string, 'neutral' | 'active' | 'warning' | 'healthy'> = {
  inbox: 'neutral',
  'in-progress': 'active',
  review: 'warning',
  blocked: 'warning',
  done: 'healthy',
};

// Domain health status → StatusDot variant
const HEALTH_VARIANT: Record<string, 'healthy' | 'warning' | 'critical'> = {
  healthy: 'healthy',
  warning: 'warning',
  critical: 'critical',
};

function formatTime(ts?: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MissionControlPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCol, setExpandedCol] = useState<string | null>(initialData.columns[0]?.id || null);

  useEffect(() => {
    getMissionControlData(workspaceId)
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [workspaceId]);

  // === Loading state: skeleton matching layout shape ===
  if (isLoading) {
    return (
      <div className="p-5 md:p-6">
        {/* Metric rail skeleton */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-5 mb-5 pb-5" style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <SkeletonBlock width="60%" height={20} />
              <SkeletonBlock width="80%" height={12} />
            </div>
          ))}
        </div>
        {/* Domain health skeleton */}
        <div className="flex gap-4 mb-5">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} width={120} height={32} radius={6} />
          ))}
        </div>
        {/* Kanban skeleton */}
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} width={160} height={240} radius={8} />
          ))}
        </div>
      </div>
    );
  }

  const { stats, columns, items, domainHealth, activeAgents } = data;

  const toggleCol = (id: string) => setExpandedCol((prev) => (prev === id ? null : id));

  return (
    <div className="p-5 md:p-6 flex flex-col h-full">
      {/* === METRIC RAIL (replaces KPI hero tiles) === */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="grid grid-cols-3 md:grid-cols-5 gap-5 mb-5 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}
      >
        {stats.map((kpi) => (
          <MetricItem
            key={kpi.label}
            value={kpi.value}
            label={kpi.label}
            trend={kpi.trend}
          />
        ))}
      </motion.div>

      {/* === DOMAIN HEALTH + ACTIVE AGENTS (newly surfaced) === */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 pb-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}>
        {/* Domain health chips — inline, no cards */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="v2-mono"
            style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Domains
          </span>
          {domainHealth.map((d) => (
            <div key={d.domain} className="flex items-center gap-1.5">
              <StatusDot variant={HEALTH_VARIANT[d.status]} size={6} />
              <span
                style={{
                  fontFamily: 'var(--v2-font-sans)',
                  fontSize: '0.75rem',
                  color: 'var(--v2-paper-ink)',
                  fontWeight: 500,
                }}
              >
                {d.domain.replace(/_/g, ' ')}
              </span>
              <span className="v2-mono tabular-nums" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                {d.health}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* === ACTIVE AGENTS (newly surfaced) === */}
      <div className="flex flex-wrap items-center gap-2 mb-5 flex-shrink-0">
        <span
          className="v2-mono"
          style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Agents
        </span>
        {activeAgents.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid var(--v2-paper-rule)' }}
          >
            <StatusDot variant={agent.status === 'active' ? 'active' : 'idle'} size={5} pulse={agent.status === 'active'} />
            <span
              style={{
                fontFamily: 'var(--v2-font-sans)',
                fontSize: '0.7rem',
                color: agent.status === 'active' ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)',
              }}
            >
              {agent.name.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* === KANBAN BOARD (accordion — kept, cards fixed) === */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colItems = items.filter((item) => item.status === col.id);
          const isExpanded = expandedCol === col.id;
          const statusVariant = COLUMN_STATUS[col.id] || 'neutral';

          return (
            <motion.div
              key={col.id}
              animate={{ width: isExpanded ? 300 : 48 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex flex-col rounded-[8px] overflow-hidden flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.3)',
                border: '1px solid var(--v2-paper-rule)',
              }}
            >
              {/* Column header — status dot + label + count (no border-top accent) */}
              <div
                className="flex items-center transition-all flex-shrink-0"
                style={{
                  flexDirection: isExpanded ? 'row' : 'column',
                  justifyContent: isExpanded ? 'space-between' : 'center',
                  padding: isExpanded ? '10px 12px' : '12px 0',
                  gap: isExpanded ? '0' : '8px',
                }}
              >
                {isExpanded ? (
                  <>
                    <div className="flex items-center gap-2">
                      <StatusDot variant={statusVariant} size={6} />
                      <span
                        style={{
                          fontFamily: 'var(--v2-font-sans)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--v2-paper-ink)',
                        }}
                      >
                        {STATUS_LABELS[col.id] || col.title}
                      </span>
                      <span
                        className="v2-mono tabular-nums px-1.5 py-0.5 rounded"
                        style={{ fontSize: '0.62rem', background: 'rgba(0,0,0,0.04)', color: 'var(--v2-paper-ink-2)' }}
                      >
                        {colItems.length}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleCol(col.id)}
                      className="p-1 rounded-[4px] hover:bg-[rgba(0,0,0,0.04)]"
                      style={{ color: 'var(--v2-paper-ink-2)' }}
                      aria-label={`Collapse ${STATUS_LABELS[col.id]}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleCol(col.id)}
                      className="p-1 rounded-[4px] hover:bg-[rgba(0,0,0,0.04)]"
                      style={{ color: 'var(--v2-paper-ink-2)' }}
                      aria-label={`Expand ${STATUS_LABELS[col.id]}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span
                      className="v2-mono whitespace-nowrap"
                      style={{
                        fontSize: '0.62rem',
                        color: 'var(--v2-paper-ink-2)',
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                      }}
                    >
                      {STATUS_LABELS[col.id] || col.title}
                    </span>
                  </>
                )}
              </div>

              {/* Cards — only when expanded */}
              {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {colItems.length === 0 ? (
                    <div
                      className="text-center py-10 rounded-[6px]"
                      style={{ border: '1px dashed var(--v2-paper-rule)' }}
                    >
                      <span className="v2-mono" style={{ fontSize: '0.7rem', color: 'var(--v2-paper-ink-2)' }}>
                        Empty
                      </span>
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <KanbanCard
                        key={item.id}
                        item={{
                          id: item.id,
                          title: item.title,
                          slug: item.slug,
                          priority: item.priority as 'urgent' | 'high' | 'medium' | 'low' | undefined,
                          assignee: item.assignee,
                          timestamp: item.events?.[item.events.length - 1]?.timestamp || item.createdAt,
                        }}
                        formatTime={formatTime}
                      />
                    ))
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
