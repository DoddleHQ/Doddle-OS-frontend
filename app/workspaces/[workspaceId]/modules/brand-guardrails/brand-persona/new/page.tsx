'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
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

export default function BrandPersonaNewPage() {
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
        graphId: 'brand_persona_generator',
        workspaceId,
        onComplete: (summary) => {
            console.log('Brand Persona Generator completed:', summary);
        },
    });

    // Handle message send
    const handleSendMessage = useCallback((message: string) => {
        setChatInputValue('');
        sentMessageRef.current = message;

        if (isHITLPending && streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, message);
            return;
        }

        if (!isRunning) {
            addMessage({
                type: 'user',
                content: message,
                sender: 'You',
            });
            startStream({ human_input: message });
        }
    }, [isHITLPending, streamState.pendingHITL, isRunning, respondToHITL, addMessage, startStream]);

    // Handle HITL response (structured)
    const handleHITLRespond = useCallback((response: unknown) => {
        if (streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, response);
        }
    }, [streamState.pendingHITL, respondToHITL]);

    // Append to chat input (for multi_selection)
    const handleAppendToInput = useCallback((text: string) => {
        setChatInputValue((prev) => prev ? `${prev}, ${text}` : text);
    }, []);

    // Copy artifact
    const handleCopyArtifact = useCallback((artifact: ArtifactPayload) => {
        const markdown = extractArtifactMarkdown(artifact);
        if (markdown) {
            navigator.clipboard.writeText(markdown);
            setCopiedArtifactId(artifact.artifactId);
            setTimeout(() => setCopiedArtifactId(null), 2000);
        }
    }, []);

    // Download artifact
    const handleDownloadArtifact = useCallback((artifact: ArtifactPayload) => {
        const markdown = extractArtifactMarkdown(artifact);
        if (markdown) {
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${artifact.title || 'brand-persona'}.md`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }, []);

    // Create thread in DB when stream thread ID is available
    useEffect(() => {
        if (streamState.threadId && !dbThreadIdRef.current) {
            const message = sentMessageRef.current || '';
            const title = message.length > 50 ? message.slice(0, 50) + '...' : message || 'Brand Persona Generation';

            createThreadFromStream({
                threadId: streamState.threadId,
                workspaceId,
                moduleId: 'brand-persona',
                title,
                description: message,
            }).then((thread) => {
                dbThreadIdRef.current = thread.id;
                setDbThreadId(thread.id);
            }).catch((err) => {
                console.error('Failed to create thread:', err);
            });
        }
    }, [streamState.threadId, workspaceId, createThreadFromStream]);

    // Replace URL when DB thread ID is available
    useEffect(() => {
        if (dbThreadId && !urlReplacedRef.current) {
            urlReplacedRef.current = true;
            window.history.replaceState(null, '', `/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona/${dbThreadId}`);
        }
    }, [dbThreadId, workspaceId]);

    // Save artifacts
    useEffect(() => {
        if (streamState.threadId && artifacts.length > 0 && dbThreadIdRef.current) {
            artifacts.forEach((artifact) => {
                saveArtifact(workspaceId, 'brand-persona', dbThreadIdRef.current!, {
                    artifactId: artifact.artifactId,
                    content: artifact.content,
                    title: artifact.title,
                    artifactType: artifact.artifactType,
                });
            });
        }
    }, [artifacts, streamState.threadId, workspaceId, saveArtifact]);

    // Update thread status on complete
    useEffect(() => {
        if (isComplete && dbThreadIdRef.current && !successDismissed) {
            updateThread(workspaceId, 'brand-persona', dbThreadIdRef.current, { status: 'complete' });
        }
    }, [isComplete, dbThreadIdRef, successDismissed, workspaceId, updateThread]);

    // Auto-scroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, artifacts]);

    const isInputDisabled = isRunning || (isHITLPending && streamState.pendingHITL?.requestType !== 'feedback' && streamState.pendingHITL?.requestType !== 'topic_input' && streamState.pendingHITL?.requestType !== 'data_input');

    const overallProgress = calculateOverallProgress(currentStep?.stepNumber || 0, currentStep?.totalSteps || 0, progress?.current ? (progress.current / progress.total) * 100 : undefined);

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden">
            {/* Error notification */}
            {error && !isRunning && (
                <Notification
                    message={error.message}
                    variant="error"
                    onClose={clearError}
                />
            )}

            {/* Chat container */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {/* Welcome hero (before first message) */}
                {messages.length === 0 && !isRunning && (
                    <div className="text-center py-12 max-w-md mx-auto">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Brand Persona Generator</h2>
                        <p className="text-slate-500 mb-4">
                            Enter your website URL or describe your business. I&apos;ll generate a comprehensive
                            brand persona to align your AI agents.
                        </p>
                    </div>
                )}

                {/* Render messages */}
                {messages.map((message) => (
                    <MessageRenderer
                        key={message.id}
                        message={message}
                        artifacts={artifacts}
                        pendingHITL={streamState.pendingHITL}
                        onHITLRespond={handleHITLRespond}
                        onCopyArtifact={handleCopyArtifact}
                        onDownloadArtifact={handleDownloadArtifact}
                        copiedArtifactId={copiedArtifactId}
                        onAppendToInput={handleAppendToInput}
                    />
                ))}

                {/* Typing indicator */}
                {isRunning && !isHITLPending && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm pl-2">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{progress?.message || currentStep?.stepName || 'Generating...'}</span>
                    </div>
                )}

                {/* Completion banner */}
                {isComplete && !successDismissed && (
                    <div className="flex justify-center">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5 max-w-md text-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Brand Persona Generated!</h3>
                            <p className="text-sm text-slate-600 mb-3">Your brand persona is ready. It will guide every agent in your workspace.</p>
                            {dbThreadId && (
                                <Link
                                    href={`/workspaces/${workspaceId}/mission-control`}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Back to Mission Control →
                                </Link>
                            )}
                            <button
                                onClick={() => setSuccessDismissed(true)}
                                className="block mx-auto mt-2 text-xs text-slate-400 hover:text-slate-600"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat input */}
            <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isInputDisabled}
                    placeholder={
                        isHITLPending
                            ? 'Enter your response...'
                            : isRunning
                                ? 'Generating persona...'
                                : 'Enter your website URL or describe your business...'
                    }
                    inputValue={chatInputValue}
                    onInputChange={setChatInputValue}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MessageRenderer — inline component (same pattern as interactive-website-architect)
// ---------------------------------------------------------------------------

interface MessageRendererProps {
    message: ChatMessageType;
    artifacts: ArtifactPayload[];
    pendingHITL: HITLRequestPayload | null;
    onHITLRespond: (response: unknown) => void;
    onCopyArtifact: (artifact: ArtifactPayload) => void;
    onDownloadArtifact: (artifact: ArtifactPayload) => void;
    copiedArtifactId: string | null;
    onAppendToInput?: (text: string) => void;
}

function MessageRenderer({
    message,
    artifacts,
    pendingHITL,
    onHITLRespond,
    onCopyArtifact,
    onDownloadArtifact,
    copiedArtifactId,
    onAppendToInput,
}: MessageRendererProps) {
    // User message
    if (message.type === 'user') {
        return (
            <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{message.content}</p>
                </div>
            </div>
        );
    }

    // System message
    if (message.type === 'system') {
        return (
            <div className="flex justify-center">
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    // Step message
    if (message.type === 'step') {
        return (
            <div className="flex justify-center">
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    // Agent message
    if (message.type === 'agent') {
        return (
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">BP</span>
                </div>
                <div className="flex-1">
                    {message.sender && (
                        <p className="text-xs text-slate-400 mb-1">{message.sender}</p>
                    )}
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                        <MarkdownRenderer content={message.content} accentColor="violet" />
                    </div>
                </div>
            </div>
        );
    }

    // Artifact message
    if (message.type === 'artifact') {
        const artifact = artifacts.find((a) => a.artifactId === message.metadata?.artifactId);
        if (artifact) {
            return (
                <div className="pl-11">
                    <ArtifactCardRouter
                        artifact={artifact}
                        onRespond={onHITLRespond}
                        onCopyArtifact={onCopyArtifact}
                        onDownloadArtifact={onDownloadArtifact}
                        copiedArtifactId={copiedArtifactId}
                        onAppendToInput={onAppendToInput}
                    />
                </div>
            );
        }
    }

    // HITL message
    if (message.type === 'hitl' && pendingHITL) {
        return (
            <div className="pl-11">
                <HITLMessageCard
                    request={pendingHITL}
                    onRespond={onHITLRespond}
                    onAppendToInput={onAppendToInput}
                />
            </div>
        );
    }

    return null;
}
