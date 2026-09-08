'use client';
import { useParams } from 'next/navigation';

import { useRouter } from 'next/navigation';
import { FolderTree, Terminal } from 'lucide-react';
import { GRAPH_TEMPLATES, DEFAULT_RUN_PROMPT } from '@/lib/demo/data';
import { startRun } from '@/lib/demo/engine';

export default function DemoGraphsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const router = useRouter();

  const run = () => {
    void startRun(DEFAULT_RUN_PROMPT);
    router.push('/demo/launchpad');
  };

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-8 md:px-10 py-5 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <FolderTree className="w-6 h-6 md:w-7 md:h-7" style={{ color: 'var(--line-amber)' }} /> Graphs
          </h1>
          <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-2">Directory of available workflow templates to spawn into the Launchpad.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl rise">
          {GRAPH_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className={`agency-card p-6 flex flex-col justify-between ${tpl.featured ? '' : '!bg-transparent'}`}
              style={tpl.featured ? { borderColor: `color-mix(in srgb, ${tpl.ink} 35%, transparent)` } : undefined}
            >
              <div>
                <span
                  className="inline-block mb-4 text-[9px] font-mono px-2 py-1 rounded-[3px] border"
                  style={{
                    color: tpl.ink,
                    borderColor: `color-mix(in srgb, ${tpl.ink} 35%, transparent)`,
                    background: `color-mix(in srgb, ${tpl.ink} 8%, transparent)`,
                  }}
                >
                  tag: {tpl.tag}
                </span>
                <h3 className="text-base font-bold mb-2">{tpl.title}</h3>
                <p className="text-xs text-[var(--ink-dim)] mb-6 leading-relaxed">
                  Spawns <span className="font-mono" style={{ color: 'var(--line-green)' }}>#{tpl.id}</span>. {tpl.desc}
                </p>
              </div>
              <button
                type="button"
                className={tpl.featured ? 'btn-primary w-full !py-2.5' : 'btn-outline w-full !py-2.5'}
                onClick={run}
              >
                <Terminal className="w-3 h-3" /> doddle run
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
