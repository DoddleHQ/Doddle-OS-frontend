'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';

const EMPTY_MESSAGES: never[] = [];
const EMPTY_ARTIFACTS: never[] = [];
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Loader2, Globe } from 'lucide-react';
import { useCurrentWorkspace } from '@/lib/hooks/useCurrentWorkspace';
import {
    useRunRegistry,
    getRunActions,
    liveRunUrl,
    type RunSnapshot,
} from '@/lib/runs/runRegistry';
import type { AgentConfig } from './agents';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { StreamArtifact } from './StreamArtifact';
import { getRunContext, getCompletionSummary } from './runContext';
import { supersededArtifactIds } from './artifactMarkdown';
import { MagentoGate } from './MagentoGate';
import { V2HITLCard } from '@/components/v2/onboarding/V2HITLCard';
import type { ChatMessage as ChatMessageType } from '@/lib/types/graph-events.types';

const EASE = [0.16, 1, 0.3, 1] as const;

export function AgentStream({ config, workspaceId, runId: runIdProp }: {
    config: AgentConfig;
    workspaceId: string;
    runId?: string;
}) {
    const chatRef = useRef<HTMLDivElement>(null);
    const [activeRunId, setActiveRunId] = useState<string | null>(runIdProp ?? null);

    const { workspace } = useCurrentWorkspace(workspaceId);
    const workspaceDomain = workspace?.websiteDomain ?? '';

    const run: RunSnapshot | undefined = useRunRegistry((s) => (activeRunId ? s.runs[activeRunId] : undefined));
    const createRun = useRunRegistry((s) => s.createRun);

    const isRunning = !!run && (run.status === 'running' || run.status === 'connecting' || run.status === 'hitl_pending');
    const isHITLPending = run?.status === 'hitl_pending';
    const isComplete = run?.status === 'complete';
    const messages = useMemo(() => run?.messages ?? EMPTY_MESSAGES, [run]);
    const artifacts = useMemo(() => run?.artifacts ?? EMPTY_ARTIFACTS, [run]);
    const error = run?.error ?? null;
    const progress = run?.progress ?? null;
    const completeEvent = run?.completeEvent ?? null;

    useEffect(() => {
        const el = chatRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 240) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, artifacts, isRunning]);

    const showHITL = isHITLPending && !!run?.pendingHITL;
    const showWelcome = !activeRunId;

    const beginRun = useCallback((input: Record<string, unknown>, openingMessage?: { type: 'user'; content: string; sender: string }) => {
        const runId = createRun({
            agentSlug: config.slug,
            graphId: config.graphId,
            moduleId: config.moduleId,
            agentName: config.name,
            agentInitials: config.initials,
            workspaceId,
            input,
            openingMessage,
        });
        setActiveRunId(runId);
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', liveRunUrl(workspaceId, config.slug, runId));
        }
        return runId;
    }, [createRun, config, workspaceId]);

    const handleSend = useCallback((message: string) => {
        const effectiveUrl = showWelcome && workspaceDomain ? workspaceDomain : message;
        const userText = showWelcome && workspaceDomain ? `Analyze ${workspaceDomain}` : message;
        if (activeRunId) {
            const actions = getRunActions(activeRunId);
            actions?.addMessage({ type: 'user', content: userText, sender: 'You' });
            actions?.start(config.inputBuilder(effectiveUrl, undefined, workspaceId));
            return;
        }
        beginRun(
            config.inputBuilder(effectiveUrl, undefined, workspaceId),
            { type: 'user', content: userText, sender: 'You' },
        );
    }, [activeRunId, beginRun, config, showWelcome, workspaceDomain, workspaceId]);

    const handleStart = useCallback(() => {
        const content = config.startMessage ?? (workspaceDomain ? `Analyze ${workspaceDomain}` : 'Start');
        beginRun(
            config.inputBuilder(workspaceDomain, undefined, workspaceId),
            { type: 'user', content, sender: 'You' },
        );
    }, [beginRun, config, workspaceDomain, workspaceId]);

    const handleHITLRespond = useCallback((response: unknown) => {
        if (activeRunId && run?.pendingHITL) {
            getRunActions(activeRunId)?.respond(run.pendingHITL.requestId, response);
        }
    }, [activeRunId, run?.pendingHITL]);

    const clearError = useCallback(() => {
        if (activeRunId) getRunActions(activeRunId)?.clearError();
    }, [activeRunId]);

    const lastHitlId = (() => {
        const hitlMsgs = messages.filter(m => m.type === 'hitl');
        return run?.pendingHITL ? hitlMsgs[hitlMsgs.length - 1]?.id : null;
    })();

    const runContext = getRunContext(config.graphId, progress, messages);
    const completionSummary = getCompletionSummary(completeEvent);

    const supersededArtifacts = supersededArtifactIds(artifacts);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}>
                <Link
                    href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${config.slug}`}
                    className="flex items-center gap-2 transition-colors"
                    style={{ color: 'var(--v2-paper-ink-2)' }}
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
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
                        <span className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-paper-ink-2)' }}>
                            {config.workingStatus}{runContext ? ` · ${runContext}` : ''}
                        </span>
                    </div>
                )}
                {isComplete && (
                    <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" style={{ color: 'var(--v2-sage)' }} />
                        <span className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-sage)' }}>
                            complete{completionSummary ? ` · ${completionSummary}` : ''}
                        </span>
                    </div>
                )}
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-[720px] mx-auto flex flex-col">
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
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

                    {messages.map((msg) => {
                        if (msg.type === 'hitl') {
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
                            if (artifact && supersededArtifacts.has(artifact.artifactId)) return null;
                            if (artifact) return <StreamArtifact key={msg.id} artifact={artifact} />;
                            return null;
                        }
                        return <ChatMessage key={msg.id} message={msg as ChatMessageType} agentName={config.name} agentInitials={config.initials} />;
                    })}

                    {showHITL && (
                        <V2HITLCard request={run!.pendingHITL!} onRespond={handleHITLRespond} />
                    )}

                    <AnimatePresence>
                        {isRunning && !isHITLPending && <TypingIndicator agentName={config.name} agentInitials={config.initials} />}
                    </AnimatePresence>

                    {error && !isRunning && (
                        <div className="my-3 p-3 rounded-[8px]" style={{ background: 'rgba(200,50,27,0.04)', border: '1px solid var(--v2-vermilion)' }}>
                            <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-vermilion)' }}>{error.message}</p>
                            <button onClick={clearError} className="ml-2 underline" style={{ color: 'var(--v2-vermilion)' }}>dismiss</button>
                        </div>
                    )}

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
                            {completionSummary && (
                                <p className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)', marginBottom: '0.75rem' }}>
                                    {completionSummary}
                                </p>
                            )}
                            <Link
                                href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${config.slug}`}
                                className="inline-flex items-center gap-2 px-4 py-2 v2-label text-[10px] rounded-[8px]"
                                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                            >
                                Back to threads
                            </Link>
                        </motion.div>
                    )}
                </div>
            </div>

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
