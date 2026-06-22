'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, Bot, BarChart3 } from 'lucide-react';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import { useThread } from '@/lib/contexts/ThreadContext';
import {
    ChatMessage as ChatMessageType,
    ArtifactPayload,
    HITLRequestPayload,
    calculateOverallProgress,
} from '@/lib/types/graph-events.types';
import ChatInput from '@/components/content-factory/chat/ChatInput';
import HITLMessageCard from '@/components/content-factory/chat/HITLMessageCard';
import ArtifactCardRouter from '@/components/content-factory/chat/artifacts/ArtifactCardRouter';
import MarkdownRenderer from '@/components/content-factory/chat/artifacts/MarkdownRenderer';
import Notification from '@/components/ui/Notification';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';

/**
 * New Project Page - Chat Interface with LangGraph Streaming
 *
 * A chat interface that takes user input and streams LangGraph workflow events
 * in real-time using the unified event system.
 */
export default function NewProjectPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;

    const {
        createThreadFromStream,
        updateThread,
        saveArtifact,
    } = useThread();

    const [chatInputValue, setChatInputValue] = useState('');

    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);

    const [successDismissed, setSuccessDismissed] = useState(false);
    const dbThreadIdRef = useRef<string | null>(null);
    const urlReplacedRef = useRef(false);
    const sentMessageRef = useRef<string | null>(null);
    const [dbThreadId, setDbThreadId] = useState<string | null>(null);

    // Use the LangGraph stream hook
    const {
        state: streamState,
        startStream,
        addMessage,
        respondToHITL,
        clearError,
        isRunning,
        isHITLPending,
        isComplete,
        currentStep,
        progress,
        error,
        completeEvent,
        messages,
        artifacts,
    } = useLangGraphStream({
        graphId: 'interactive_website_architect',
        workspaceId,
        onComplete: (summary) => {
            console.log('Workflow completed:', summary);
        },
    });

    // Handle message send
    const handleSendMessage = useCallback((message: string) => {
        setChatInputValue('');
        sentMessageRef.current = message;

        if (!isRunning) {
            addMessage({
                type: 'user',
                content: message,
            });

            startStream({
                user_input: message,
            });
        } else if (isHITLPending && streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, message);
        }
    }, [isRunning, isHITLPending, streamState.pendingHITL, startStream, respondToHITL, addMessage]);

    // Handle HITL response from the HITL card
    const handleHITLRespond = useCallback((response: unknown) => {
        if (streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, response);
        }
    }, [streamState.pendingHITL, respondToHITL]);

    // Copy artifact content to clipboard
    const handleCopyArtifact = useCallback(async (artifact: ArtifactPayload) => {
        const markdownContent = extractArtifactMarkdown(artifact);
        await navigator.clipboard.writeText(markdownContent);
        setCopiedArtifactId(artifact.artifactId);
        setTimeout(() => setCopiedArtifactId(null), 2000);
    }, []);

    // Download artifact
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

    // Redirect if workspaceId is not available
    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/workspaces');
        }
    }, [workspaceId, router]);

    useEffect(() => {
        if (streamState.threadId && !dbThreadIdRef.current) {
            const message = sentMessageRef.current || '';
            const title = message.slice(0, 100) || 'Interactive Website Architect Project';

            createThreadFromStream({
                workspaceId,
                threadId: streamState.threadId,
                moduleId: 'interactive-website-architect',
                title,
                description: message,
            }).then((thread) => {
                dbThreadIdRef.current = thread.id;
                setDbThreadId(thread.id);
            }).catch((err) => {
                console.error('[NewProjectPage] Failed to create thread:', err);
            });
        }
    }, [streamState.threadId, workspaceId, createThreadFromStream]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, artifacts, currentStep]);

    // Save artifacts as they are created
    useEffect(() => {
        if (dbThreadId && artifacts.length > 0) {
            artifacts.forEach((artifact) => {
                saveArtifact(workspaceId, 'interactive-website-architect', dbThreadId, artifact).catch((err) => {
                    console.error(`[NewProjectPage] Failed to save artifact ${artifact.artifactId}:`, err);
                });
            });
        }
    }, [artifacts, dbThreadId, workspaceId, saveArtifact]);

    // Update thread status on completion
    useEffect(() => {
        if (isComplete && dbThreadId && completeEvent) {
            updateThread(workspaceId, 'interactive-website-architect', dbThreadId, {
                status: 'complete',
                description: typeof completeEvent.summary === 'string'
                    ? completeEvent.summary
                    : 'Interactive Website Architect project completed',
            }).catch((err) => {
                console.error('[NewProjectPage] Failed to update thread status:', err);
            });
        }
    }, [isComplete, dbThreadId, completeEvent, workspaceId, updateThread]);

    // Redirect to thread view on completion
    useEffect(() => {
        if (isComplete && dbThreadId && !successDismissed) {
            const timer = setTimeout(() => {
                router.push(`/workspaces/${workspaceId}/modules/content-factory/interactive-website-architect/${dbThreadId}`);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isComplete, dbThreadId, successDismissed, router, workspaceId]);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    const overallProgress = progress ? calculateOverallProgress(progress.current, progress.total) : 0;

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
            {/* Success Notification */}
            {isComplete && completeEvent && (
                <Notification
                    message={typeof completeEvent.summary === 'string' ? completeEvent.summary : 'Interactive Website Architect project completed successfully!'}
                    variant="success"
                    visible={!successDismissed}
                    onClose={() => setSuccessDismissed(true)}
                />
            )}

            {/* Error Notification */}
            {error && (
                <Notification
                    message={error.message || 'An error occurred during processing'}
                    variant="error"
                    visible={!!error}
                    onClose={clearError}
                />
            )}

            {/* Chat Container */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth" ref={chatContainerRef}>
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Welcome Message */}
                    {messages.length === 0 && !isRunning && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                            <div className="mb-4 text-emerald-600">
                                <Bot className="h-12 w-12 mx-auto" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Interactive Website Architect</h2>
                            <p className="text-muted-foreground mb-4">
                                Design and build interactive websites with AI-powered architecture and real-time collaboration.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Start by describing your website project or asking a question about web architecture.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                message.type === 'user'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white border border-slate-200 text-slate-900'
                            }`}>
                                {message.type === 'user' ? (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                ) : (
                                    <MarkdownRenderer content={message.content} />
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Current Step Indicator */}
                    {currentStep && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{currentStep.stepName}</p>
                                    {currentStep.description && (
                                        <p className="text-sm text-muted-foreground">{currentStep.description}</p>
                                    )}
                                </div>
                                {progress && (
                                    <div className="text-sm text-muted-foreground">
                                        {overallProgress}%
                                    </div>
                                )}
                            </div>
                            {progress && progress.total > 0 && (
                                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-600 transition-all duration-300"
                                        style={{ width: `${overallProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* HITL Request */}
                    {isHITLPending && streamState.pendingHITL && (
                        <HITLMessageCard
                            request={streamState.pendingHITL}
                            onRespond={handleHITLRespond}
                        />
                    )}

                    {/* Artifacts */}
                    {artifacts.map((artifact) => (
                        <ArtifactCardRouter
                            key={artifact.artifactId}
                            artifact={artifact}
                            onRespond={() => {}}
                            onCopyArtifact={handleCopyArtifact}
                            onDownloadArtifact={handleDownloadArtifact}
                            copiedArtifactId={copiedArtifactId}
                        />
                    ))}

                    {/* Loading Indicator */}
                    {isRunning && !currentStep && !isHITLPending && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Processing...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-slate-200 bg-white p-4">
                <ChatInput
                    inputValue={chatInputValue}
                    onInputChange={setChatInputValue}
                    onSend={handleSendMessage}
                    disabled={isRunning && !isHITLPending}
                    placeholder={
                        isHITLPending
                            ? 'Provide your response...'
                            : isRunning
                            ? 'Processing...'
                            : 'Describe your website project...'
                    }
                />
            </div>
        </div>
    );
}