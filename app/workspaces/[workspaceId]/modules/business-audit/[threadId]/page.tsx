'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Bot, ShieldCheck, AlertCircle } from 'lucide-react';
import { useThread } from '@/lib/contexts/ThreadContext';
import { ArtifactPayload } from '@/lib/types/graph-events.types';
import ArtifactCardRouter from '@/components/content-factory/chat/artifacts/ArtifactCardRouter';
import MarkdownRenderer from '@/components/content-factory/chat/artifacts/MarkdownRenderer';
import Notification from '@/components/ui/Notification';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';

export default function ThreadViewPage() {
    const params = useParams();
    const threadId = params.threadId as string;

    const {
        currentThread,
        currentArtifacts,
        isLoading,
        error,
        fetchThread,
        fetchArtifacts,
        clearError,
    } = useThread();

    const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);

    useEffect(() => {
        if (threadId) {
            fetchThread(threadId);
            fetchArtifacts(threadId);
        }
    }, [threadId, fetchThread, fetchArtifacts]);

    const handleCopyArtifact = useCallback(async (artifact: ArtifactPayload) => {
        const markdownContent = extractArtifactMarkdown(artifact);
        await navigator.clipboard.writeText(markdownContent);
        setCopiedArtifactId(artifact.artifactId);
        setTimeout(() => setCopiedArtifactId(null), 2000);
    }, []);

    const handleDownloadArtifact = useCallback((artifact: ArtifactPayload) => {
        const markdownContent = extractArtifactMarkdown(artifact);
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            </div>
        );
    }

    if (error || !currentThread) {
        return (
            <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden">
                <Notification
                    message={error || 'Thread not found'}
                    variant="error"
                    visible={!!error || !currentThread}
                    onClose={clearError}
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-neutral-500">Thread not found or failed to load.</p>
                    </div>
                </div>
            </div>
        );
    }

    const statusBadge = {
        complete: 'bg-green-100 text-green-700',
        running: 'bg-blue-100 text-blue-700',
        hitl_pending: 'bg-amber-100 text-amber-700',
        error: 'bg-red-100 text-red-700',
        idle: 'bg-slate-100 text-slate-600',
    }[currentThread.status] || 'bg-slate-100 text-slate-600';

    const statusLabel = {
        complete: 'Complete',
        running: 'Running',
        hitl_pending: 'Awaiting Input',
        error: 'Error',
        idle: 'Idle',
    }[currentThread.status] || currentThread.status;

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-center my-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
                            {statusLabel}
                        </span>
                    </div>

                    {currentArtifacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center mb-6">
                                <ShieldCheck className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{currentThread.title}</h2>
                            <p className="text-slate-500">No artifacts saved yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentArtifacts.map((artifact) => (
                                <ArtifactCardRouter
                                    key={artifact.id}
                                    artifact={{
                                        artifactId: artifact.artifactId,
                                        artifactType: artifact.artifactType,
                                        title: artifact.title,
                                        description: artifact.description,
                                        content: artifact.content,
                                        metadata: artifact.metadata,
                                    }}
                                    onRespond={() => {}}
                                    onCopyArtifact={handleCopyArtifact}
                                    onDownloadArtifact={handleDownloadArtifact}
                                    copiedArtifactId={copiedArtifactId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
