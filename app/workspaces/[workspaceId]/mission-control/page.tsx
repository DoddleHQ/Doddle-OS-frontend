'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMissionControlData } from '@/lib/apiMock';
import { mockMissionControlData } from '@/data/missionControl';

/*
 * Mission Control — kanban board with proper accordion behavior.
 *
 * Single-expand accordion: one column open at a time, collapsed columns
 * are narrow vertical strips. Preserves the exact v1 interaction but in
 * Specimen Terminal style (paper, hairlines, vermilion accents).
 */

const COLUMN_ACCENTS: Record<string, string> = {
  inbox: 'var(--v2-paper-ink-2)',
  'in-progress': 'var(--v2-paper-ink)',
  review: 'var(--v2-vermilion)',
  blocked: 'var(--v2-vermilion)',
  done: 'var(--v2-sage)',
};

const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  'in-progress': 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'URGENT', color: 'var(--v2-vermilion)' },
  high: { label: 'HIGH', color: 'var(--v2-vermilion)' },
  medium: { label: 'MED', color: 'var(--v2-paper-ink)' },
  low: { label: 'LOW', color: 'var(--v2-paper-ink-2)' },
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
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCol, setExpandedCol] = useState<string | null>(
    mockMissionControlData.columns[0]?.id || null
  );

  useEffect(() => {
    getMissionControlData(workspaceId).then(() => setIsLoading(false)).catch(() => setIsLoading(false));
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
      </div>
    );
  }

  const { stats, columns, items } = mockMissionControlData;

  const toggleCol = (id: string) => setExpandedCol(prev => prev === id ? null : id);

  return (
    <div className="p-5 md:p-6 flex flex-col h-full">
      {/* === KPI strip === */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}
      >
        {stats.map((kpi: any, i: number) => {
          const trendColor = kpi.trend === 'up' ? 'var(--v2-sage)' : kpi.trend === 'down' ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink-2)';
          return (
            <div key={i}>
              <div className="v2-display text-[1.5rem] leading-none" style={{ color: 'var(--v2-paper-ink)' }}>{kpi.value}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="v2-label text-[8px]" style={{ color: 'var(--v2-paper-ink-2)' }}>{kpi.label}</span>
                <span className="v2-mono text-[9px]" style={{ color: trendColor }}>{kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—'}</span>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* === Kanban board (accordion) === */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {columns.map((col: any, colIdx: number) => {
          const colItems = items.filter((item: any) => item.status === col.id);
          const isExpanded = expandedCol === col.id;
          const accent = COLUMN_ACCENTS[col.id] || 'var(--v2-paper-ink-2)';

          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: colIdx * 0.08 }}
              className="flex flex-col rounded-[8px] overflow-hidden transition-all duration-300 flex-shrink-0"
              style={{
                width: isExpanded ? 300 : 48,
                background: 'rgba(255,255,255,0.3)',
                border: '1px solid var(--v2-paper-rule)',
              }}
            >
              {/* Column header */}
              <div
                className="flex items-center transition-all"
                style={{
                  borderTop: `2px solid ${accent}`,
                  flexDirection: isExpanded ? 'row' : 'column',
                  justifyContent: isExpanded ? 'space-between' : 'center',
                  padding: isExpanded ? '10px 12px' : '12px 0',
                  gap: isExpanded ? '0' : '8px',
                }}
              >
                {isExpanded ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="v2-label text-[9px]" style={{ color: 'var(--v2-paper-ink)' }}>
                        {STATUS_LABELS[col.id] || col.title}
                      </span>
                      <span className="v2-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(200,50,27,0.06)', color: 'var(--v2-paper-ink-2)' }}>
                        {colItems.length}
                      </span>
                    </div>
                    <button onClick={() => toggleCol(col.id)} className="p-1 rounded transition-colors hover:bg-[rgba(0,0,0,0.04)]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => toggleCol(col.id)} className="p-1 rounded transition-colors hover:bg-[rgba(0,0,0,0.04)]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="v2-label text-[8px] whitespace-nowrap" style={{ color: 'var(--v2-paper-ink-2)', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                      {STATUS_LABELS[col.id] || col.title}
                    </span>
                  </>
                )}
              </div>

              {/* Cards — only when expanded */}
              {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {colItems.length === 0 ? (
                    <div className="text-center py-10 rounded-[6px] v2-mono text-[11px]" style={{ border: '1px dashed var(--v2-paper-rule)', color: 'var(--v2-paper-ink-2)' }}>
                      No items
                    </div>
                  ) : (
                    colItems.map((item: any, itemIdx: number) => {
                      const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
                      const showPriority = item.priority === 'urgent' || item.priority === 'high';
                      const lastEvent = item.events?.[item.events?.length - 1];
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: itemIdx * 0.05 }}
                          className="p-3 rounded-[8px] transition-all hover:translate-y-[-1px] cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid var(--v2-paper-rule)' }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="v2-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--v2-paper-ink-2)' }}>
                              {item.slug || 'General'}
                            </span>
                            {showPriority && (
                              <span className="v2-label text-[7px] px-1.5 py-0.5 rounded" style={{ border: `1px solid ${priority.color}`, color: priority.color }}>
                                {priority.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] leading-snug mb-2" style={{ color: 'var(--v2-paper-ink)' }}>{item.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>{item.assignee || '—'}</span>
                            <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>{formatTime(lastEvent?.timestamp || item.createdAt)}</span>
                          </div>
                        </motion.div>
                      );
                    })
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
