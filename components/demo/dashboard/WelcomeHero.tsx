'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderTree, Terminal, Building2, Zap } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { threadService } from '@/lib/services/threadService';
import type { AuditThread } from '@/lib/types/thread.types';
import { BrandMark, greeting } from '../primitives';

const modules = [
  {
    label: 'Launchpad',
    desc: 'Mission control — live threads, streaming output, approvals',
    icon: <Terminal className="w-4 h-4" />,
    ink: 'var(--line-cobalt)',
    path: 'launchpad',
  },
  {
    label: 'Power Agents',
    desc: 'Chat directly with a specialist agent',
    icon: <Zap className="w-4 h-4" />,
    ink: 'var(--line-green)',
    path: 'power-agents',
  },
  {
    label: 'Graphs',
    desc: 'Workflow templates to dispatch',
    icon: <FolderTree className="w-4 h-4" />,
    ink: 'var(--line-amber)',
    path: 'graphs',
  },
  {
    label: 'Agency Hub',
    desc: 'Workspaces, billing, guardrails, team',
    icon: <Building2 className="w-4 h-4" />,
    ink: 'var(--line-scarlet)',
    path: 'agency-hub',
  },
];

export function WelcomeHero({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const displayName = user?.name || 'Operator';
  const [recentThreads, setRecentThreads] = useState<AuditThread[]>([]);

  useEffect(() => {
    threadService.listThreads(workspaceId, { moduleId: 'content-factory', limit: 5 })
      .then(setRecentThreads)
      .catch(() => setRecentThreads([]));
  }, [workspaceId]);

  return (
    <div className="w-full flex flex-col items-center justify-center mb-8 mt-2 text-center rise">
      <BrandMark className="w-12 h-12 mb-4" />
      <h2 className="text-3xl font-bold tracking-tight mb-2 text-[var(--ink)]">
        {greeting()}, {displayName.split(' ')[0]}.
      </h2>
      <p className="text-[var(--ink-dim)] text-[13px] mb-7">What are we working on today?</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-6">
        {modules.map((mod) => (
          <Link
            key={mod.path}
            href={`/workspaces/${workspaceId}/${mod.path}`}
            className="agency-card p-4 text-left flex flex-col items-start gap-3 group"
          >
            <span
              className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ border: `1.5px solid ${mod.ink}`, color: mod.ink }}
            >
              {mod.icon}
            </span>
            <div>
              <p className="text-[13px] font-semibold">{mod.label}</p>
              <p className="text-[10px] text-[var(--ink-dim)] mt-1 leading-snug">{mod.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {recentThreads.length > 0 && (
        <div className="w-full max-w-4xl mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono mb-2 text-left">Recent Activity</p>
          <div className="plate overflow-hidden">
            {recentThreads.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={`/workspaces/${workspaceId}/modules/${t.moduleId}`}
                className="dense-row"
              >
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-xs font-semibold truncate">{t.title || 'Untitled'}</span>
                  <span className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5 truncate">
                    {t.moduleId} · {t.docCount} artifacts · {t.status}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
