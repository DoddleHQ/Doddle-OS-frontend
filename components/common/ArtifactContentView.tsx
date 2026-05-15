'use client';

import React, { useState, useCallback } from 'react';
import { AuditArtifact } from '@/lib/types/thread.types';
import { ArtifactPayload } from '@/lib/types/graph-events.types';
import { toArtifactPayload } from '@/lib/utils/artifactUtils';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';
import ArtifactCardRouter from '@/components/content-factory/chat/artifacts/ArtifactCardRouter';

export default function ArtifactContentView({ artifact }: { artifact: AuditArtifact }) {
    const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);
    const payload = toArtifactPayload(artifact);

    const handleCopy = useCallback((a: ArtifactPayload) => {
        const md = extractArtifactMarkdown(a);
        navigator.clipboard.writeText(md).then(() => {
            setCopiedArtifactId(a.artifactId);
            setTimeout(() => setCopiedArtifactId(null), 2000);
        });
    }, []);

    const handleDownload = useCallback((a: ArtifactPayload) => {
        const md = extractArtifactMarkdown(a);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const el = document.createElement('a');
        el.href = url;
        el.download = `${a.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
        URL.revokeObjectURL(url);
    }, []);

    return (
        <ArtifactCardRouter
            artifact={payload}
            onRespond={() => {}}
            onCopyArtifact={handleCopy}
            onDownloadArtifact={handleDownload}
            copiedArtifactId={copiedArtifactId}
        />
    );
}
