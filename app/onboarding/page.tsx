'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import {
    ChatMessage as ChatMessageType,
    ArtifactPayload,
    HITLRequestPayload,
} from '@/lib/types/graph-events.types';
import ChatInput from '@/components/content-factory/chat/ChatInput';
import HITLMessageCard from '@/components/content-factory/chat/HITLMessageCard';
import ArtifactCardRouter from '@/components/content-factory/chat/artifacts/ArtifactCardRouter';
import MarkdownRenderer from '@/components/content-factory/chat/artifacts/MarkdownRenderer';
import Notification from '@/components/ui/Notification';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';

/*
 * /onboarding — brand persona generator via LangGraph.
 *
 * Uses useLangGraphStream with graphId 'brand_persona_generator' to stream
 * the conversation. The agent asks questions (HITL interrupts), the user
 * responds, and at the end produces a brand persona report artifact.
 *
 * No workspace needed — this runs before the user has one.
 */

export default function OnboardingPage() {
    const router = useRouter();

    const [chatInputValue, setChatInputValue] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);
    const sentMessageRef = useRef<string | null>(null);

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
        messages,
        artifacts,
    } = useLangGraphStream({
        graphId: 'brand_persona_generator',
        onComplete: (summary) => {
            console.log('Brand persona onboarding completed:', summary);
        },
    });

    const handleSendMessage = useCallback((message: string) => {
        setChatInputValue('');
        sentMessageRef.current = message;

        if (isHITLPending && streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, message);
            return;
        }

        if (!isRunning) {
            addMessage({ type: 'user', content: message, sender: 'You' });
            startStream({ human_input: message });
        }
    }, [isHITLPending, streamState.pendingHITL, isRunning, respondToHITL, addMessage, startStream]);

    const handleHITLRespond = useCallback((response: unknown) => {
        if (streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, response);
        }
    }, [streamState.pendingHITL, respondToHITL]);

    const handleAppendToInput = useCallback((text: string) => {
        setChatInputValue((prev) => prev ? `${prev}, ${text}` : text);
    }, []);

    const handleCopyArtifact = useCallback((artifact: ArtifactPayload) => {
        const markdown = extractArtifactMarkdown(artifact);
        if (markdown) {
            navigator.clipboard.writeText(markdown);
            setCopiedArtifactId(artifact.artifactId);
            setTimeout(() => setCopiedArtifactId(null), 2000);
        }
    }, []);

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

    // Auto-scroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, artifacts]);

    const isInputDisabled = isRunning || (isHITLPending &&
        streamState.pendingHITL?.requestType !== 'feedback' &&
        streamState.pendingHITL?.requestType !== 'topic_input' &&
        streamState.pendingHITL?.requestType !== 'data_input');

    return (
        <div className="v2-scope min-h-screen flex flex-col" style={{ background: 'var(--v2-paper-ground)' }}>
            {/* Header */}
            <header className="flex-shrink-0 px-6 md:px-10 pt-8 pb-2 relative z-10">
                <div className="max-w-[720px] mx-auto flex items-center justify-between">
                    <Link href="/" className="v2-display text-[1.125rem]" style={{ color: 'var(--v2-paper-ink)' }}>
                        Doddle OS
                    </Link>
                </div>
            </header>

            {/* Chat area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-6 md:px-10 relative z-10"
            >
                <div className="max-w-[720px] mx-auto py-4">
                    {/* Error */}
                    {error && !isRunning && (
                        <div className="mb-4 p-3 rounded-[8px] v2-mono text-[12px]" style={{ background: 'rgba(200,50,27,0.04)', border: '1px solid var(--v2-vermilion)', color: 'var(--v2-vermilion)' }}>
                            {error.message}
                            <button onClick={clearError} className="ml-2 underline">dismiss</button>
                        </div>
                    )}

                    {/* Welcome hero (before first message) */}
                    {messages.length === 0 && !isRunning && (
                        <div className="text-center py-12">
                            <h1 className="v2-display text-[clamp(1.5rem,3vw,2rem)] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
                                Brand Persona Setup
                            </h1>
                            <p className="text-[14px] mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                Enter your website URL or describe your business.
                            </p>
                            <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                I&apos;ll generate a brand persona to align your AI agents.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
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
                        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--v2-paper-ink-2)' }}>
                            <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: 'var(--v2-paper-ink-2)', animation: `v2-pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                                    />
                                ))}
                            </div>
                            <span className="v2-mono text-[11px]">{progress?.message || currentStep?.stepName || 'Generating...'}</span>
                        </div>
                    )}

                    {/* Completion */}
                    {isComplete && (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--v2-sage)' }} strokeWidth={1.5} />
                            <h2 className="v2-display text-[1.5rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
                                Brand persona generated!
                            </h2>
                            <p className="text-[14px] mb-6" style={{ color: 'var(--v2-paper-ink-2)' }}>
                                Your workspace is ready.
                            </p>
                            <button
                                onClick={() => router.push('/workspaces')}
                                className="inline-flex items-center gap-2 px-7 py-3.5 v2-label text-[12px] transition-all hover:scale-[1.02]"
                                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', borderRadius: '10px', boxShadow: '0 4px 14px rgba(200,50,27,0.25)' }}
                            >
                                Enter the OS <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat input */}
            <div className="flex-shrink-0 px-6 md:px-10 pb-6 pt-2 relative z-10">
                <div className="max-w-[720px] mx-auto">
                    {!isComplete && (
                        <ChatInput
                            onSend={handleSendMessage}
                            disabled={isInputDisabled}
                            placeholder={
                                isHITLPending
                                    ? 'Enter your response...'
                                    : isRunning
                                        ? 'Generating...'
                                        : 'Enter your website URL or describe your business...'
                            }
                            inputValue={chatInputValue}
                            onInputChange={setChatInputValue}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MessageRenderer — inline, v2-styled
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
    message, artifacts, pendingHITL, onHITLRespond,
    onCopyArtifact, onDownloadArtifact, copiedArtifactId, onAppendToInput,
}: MessageRendererProps) {
    // User
    if (message.type === 'user') {
        return (
            <div className="flex justify-end mb-3">
                <div className="px-4 py-2.5 max-w-[85%] rounded-[12px_12px_4px_12px] text-[14px]"
                    style={{ background: 'rgba(200,50,27,0.06)', border: '1px solid rgba(200,50,27,0.15)', color: 'var(--v2-paper-ink)' }}>
                    {message.content}
                </div>
            </div>
        );
    }

    // System
    if (message.type === 'system') {
        return (
            <div className="flex justify-center mb-3">
                <span className="v2-mono text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--v2-paper-ink-2)' }}>
                    {message.content}
                </span>
            </div>
        );
    }

    // Step
    if (message.type === 'step') {
        return (
            <div className="flex justify-center mb-3">
                <span className="v2-mono text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--v2-paper-ink-2)' }}>
                    {message.content}
                </span>
            </div>
        );
    }

    // Agent
    if (message.type === 'agent') {
        return (
            <div className="mb-3">
                {message.sender && (
                    <span className="v2-label text-[8px] block mb-1" style={{ color: 'var(--v2-vermilion)' }}>
                        {message.sender}
                    </span>
                )}
                <div className="px-4 py-3 max-w-[85%] rounded-[12px_12px_12px_4px]"
                    style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid var(--v2-paper-rule)' }}>
                    <div className="text-[14px] leading-[1.55]" style={{ color: 'var(--v2-paper-ink)' }}>
                        <MarkdownRenderer content={message.content} />
                    </div>
                </div>
            </div>
        );
    }

    // Artifact
    if (message.type === 'artifact') {
        const artifact = artifacts.find((a) => a.artifactId === message.metadata?.artifactId);
        if (artifact) {
            return (
                <div className="mb-4">
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

    // HITL
    if (message.type === 'hitl' && pendingHITL) {
        return (
            <div className="mb-4">
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
