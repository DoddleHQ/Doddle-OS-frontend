'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, ChevronLeft, Plus, Hash, Trash2 } from 'lucide-react';
import { useThread } from '@/lib/contexts/ThreadContext';
import { notify } from '@/lib/stores/notificationStore';
import type { AgentConfig } from './agents';
import type { AuditThread } from '@/lib/types/thread.types';

const EASE = [0.16, 1, 0.3, 1] as const;

/*
 * ThreadSidebar — Discord-like second column showing threads within an agent.
 *
 * Layout position: between the module nav (column 1) and the content area (column 3).
 * Discord-inspired: compact rows, section header, sub-thread indention,
 * active state via solid fill, hash icon prefix.
 *
 * Operate mode: paper register, vermilion active fill, 200ms expand/collapse.
 */

export function ThreadSidebar({
    agent,
    workspaceId,
    activeThreadId,
}: {
    agent: AgentConfig;
    workspaceId: string;
    activeThreadId?: string;
}) {
    const { threads, isLoading, fetchThreads, deleteThread } = useThread();
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        fetchThreads(workspaceId, agent.moduleId);
    }, [workspaceId, agent.moduleId, fetchThreads]);

    const toggleExpand = (id: string) => {
        setExpandedParents((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDeleteThread = async (thread: AuditThread) => {
        if (!confirm(`Delete "${thread.title || 'this thread'}"? All artifacts will be removed.`)) return;
        try {
            await deleteThread(workspaceId, agent.moduleId, thread.id);
            notify('Thread deleted', 'success');
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Failed to delete thread', 'error');
        }
    };

    // Split: roots (no parentId) and children (has parentId)
    // When backend adds parentId, children will group under parents automatically.
    const rootThreads = threads.filter((t) => !(t as any).parentId);
    const allChildren = threads.filter((t) => !!(t as any).parentId);

    return (
        <AnimatePresence initial={false} mode="wait">
            {collapsed ? (
                /* === Collapsed: thin strip with expand button === */
                <motion.aside
                    key="collapsed"
                    initial={{ width: 0 }}
                    animate={{ width: 36 }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="hidden lg:flex flex-col items-center flex-shrink-0 py-3 h-full"
                    style={{ background: 'var(--v2-paper-ground)', borderRight: '1px solid var(--v2-paper-rule)' }}
                >
                    <button
                        onClick={() => setCollapsed(false)}
                        className="p-1.5 rounded-[6px] transition-colors"
                        style={{ color: 'var(--v2-paper-ink-2)' }}
                        title="Show threads"
                        aria-label="Show threads"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Agent initial as compact indicator */}
                    <div
                        className="mt-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                            background: 'rgba(200,50,27,0.08)',
                            border: '1px solid rgba(200,50,27,0.15)',
                            color: 'var(--v2-vermilion)',
                            fontFamily: 'var(--v2-font-sans)',
                            fontSize: '0.55rem',
                            fontWeight: 600,
                        }}
                    >
                        {agent.initials}
                    </div>
                </motion.aside>
            ) : (
                /* === Expanded: full thread sidebar === */
                <motion.aside
                    key="expanded"
                    initial={{ width: 0 }}
                    animate={{ width: 260 }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="hidden lg:flex flex-col flex-shrink-0 h-full overflow-hidden"
                    style={{ background: 'var(--v2-paper-ground)', borderRight: '1px solid var(--v2-paper-rule)' }}
                >
            {/* Section header — like Discord's channel category header */}
            <div
                className="flex items-center justify-between px-3 pt-3 pb-1.5 flex-shrink-0"
            >
                <span
                    className="v2-label"
                    style={{ fontSize: '0.58rem', color: 'var(--v2-paper-ink-2)', letterSpacing: '0.1em' }}
                >
                    {agent.name.toUpperCase()} — THREADS
                </span>
                <div className="flex items-center gap-0.5">
                    <Link
                        href={`/workspaces/${workspaceId}/modules/content-factory/v2/${agent.slug}/new`}
                        className="p-1 rounded-[4px] transition-colors"
                        style={{ color: 'var(--v2-paper-ink-2)' }}
                        title="New thread"
                        aria-label="New thread"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </Link>
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1 rounded-[4px] transition-colors"
                        style={{ color: 'var(--v2-paper-ink-2)' }}
                        title="Hide threads"
                        aria-label="Hide threads"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Thread list */}
            <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="h-7 rounded-[6px]" style={{ background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                    ))
                ) : rootThreads.length === 0 ? (
                    <div className="px-2 py-6">
                        <p className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)', lineHeight: 1.5 }}>
                            No threads yet.
                        </p>
                        <Link
                            href={`/workspaces/${workspaceId}/modules/content-factory/v2/${agent.slug}/new`}
                            className="inline-block mt-2 px-3 py-1.5 rounded-[6px] v2-label text-[9px]"
                            style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                        >
                            Start with {agent.name}
                        </Link>
                    </div>
                ) : (
                    rootThreads.map((thread) => {
                        const children = allChildren.filter((c) => (c as any).parentId === thread.id);
                        return (
                            <ThreadRow
                                key={thread.id}
                                thread={thread}
                                isActive={activeThreadId === thread.id}
                                workspaceId={workspaceId}
                                agentSlug={agent.slug}
                                isExpanded={expandedParents.has(thread.id)}
                                onToggle={() => toggleExpand(thread.id)}
                                childThreads={children}
                                activeThreadId={activeThreadId}
                                onDelete={() => handleDeleteThread(thread)}
                            />
                        );
                    })
                )}
            </nav>
        </motion.aside>
            )}
        </AnimatePresence>
    );
}

/* === Thread row (parent + expandable children) === */
function ThreadRow({
    thread,
    isActive,
    workspaceId,
    agentSlug,
    isExpanded,
    onToggle,
    childThreads,
    activeThreadId,
    onDelete,
}: {
    thread: AuditThread;
    isActive: boolean;
    workspaceId: string;
    agentSlug: string;
    isExpanded: boolean;
    onToggle: () => void;
    childThreads: AuditThread[];
    activeThreadId?: string;
    onDelete: () => void;
}) {
    const hasChildren = childThreads.length > 0;
    const href = `/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/${thread.id}`;
    const activeBg = 'rgba(200,50,27,0.08)';
    const hoverBg = 'rgba(0,0,0,0.03)';
    const isRunning = thread.status === 'running';

    return (
        <div>
            {/* Parent thread row */}
            <div
                className="group flex items-center gap-0.5 px-2 py-1.5 rounded-[6px] transition-colors cursor-pointer"
                style={{ background: isActive ? activeBg : 'transparent' }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => {
                    if (hasChildren) onToggle();
                }}
            >
                {/* Chevron or spacer */}
                {hasChildren ? (
                    <span className="flex-shrink-0 p-0.5" style={{ color: 'var(--v2-paper-ink-2)' }}>
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                ) : (
                    <span className="w-3.5 flex-shrink-0 flex items-center justify-center">
                        <Hash className="w-2.5 h-2.5" style={{ color: 'var(--v2-paper-rule-strong)' }} />
                    </span>
                )}

                {/* Title link */}
                <Link
                    href={href}
                    className="flex-1 flex items-center gap-1.5 min-w-0"
                >
                    <span
                        className="truncate"
                        style={{
                            fontFamily: 'var(--v2-font-sans)',
                            fontSize: '0.75rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)',
                            lineHeight: 1.3,
                        }}
                    >
                        {thread.title || 'Untitled'}
                    </span>
                    {/* Running indicator */}
                    {isRunning && (
                        <motion.span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--v2-vermilion)' }}
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    )}
                    {/* Doc count */}
                    {thread.docCount > 0 && (
                        <span
                            className="v2-mono ml-auto flex-shrink-0 text-[0.58rem]"
                            style={{ color: 'var(--v2-paper-ink-2)' }}
                        >
                            {thread.docCount}
                        </span>
                    )}
                </Link>

                {/* Delete button (visible on hover) */}
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                    className="flex-shrink-0 p-1 rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--v2-vermilion)' }}
                    title="Delete thread"
                    aria-label={`Delete ${thread.title || 'thread'}`}
                >
                    <Trash2 className="w-3 h-3" />
                </button>

                {/* Add sub-thread (visible on hover) */}
                {hasChildren && (
                    <Link
                        href={`/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/new?parent=${thread.id}`}
                        className="flex-shrink-0 p-0.5 opacity-0 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--v2-paper-ink-2)' }}
                        title="Add sub-thread"
                        aria-label="Add sub-thread"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Plus className="w-3 h-3" />
                    </Link>
                )}
            </div>

            {/* Children (sub-threads) */}
            <AnimatePresence initial={false}>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="overflow-hidden"
                    >
                        {childThreads.map((child) => {
                            const childHref = `/workspaces/${workspaceId}/modules/content-factory/v2/${agentSlug}/${child.id}`;
                            const childActive = activeThreadId === child.id;
                            return (
                                <Link
                                    key={child.id}
                                    href={childHref}
                                    className="flex items-center gap-1.5 ml-5 pl-2 pr-2 py-1 rounded-[4px] transition-colors"
                                    style={{ background: childActive ? activeBg : 'transparent' }}
                                    onMouseEnter={(e) => { if (!childActive) e.currentTarget.style.background = hoverBg; }}
                                    onMouseLeave={(e) => { if (!childActive) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Hash className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--v2-paper-rule-strong)' }} />
                                    <span
                                        className="truncate"
                                        style={{
                                            fontFamily: 'var(--v2-font-sans)',
                                            fontSize: '0.7rem',
                                            fontWeight: childActive ? 500 : 400,
                                            color: childActive ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)',
                                        }}
                                    >
                                        {child.title || 'Untitled'}
                                    </span>
                                </Link>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
