'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { getAgent } from '@/components/v2/content-factory/agents';
import { useThread } from '@/lib/contexts/ThreadContext';
import { StreamArtifact } from '@/components/v2/content-factory/StreamArtifact';
import { detectArtifactKind, kindToArtifactType, supersededArtifactIds } from '@/components/v2/content-factory/artifactMarkdown';
import { notify } from '@/lib/stores/notificationStore';
import { useRunRegistry, isRunLive } from '@/lib/runs/runRegistry';
import type { ArtifactPayload } from '@/lib/types/graph-events.types';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ThreadDetail() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;
    const agentSlug = params.agentSlug as string;
    const threadId = params.threadId as string;
    const agent = getAgent(agentSlug);

    const { currentThread, currentArtifacts, isLoading, error, fetchThread, fetchArtifacts, deleteThread } = useThread();
    const [deleting, setDeleting] = useState(false);

    const liveRun = useRunRegistry((s) => {
        const langId = currentThread?.langId;
        if (!langId) return undefined;
        return Object.values(s.runs).find((r) => r.threadId === langId && isRunLive(r.status));
    });
    useEffect(() => {
        if (liveRun) {
            router.replace(`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/live/${liveRun.runId}`);
        }
    }, [liveRun, router, workspaceId, agentSlug]);

    useEffect(() => {
        if (agent) {
            fetchThread(workspaceId, agent.moduleId, threadId);
            fetchArtifacts(workspaceId, agent.moduleId, threadId);
        }
    }, [workspaceId, agent, threadId, fetchThread, fetchArtifacts]);

    if (!agent) {
        return <div className="p-6"><p style={{ color: 'var(--v2-paper-ink-2)' }}>Agent not found</p></div>;
    }

    const handleDelete = async () => {
        if (!currentThread) return;
        if (!confirm(`Delete "${currentThread.title || 'this thread'}"? All artifacts will be removed. This cannot be undone.`)) return;
        try {
            setDeleting(true);
            await deleteThread(workspaceId, agent.moduleId, threadId);
            notify('Thread deleted', 'success');
            router.replace(`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}`);
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Failed to delete thread', 'error');
            setDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-5 md:p-6 max-w-[720px] mx-auto">
                <div className="h-6 rounded mb-4" style={{ width: '50%', background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                <div className="h-48 rounded-[10px]" style={{ background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
            </div>
        );
    }

    if (error || !currentThread) {
        return (
            <div className="p-5 md:p-6 max-w-[720px] mx-auto">
                <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-vermilion)' }}>
                    {error || 'Thread not found'}
                </p>
            </div>
        );
    }

    return (
        <div className="p-5 md:p-6 max-w-[720px] mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="flex items-center gap-2 mb-5"
            >
                <Link href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}`} style={{ color: 'var(--v2-paper-ink-2)' }}>
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h2 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1rem', fontWeight: 600, color: 'var(--v2-paper-ink)' }}>
                    {currentThread.title || 'Untitled'}
                </h2>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="ml-auto p-1.5 rounded-[6px] transition-opacity flex-shrink-0"
                    style={{ color: 'var(--v2-vermilion)', opacity: deleting ? 0.5 : 0.6 }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                    title="Delete thread"
                    aria-label="Delete thread"
                >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </motion.div>

            {currentThread.description && (
                <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.8rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1.5rem' }}>
                    {currentThread.description}
                </p>
            )}

            {currentArtifacts.length === 0 ? (
                <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)' }}>
                    No artifacts saved in this thread.
                </p>
            ) : (
                <div className="space-y-4">
                    {(() => {
                        const payloads = currentArtifacts.map((artifact) => {
                            const base: ArtifactPayload = {
                                artifactId: String(artifact.id),
                                artifactType: 'report',
                                title: artifact.pageName || 'Artifact',
                                content: artifact.content || artifact.data,
                            };
                            return { ...base, artifactType: kindToArtifactType(detectArtifactKind(base)) };
                        });
                        const superseded = supersededArtifactIds(payloads);
                        return payloads
                            .filter((p) => !superseded.has(p.artifactId))
                            .map((payload) => <StreamArtifact key={payload.artifactId} artifact={payload} />);
                    })()}
                </div>
            )}
        </div>
    );
}
