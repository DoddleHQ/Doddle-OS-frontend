'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, Clock } from 'lucide-react';
import { TechnicalAuditButton } from '@/components/business-audit';
import { useThread } from '@/lib/contexts/ThreadContext';
import { AuditThread, ThreadStatus } from '@/lib/types/thread.types';

const statusConfig: Record<ThreadStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    idle: { variant: 'neutral', label: 'Idle' },
    running: { variant: 'info', label: 'Running' },
    hitl_pending: { variant: 'warning', label: 'Awaiting Input' },
    complete: { variant: 'success', label: 'Complete' },
    error: { variant: 'error', label: 'Error' },
};

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

function ThreadCard({ thread }: { thread: AuditThread }) {
    const config = statusConfig[thread.status];
    const description = thread.pageNames.length > 0
        ? `Pages: ${thread.pageNames.join(', ')}`
        : 'No pages audited yet';

    return (
        <Link href={`/workspaces/${thread.workspaceId}/modules/business-audit/${thread.id}`}>
            <Card className="p-4 hover:border-primary transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-medium mb-1">{thread.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {description}
                        </p>
                    </div>
                    <Badge variant={config.variant}>
                        {config.label}
                    </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(thread.createdAt)}
                        <span className="text-neutral-300">·</span>
                        {thread.artifactCount} {thread.artifactCount === 1 ? 'artifact' : 'artifacts'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </Card>
        </Link>
    );
}

export default function BusinessAuditPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;
    const { threads, isLoading, fetchThreads } = useThread();

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/workspaces');
        }
    }, [workspaceId, router]);

    useEffect(() => {
        if (workspaceId) {
            fetchThreads(workspaceId, 'business-audit');
        }
    }, [workspaceId, fetchThreads]);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Business Audit</h1>
                    <p className="text-muted-foreground">Comprehensive analysis of brand voice, strategy, and business health</p>
                </div>
                <div className="flex gap-2 items-center">
                    <TechnicalAuditButton workspaceId={workspaceId} />
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
            ) : threads.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 py-16">
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <div className="mb-4 text-slate-700">
                            <ShieldCheck className="h-12 w-12" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No audits yet</h3>
                        <p className="text-sm text-slate-700 max-w-sm">
                            Start a technical audit to analyze a website's SEO and performance.
                        </p>
                    </div>
                </div>
            ) : (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Audit Threads</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {threads.map(thread => (
                            <ThreadCard key={thread.id} thread={thread} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
