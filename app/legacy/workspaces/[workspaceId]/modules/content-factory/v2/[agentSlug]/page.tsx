'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, Hash } from 'lucide-react';
import { getAgent } from '@/components/v2/content-factory/agents';
import { ThreadSidebar } from '@/components/v2/content-factory/ThreadSidebar';
import { useThread } from '@/lib/contexts/ThreadContext';

const EASE = [0.16, 1, 0.3, 1] as const;

function formatRelativeTime(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m ago`;
    if (min < 1440) return `${Math.floor(min / 60)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AgentView() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const agentSlug = params.agentSlug as string;
    const agent = getAgent(agentSlug);

    const { threads, isLoading } = useThread();

    if (!agent) {
        return <div className="p-6"><p style={{ color: 'var(--v2-paper-ink-2)' }}>Agent not found</p></div>;
    }

    return (
        <div className="flex h-full">
            <ThreadSidebar agent={agent} workspaceId={workspaceId} />

            <div className="flex-1 overflow-y-auto">
                <div className="p-5 md:p-8 max-w-[680px]">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 rounded-[8px]" style={{ background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                            ))}
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                                style={{
                                    background: 'rgba(200,50,27,0.08)',
                                    border: '1px solid rgba(200,50,27,0.15)',
                                    color: 'var(--v2-vermilion)',
                                    fontFamily: 'var(--v2-font-sans)',
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                }}
                            >
                                {agent.initials}
                            </div>
                            <h2 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', marginBottom: '0.5rem' }}>
                                {agent.name}
                            </h2>
                            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', color: 'var(--v2-paper-ink-2)', maxWidth: '360px', marginBottom: '2rem', lineHeight: 1.6 }}>
                                {agent.greeting}
                            </p>
                            <Link
                                href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/new`}
                                className="inline-flex items-center gap-2 px-6 py-3 v2-label text-[11px] rounded-[8px]"
                                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                            >
                                Start with {agent.name}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.18, ease: EASE }}
                                className="flex items-center justify-between mb-5"
                            >
                                <h2 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--v2-paper-ink)' }}>
                                    Recent threads
                                </h2>
                                <Link
                                    href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/new`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] v2-label text-[9px]"
                                    style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                                >
                                    New thread
                                </Link>
                            </motion.div>

                            <div className="space-y-2">
                                {threads.slice(0, 8).map((thread, i) => (
                                    <motion.div
                                        key={thread.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, delay: Math.min(i * 0.04, 0.2), ease: EASE }}
                                    >
                                        <Link
                                            href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/${thread.id}`}
                                            className="flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-colors"
                                            style={{
                                                background: 'rgba(255,255,255,0.35)',
                                                border: '1px solid var(--v2-paper-rule)',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'rgba(0,0,0,0.03)' }}
                                            >
                                                <Hash className="w-3.5 h-3.5" style={{ color: 'var(--v2-paper-ink-2)' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', fontWeight: 500, color: 'var(--v2-paper-ink)', lineHeight: 1.3 }}>
                                                    {thread.title || 'Untitled'}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
                                                        {thread.updatedAt ? formatRelativeTime(thread.updatedAt) : '—'}
                                                    </span>
                                                    {thread.docCount > 0 && (
                                                        <span className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
                                                            · {thread.docCount} {thread.docCount === 1 ? 'doc' : 'docs'}
                                                        </span>
                                                    )}
                                                    {thread.status === 'running' && (
                                                        <span className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-vermilion)' }}>
                                                            · running
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-30" style={{ color: 'var(--v2-vermilion)' }} />
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
