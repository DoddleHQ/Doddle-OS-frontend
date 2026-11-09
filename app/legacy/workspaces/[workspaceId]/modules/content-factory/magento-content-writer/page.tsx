'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, ArrowRight, Clock, AlertCircle, Plus } from 'lucide-react';
import { useThread } from '@/lib/contexts/ThreadContext';
import { AuditThread } from '@/lib/types/thread.types';

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function ThreadCard({ thread, workspaceId }: { thread: AuditThread; workspaceId: string }) {
    const description = thread.description || 'No description';

    return (
        <Link href={`/legacy/workspaces/${workspaceId}/modules/content-factory/magento-content-writer/${thread.id}`}>
            <Card className="p-4 hover:border-purple-300 transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-medium mb-1">{thread.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {description}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(thread.createdAt)}
                        <span className="text-neutral-300">·</span>
                        {thread.docCount} {thread.docCount === 1 ? 'doc' : 'docs'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </Card>
        </Link>
    );
}

export default function MagentoContentWriterListPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;
    const { threads, isLoading, error, fetchThreads } = useThread();

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/legacy/workspaces');
        }
    }, [workspaceId, router]);

    useEffect(() => {
        if (workspaceId) {
            fetchThreads(workspaceId, 'magento-content-writer');
        }
    }, [workspaceId, fetchThreads]);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link
                            href={`/legacy/workspaces/${workspaceId}/modules/content-factory`}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Content Factory
                        </Link>
                        <span className="text-sm text-muted-foreground">/</span>
                        <span className="text-sm text-muted-foreground">Magento Content Writer</span>
                    </div>
                    <p className="text-muted-foreground">Write and push content directly to Magento</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Link href={`/legacy/workspaces/${workspaceId}/modules/content-factory/magento-content-writer/new`}>
                        <Button variant="primary" className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Thread
                        </Button>
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="h-6 w-40 bg-slate-100 animate-pulse rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                                <div className="flex justify-between">
                                    <div className="h-6 w-3/4 bg-slate-100 animate-pulse rounded" />
                                    <div className="h-6 w-16 bg-slate-100 animate-pulse rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-slate-50 animate-pulse rounded" />
                                </div>
                                <div className="pt-2 flex justify-between items-center">
                                    <div className="h-4 w-24 bg-slate-50 animate-pulse rounded" />
                                    <div className="h-4 w-4 bg-slate-100 animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : error ? (
                <Card className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Failed to load threads</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => fetchThreads(workspaceId, 'magento-content-writer')}>Retry</Button>
                </Card>
            ) : threads.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 py-16">
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <div className="mb-4 text-purple-600">
                            <FileText className="h-12 w-12" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No threads yet</h3>
                        <p className="text-sm text-slate-700 max-w-sm">
                            Start a Magento content writing session to generate and push product, category, and collection page content.
                        </p>
                    </div>
                </div>
            ) : (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Magento Content Threads</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {threads.map(thread => (
                            <ThreadCard key={thread.id} thread={thread} workspaceId={workspaceId} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
