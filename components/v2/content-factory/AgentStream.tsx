'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Loader2, Globe } from 'lucide-react';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import { useThread } from '@/lib/contexts/ThreadContext';
import { useCurrentWorkspace } from '@/lib/hooks/useCurrentWorkspace';
import type { AgentConfig } from './agents';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { StreamArtifact } from './StreamArtifact';
import { MagentoGate } from './MagentoGate';
import { V2HITLCard } from '@/components/v2/onboarding/V2HITLCard';
import type { ChatMessage as ChatMessageType } from '@/lib/types/graph-events.types';

const EASE = [0.16, 1, 0.3, 1] as const;

/*
 * AgentStream — v2 shared streaming chat page for content factory agents.
 *
 * Replaces the 3 duplicated v1 `new/page.tsx` files with one parameterized
 * component. Takes an AgentConfig (graphId, inputBuilder, etc.) and renders:
 * - Welcome state: agent title + "Start Analysis" button (only trigger)
 * - Streaming state: messages, artifacts, HITL cards, typing indicator
 * - Completion state: success banner + back-to-list link
 *
 * Uses the existing useLangGraphStream hook (proven, no SDK migration risk)
 * + ThreadContext for persistence.
 */

export function AgentStream({ config, workspaceId }: { config: AgentConfig; workspaceId: string }) {
    const chatRef = useRef<HTMLDivElement>(null);
    const threadCreatedRef = useRef(false);
    // DB thread ID (differs from the LangGraph thread ID) — used for artifact
    // persistence so the detail page can find them
    const [dbThreadId, setDbThreadId] = useState<string | null>(null);

    const { workspace } = useCurrentWorkspace(workspaceId);
    const workspaceDomain = workspace?.websiteDomain ?? '';

    const { createThreadFromStream, saveArtifact, updateThread } = useThread();

    const {
        state: streamState,
        startStream,
        addMessage,
        respondToHITL,
        isRunning,
        isHITLPending,
        isComplete,
        error,
        messages,
        artifacts,
        clearError,
    } = useLangGraphStream({
        graphId: config.graphId,
        workspaceId,
    });

    // Auto-scroll to bottom on new content
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, artifacts, isRunning]);

    // Create a DB thread once we have a LangGraph thread ID
    useEffect(() => {
        if (streamState.threadId && !threadCreatedRef.current && isRunning) {
            threadCreatedRef.current = true;
            createThreadFromStream({
                workspaceId,
                threadId: streamState.threadId,
                moduleId: config.moduleId,
                title: `${config.name} — ${new Date().toLocaleDateString()}`,
                description: `Started via ${config.name}`,
            }).then((dbThread) => {
                if (dbThread) {
                    // Store the DB thread ID — artifacts must be saved under
                    // this ID (not the LangGraph ID) so the detail page can
                    // find them
                    setDbThreadId(dbThread.id);
                    const newUrl = `/workspaces/${workspaceId}/modules/content-factory/v2/${config.slug}/${dbThread.id}`;
                    window.history.replaceState(null, '', newUrl);
                }
            }).catch(() => { /* non-fatal */ });
        }
    }, [streamState.threadId, config.moduleId, config.slug, config.name, workspaceId, isRunning, createThreadFromStream]);

    // Save artifacts as they arrive — uses the DB thread ID (not LangGraph)
    // and tracks queued IDs so none are skipped when multiple arrive together
    const savedArtifactIdsRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        if (!dbThreadId || artifacts.length === 0) return;
        for (const artifact of artifacts) {
            if (savedArtifactIdsRef.current.has(artifact.artifactId)) continue;
            savedArtifactIdsRef.current.add(artifact.artifactId);
            saveArtifact(workspaceId, config.moduleId, dbThreadId, artifact).catch(() => {});
        }
    }, [artifacts, dbThreadId, config.moduleId, workspaceId, saveArtifact]);

    // Mark the DB thread complete when the run finishes — without this the
    // thread list shows a permanent "running" status/pulse.
    const completionMarkedRef = useRef(false);
    useEffect(() => {
        if (isComplete && dbThreadId && !completionMarkedRef.current) {
            completionMarkedRef.current = true;
            updateThread(workspaceId, config.moduleId, dbThreadId, { status: 'complete' }).catch(() => {});
        }
        if (!isRunning && !isComplete) {
            completionMarkedRef.current = false;
        }
    }, [isComplete, isRunning, dbThreadId, workspaceId, config.moduleId, updateThread]);

    // Reset guards when a new stream starts — clears the artifact dedup set
    // and the thread-created flag so retry streams work correctly
    useEffect(() => {
        if (!isRunning && !isComplete) {
            threadCreatedRef.current = false;
            savedArtifactIdsRef.current.clear();
            setDbThreadId(null);
        }
    }, [isRunning, isComplete]);

    const showHITL = isHITLPending && !!streamState.pendingHITL;
    const showWelcome = !isRunning && !isComplete && messages.length === 0;

    const handleSend = useCallback((message: string) => {
        // Auto-use workspace domain on the first message — the user doesn't need to type a URL
        const effectiveUrl = showWelcome && workspaceDomain ? workspaceDomain : message;
        addMessage({ type: 'user', content: showWelcome && workspaceDomain ? `Analyze ${workspaceDomain}` : message, sender: 'You' });
        const input = config.inputBuilder(effectiveUrl, undefined, workspaceId);
        startStream(input);
    }, [addMessage, config, startStream, workspaceId, workspaceDomain, showWelcome]);

    // Welcome-screen start button — the only trigger for the first run.
    // Agents with a startMessage (e.g. Mia, who works from the catalog
    // instead of a domain) use it verbatim.
    const handleStart = useCallback(() => {
        const content = config.startMessage ?? (workspaceDomain ? `Analyze ${workspaceDomain}` : 'Start');
        addMessage({ type: 'user', content, sender: 'You' });
        startStream(config.inputBuilder(workspaceDomain, undefined, workspaceId));
    }, [addMessage, config, startStream, workspaceDomain, workspaceId]);

    const handleHITLRespond = useCallback((response: unknown) => {
        if (streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, response);
        }
    }, [streamState.pendingHITL, respondToHITL]);

    // Deduplicate messages — the hook sometimes adds duplicate step messages
    const lastHitlId = (() => {
        const hitlMsgs = messages.filter(m => m.type === 'hitl');
        return streamState.pendingHITL ? hitlMsgs[hitlMsgs.length - 1]?.id : null;
    })();

    return (
        <div className="flex flex-col h-full">
            {/* Top bar: back link + status */}
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}>
                <Link
                    href={`/workspaces/${workspaceId}/modules/content-factory/v2/${config.slug}`}
                    className="flex items-center gap-2 transition-colors"
                    style={{ color: 'var(--v2-paper-ink-2)' }}
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {/* Agent avatar + name */}
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(200,50,27,0.08)', border: '1px solid rgba(200,50,27,0.15)', color: 'var(--v2-vermilion)', fontFamily: 'var(--v2-font-sans)', fontSize: '0.6rem', fontWeight: 600 }}
                    >
                        {config.initials}
                    </div>
                    <div className="flex flex-col">
                        <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--v2-paper-ink)' }}>{config.name}</span>
                        <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.6rem', color: 'var(--v2-paper-ink-2)' }}>{config.role}</span>
                    </div>
                </Link>
                {isRunning && (
                    <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
                        <span className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-paper-ink-2)' }}>{config.workingStatus}</span>
                    </div>
                )}
                {isComplete && (
                    <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" style={{ color: 'var(--v2-sage)' }} />
                        <span className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-sage)' }}>complete</span>
                    </div>
                )}
            </div>

            {/* Chat area */}
            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-[720px] mx-auto flex flex-col">
                    {/* Welcome state */}
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            {/* Avatar */}
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                                style={{ background: 'rgba(200,50,27,0.08)', border: '1px solid rgba(200,50,27,0.15)', color: 'var(--v2-vermilion)', fontFamily: 'var(--v2-font-sans)', fontSize: '1.25rem', fontWeight: 600 }}
                            >
                                {config.initials}
                            </div>
                            <h2 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                                {config.name}
                            </h2>
                            <span className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1rem', display: 'block' }}>
                                {config.role}
                            </span>
                            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', color: 'var(--v2-paper-ink-2)', maxWidth: '400px', marginBottom: '2rem', lineHeight: 1.55 }}>
                                {config.greeting}
                            </p>
                            {/* Pre-flight context — catalog agents (Mia) gate on the
                                Magento connection; the rest show the workspace domain */}
                            {config.connectionSource === 'magento' ? (
                                <MagentoGate
                                    workspaceId={workspaceId}
                                    startLabel={config.startLabel ?? 'Start Writing'}
                                    onStart={handleStart}
                                />
                            ) : workspaceDomain ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        className="flex items-center gap-2 px-4 py-2 rounded-[8px]"
                                        style={{ border: '1px solid var(--v2-paper-rule)', background: 'rgba(255,255,255,0.3)' }}
                                    >
                                        <Globe className="w-3.5 h-3.5" style={{ color: 'var(--v2-paper-ink-2)' }} />
                                        <span className="v2-mono" style={{ fontSize: '0.75rem', color: 'var(--v2-paper-ink)' }}>
                                            {workspaceDomain}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleStart}
                                        className="v2-mono px-6 py-2 rounded-[8px] transition-colors"
                                        style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            color: '#fff',
                                            background: 'var(--v2-vermilion)',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {config.startLabel ?? 'Start Analysis'}
                                    </button>
                                </div>
                            ) : (
                                /* No domain set — tell the user to add one in settings */
                                <div className="px-4 py-3 rounded-[8px]" style={{ border: '1px dashed var(--v2-paper-rule-strong)', background: 'rgba(255,255,255,0.2)' }}>
                                    <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.78rem', color: 'var(--v2-paper-ink-2)', textAlign: 'center' }}>
                                        No website domain set for this workspace.
                                    </p>
                                    <p className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-paper-ink-2)', textAlign: 'center', marginTop: '0.25rem' }}>
                                        Add one in workspace settings to get started.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Messages */}
                    {messages.map((msg) => {
                        if (msg.type === 'hitl') {
                            // The currently-pending HITL renders as the live
                            // interactive card below — skip it here. Past
                            // (answered) HITLs render as static question text
                            // so the transcript stays coherent.
                            if (msg.id === lastHitlId) return null;
                            const hitlData = msg.metadata?.data as { message?: string; prompt?: string } | undefined;
                            const questionText = hitlData?.message || hitlData?.prompt || msg.content || '';
                            return (
                                <ChatMessage
                                    key={msg.id}
                                    message={{ ...msg, type: 'agent', content: questionText } as ChatMessageType}
                                    agentName={config.name}
                                    agentInitials={config.initials}
                                />
                            );
                        }
                        if (msg.type === 'artifact') {
                            const artifact = artifacts.find(a => a.artifactId === msg.metadata?.artifactId);
                            if (artifact) return <StreamArtifact key={msg.id} artifact={artifact} />;
                            return null;
                        }
                        return <ChatMessage key={msg.id} message={msg as ChatMessageType} agentName={config.name} agentInitials={config.initials} />;
                    })}

                    {/* HITL card */}
                    {showHITL && (
                        <V2HITLCard request={streamState.pendingHITL!} onRespond={handleHITLRespond} />
                    )}

                    {/* Typing indicator */}
                    <AnimatePresence>
                        {isRunning && !isHITLPending && <TypingIndicator agentName={config.name} agentInitials={config.initials} />}
                    </AnimatePresence>

                    {/* Error */}
                    {error && !isRunning && (
                        <div className="my-3 p-3 rounded-[8px]" style={{ background: 'rgba(200,50,27,0.04)', border: '1px solid var(--v2-vermilion)' }}>
                            <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-vermilion)' }}>{error.message}</p>
                            <button onClick={clearError} className="ml-2 underline" style={{ color: 'var(--v2-vermilion)' }}>dismiss</button>
                        </div>
                    )}

                    {/* Completion */}
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="text-center py-6 mt-3"
                        >
                            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', color: 'var(--v2-paper-ink)', fontWeight: 500, marginBottom: '0.75rem' }}>
                                Done!
                            </p>
                            <Link
                                href={`/workspaces/${workspaceId}/modules/content-factory/v2/${config.slug}`}
                                className="inline-flex items-center gap-2 px-4 py-2 v2-label text-[10px] rounded-[8px]"
                                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                            >
                                Back to threads
                            </Link>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Input — hidden on welcome screen; "Start Analysis" is the only trigger */}
            {!isComplete && !showWelcome && (
                <div className="flex-shrink-0 px-4 pb-4 pt-1">
                    <div className="max-w-[720px] mx-auto">
                        <ChatInput
                            onSend={handleSend}
                            disabled={isRunning || isHITLPending}
                            placeholder={
                                isHITLPending
                                    ? 'Waiting for your response…'
                                    : config.inputPlaceholder
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
