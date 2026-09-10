'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, FileText, Globe, Store } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { threadService } from '@/lib/services/threadService';
import { AGENT_LIST } from '@/components/v2/content-factory/agents';
import type { AuditThread } from '@/lib/types/thread.types';
import { BrandMark, greeting } from '../primitives';

const agentIcons: Record<string, React.ReactNode> = {
  'content-architect': <FileText className="w-4 h-4" />,
  'magento-content': <Store className="w-4 h-4" />,
  'interactive-website-architect': <Globe className="w-4 h-4" />,
};
const agentInks: Record<string, string> = {
  'content-architect': 'var(--line-cobalt)',
  'magento-content': 'var(--line-green)',
  'interactive-website-architect': 'var(--line-amber)',
};

function AgentCard({ slug, name, role, subtitle, href }: {
  slug: string;
  name: string;
  role: string;
  subtitle: string;
  href: string;
}) {
  const ink = agentInks[slug] ?? 'var(--line-cobalt)';
  return (
    <Link
      href={href}
      className="agency-card p-5 text-left flex flex-col items-start gap-3 relative group"
    >
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0" style={{ border: `1.5px solid ${ink}`, color: ink }}>
          {agentIcons[slug] ?? <Bot className="w-4 h-4" />}
        </span>
        <div>
          <p className="text-[13px] font-semibold">{name}</p>
          <p className="text-[10px] text-[var(--ink-faint)]">{role}</p>
        </div>
      </div>
      <p className="text-[11px] text-[var(--ink-dim)] leading-relaxed line-clamp-2">{subtitle}</p>
    </Link>
  );
}

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
      <p className="text-[var(--ink-dim)] text-[13px] mb-7">Pick an agent to start working with</p>

      {/* Real agent roster from the production agents registry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-6">
        {AGENT_LIST.map((agent) => (
          <AgentCard
            key={agent.slug}
            slug={agent.slug}
            name={agent.name}
            role={agent.role}
            subtitle={agent.subtitle}
            href={`/workspaces/${workspaceId}/modules/content-factory/v2/${agent.slug}`}
          />
        ))}
      </div>

      {/* Recent threads from the real thread service */}
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
