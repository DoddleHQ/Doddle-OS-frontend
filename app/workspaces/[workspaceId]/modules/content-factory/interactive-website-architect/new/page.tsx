'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, Bot } from 'lucide-react';
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
 * Interactive Website Architect - New Thread Page
 *
 * A chat interface that streams the interactive_website_architect_v2 LangGraph workflow
 * events in real-time using the unified event system.
 */
export default function InteractiveWebsiteArchitectNewPage() {
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

    // Use the LangGraph stream hook with interactive_website_architect graph
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
            console.log('Interactive Website Architect workflow completed:', summary);
        },
    });

    // Handle message send
    const handleSendMessage = useCallback((message: string) => {
        setChatInputValue('');
        sentMessageRef.current = message;

        if (isHITLPending && streamState.pendingHITL) {
            // If there's a pending HITL request, treat message as response
            respondToHITL(streamState.pendingHITL.requestId, message);
            return;
        }

        if (!isRunning) {
            addMessage({
                type: 'user',
                content: message,
            });

            startStream({
                user_input: message,
            });
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
            const message = sentMessageRef.current || 'Interactive Website Architect';

            createThreadFromStream({
                threadId: streamState.threadId,
                workspaceId,
                moduleId: 'interactive-website-architect',
                title: `Website Architect: ${message.substring(0, 50)}`,
                description: `Interactive website architect session: ${message.substring(0, 100)}`,
            }).then((thread) => {
                // Only use the database-returned ID — never fall back to the
                // LangGraph thread ID, which does not exist in the database.
                const dbId = thread.id;
                if (!dbId) {
                    console.error('[InteractiveWebsiteArchitectNew] Thread created but returned no database ID:', thread);
                    return;
                }
                dbThreadIdRef.current = dbId;
                setDbThreadId(dbId);
            }).catch((err) => {
                console.error('[InteractiveWebsiteArchitectNew] Failed to create thread in database:', err);
            });
        }
    }, [streamState.threadId, createThreadFromStream, workspaceId]);

    useEffect(() => {
        if (dbThreadId && !urlReplacedRef.current) {
            urlReplacedRef.current = true;
            const newUrl = `/workspaces/${workspaceId}/modules/content-factory/interactive-website-architect/${dbThreadId}`;
            window.history.replaceState(null, '', newUrl);
        }
    }, [dbThreadId, workspaceId]);

    useEffect(() => {
        if (dbThreadId && artifacts.length > 0) {
            for (const artifact of artifacts) {
                saveArtifact(workspaceId, 'interactive-website-architect', dbThreadId, artifact);
            }
        }
    }, [artifacts, dbThreadId, saveArtifact, workspaceId]);

    useEffect(() => {
        if (isComplete && dbThreadId && completeEvent) {
            updateThread(workspaceId, 'interactive-website-architect', dbThreadId, {
                status: 'complete',
            });
        }
    }, [isComplete, completeEvent, dbThreadId, workspaceId, updateThread]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Don't render if workspaceId is not available - AFTER all hooks
    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    // Input is disabled when workflow is running and no HITL is pending
    const isInputDisabled = isRunning && !isHITLPending;

    // Calculate overall progress
    const overallProgress = currentStep
        ? calculateOverallProgress(currentStep.stepNumber, currentStep.totalSteps, progress?.current ? (progress.current / progress.total) * 100 : undefined)
        : 0;

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
            {/* Error notification */}
            <Notification
                message={error?.message || ''}
                variant="error"
                visible={!!error}
                onClose={clearError}
            />

            {/* Success notification when workflow completes successfully */}
            <Notification
                message={completeEvent?.message || 'Website architecture completed successfully!'}
                variant="success"
                visible={isComplete && completeEvent?.status === 'success' && !successDismissed}
                onClose={() => setSuccessDismissed(true)}
            />

            {/* Status indicator when running (but not during HITL) */}
            {isRunning && !isHITLPending && (
                <div className="flex-shrink-0 bg-emerald-50/50 backdrop-blur border-b border-emerald-100/50 px-6 py-2.5 sticky top-0 z-10 transition-all">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-emerald-700 mb-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>
                                {currentStep
                                    ? `Step ${currentStep.stepNumber}/${currentStep.totalSteps}: ${currentStep.stepName}`
                                    : 'Processing...'
                                }
                            </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-emerald-100 rounded-full h-1.5">
                            <div
                                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* HITL Pending Status Banner */}
            {isHITLPending && (
                <div className="flex-shrink-0 bg-amber-50/50 backdrop-blur border-b border-amber-100/50 px-6 py-2.5 sticky top-0 z-10 transition-all">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Waiting for your response - please check the chat or enter your feedback below</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth"
            >
                <div className="w-full space-y-6">
                    {/* Welcome message if no messages yet */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center mb-6 transform transition-transform hover:scale-105">
                                <Bot className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-3 tracking-tight">
                                Interactive Website Architect
                            </h2>
                            <p className="text-slate-500 max-w-md mb-8 text-lg">
                                Design and build interactive websites with AI-powered architecture and real-time collaboration.
                            </p>
                            <p className="text-sm text-slate-400">
                                Start by describing your website project or asking a question about web architecture.
                            </p>
                        </div>
                    )}

                    {/* Chat messages */}
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
                            onAppendToInput={(text: string) => {
                                setChatInputValue(prev => prev ? `${prev}\n${text}` : text);
                            }}
                        />
                    ))}

                    {/* Typing indicator when workflow is running */}
                    {isRunning && !isHITLPending && (
                        <div className="flex justify-start my-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {progress?.message || 'Processing...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completion message */}
                    {streamState.status === 'complete' && (
                        <div className="flex justify-center my-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 max-w-md text-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                                <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                                    Website Architecture Complete!
                                </h3>
                                <p className="text-sm text-neutral-600 mb-2">
                                    Your interactive website has been architected successfully.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isInputDisabled}
                    placeholder={
                        isHITLPending
                            ? 'Enter your response...'
                            : isRunning
                                ? 'Waiting for architecture to complete...'
                                : 'Describe your website project...'
                    }
                    inputValue={chatInputValue}
                    onInputChange={setChatInputValue}
                />
            </div>
        </div>
    );
}

// ============================================
// Message Renderer Component
// ============================================

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
    const metadata = message.metadata;

    // User messages - right aligned
    if (message.type === 'user') {
        return (
            <div className="flex justify-end my-4">
                <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl rounded-br-sm max-w-[65%] shadow-sm min-w-0 overflow-hidden">
                    <MarkdownRenderer content={message.content} accentColor="emerald" invert />
                </div>
            </div>
        );
    }

    // System messages - center aligned, smaller
    if (message.type === 'system') {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-medium">
                    <MarkdownRenderer content={message.content} accentColor="slate" />
                </div>
            </div>
        );
    }

    // Step messages - show description without step counter
    if (message.type === 'step') {
        return (
            <div className="flex justify-start my-4">
                <div className="flex gap-3 max-w-[75%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-2xl rounded-tl-sm">
                        <MarkdownRenderer content={message.content} accentColor="emerald" />
                    </div>
                </div>
            </div>
        );
    }

    // Agent messages - left aligned with avatar
    if (message.type === 'agent') {
        return (
            <div className="flex justify-start my-4">
                <div className="flex gap-3 max-w-[75%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-sm">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                        <MarkdownRenderer content={message.content} accentColor="slate" />
                        {message.sender && (
                            <p className="text-xs text-slate-400 mt-2">{message.sender}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Artifact messages - routed to dedicated card components
    if (message.type === 'artifact') {
        const artifactId = metadata?.artifactId;
        const artifact = artifacts.find(a => a.artifactId === artifactId);

        if (!artifact) return null;

        return (
            <ArtifactCardRouter
                artifact={artifact}
                onRespond={onHITLRespond}
                onCopyArtifact={onCopyArtifact}
                onDownloadArtifact={onDownloadArtifact}
                copiedArtifactId={copiedArtifactId}
                onAppendToInput={onAppendToInput}
            />
        );
    }

    // HITL messages - interactive card (or static if already responded)
    if (message.type === 'hitl') {
        const isActive = pendingHITL !== null && pendingHITL.requestId === metadata?.requestId;
        const hitlData = isActive ? pendingHITL : (metadata?.data as HITLRequestPayload | undefined);

        // Use HITLMessageCard for selection, multi_selection, and data_input with fields
        if (hitlData && hitlData.options && hitlData.options.length > 0 && hitlData.requestType !== 'url_selection') {
            const hasLinkListArtifact = artifacts.some(a => a.artifactType === 'link_list');
            if (hitlData.requestType === 'multi_selection' && hasLinkListArtifact) {
                return null;
            }
            return (
                <div className="flex justify-start my-4">
                    <HITLMessageCard
                        request={hitlData}
                        onRespond={onHITLRespond as (response: Record<string, unknown>) => void}
                        onAppendToInput={onAppendToInput}
                        disabled={!isActive}
                    />
                </div>
            );
        }

        // Use HITLMessageCard for data_input with structured fields
        if (hitlData && hitlData.requestType === 'data_input' && hitlData.data?.fields) {
            return (
                <div className="flex justify-start my-4">
                    <HITLMessageCard
                        request={hitlData}
                        onRespond={onHITLRespond as (response: Record<string, unknown>) => void}
                        disabled={!isActive}
                    />
                </div>
            );
        }

        return (
            <div className="flex justify-start my-4">
                <div className="flex gap-3 max-w-[75%]">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        <AlertCircle className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <div className={`rounded-2xl rounded-tl-sm shadow-sm p-5 ${isActive ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                        <div className={`text-[15px] leading-relaxed ${isActive ? 'text-amber-900' : 'text-slate-600'} ${hitlData ? 'mb-4' : ''}`}>
                            <MarkdownRenderer content={message.content} accentColor="amber" />
                        </div>

                        {/* Show interactive elements only when HITL is active */}
                        {hitlData && (
                            <>
                                {hitlData.requestType === 'confirmation' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Please provide your confirmation in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'feedback' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Type your feedback in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'data_input' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Type your input in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'topic_input' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Type your topic or question in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'url_selection' && hitlData.options && (
                                    <div className="space-y-2">
                                        {hitlData.options.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => onHITLRespond([option.value])}
                                                className="w-full text-left px-4 py-3 text-sm rounded-lg transition-colors bg-white border border-amber-200 hover:bg-amber-100"
                                            >
                                                <div className="font-medium text-slate-800">{option.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {hitlData.requestType === 'content_review' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onHITLRespond({ approved: true })}
                                            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => onHITLRespond({ approved: false })}
                                            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-white border border-amber-200 text-amber-800 hover:bg-amber-100"
                                        >
                                            Request Changes
                                        </button>
                                    </div>
                                )}

                                {!hitlData.options &&
                                    !['feedback', 'data_input', 'topic_input', 'content_review'].includes(hitlData.requestType || '') && (
                                        <p className="text-xs text-amber-600 italic">
                                            Type your response in the chat input below
                                        </p>
                                    )}
                            </>
                        )}

                        {/* Show "responded" indicator when no longer active */}
                        {!isActive && (
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Responded
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
