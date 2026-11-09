'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Send, Loader2 } from 'lucide-react';
import { FlowingThreads } from '@/components/v2/FlowingThreads';
import { Logo } from '@/components/v2/Logo';
import { DeskCard, AgentTyping } from './DeskCard';
import { V2HITLCard } from './V2HITLCard';
import { V2ArtifactCard } from './V2ArtifactCard';
import { V2Markdown } from './V2Markdown';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { debugLog } from '@/lib/utils/debugLog';
import { PREMIUM_EASE } from '@/components/v2/motion';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';
import type { ArtifactPayload } from '@/lib/types/graph-events.types';

function extractWorkspaceMeta(
  summary: Record<string, unknown> | undefined,
  artifacts: ArtifactPayload[],
): { workspaceName: string; domain: string | undefined } {
  const name =
    (typeof summary?.workspaceName === 'string' && summary.workspaceName) ||
    (typeof summary?.workspace_name === 'string' && summary.workspace_name) ||
    '';

  const domain =
    (typeof summary?.domain === 'string' && summary.domain) ||
    (typeof summary?.websiteDomain === 'string' && summary.websiteDomain) ||
    (typeof summary?.website_domain === 'string' && summary.website_domain) ||
    undefined;

  if (name || domain) {
    return { workspaceName: name, domain: domain || undefined };
  }

  for (const a of artifacts) {
    const meta = a.metadata as Record<string, unknown> | undefined;
    const mName =
      (typeof meta?.workspaceName === 'string' && meta.workspaceName) ||
      (typeof meta?.workspace_name === 'string' && meta.workspace_name);
    const mDomain =
      (typeof meta?.domain === 'string' && meta.domain) ||
      (typeof meta?.websiteDomain === 'string' && meta.websiteDomain) ||
      (typeof meta?.website_domain === 'string' && meta.website_domain);
    if (mName || mDomain) {
      return { workspaceName: mName || '', domain: mDomain || undefined };
    }
  }

  return { workspaceName: '', domain: undefined };
}

export function OnboardingDesk({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  const { createWorkspace } = useWorkspaces();
  const { refresh: refreshAuth } = useAuth();
  const isWorkspaceScoped = !!workspaceId;
  const chatRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const {
    state: streamState,
    startStream,
    addMessage,
    respondToHITL,
    clearError,
    isRunning,
    isHITLPending,
    isComplete,
    completeEvent,
    currentStep,
    progress,
    error,
    messages,
    artifacts,
  } = useLangGraphStream({
    graphId: 'brand_persona_generator',
    onComplete: (summary) => {
      debugLog('Brand persona completed:', summary);
    },
  });

  const { workspaceName, domain } = extractWorkspaceMeta(
    completeEvent?.summary as Record<string, unknown> | undefined,
    artifacts,
  );

  const personaMarkdown = (() => {
    const reportArtifact = artifacts.find((a) => a.artifactType === 'report') || artifacts[0];
    if (!reportArtifact) return '';
    const md = extractArtifactMarkdown(reportArtifact);
    return md && md.trim() !== '{}' && md.trim() !== '' ? md : '';
  })();

  const isListening = !isRunning && !isHITLPending && !isComplete && messages.length > 0;

  const handleBegin = useCallback(() => {
    setStarted(true);
    setTimeout(() => startStream({ human_input: '' }), 300);
  }, [startStream]);

  const handleSendMessage = useCallback((message: string) => {
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

  const handleEnterOS = useCallback(async () => {
    if (isCreatingWorkspace) return;
    setWorkspaceError(null);
    setIsCreatingWorkspace(true);
    try {
      if (isWorkspaceScoped && workspaceId) {
        const { workspaceService } = await import('@/lib/services/workspaceService');
        await workspaceService.upsertPersona(workspaceId, personaMarkdown || '');
        router.replace(`/legacy/workspaces/${workspaceId}`);
      } else {
        const ws = await createWorkspace(
          workspaceName || '',
          domain || undefined,
          personaMarkdown || undefined,
        );

        try {
          await refreshAuth();
        } catch {
        }

        router.replace(`/legacy/workspaces/${ws.workspaceId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setWorkspaceError(message);
      setIsCreatingWorkspace(false);
    }
  }, [isCreatingWorkspace, isWorkspaceScoped, workspaceId, createWorkspace, workspaceName, domain, personaMarkdown, refreshAuth, router]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, artifacts, isRunning]);

  const showHITLCard = isHITLPending && !!streamState.pendingHITL;
  const showChatInput = !isRunning && !isComplete && !isHITLPending && started;

  if (!started) {
    return (
      <div className="v2-scope min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
        <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.4 }}>
          <FlowingThreads />
        </div>

        <motion.div
          className="absolute pointer-events-none rounded-full"
          style={{ top: '-15%', right: '-10%', width: '40vw', height: '40vh', background: 'var(--v2-vermilion)', filter: 'blur(140px)' }}
          animate={{ opacity: [0.02, 0.05, 0.02] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <header className="flex-shrink-0 px-6 md:px-10 pt-8 relative z-10">
          <div className="max-w-[720px] mx-auto">
            <Link href="/" className="v2-display text-[1.125rem]" style={{ color: 'var(--v2-paper-ink)' }}>
              <Logo variant="wordmark" theme="light" />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 md:px-10 relative z-10">
          <div className="max-w-[640px] w-full text-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
            >
              <motion.h1
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.7, ease: PREMIUM_EASE }}
                className="v2-display text-[clamp(2rem,5vw,3.5rem)] leading-[1] mb-3"
                style={{ color: 'var(--v2-paper-ink)' }}
              >
                {isWorkspaceScoped ? 'Set up your brand persona.' : 'Build your brand persona.'}
              </motion.h1>

              <motion.p
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.6, ease: PREMIUM_EASE }}
                className="text-[15px] md:text-[17px] leading-[1.55] mb-2 max-w-[460px] mx-auto"
                style={{ color: 'var(--v2-paper-ink-2)' }}
              >
                Answer a few questions about your business. Our agent will generate a
                comprehensive brand persona to align every AI agent in your workspace.
              </motion.p>

              <motion.p
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="v2-mono text-[11px] mb-10"
                style={{ color: 'var(--v2-paper-ink-2)' }}
              >
                Takes about 2 minutes
              </motion.p>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, delay: 0.3, ease: PREMIUM_EASE }}
              >
                <motion.button
                  onClick={handleBegin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: PREMIUM_EASE }}
                  className="inline-flex items-center gap-2.5 px-8 py-4 v2-label text-[12px] rounded-[12px]"
                  style={{
                    background: 'var(--v2-vermilion)',
                    color: 'var(--v2-vermilion-ink)',
                    boxShadow: '0 4px 20px rgba(200,50,27,0.25)',
                  }}
                >
                  Begin
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-scope min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
        <FlowingThreads />
      </div>

      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ top: '-15%', right: '-10%', width: '40vw', height: '40vh', background: 'var(--v2-vermilion)', filter: 'blur(140px)' }}
        animate={{ opacity: [0.02, 0.04, 0.02] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <header className="flex-shrink-0 px-6 md:px-10 pt-8 pb-2 relative z-10">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <Link href="/" className="v2-display text-[1.125rem]" style={{ color: 'var(--v2-paper-ink)' }}>
            <Logo variant="wordmark" theme="light" />
          </Link>
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--v2-vermilion)' }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="v2-mono text-[10px]" style={{ color: 'var(--v2-paper-ink-2)' }}>listening</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 md:px-10 relative z-10">
        <div className="max-w-[720px] mx-auto flex flex-col py-4">
          {error && !isRunning && (
            <div className="mb-4 p-3 rounded-[8px] v2-mono text-[12px]" style={{ background: 'rgba(200,50,27,0.04)', border: '1px solid var(--v2-vermilion)', color: 'var(--v2-vermilion)' }}>
              {error.message}
              <button onClick={clearError} className="ml-2 underline">dismiss</button>
            </div>
          )}

          {(() => {
            const lastHitlId = streamState.pendingHITL
              ? messages.filter((m) => m.type === 'hitl').slice(-1)[0]?.id
              : null;

            return messages.map((msg) => {
              if (msg.type === 'user') {
                return <DeskCard key={msg.id} variant="user">{msg.content}</DeskCard>;
              }
              if (msg.type === 'system' || msg.type === 'step') {
                return <DeskCard key={msg.id} variant="system">{msg.content}</DeskCard>;
              }
              if (msg.type === 'agent') {
                return (
                  <DeskCard key={msg.id} variant="agent">
                    <V2Markdown content={msg.content} />
                  </DeskCard>
                );
              }
              if (msg.type === 'artifact') {
                const artifact = artifacts.find((a) => a.artifactId === msg.metadata?.artifactId);
                if (artifact) {
                  return <V2ArtifactCard key={msg.id} artifact={artifact} />;
                }
              }
              if (msg.type === 'hitl') {
                if (msg.id === lastHitlId) {
                  return null;
                }
                return (
                  <DeskCard key={msg.id} variant="agent">
                    <V2Markdown content={msg.content} />
                  </DeskCard>
                );
              }
              return null;
            });
          })()}

          {showHITLCard && streamState.pendingHITL && (
            <V2HITLCard request={streamState.pendingHITL} onRespond={handleHITLRespond} />
          )}

          <AnimatePresence>
            {isRunning && !isHITLPending && <AgentTyping />}
          </AnimatePresence>

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: PREMIUM_EASE }}
              className="text-center py-8"
            >
              <h2 className="v2-display text-[1.5rem] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
                Brand persona generated!
              </h2>
              <p className="text-[14px] mb-4" style={{ color: 'var(--v2-paper-ink-2)' }}>
                {isWorkspaceScoped ? 'Ready to save to your workspace.' : 'Your workspace is ready.'}
              </p>

              {(workspaceName || domain) && (
                <div className="mb-5 inline-flex flex-col gap-1 px-4 py-2.5 rounded-[10px] text-left" style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid var(--v2-paper-rule)' }}>
                  {workspaceName && (
                    <div className="flex items-baseline gap-2">
                      <span className="v2-label text-[8px] flex-shrink-0" style={{ color: 'var(--v2-paper-ink-2)' }}>Name</span>
                      <span className="text-[13px]" style={{ color: 'var(--v2-paper-ink)' }}>{workspaceName}</span>
                    </div>
                  )}
                  {domain && (
                    <div className="flex items-baseline gap-2">
                      <span className="v2-label text-[8px] flex-shrink-0" style={{ color: 'var(--v2-paper-ink-2)' }}>Domain</span>
                      <span className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink)' }}>{domain}</span>
                    </div>
                  )}
                </div>
              )}

              {workspaceError && (
                <p className="v2-mono text-[11px] mb-3" style={{ color: 'var(--v2-vermilion)' }}>
                  {workspaceError}
                </p>
              )}

              <div>
                <motion.button
                  onClick={handleEnterOS}
                  disabled={isCreatingWorkspace}
                  whileHover={{ scale: isCreatingWorkspace ? 1 : 1.02 }}
                  whileTap={{ scale: isCreatingWorkspace ? 1 : 0.98 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 v2-label text-[12px] transition-all"
                  style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', borderRadius: '10px', boxShadow: '0 4px 14px rgba(200,50,27,0.25)', opacity: isCreatingWorkspace ? 0.7 : 1 }}
                >
                  {isCreatingWorkspace ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating workspace…
                    </>
                  ) : (
                    <>
                      {isWorkspaceScoped ? 'Save & Continue' : 'Enter the OS'} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 md:px-10 pb-6 pt-2 relative z-10">
        <div className="max-w-[720px] mx-auto">
          {showChatInput && !isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: PREMIUM_EASE }}
              className="flex items-center gap-2 p-1.5 rounded-[14px]"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid var(--v2-paper-rule)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            >
              <input
                value={chatValue}
                onChange={(e) => setChatValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (chatValue.trim()) { handleSendMessage(chatValue); setChatValue(''); } } }}
                placeholder="Enter your website URL or describe your business..."
                className="flex-1 bg-transparent px-3.5 py-2.5 text-[14px] outline-none"
                style={{ color: 'var(--v2-paper-ink)' }}
                autoFocus
              />
              <motion.button
                onClick={() => { if (chatValue.trim()) { handleSendMessage(chatValue); setChatValue(''); } }}
                disabled={!chatValue.trim()}
                whileTap={{ scale: 0.92 }}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors flex-shrink-0"
                style={{ background: chatValue.trim() ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)', color: 'var(--v2-vermilion-ink)', opacity: chatValue.trim() ? 1 : 0.4 }}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
