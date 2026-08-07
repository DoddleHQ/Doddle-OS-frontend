'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Send } from 'lucide-react';
import { FlowingThreads } from '@/components/v2/FlowingThreads';
import { DeskCard, AgentTyping } from './DeskCard';
import { OptionSelector, type Option } from './OptionSelector';
import HITLMessageCard from '@/components/content-factory/chat/HITLMessageCard';
import ArtifactCardRouter from '@/components/content-factory/chat/artifacts/ArtifactCardRouter';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import type { ArtifactPayload } from '@/lib/types/graph-events.types';

/*
 * OnboardingDesk — "The Agent's Desk" onboarding experience.
 *
 * SAME v2 DESIGN as finalized: FlowingThreads ambient background, DeskCards
 * with Motion Design choreography, listening indicator, vermilion accents,
 * Instrument Serif headings. NO design changes.
 *
 * CHANGED: Now wired to the real brand_persona_generator graph via
 * useLangGraphStream instead of mock STEPS. Graph messages render as
 * DeskCards, interrupts render as HITLMessageCard / OptionSelector,
 * artifacts render as ArtifactCardRouter, completion shows the CTA.
 */

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

export function OnboardingDesk() {
  const router = useRouter();
  const chatRef = useRef<HTMLDivElement>(null);

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
      console.log('Brand persona completed:', summary);
    },
  });

  const isListening = !isRunning && !isHITLPending && !isComplete && messages.length > 0;
  const [copiedArtifactId, setCopiedArtifactId] = useCopiedArtifact();

  // Auto-start the graph on mount — the first node (input_mode) fires an
  // interrupt immediately, so the user sees the "How would you like to provide
  // your business information?" prompt without typing anything first.
  useEffect(() => {
    startStream({ human_input: '' });
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

  const handleCopyArtifact = useCallback((artifact: ArtifactPayload) => {
    const markdown = extractArtifactMarkdown(artifact);
    if (markdown) {
      navigator.clipboard.writeText(markdown);
      setCopiedArtifactId(artifact.artifactId);
      setTimeout(() => setCopiedArtifactId(null), 2000);
    }
  }, [setCopiedArtifactId]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, artifacts, isRunning]);

  // Check if input should be enabled (freetext HITL types or no HITL pending)
  const inputEnabled = !isRunning && !isComplete && (
    !isHITLPending ||
    streamState.pendingHITL?.requestType === 'feedback' ||
    streamState.pendingHITL?.requestType === 'topic_input' ||
    streamState.pendingHITL?.requestType === 'data_input'
  );

  // Determine if we should show the OptionSelector-style HITL (for selection/multi_selection)
  const showHITLCard = isHITLPending && streamState.pendingHITL &&
    streamState.pendingHITL.requestType !== 'feedback' &&
    streamState.pendingHITL.requestType !== 'topic_input' &&
    streamState.pendingHITL.requestType !== 'data_input';

  return (
    <div className="v2-scope min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
      {/* Ambient layer — FlowingThreads at low opacity */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
        <FlowingThreads />
      </div>

      {/* Subtle ambient glow */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ top: '-15%', right: '-10%', width: '40vw', height: '40vh', background: 'var(--v2-vermilion)', filter: 'blur(140px)' }}
        animate={{ opacity: [0.02, 0.04, 0.02] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Wordmark */}
      <header className="flex-shrink-0 px-6 md:px-10 pt-8 pb-2 relative z-10">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <Link href="/" className="v2-display text-[1.125rem]" style={{ color: 'var(--v2-paper-ink)' }}>
            Doddle OS
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

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 md:px-10 relative z-10">
        <div className="max-w-[720px] mx-auto flex flex-col py-4">
          {/* Welcome hero (before first message) */}
          {messages.length === 0 && !isRunning && (
            <div className="text-center py-12">
              <h1 className="v2-display text-[clamp(1.5rem,3vw,2rem)] mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
                Brand Persona Setup
              </h1>
              <p className="text-[14px]" style={{ color: 'var(--v2-paper-ink-2)' }}>
                Enter your website URL or describe your business to begin.
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isRunning && (
            <div className="mb-4 p-3 rounded-[8px] v2-mono text-[12px]" style={{ background: 'rgba(200,50,27,0.04)', border: '1px solid var(--v2-vermilion)', color: 'var(--v2-vermilion)' }}>
              {error.message}
              <button onClick={clearError} className="ml-2 underline">dismiss</button>
            </div>
          )}

          {/* Messages → DeskCards */}
          {messages.map((msg) => {
            if (msg.type === 'user') {
              return <DeskCard key={msg.id} variant="user">{msg.content}</DeskCard>;
            }
            if (msg.type === 'system' || msg.type === 'step') {
              return <DeskCard key={msg.id} variant="system">{msg.content}</DeskCard>;
            }
            if (msg.type === 'agent') {
              return <DeskCard key={msg.id} variant="agent">{msg.content}</DeskCard>;
            }
            if (msg.type === 'artifact') {
              const artifact = artifacts.find((a) => a.artifactId === msg.metadata?.artifactId);
              if (artifact) {
                return (
                  <DeskCard key={msg.id} variant="summary" delay={0.1}>
                    <ArtifactCardRouter
                      artifact={artifact}
                      onRespond={handleHITLRespond}
                      onCopyArtifact={handleCopyArtifact}
                      onDownloadArtifact={() => {}}
                      copiedArtifactId={copiedArtifactId}
                    />
                  </DeskCard>
                );
              }
            }
            if (msg.type === 'hitl') {
              // HITL handled below — skip inline rendering here
              return null;
            }
            return null;
          })}

          {/* HITL card (selection / multi_selection / content_review etc.) */}
          {showHITLCard && streamState.pendingHITL && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: PREMIUM_EASE }}
              className="mb-4"
            >
              <HITLMessageCard
                request={streamState.pendingHITL}
                onRespond={handleHITLRespond}
              />
            </motion.div>
          )}

          {/* Agent typing */}
          <AnimatePresence>
            {isRunning && !isHITLPending && <AgentTyping />}
          </AnimatePresence>

          {/* Completion */}
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
            </motion.div>
          )}
        </div>
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 px-6 md:px-10 pb-6 pt-2 relative z-10">
        <div className="max-w-[720px] mx-auto">
          {inputEnabled && !isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: PREMIUM_EASE }}
              className="flex items-center gap-2 p-1.5 rounded-[14px]"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid var(--v2-paper-rule)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            >
              <input
                value={''}
                onChange={() => {}}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = (e.target as HTMLInputElement).value; if (v.trim()) { (e.target as HTMLInputElement).value = ''; handleSendMessage(v); } } }}
                placeholder={isHITLPending ? 'Enter your response...' : isRunning ? 'Generating...' : 'Enter your website URL or describe your business...'}
                className="flex-1 bg-transparent px-3.5 py-2.5 text-[14px] outline-none"
                style={{ color: 'var(--v2-paper-ink)' }}
                autoFocus
              />
              <motion.button
                onClick={(e) => { const input = (e.currentTarget.previousElementSibling as HTMLInputElement); if (input?.value?.trim()) { handleSendMessage(input.value); input.value = ''; } }}
                whileTap={{ scale: 0.92 }}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors flex-shrink-0"
                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
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

// Small helper hook for copied artifact state
function useCopiedArtifact(): [string | null, (id: string | null) => void] {
  return useReactState<string | null>(null);
}
// Avoid importing useState separately — use React's default
import { useState as useReactState } from 'react';
