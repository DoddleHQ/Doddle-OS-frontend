import { ArtifactPayload } from '@/lib/types/graph-events.types';

/**
 * Preprocess markdown content by removing code block markers and formatting
 */
export function preprocessMarkdown(content: string): string {
    let result = content.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');
    result = result.replace(/([^\n])\n(\[[a-z0-9]+\])/g, '$1\n\n$2');
    return result.trim();
}

/**
 * Convert data table content to markdown format
 */
export function convertDataTableToMarkdown(artifact: ArtifactPayload): string {
    const content = typeof artifact.content === 'string'
        ? (() => {
            try {
                return JSON.parse(artifact.content);
            } catch {
                return { _rawString: artifact.content };
            }
        })()
        : (artifact.content as Record<string, unknown>) || {};

    const stepId = artifact.metadata?.stepId as string | undefined;
    const title = artifact.title;

    let markdown = `# ${title}\n\n`;

    // Site Context
    if (stepId === 'site_context' || title.toLowerCase().includes('site context')) {
        markdown += `## Site Context\n\n`;
        if (content.business_name) markdown += `**Business:** ${content.business_name}\n\n`;
        if (content.niche) markdown += `**Niche:** ${content.niche}\n\n`;
        if (content.target_audience) markdown += `**Target Audience:** ${content.target_audience}\n\n`;
        if (content.primary_goal) markdown += `**Primary Goal:** ${content.primary_goal}\n\n`;
        if (content.description) markdown += `**Description:**\n${content.description}\n\n`;

        const keyServices = content.key_services as string[] | undefined;
        if (keyServices && keyServices.length > 0) {
            markdown += `**Key Services:**\n`;
            keyServices.forEach(s => markdown += `- ${s}\n`);
            markdown += '\n';
        }

        const brandVoice = content.brand_voice as Record<string, unknown> | undefined;
        if (brandVoice) {
            markdown += `**Brand Voice:**\n`;
            Object.entries(brandVoice).forEach(([k, v]) => {
                markdown += `- ${k}: ${v}\n`;
            });
            markdown += '\n';
        }

        const techHints = content.tech_stack_hints as string[] | undefined;
        if (techHints && techHints.length > 0) {
            markdown += `**Tech Hints:**\n`;
            techHints.forEach(t => markdown += `- ${t}\n`);
            markdown += '\n';
        }
    }
    // Tech Stack
    else if (stepId === 'tech_research' || title.toLowerCase().includes('tech stack')) {
        markdown += `## Tech Stack\n\n`;
        if (content.stack) markdown += `**Stack:** ${content.stack}\n\n`;

        const error = content.error as string | undefined;
        if (error) {
            markdown += `⚠️ **Error:** ${error}\n\n`;
        }

        const conventions = content.conventions as Record<string, string> | undefined;
        if (conventions && Object.keys(conventions).length > 0) {
            markdown += `### Conventions\n\n`;
            Object.entries(conventions).forEach(([key, val]) => {
                markdown += `**${key.replace(/_/g, ' ')}:**\n${val}\n\n`;
            });
        }

        const bestPractices = content.best_practices as string[] | undefined;
        if (bestPractices && bestPractices.length > 0) {
            markdown += `### Best Practices\n\n`;
            bestPractices.forEach(bp => markdown += `- ${bp}\n`);
            markdown += '\n';
        }
    }
    // Home Page
    else if (stepId === 'home_scraping' || title.toLowerCase().includes('home page') ||
        'meta_title' in content || 'headings' in content || 'content_stats' in content) {
        markdown += `## Home Page Analysis\n\n`;

        const url = content.url as string | undefined;
        if (url) markdown += `**URL:** ${url}\n\n`;

        if (content.meta_title) markdown += `**Meta Title:** ${content.meta_title}\n\n`;
        if (content.meta_description) markdown += `**Meta Description:** ${content.meta_description}\n\n`;
        if (content.meta_keywords) markdown += `**Meta Keywords:** ${content.meta_keywords}\n\n`;

        const contentStats = content.content_stats as Record<string, number> | undefined;
        if (contentStats) {
            markdown += `### Content Stats\n\n`;
            if (contentStats.paragraphs_count) markdown += `- Paragraphs: ${contentStats.paragraphs_count}\n`;
            if (contentStats.word_count) markdown += `- Words: ${contentStats.word_count}\n`;
            if (contentStats.links_count) markdown += `- Links: ${contentStats.links_count}\n`;
            if (content.scrape_method) markdown += `- Method: ${content.scrape_method}\n`;
            markdown += '\n';
        }

        const headings = content.headings as Record<string, string[]> | undefined;
        if (headings) {
            markdown += `### Headings\n\n`;
            Object.entries(headings).forEach(([level, items]) => {
                if (items && items.length > 0) {
                    markdown += `**${level}:**\n`;
                    items.forEach((h: string) => markdown += `- ${h}\n`);
                    markdown += '\n';
                }
            });
        }
    }
    // Generic Data View
    else {
        markdown += `## Data\n\n`;
        Object.entries(content).forEach(([key, value]) => {
            const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
            markdown += `**${key.replace(/_/g, ' ')}:**\n${displayValue}\n\n`;
        });
    }

    return preprocessMarkdown(markdown);
}

/**
 * Convert link list content to markdown format
 */
export function convertLinkListToMarkdown(artifact: ArtifactPayload): string {
    const content = typeof artifact.content === 'string'
        ? (() => {
            try {
                return JSON.parse(artifact.content);
            } catch {
                return { total: 0, links: {} };
            }
        })()
        : artifact.content as Record<string, unknown>;

    const title = artifact.title;
    const description = artifact.description || '';

    let markdown = `# ${title}\n\n`;
    if (description) markdown += `${description}\n\n`;

    const total = content.total as number | undefined;
    const byType = content.byType as Record<string, number> | undefined;
    const links = content.links as Record<string, Array<{ url: string; text?: string; predictedType?: string }>> | undefined;

    if (total !== undefined) markdown += `**Total Links:** ${total}\n\n`;

    if (byType) {
        markdown += `### Links by Type\n\n`;
        Object.entries(byType).forEach(([type, count]) => {
            markdown += `- ${type}: ${count}\n`;
        });
        markdown += '\n';
    }

    if (links) {
        Object.entries(links).forEach(([category, linkList]) => {
            if (Array.isArray(linkList) && linkList.length > 0) {
                markdown += `### ${category}\n\n`;
                linkList.forEach(link => {
                    markdown += `- [${link.text || link.url}](${link.url})\n`;
                    if (link.predictedType && link.predictedType !== 'custom') {
                        markdown += `  - Type: ${link.predictedType}\n`;
                    }
                });
                markdown += '\n';
            }
        });
    }

    return preprocessMarkdown(markdown);
}

/**
 * Convert generic artifact content to markdown format
 */
export function convertGenericToMarkdown(artifact: ArtifactPayload): string {
    const title = artifact.title;
    const description = artifact.description || '';

    let markdown = `# ${title}\n\n`;
    if (description) markdown += `${description}\n\n`;

    const content = typeof artifact.content === 'string'
        ? artifact.content
        : JSON.stringify(artifact.content, null, 2);

    markdown += `\`\`\`\n${content}\n\`\`\``;

    return preprocessMarkdown(markdown);
}

/**
 * Extract markdown content from any artifact type
 * This is the main function that should be used for copy/download operations
 */
export function extractArtifactMarkdown(artifact: ArtifactPayload): string {
    const artifactType = artifact.artifactType;

    // Markdown-based artifacts (report, blueprint, content)
    if (['report', 'pre_run_report', 'pre_run_audit', 'pre_run_audit_summary', 'blueprint', 'content'].includes(artifactType)) {
        const content = typeof artifact.content === 'string'
            ? (() => {
                try {
                    return JSON.parse(artifact.content);
                } catch {
                    return { _rawString: artifact.content };
                }
            })()
            : (artifact.content as Record<string, unknown>) || {};

        const markdownKeys: Record<string, string[]> = {
            report: ['reportContent'],
            pre_run_report: ['reportContent'],
            pre_run_audit: ['reportContent'],
            pre_run_audit_summary: ['reportContent'],
            blueprint: ['blueprintContent'],
            content: ['contentText'],
        };

        const keys = markdownKeys[artifactType] || [];

        for (const key of keys) {
            if (content?.[key] && typeof content[key] === 'string') {
                return preprocessMarkdown(content[key] as string);
            }
        }

        if (content._rawString) {
            return preprocessMarkdown(content._rawString as string);
        }

        const fallbackContent = typeof artifact.content === 'string'
            ? artifact.content
            : JSON.stringify(artifact.content, null, 2);
        return preprocessMarkdown(fallbackContent);
    }

    // Data table artifacts
    if (artifactType === 'data_table') {
        return convertDataTableToMarkdown(artifact);
    }

    // Link list artifacts
    if (artifactType === 'link_list') {
        return convertLinkListToMarkdown(artifact);
    }

    // Generic artifacts
    return convertGenericToMarkdown(artifact);
}
