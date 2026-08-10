'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { WORKSPACE_MODULES as MODULES } from '@/components/v2/dashboard/modules';

/*
 * Workspace landing — module overview inside the instrument shell.
 *
 * A clean grid of module links. Each card: icon, name, description.
 * Paper ground, hairline borders, vermilion hover accent.
 */

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="p-5 md:p-6">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="v2-display text-[1.5rem] mb-1"
        style={{ color: 'var(--v2-paper-ink)' }}
      >
        Modules
      </motion.h2>
      <p className="v2-mono text-[12px] mb-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
        {MODULES.length} available · select to view threads and deploy agents
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Link
                href={`/workspaces/${workspaceId}/${mod.path}`}
                className="block p-4 rounded-[10px] transition-all hover:translate-y-[-2px] group"
                style={{
                  background: 'rgba(255,255,255,0.35)',
                  border: '1px solid var(--v2-paper-rule)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: 'rgba(200,50,27,0.06)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: 'var(--v2-vermilion)' }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--v2-paper-ink)' }}>
                      {mod.name}
                    </h3>
                    <p className="v2-mono text-[11px] truncate" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      {mod.desc}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
