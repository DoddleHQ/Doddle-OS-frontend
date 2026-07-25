import { AuditArtifact } from '@/lib/types/thread.types';
import { ArtifactPayload, ArtifactType } from '@/lib/types/graph-events.types';

function parseContent(artifact: AuditArtifact): Record<string, unknown> {
    if (artifact.data && typeof artifact.data === 'object' && Object.keys(artifact.data).length > 0) {
        return artifact.data;
    }
    if (typeof artifact.content === 'string') {
        try {
            const parsed = JSON.parse(artifact.content);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch {}
    }
    if (artifact.content && typeof artifact.content === 'object') {
        return artifact.content as Record<string, unknown>;
    }
    return {};
}

function getMergedContent(artifact: AuditArtifact): Record<string, unknown> {
    const fromData = (artifact.data && typeof artifact.data === 'object' && Object.keys(artifact.data).length > 0)
        ? artifact.data
        : {};

    let fromContent: Record<string, unknown> = {};
    if (typeof artifact.content === 'string') {
        try {
            const parsed = JSON.parse(artifact.content);
            if (parsed && typeof parsed === 'object') fromContent = parsed;
        } catch {}
    } else if (artifact.content && typeof artifact.content === 'object') {
        fromContent = artifact.content as Record<string, unknown>;
    }

    return { ...fromContent, ...fromData };
}

function detectArtifactType(artifact: AuditArtifact): ArtifactType {
    const data = getMergedContent(artifact);

    const pageName = (artifact.pageName || '').toLowerCase();

    if ('reportContent' in data) return 'report';
    if ('blueprintContent' in data) return 'blueprint';
    if ('contentText' in data) return 'content';

    if ('links' in data || 'total' in data) return 'link_list';
    if ('headings' in data || 'meta_title' in data || 'content_stats' in data) return 'data_table';
    if ('stack' in data || 'conventions' in data) return 'tech_stack';
    if ('business_name' in data || 'niche' in data || 'brand_voice' in data) return 'site_context';

    if (pageName.includes('site context')) return 'site_context';
    if (pageName.includes('tech stack')) return 'tech_stack';
    if (pageName.includes('link')) return 'link_list';
    if (pageName.includes('analysis')) return 'report';

    // If content is a plain string (not parseable JSON), treat as report/markdown
    if (typeof artifact.content === 'string') {
        try {
            JSON.parse(artifact.content);
        } catch {
            return 'report';
        }
    }

    return 'data_table';
}

export function toArtifactPayload(artifact: AuditArtifact): ArtifactPayload {
    let content: unknown = artifact.content;
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content);
        } catch {
            // keep as string
        }
    }

    return {
        artifactId: String(artifact.id),
        artifactType: detectArtifactType(artifact),
        title: artifact.pageName || `Artifact #${artifact.id}`,
        content,
        metadata: {
            mimeType: 'application/json',
        },
    };
}
