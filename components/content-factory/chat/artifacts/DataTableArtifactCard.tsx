'use client';

import React from 'react';
import { ArtifactPayload, HeadingsData, ContentStats, HomePageData } from '@/lib/types/graph-events.types';
import { Database, Globe, Building2, Cpu, ExternalLink } from 'lucide-react';
import ArtifactCardShell from './ArtifactCardShell';
import MarkdownRenderer from './MarkdownRenderer';

interface DataTableArtifactCardProps {
    artifact: ArtifactPayload;
    onCopyArtifact: (artifact: ArtifactPayload) => void;
    onDownloadArtifact: (artifact: ArtifactPayload) => void;
    copiedArtifactId: string | null;
}

function preprocessMarkdown(content: string): string {
    let result = content;
    const fencedMatch = result.match(/^```(?:markdown)?\s*\n([\s\S]*?)\n```\s*$/);
    if (fencedMatch) {
        result = fencedMatch[1];
    }
    result = result.replace(/([^\n])\n(\[[a-z0-9]+\])/g, '$1\n\n$2');
    return result.trim();
}

export default function DataTableArtifactCard({
    artifact,
    onCopyArtifact,
    onDownloadArtifact,
    copiedArtifactId,
}: DataTableArtifactCardProps) {
    const content = artifact.content as Record<string, unknown>;
    const stepId = artifact.metadata?.stepId as string | undefined;

    const isSiteContext = stepId === 'site_context' ||
        artifact.title.toLowerCase().includes('site context');
    const isTechStack = stepId === 'tech_research' ||
        artifact.title.toLowerCase().includes('tech stack');

    const isHomePage = stepId === 'home_scraping' ||
        artifact.title.toLowerCase().includes('home page') ||
       
        'meta_title' in content ||
        'headings' in content ||
        'content_stats' in content;

   const hasReportContent = isSiteContext && typeof content?.reportContent === 'string';

    const icon = isSiteContext
        ? <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
        : isTechStack
            ? <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            : <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" />;

    const accentColor = isSiteContext ? 'cyan' : isTechStack ? 'amber' : 'teal';

    return (
        <ArtifactCardShell
            artifact={artifact}
            icon={icon}
            accentColor={accentColor}
            onCopyArtifact={onCopyArtifact}
            onDownloadArtifact={onDownloadArtifact}
            copiedArtifactId={copiedArtifactId}
            collapsibleMaxHeight={350}
        >
            {isSiteContext && hasReportContent ? (
                <BusinessPersonaView content={content} accentColor={accentColor} />
            ) : isSiteContext ? (
                <SiteContextView content={content} />
            ) : isTechStack ? (
                <TechStackView content={content} />
            ) : isHomePage ? (
                <HomePageView content={content as HomePageData} />
            ) : (
                <GenericDataView content={content} />
            )}
        </ArtifactCardShell>
    );
}

function SiteContextView({ content }: { content: Record<string, unknown> }) {
    const keyServices = content.key_services as string[] | undefined;
    const brandVoice = content.brand_voice as Record<string, unknown> | undefined;
    const techHints = content.tech_stack_hints as string[] | undefined;

    return (
        <div className="space-y-3">
            <KeyValueRow label="Business" value={content.business_name as string} />
            <KeyValueRow label="Niche" value={content.niche as string} />
            <KeyValueRow label="Target Audience" value={content.target_audience as string} />
            <KeyValueRow label="Primary Goal" value={content.primary_goal as string} />

            {!!content.description && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Description</label>
                    <p className="text-[13px] text-slate-700 mt-0.5 leading-relaxed">{String(content.description)}</p>
                </div>
            )}

            {keyServices && keyServices.length > 0 && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Key Services</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {keyServices.map((s, i) => (
                            <span key={i} className="text-xs bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-lg font-medium">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {brandVoice && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Brand Voice</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(brandVoice).map(([k, v]) => (
                            <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                <span className="font-medium capitalize">{k}:</span> {String(v)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {techHints && techHints.length > 0 && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Tech Hints</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {techHints.map((t, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono">{t}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function BusinessPersonaView({ content, accentColor }: { content: Record<string, unknown>; accentColor: string }) {
    const reportContent = content.reportContent as string;
    const businessName = (content.businessName ?? content.business_name) as string | undefined;
    const niche = content.niche as string | undefined;
    const reportType = content.reportType as string | undefined;
    const siteUrl = content.siteUrl as string | undefined;
    const pagesCrawled = content.pagesCrawled as number | undefined;
    const generatedAt = content.generatedAt as string | undefined;

    return (
        <div className="space-y-3">
            {(businessName || niche || reportType) && (
                <div className="flex flex-wrap items-center gap-2">
                    {businessName && (
                        <span className="text-sm font-semibold text-slate-800">{businessName}</span>
                    )}
                    {niche && (
                        <span className={`text-[10px] sm:text-xs bg-${accentColor}-50 text-${accentColor}-700 px-2 py-0.5 rounded-full font-medium capitalize`}>
                            {niche.replace(/_/g, ' ')}
                        </span>
                    )}
                    {reportType && (
                        <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium capitalize">
                            {reportType.replace(/_/g, ' ')}
                        </span>
                    )}
                </div>
            )}

            {(pagesCrawled || siteUrl || generatedAt) && (
                <div className="flex flex-wrap gap-2">
                    {pagesCrawled && (
                        <span className={`inline-flex items-center gap-1 text-xs bg-${accentColor}-50 text-${accentColor}-700 px-2 py-1 rounded-lg font-medium`}>
                            📄 {pagesCrawled} pages crawled
                        </span>
                    )}
                    {siteUrl && (
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono truncate max-w-[200px] sm:max-w-none">
                            {siteUrl}
                        </span>
                    )}
                    {generatedAt && (
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded-lg">
                            {new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>
            )}

            <MarkdownRenderer content={preprocessMarkdown(reportContent)} accentColor={accentColor} />
        </div>
    );
}

function TechStackView({ content }: { content: Record<string, unknown> }) {
    const conventions = content.conventions as Record<string, string> | undefined;
    const bestPractices = content.best_practices as string[] | undefined;
    const error = content.error as string | undefined;

    return (
        <div className="space-y-3">
            {!!content.stack && (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Stack:</span>
                    <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg">
                        {String(content.stack)}
                    </span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                    ⚠️ {error}
                </div>
            )}

            {conventions && Object.keys(conventions).length > 0 && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Conventions</label>
                    <div className="mt-1.5 space-y-1.5">
                        {Object.entries(conventions).map(([key, val]) => (
                            <div key={key} className="bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-[11px] font-medium text-amber-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                <p className="text-[13px] text-slate-700 mt-0.5 leading-relaxed">{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {bestPractices && bestPractices.length > 0 && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Best Practices</label>
                    <ul className="mt-1.5 space-y-1">
                        {bestPractices.map((bp, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                                <span className="text-amber-500 mt-0.5">•</span>
                                {bp}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function HomePageView({ content }: { content: HomePageData }) {
    const headings = content.headings;
    const url = content.url;
    const contentStats = content.content_stats;

    return (
        <div className="space-y-3">
            {url && (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-mono bg-teal-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[200px] sm:max-w-none">{url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
            )}

            <KeyValueRow label="Meta Title" value={content.meta_title} />
            <KeyValueRow label="Meta Description" value={content.meta_description} />
            <KeyValueRow label="Meta Keywords" value={content.meta_keywords} />

            <div className="flex gap-3 flex-wrap">
                <StatBadge label="Paragraphs" value={contentStats?.paragraphs_count} />
                <StatBadge label="Words" value={contentStats?.word_count} />
                <StatBadge label="Links" value={contentStats?.links_count} />
                {content.scrape_method && (
                    <StatBadge label="Method" value={content.scrape_method} />
                )}
            </div>

            {headings && (
                <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Headings</label>
                    <div className="mt-1.5 space-y-1">
                        {Object.entries(headings).map(([level, items]) => {
                            if (!items || items.length === 0) return null;
                            return (
                                <div key={level} className="flex items-start gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                                        {level}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {items.map((h: string, i: number) => (
                                            <span key={i} className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                                                {h}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function GenericDataView({ content }: { content: Record<string, unknown> }) {
    return (
        <div className="space-y-2">
            {Object.entries(content).map(([key, value]) => {
                const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return <KeyValueRow key={key} label={key.replace(/_/g, ' ')} value={displayValue} />;
            })}
        </div>
    );
}

function KeyValueRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div>
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</label>
            <p className="text-[13px] text-slate-700 mt-0.5 leading-relaxed">{value}</p>
        </div>
    );
}

function StatBadge({ label, value }: { label: string; value?: number | string | null }) {
    if (value === undefined || value === null) return null;
    return (
        <div className="bg-slate-50 rounded-lg px-3 py-1.5 text-center">
            <p className="text-sm font-bold text-slate-800">{value}</p>
            <p className="text-[10px] text-slate-400 uppercase">{label}</p>
        </div>
    );
}
