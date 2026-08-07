'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, FileText, AlertCircle, Trash2, Pencil } from 'lucide-react';
import { useThread } from '@/lib/contexts/ThreadContext';
import ArtifactContentView from '@/components/common/ArtifactContentView';
import Notification from '@/components/ui/Notification';

export default function BrandPersonaThreadViewPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;
    const threadId = params.threadId as string;

    const {
        currentThread,
        currentArtifacts,
        isLoading,
        error,
        fetchThread,
        fetchArtifacts,
        updateThread,
        deleteThread,
        clearError,
    } = useThread();

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (threadId && workspaceId) {
            fetchThread(workspaceId, 'brand-persona', threadId);
            fetchArtifacts(workspaceId, 'brand-persona', threadId);
        }
    }, [threadId, workspaceId, fetchThread, fetchArtifacts]);

    const startEditing = useCallback(() => {
        if (currentThread) {
            setEditTitle(currentThread.title);
            setEditDesc(currentThread.description || '');
            setIsEditing(true);
        }
    }, [currentThread]);

    const saveEdit = useCallback(async () => {
        await updateThread(workspaceId, 'brand-persona', threadId, { title: editTitle, description: editDesc });
        setIsEditing(false);
    }, [workspaceId, threadId, editTitle, editDesc, updateThread]);

    const handleDelete = useCallback(async () => {
        if (!confirm('Are you sure you want to delete this thread?')) return;
        setIsDeleting(true);
        try {
            await deleteThread(workspaceId, 'brand-persona', threadId);
            router.push(`/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona`);
        } catch {
            setIsDeleting(false);
        }
    }, [workspaceId, threadId, deleteThread, router]);

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
                <div className="flex-1 flex items-center justify-center">
                    <Notification
                        message={error || 'Thread not found'}
                        variant="error"
                        onClose={clearError}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden">
            {/* Thread Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Link
                        href={`/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona`}
                        className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                    >
                        <FileText className="h-5 w-5" />
                    </Link>
                    {isEditing ? (
                        <div className="flex-1 space-y-1">
                            <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full text-sm font-semibold text-slate-900 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                placeholder="Thread title"
                            />
                            <input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full text-xs text-slate-500 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                                placeholder="Description"
                            />
                        </div>
                    ) : (
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-slate-900 truncate">{currentThread.title}</h2>
                            {currentThread.description && (
                                <p className="text-xs text-slate-500 truncate">{currentThread.description}</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {isEditing ? (
                        <button
                            onClick={saveEdit}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    ) : (
                        <button
                            onClick={startEditing}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Artifacts */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentArtifacts.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-slate-400">No artifacts yet.</p>
                    </div>
                ) : (
                    currentArtifacts.map((artifact) => (
                        <ArtifactContentView key={artifact.id} artifact={artifact} />
                    ))
                )}
            </div>
        </div>
    );
}
