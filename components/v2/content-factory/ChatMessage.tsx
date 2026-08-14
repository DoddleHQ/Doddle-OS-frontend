'use client';

import { motion } from 'motion/react';
import type { ChatMessage as ChatMessageType } from '@/lib/types/graph-events.types';
import { V2Markdown } from '@/components/v2/onboarding/V2Markdown';

/*
 * ChatMessage — v2 Specimen Terminal message bubble.
 *
 * Variants match the graph event system:
 * - agent: paper-register bubble, left-aligned, "Agent" label
 * - user: vermilion-tinted bubble, right-aligned
 * - system: centered pill, mono text
 * - step: hairline-separated status line
 *
 * Operate mode: single sans, accent reserved for the agent label + user bubble,
 * border OR shadow (never both), 150ms entry.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function ChatMessage({ message, agentName, agentInitials }: { message: ChatMessageType; agentName?: string; agentInitials?: string }) {
    if (message.type === 'user') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8, x: 8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="flex justify-end mb-3"
            >
                <div
                    className="px-4 py-2.5 max-w-[85%]"
                    style={{
                        background: 'rgba(200,50,27,0.06)',
                        border: '1px solid rgba(200,50,27,0.12)',
                        borderRadius: '12px 12px 4px 12px',
                    }}
                >
                    <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.82rem', color: 'var(--v2-paper-ink)', lineHeight: 1.5 }}>
                        {message.content}
                    </p>
                </div>
            </motion.div>
        );
    }

    if (message.type === 'system' || message.type === 'step') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex justify-center my-2"
            >
                <span
                    className="v2-mono px-3 py-1 rounded-full"
                    style={{
                        fontSize: '0.68rem',
                        color: 'var(--v2-paper-ink-2)',
                        border: '1px solid var(--v2-paper-rule)',
                    }}
                >
                    {message.content}
                </span>
            </motion.div>
        );
    }

    if (message.type === 'agent') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8, x: -8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="flex justify-start mb-3 w-full gap-2.5"
            >
                {/* Avatar */}
                <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                        background: 'rgba(200,50,27,0.08)',
                        border: '1px solid rgba(200,50,27,0.15)',
                        color: 'var(--v2-vermilion)',
                        fontFamily: 'var(--v2-font-sans)',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                    }}
                >
                    {agentInitials || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className="mb-1">
                        <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--v2-paper-ink)' }}>
                            {agentName || 'Agent'}
                        </span>
                    </div>
                    <div
                        className="px-4 py-3"
                        style={{
                            background: 'rgba(255,255,255,0.4)',
                            border: '1px solid var(--v2-paper-rule)',
                            borderRadius: '4px 12px 12px 12px',
                        }}
                    >
                        <div style={{ fontSize: '0.82rem', lineHeight: 1.55 }}>
                            <V2Markdown content={message.content} />
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return null;
}

/*
 * TypingIndicator — ambient pulse shown while the agent is working.
 */
export function TypingIndicator({ agentName = 'Agent', agentInitials = 'A' }: { agentName?: string; agentInitials?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex justify-start mb-3 gap-2.5"
        >
            {/* Avatar */}
            <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                    background: 'rgba(200,50,27,0.08)',
                    border: '1px solid rgba(200,50,27,0.15)',
                    color: 'var(--v2-vermilion)',
                    fontFamily: 'var(--v2-font-sans)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                }}
            >
                {agentInitials}
            </div>
            <div className="flex-1">
                <div className="mb-1">
                    <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--v2-paper-ink)' }}>
                        {agentName}
                    </span>
                </div>
                <div
                    className="px-4 py-3 rounded-[4px_12px_12px_12px] flex items-center gap-1.5 inline-flex"
                    style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid var(--v2-paper-rule)' }}
                >
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: 'var(--v2-paper-ink-2)' }}
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
