'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Clock } from 'lucide-react';

/*
 * ThreadLane — expandable full-width thread row for the broadsheet.
 *
 * Each thread is a lane (not a card in a column). Click to expand inline —
 * shows the agent handoff chain, priority, domain, status, and timestamp.
 * Priority badge (vermilion high/urgent, ink medium, ink-2 low). Status dot.
 */

export interface ThreadLaneData {
  id: string;
  title: string;
  domain: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  timestamp?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  inbox: { label: 'Inbox', color: 'var(--v2-paper-ink-2)', dot: '#9a9189' },
  'in-progress': { label: 'In Progress', color: 'var(--v2-paper-ink)', dot: '#6a6055' },
  review: { label: 'Review', color: 'var(--v2-vermilion)', dot: '#c8321b' },
  blocked: { label: 'Blocked', color: 'var(--v2-vermilion)', dot: '#c8321b' },
  done: { label: 'Done', color: 'var(--v2-sage)', dot: '#7fb069' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'URGENT', color: 'var(--v2-vermilion)' },
  high: { label: 'HIGH', color: 'var(--v2-vermilion)' },
  medium: { label: 'MED', color: 'var(--v2-paper-ink)' },
  low: { label: 'LOW', color: 'var(--v2-paper-ink-2)' },
};

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ThreadLane({ thread, index }: { thread: ThreadLaneData; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[thread.status] || STATUS_CONFIG.inbox;
  const priority = PRIORITY_CONFIG[thread.priority] || PRIORITY_CONFIG.low;
  const showPriority = thread.priority === 'urgent' || thread.priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left py-4 px-4 md:px-6 flex items-center gap-4 transition-colors hover:bg-[rgba(255,255,255,0.3)] rounded-[8px] group"
      >
        {/* Status dot */}
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status.dot }} />

        {/* Domain */}
        <span className="v2-mono text-[10px] uppercase tracking-wider flex-shrink-0 hidden sm:block min-w-[100px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
          {thread.domain}
        </span>

        {/* Title */}
        <span className="flex-1 text-[14px] truncate" style={{ color: 'var(--v2-paper-ink)' }}>
          {thread.title}
        </span>

        {/* Priority badge */}
        {showPriority && (
          <span
            className="v2-label text-[8px] px-2 py-0.5 rounded flex-shrink-0"
            style={{ border: `1px solid ${priority.color}`, color: priority.color }}
          >
            {priority.label}
          </span>
        )}

        {/* Status label */}
        <span className="v2-mono text-[10px] flex-shrink-0 min-w-[70px] text-right" style={{ color: status.color }}>
          {status.label}
        </span>

        {/* Timestamp */}
        {thread.timestamp && (
          <span className="v2-mono text-[10px] flex items-center gap-1 flex-shrink-0 hidden md:flex" style={{ color: 'var(--v2-paper-ink-2)' }}>
            <Clock className="w-3 h-3" />
            {formatTimestamp(thread.timestamp)}
          </span>
        )}

        {/* Expand chevron */}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0" style={{ color: 'var(--v2-paper-ink-2)' }}>
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-6 md:ml-10 mr-4 md:mr-6 mb-4 p-5 rounded-[8px]" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid var(--v2-paper-rule)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="v2-label text-[8px] mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>assignee</div>
                  <div className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink)' }}>{thread.assignee}</div>
                </div>
                <div>
                  <div className="v2-label text-[8px] mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>domain</div>
                  <div className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink)' }}>{thread.domain}</div>
                </div>
                <div>
                  <div className="v2-label text-[8px] mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>priority</div>
                  <div className="v2-mono text-[12px]" style={{ color: priority.color }}>{thread.priority}</div>
                </div>
                <div>
                  <div className="v2-label text-[8px] mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>status</div>
                  <div className="v2-mono text-[12px]" style={{ color: status.color }}>{status.label}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hairline divider */}
      <div className="ml-4 md:ml-6 mr-4 md:mr-6" style={{ borderTop: '1px solid var(--v2-paper-rule)' }} />
    </motion.div>
  );
}
