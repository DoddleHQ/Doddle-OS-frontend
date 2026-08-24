'use client';

/*
 * RunRegistryProvider — keeps every live run mounted.
 *
 * Renders one headless RunContainer per registry run (they own the SSE
 * streams and persistence), then the children. Mounted once in the
 * content-factory layout so containers survive navigation anywhere in the
 * module. Leaving the module entirely unmounts (and cancels) runs —
 * cross-module persistence needs the durable-server work.
 */

import { useRunRegistry } from '@/lib/runs/runRegistry';
import { getAgent } from './agents';
import { RunContainer } from './RunContainer';

export function RunRegistryProvider({ children }: { children: React.ReactNode }) {
    const runs = useRunRegistry((s) => s.runs);
    const order = useRunRegistry((s) => s.order);

    const mounted = order
        .map((runId) => runs[runId])
        .filter((run): run is NonNullable<typeof run> => Boolean(run))
        .map((run) => {
            const config = getAgent(run.agentSlug);
            if (!config) return null; // unknown slug: can't mount a container
            return (
                <RunContainer
                    key={run.runId}
                    runId={run.runId}
                    config={config}
                    workspaceId={run.workspaceId}
                />
            );
        });

    return (
        <>
            {mounted}
            {children}
        </>
    );
}
