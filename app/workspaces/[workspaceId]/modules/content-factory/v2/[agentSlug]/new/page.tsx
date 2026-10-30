'use client';

import { useParams } from 'next/navigation';
import { getAgent } from '@/components/v2/content-factory/agents';
import { AgentStream } from '@/components/v2/content-factory/AgentStream';

export default function AgentStreamPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const agentSlug = params.agentSlug as string;
    const agent = getAgent(agentSlug);

    if (!agent) {
        return <div className="p-6"><p style={{ color: 'var(--v2-paper-ink-2)' }}>Agent not found</p></div>;
    }

    return <AgentStream config={agent} workspaceId={workspaceId} />;
}
