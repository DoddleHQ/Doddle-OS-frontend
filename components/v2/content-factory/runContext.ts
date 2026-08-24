import type { ChatMessage, CompletePayload } from '@/lib/types/graph-events.types';

/*
 * runContext — the run-status line shown in the AgentStream top bar during
 * multi-phase executions (page picking → generation → QC).
 *
 * Two layers, in priority order:
 * 1. Structured: `progress` events from the graph (current/total[/message]) —
 *    graph-agnostic, no string parsing. Any graph that emits progress gets a
 *    live counter for free.
 * 2. Fallback: declarative message-pattern table keyed by graphId — derives
 *    counters from the graph's system messages for graphs that don't emit
 *    progress yet. Patterns live in one table so a graph's copy change is a
 *    one-line fix here, not logic surgery inside a component.
 *
 * Extracted from AgentStream (was an inline regex block) to keep the shared
 * component generic and this logic testable.
 */

export interface RunProgress {
    current: number;
    total: number;
    message?: string;
}

interface MessagePattern {
    /** Sum matches across messages (accumulating counters, e.g. pages picked). */
    accumulate?: RegExp;
    /** Last match wins (phase milestones, e.g. generation/QC totals). */
    lastMatch?: RegExp;
    /** Build the display line from the accumulated/last values. */
    format: (values: { accumulated: number; last: RegExpMatchArray | null }) => string;
}

const MESSAGE_PATTERNS: Record<string, MessagePattern[]> = {
    magento_content: [
        {
            lastMatch: /^Auto-QA complete: (\d+)\/(\d+) pages pass/,
            format: ({ last }) => `QC ${last![1]}/${last![2]} passed`,
        },
        {
            lastMatch: /^Generating content for (\d+) targets/,
            format: ({ last }) => `writing ${last![1]} pages`,
        },
        {
            accumulate: /^Added (\d+) /,
            format: ({ accumulated }) => (accumulated > 0 ? `${accumulated} pages picked` : ''),
        },
    ],
};

function deriveFromMessages(graphId: string, messages: ChatMessage[]): string {
    const patterns = MESSAGE_PATTERNS[graphId];
    if (!patterns) return '';
    const systemTexts = messages.filter((m) => m.type === 'system').map((m) => m.content);
    for (const pattern of patterns) {
        let accumulated = 0;
        let last: RegExpMatchArray | null = null;
        for (const text of systemTexts) {
            if (pattern.accumulate) {
                const m = text.match(pattern.accumulate);
                if (m) accumulated += Number(m[1]);
            }
            if (pattern.lastMatch) {
                const m = text.match(pattern.lastMatch);
                if (m) last = m;
            }
        }
        // A pattern only speaks when its own signal is present.
        const hasSignal = pattern.lastMatch ? last !== null : accumulated > 0;
        if (!hasSignal) continue;
        const label = pattern.format({ accumulated, last });
        if (label) return label;
    }
    return '';
}

/** Top-bar run context. Structured progress wins; message fallback otherwise. */
export function getRunContext(graphId: string, progress: RunProgress | null, messages: ChatMessage[]): string {
    if (progress && progress.total > 0) {
        const base = `${progress.current}/${progress.total}`;
        return progress.message ? `${base} · ${progress.message}` : base;
    }
    return deriveFromMessages(graphId, messages);
}

/** Completion summary line — known count keys first, generic fallback. */
export function getCompletionSummary(complete: CompletePayload | null): string {
    const s = (complete?.summary ?? {}) as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof s.pagesGenerated === 'number') parts.push(`${s.pagesGenerated} pages`);
    if (typeof s.qcPassed === 'number') parts.push(`${s.qcPassed} passed QC`);
    if (typeof s.qcFailed === 'number' && s.qcFailed > 0) parts.push(`${s.qcFailed} failed`);
    if (parts.length === 0 && typeof s.artifactsGenerated === 'number') parts.push(`${s.artifactsGenerated} artifacts`);
    return parts.join(' · ');
}
