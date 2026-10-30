'use client';

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
            if (!config) return null;
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
