import type { ArtifactPayload } from '@/lib/types/graph-events.types';

/*
 * artifactMarkdown — pure artifact-content → markdown rendering.
 *
 * Extracted from StreamArtifact so content shapes are handled by a
 * testable registry instead of an if/else pile inside the component.
 * Both live-stream artifacts (objects) and DB round-trips (JSON strings)
 * normalize through one path, so the stream view and the thread detail
 * page render identically.
 *
 * Known shapes (see the magento_content graph + v1 graphs):
 * - {reportType: 'qc', qcReport}          → QC verdict card content
 * - {contentText, metadata}               → page content (SEO fields + description)
 * - {reportContent}                       → plain markdown reports (content review sheet, audits)
 * - anything else                         → falls back to the shared v1 extractor
 */

export type ArtifactKind = 'qc' | 'page-content' | 'report' | 'generic';

interface QcReport {
    label?: string;
    page_type?: string;
    final_pass?: boolean;
    revisions?: number;
    error?: string;
    mechanical?: {
        passed?: boolean;
        critical_passed?: boolean;
        band_failures?: string[];
        checks?: Array<{ name?: string; passed?: boolean; detail?: string }>;
        issues?: string[];
    };
    qa?: {
        passed?: boolean;
        criteria?: Array<{ name?: string; passed?: boolean; evidence?: string }>;
    };
}

/** QC report artifacts (magento_content auto_qa) — verdict, revisions, failed checks. */
export function formatQcReport(qc: QcReport): string {
    const lines: string[] = [];
    const finalPass = Boolean(qc.final_pass);
    lines.push(`**QC verdict:** ${finalPass ? 'PASS' : 'FAIL'} · **Revisions:** ${Number(qc.revisions ?? 0)}`);
    if (qc.error) {
        lines.push(`**Error:** ${String(qc.error)}`);
        return lines.join('\n\n');
    }

    const mech = qc.mechanical;
    if (mech?.issues && mech.issues.length > 0) {
        // Two-tier verdicts: band/word issues don't sink a page — label them
        // as advisories so "PASS + issues listed" doesn't read contradictory.
        const header = qc.final_pass ? 'Advisory issues (page still passed)' : 'Mechanical issues';
        lines.push(`**${header}:**\n` + mech.issues.map((i) => `- ${String(i)}`).join('\n'));
    }

    const qa = qc.qa;
    if (qa?.criteria && qa.criteria.length > 0) {
        const failed = qa.criteria.filter((c) => !c.passed);
        if (failed.length === 0) {
            lines.push(`**QA review:** all ${qa.criteria.length} criteria passed`);
        } else {
            lines.push(
                '**Failed QA criteria:**\n' +
                failed.map((c) => `- **${c.name || 'criterion'}** — ${c.evidence || 'no evidence recorded'}`).join('\n'),
            );
        }
    }
    return lines.join('\n\n');
}

/**
 * Convert the writers' simple HTML (p / h2-h4 / ul-li / strong / em / br) to
 * markdown so descriptions render with real section hierarchy instead of one
 * undifferentiated blob or literal tags. Plain text passes through unchanged.
 */
export function htmlToMarkdown(html: string): string {
    if (!/<[a-z][^>]*>/i.test(html)) return html;

    const inline = (s: string) => s
        .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
        .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

    let out = html
        // Block structure — every block becomes its own markdown paragraph
        .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl: string, inner: string) => {
            const hashes = Number(lvl) <= 2 ? '##' : Number(lvl) === 3 ? '###' : '####';
            return `\n\n${hashes} ${inline(inner).replace(/<[^>]+>/g, '').trim()}\n\n`;
        })
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner: string) => `\n\n${inline(inner).trim()}\n\n`)
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => `\n- ${inline(inner).replace(/<[^>]+>/g, '').trim()}`)
        .replace(/<br\s*\/?>/gi, '\n');

    // Strip any remaining tags (ul/ol wrappers, spans, unexpected elements)
    out = out.replace(/<[^>]+>/g, '');
    out = out
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");

    return out
        .replace(/[ \t]+\n/g, '\n')   // trailing spaces on lines
        .replace(/\n{3,}/g, '\n\n')   // collapse paragraph gaps
        .trim();
}

/** Page-content artifacts ({contentText, metadata}) — SEO fields + description. */
function formatPageContent(obj: Record<string, unknown>): string {
    const meta = obj.metadata as Record<string, string> | undefined;
    if (!meta || !(meta.meta_title || meta.description)) return '';
    const lines: string[] = [];
    const fieldLabels: Array<[string, string]> = [
        ['meta_title', 'Meta title'],
        ['meta_description', 'Meta description'],
        ['meta_keyword', 'Meta keywords'],
        ['og_title', 'OG title'],
        ['og_description', 'OG description'],
        ['short_description', 'Short description'],
        ['url_key', 'URL key'],
    ];
    for (const [key, label] of fieldLabels) {
        if (meta[key]) lines.push(`**${label}:** ${meta[key]}`);
    }
    const descRaw = meta.description || (typeof obj.contentText === 'string' ? obj.contentText : '');
    if (descRaw) lines.push(`**Description:**\n\n${htmlToMarkdown(descRaw)}`);
    return lines.join('\n\n');
}

/** Normalize: live artifacts are objects, DB round-trips arrive as JSON strings. */
function normalizeContent(artifact: ArtifactPayload): Record<string, unknown> | null {
    const raw = artifact.content;
    const parsed = typeof raw === 'string'
        ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
        : raw;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
}

/** Identify the artifact's content shape — also used by the thread detail
 * page to derive a truthful artifactType instead of a hardcoded one. */
export function detectArtifactKind(artifact: ArtifactPayload): ArtifactKind {
    const obj = normalizeContent(artifact);
    if (!obj) return 'generic';
    if (obj.reportType === 'qc' && obj.qcReport && typeof obj.qcReport === 'object') return 'qc';
    const meta = obj.metadata as Record<string, string> | undefined;
    if (meta && (meta.meta_title || meta.description)) return 'page-content';
    if (typeof obj.contentText === 'string' && obj.contentText.trim()) return 'page-content';
    if (typeof obj.reportContent === 'string' && obj.reportContent.trim()) return 'report';
    return 'generic';
}

/** Map a semantic kind to the wire-protocol ArtifactType union (used by the
 * thread detail page when reconstructing ArtifactPayloads from DB rows). */
export function kindToArtifactType(kind: ArtifactKind): 'content' | 'report' {
    return kind === 'page-content' ? 'content' : 'report';
}

/**
 * Page-content artifacts are re-emitted after QC revisions under the same
 * title (latest version of the page). For display the newest version of a
 * title wins — older versions remain in persistence as history but must not
 * stack as duplicate cards. Returns the artifactIds to hide. Non-content
 * artifacts (QC reports, review sheets) have unique titles and are never
 * superseded.
 */
export function supersededArtifactIds(artifacts: ArtifactPayload[]): Set<string> {
    const lastIdxByTitle = new Map<string, number>();
    artifacts.forEach((a, i) => {
        if (detectArtifactKind(a) === 'page-content') {
            lastIdxByTitle.set(a.title, i); // later occurrences overwrite earlier ones
        }
    });
    const superseded = new Set<string>();
    artifacts.forEach((a, i) => {
        if (detectArtifactKind(a) === 'page-content' && lastIdxByTitle.get(a.title) !== i) {
            superseded.add(a.artifactId);
        }
    });
    return superseded;
}

/** Render an artifact's content to markdown. Shape-first; falls back to the
 * shared v1 extractor for shapes this module doesn't know. */
export function renderArtifactMarkdown(
    artifact: ArtifactPayload,
    extractFallback: (artifact: ArtifactPayload) => string,
): string {
    const obj = normalizeContent(artifact);

    if (obj) {
        if (detectArtifactKind(artifact) === 'qc') {
            return formatQcReport(obj.qcReport as QcReport);
        }
        const pageContent = formatPageContent(obj);
        if (pageContent) return pageContent;
        if (typeof obj.contentText === 'string' && obj.contentText.trim()) {
            return htmlToMarkdown(obj.contentText);
        }
        if (typeof obj.reportContent === 'string' && obj.reportContent.trim()) {
            return obj.reportContent;
        }
    }

    const extracted = extractFallback(artifact);
    if (extracted && extracted.trim() !== '{}' && extracted.trim() !== '') return extracted;

    return typeof artifact.content === 'string' ? artifact.content : '';
}
