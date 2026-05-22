'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Target, AlertCircle, Trash2, Pencil } from 'lucide-react';
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
            fetchThread(workspaceId, 'social-growth', threadId);
            fetchArtifacts(workspaceId, 'social-growth', threadId);
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
        await updateThread(workspaceId, 'social-growth', threadId, { title: editTitle, description: editDesc });
        setIsEditing(false);
    }, [workspaceId, threadId, editTitle, editDesc, updateThread]);

    const handleDelete = useCallback(async () => {
        if (!confirm('Are you sure you want to delete this thread?')) return;
        setIsDeleting(true);
        try {
            await deleteThread(workspaceId, 'social-growth', threadId);
            router.push(`/workspaces/${workspaceId}/modules/social-growth`);
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
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="text-xl font-bold text-neutral-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-full"
                                    />
                                    <textarea
                                        value={editDesc}
                                        onChange={e => setEditDesc(e.target.value)}
                                        rows={2}
                                        className="text-sm text-neutral-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-full resize-y"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveEdit}
                                            className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold text-neutral-900">{currentThread.title}</h2>
                                    {currentThread.description && (
                                        <p className="text-sm text-neutral-500 mt-1">{currentThread.description}</p>
                                    )}
                                </>
                            )}
                            <p className="text-xs text-neutral-400 mt-2">{currentThread.docCount} docs</p>
                        </div>
                        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                            {!isEditing && (
                                <button
                                    onClick={startEditing}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {currentArtifacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                            <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-purple-500 rounded-2xl shadow-xl shadow-violet-500/20 flex items-center justify-center mb-6">
                                <Target className="h-10 w-10 text-white" />
                            </div>
                            <p className="text-slate-500">No artifacts saved yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {currentArtifacts.map((artifact) => (
                                <ArtifactContentView key={artifact.id} artifact={artifact} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
