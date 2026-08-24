'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Download, FileText } from 'lucide-react';
import type { ArtifactPayload } from '@/lib/types/graph-events.types';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';
import { renderArtifactMarkdown } from './artifactMarkdown';
import { V2Markdown } from '@/components/v2/onboarding/V2Markdown';

const EASE = [0.16, 1, 0.3, 1] as const;

/*
 * StreamArtifact — v2 artifact card for streaming chat.
 *
 * Renders artifacts emitted by the graph during a stream (reports, data
 * tables, link lists, blueprints). Uses v2 tokens: paper-register card with
 * vermilion header accent, copy + download actions.
 *
 * Content → markdown resolution lives in ./artifactMarkdown (pure, testable,
 * shared with the thread detail page).
 */

export function StreamArtifact({ artifact }: { artifact: ArtifactPayload }) {
    const [copied, setCopied] = useState(false);

    const markdown = renderArtifactMarkdown(artifact, extractArtifactMarkdown);

    const handleCopy = () => {
        if (markdown) {
            navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (markdown) {
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${artifact.title || 'artifact'}.md`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mb-3 w-full"
        >
            <div
                className="rounded-[12px] overflow-hidden"
                style={{
                    background: 'rgba(255,255,255,0.4)',
                    border: '1px solid var(--v2-paper-rule-strong)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.75} />
                        <span
                            className="v2-label"
                            style={{ fontSize: '0.6rem', color: 'var(--v2-paper-ink)' }}
                        >
                            {artifact.title || 'Artifact'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <motion.button
                            onClick={handleCopy}
                            whileTap={{ scale: 0.92 }}
                            className="p-1.5 rounded-[6px] transition-colors"
                            style={{ color: copied ? 'var(--v2-sage)' : 'var(--v2-paper-ink-2)' }}
                            aria-label="Copy artifact"
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </motion.button>
                        <motion.button
                            onClick={handleDownload}
                            whileTap={{ scale: 0.92 }}
                            className="p-1.5 rounded-[6px] transition-colors"
                            style={{ color: 'var(--v2-paper-ink-2)' }}
                            aria-label="Download artifact"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </motion.button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 py-3 max-h-[400px] overflow-y-auto">
                    {markdown ? (
                        <V2Markdown content={markdown} />
                    ) : (
                        <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)' }}>
                            No content available
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
