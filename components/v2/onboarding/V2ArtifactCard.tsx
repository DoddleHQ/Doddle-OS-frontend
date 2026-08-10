'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Download, FileText } from 'lucide-react';
import type { ArtifactPayload } from '@/lib/types/graph-events.types';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';
import { V2Markdown } from './V2Markdown';
import { PREMIUM_EASE } from '@/components/v2/motion';

/*
 * V2ArtifactCard — Specimen Terminal artifact display.
 *
 * Renders the brand persona report (or any artifact) in v2 style:
 * paper-register card, vermilion accents, hairline borders.
 * Copy + download actions.
 */

interface V2ArtifactCardProps {
  artifact: ArtifactPayload;
  onCopy?: (artifact: ArtifactPayload) => void;
  onDownload?: (artifact: ArtifactPayload) => void;
  copied?: boolean;
}

export function V2ArtifactCard({ artifact, onCopy, onDownload, copied }: V2ArtifactCardProps) {
  const [localCopied, setLocalCopied] = useState(false);
  const isCopied = copied || localCopied;

  const handleCopy = () => {
    const markdown = extractArtifactMarkdown(artifact);
    if (markdown) {
      navigator.clipboard.writeText(markdown);
      setLocalCopied(true);
      onCopy?.(artifact);
      setTimeout(() => setLocalCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const markdown = extractArtifactMarkdown(artifact);
    if (markdown) {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.title || 'artifact'}.md`;
      a.click();
      URL.revokeObjectURL(url);
      onDownload?.(artifact);
    }
  };

  const markdown = (() => {
    const extracted = extractArtifactMarkdown(artifact);
    if (extracted && extracted.trim() !== '{}' && extracted.trim() !== '') return extracted;

    // Fallback: try common content paths for brand persona
    const content = typeof artifact.content === 'string'
      ? (() => { try { return JSON.parse(artifact.content); } catch { return null; } })()
      : artifact.content;

    if (content && typeof content === 'object') {
      // Try reportContent, personaData.reportContent, or the full content as markdown
      if (typeof content.reportContent === 'string') return content.reportContent;
      if (content.personaData?.reportContent) return content.personaData.reportContent;
      // Last resort: if the content has a markdown-like structure, render it
    }

    return '';
  })();

  // If no markdown could be extracted, render the raw content as formatted text
  const displayContent = markdown || (typeof artifact.content === 'string'
    ? artifact.content
    : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: PREMIUM_EASE }}
      className="mb-4"
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
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--v2-paper-rule)' }}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />
            <span className="v2-label text-[9px]" style={{ color: 'var(--v2-paper-ink)' }}>
              {artifact.title || 'Report'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={handleCopy}
              whileTap={{ scale: 0.92 }}
              className="p-1.5 rounded-[6px] transition-colors"
              style={{ color: isCopied ? 'var(--v2-sage)' : 'var(--v2-paper-ink-2)' }}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </motion.button>
            <motion.button
              onClick={handleDownload}
              whileTap={{ scale: 0.92 }}
              className="p-1.5 rounded-[6px] transition-colors"
              style={{ color: 'var(--v2-paper-ink-2)' }}
            >
              <Download className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 max-h-[400px] overflow-y-auto">
          {displayContent
            ? <V2Markdown content={displayContent} />
            : <p className="v2-mono text-[12px]" style={{ color: 'var(--v2-paper-ink-2)' }}>No content available</p>
          }
        </div>
      </div>
    </motion.div>
  );
}
