'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, FileText, AlertCircle, Trash2, Pencil } from 'lucide-react';
import { useThread } from '@/lib/contexts/ThreadContext';
import ArtifactContentView from '@/components/common/ArtifactContentView';
import Notification from '@/components/ui/Notification';

export default function ThreadViewPage() {
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
            fetchThread(workspaceId, 'interactive-website-architect', threadId);
            fetchArtifacts(workspaceId, 'interactive-website-architect', threadId);
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
        await updateThread(workspaceId, 'interactive-website-architect', threadId, { title: editTitle, description: editDesc });
        setIsEditing(false);
    }, [workspaceId, threadId, editTitle, editDesc, updateThread]);

    const handleDelete = useCallback(async () => {
        if (!confirm('Are you sure you want to delete this thread?')) return;
        setIsDeleting(true);
        try {
            await deleteThread(workspaceId, 'interactive-website-architect', threadId);
            router.push(`/legacy/workspaces/${workspaceId}/modules/content-factory/interactive-website-architect`);
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

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link
                            href={`/legacy/workspaces/${workspaceId}/modules/content-factory`}
                            className="hover:text-foreground transition-colors"
                        >
                            Content Factory
                        </Link>
                        <span>/</span>
                        <Link
                            href={`/legacy/workspaces/${workspaceId}/modules/content-factory/interactive-website-architect`}
                            className="hover:text-foreground transition-colors"
                        >
                            Interactive Website Architect
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">{currentThread.title}</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Description</label>
                                    <textarea
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveEdit}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h1 className="text-2xl font-bold mb-2">{currentThread.title}</h1>
                                        {currentThread.description && (
                                            <p className="text-muted-foreground">{currentThread.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={startEditing}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="h-5 w-5 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-5 w-5 text-red-600" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>
                                        {currentThread.docCount} {currentThread.docCount === 1 ? 'artifact' : 'artifacts'}
                                    </span>
                                    <span>·</span>
                                    <span>
                                        Created {new Date(currentThread.createdAt).toLocaleDateString()}
                                    </span>
                                    {currentThread.updatedAt && (
                                        <>
                                            <span>·</span>
                                            <span>
                                                Updated {new Date(currentThread.updatedAt).toLocaleDateString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {currentArtifacts.length > 0 ? (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Artifacts</h2>
                            <div className="space-y-2">
                                {currentArtifacts.map((artifact) => (
                                    <ArtifactContentView key={artifact.id} artifact={artifact} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 py-16">
                            <div className="flex flex-col items-center justify-center text-center px-4">
                                <div className="mb-4 text-slate-700">
                                    <FileText className="h-12 w-12" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">No artifacts yet</h3>
                                <p className="text-sm text-slate-700 max-w-sm">
                                    Artifacts will appear here as the interactive website architect generates content.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}