'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAgent } from '@/components/v2/content-factory/agents';
import { AgentStream } from '@/components/v2/content-factory/AgentStream';
import { useRunRegistry } from '@/lib/runs/runRegistry';

/*
 * Live run view — renders an ACTIVE registry run.
 *
 * Reached from the sidebar's "Running now" section or by the URL rewrite
 * that happens when a run starts. Runs whose container is still mounted
 * stream live here; navigating away and back reattaches seamlessly.
 * A run id that is no longer in the registry (dismissed, or the page was
 * reloaded — registry is in-memory) falls back to a pointer to the thread
 * list, where completed runs live as DB threads.
 */

export default function LiveRunPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const agentSlug = params.agentSlug as string;
    const runId = params.runId as string;

    const agent = getAgent(agentSlug);
    const run = useRunRegistry((s) => s.runs[runId]);

    if (!agent) {
        return (
            <div className="p-6">
                <p style={{ color: 'var(--v2-paper-ink-2)' }}>Agent not found.</p>
            </div>
        );
    }

    if (!run) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', color: 'var(--v2-paper-ink)' }}>
                    This run is no longer active in this session.
                </p>
                <p className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)' }}>
                    Reloaded page or dismissed run — completed runs are in the thread list.
                </p>
                <Link
                    href={`/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}`}
                    className="inline-flex items-center px-4 py-2 v2-label text-[10px] rounded-[8px]"
                    style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                >
                    Back to threads
                </Link>
            </div>
        );
    }

    return <AgentStream config={agent} workspaceId={workspaceId} runId={runId} />;
}
