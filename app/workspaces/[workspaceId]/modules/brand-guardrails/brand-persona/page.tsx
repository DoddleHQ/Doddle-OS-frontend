'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useThread } from '@/lib/contexts/ThreadContext';
import { Loader2, Plus } from 'lucide-react';

export default function BrandPersonaListPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const { threads, isLoading, fetchThreads } = useThread();

    useEffect(() => {
        if (workspaceId) {
            fetchThreads(workspaceId, 'brand-persona');
        }
    }, [workspaceId, fetchThreads]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Brand Personas</h2>
                    <p className="text-sm text-slate-500">Generated brand personas for this workspace</p>
                </div>
                <Link
                    href={`/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona/new`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Persona
                </Link>
            </div>

            {threads.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-sm text-slate-400 mb-4">No brand personas yet.</p>
                    <Link
                        href={`/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona/new`}
                        className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                        Generate your first brand persona →
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {threads.map((thread) => (
                        <Link
                            key={thread.id}
                            href={`/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona/${thread.id}`}
                            className="block p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all bg-white"
                        >
                            <h3 className="text-sm font-semibold text-slate-900 mb-1 truncate">{thread.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2">{thread.description || 'No description'}</p>
                            <div className="flex items-center gap-2 mt-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    thread.status === 'complete' ? 'bg-green-100 text-green-700' :
                                    thread.status === 'error' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {thread.status}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {thread.docCount} artifact{thread.docCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
