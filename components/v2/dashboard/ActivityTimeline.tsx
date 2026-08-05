'use client';

import { motion } from 'motion/react';
import { mockMissionControlData } from '@/data/missionControl';

/*
 * ActivityTimeline — the ink-register terminal band at the bottom of the
 * broadsheet. Full-width, sits on ink ground within the paper canvas.
 *
 * Shows the live activity feed from mockMissionControlData.liveActivity.
 * Mono timestamps, colored dots per event type, agent names. A live pulse
 * indicator at the top. This is the "execution" moment within the "strategy"
 * surface — the two-register thesis made spatial on the dashboard.
 */

const TYPE_CONFIG: Record<string, { dot: string; label: string }> = {
  resolution: { dot: 'var(--v2-sage)', label: 'resolved' },
  message: { dot: 'var(--v2-ink-text)', label: 'message' },
  conflict: { dot: 'var(--v2-vermilion-lift)', label: 'conflict' },
  system: { dot: 'var(--v2-ink-text-2)', label: 'system' },
};

function formatTime(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h`;
}

export function ActivityTimeline() {
  const activities = mockMissionControlData.liveActivity;

  return (
    <section
      className="mt-auto px-6 md:px-10 lg:px-16 py-12"
      style={{ background: 'var(--v2-ink-ground)' }}
    >
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <motion.span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--v2-vermilion-lift)' }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="v2-label text-[9px]" style={{ color: 'var(--v2-ink-text-2)' }}>
            Live · system activity
          </span>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {activities.map((act: any, i: number) => {
            const type = act.type || 'system';
            const config = TYPE_CONFIG[type] || TYPE_CONFIG.system;
            return (
              <motion.div
                key={act.id || i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, delay: (i % 5) * 0.08 }}
                className="flex items-start gap-4 py-2.5"
                style={{ borderBottom: i < activities.length - 1 ? '1px solid var(--v2-ink-rule)' : 'none' }}
              >
                {/* Time */}
                <span className="v2-mono text-[11px] flex-shrink-0 min-w-[3rem]" style={{ color: 'var(--v2-ink-text-2)' }}>
                  {formatTime(act.timestamp)}
                </span>

                {/* Dot */}
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: config.dot }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className="v2-mono text-[12px]" style={{ color: 'var(--v2-ink-text)' }}>
                    {act.agent?.name || 'System'}
                  </span>
                  {act.content && (
                    <span className="v2-mono text-[12px] ml-2" style={{ color: 'var(--v2-ink-text-2)' }}>
                      {act.content}
                    </span>
                  )}
                </div>

                {/* Type label */}
                <span className="v2-label text-[8px] flex-shrink-0 hidden sm:block" style={{ color: config.dot }}>
                  {config.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
