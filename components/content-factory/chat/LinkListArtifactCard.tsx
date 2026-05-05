'use client';

import React, { useState } from 'react';
import { ArtifactPayload } from '@/lib/types/graph-events.types';
import { Copy, Check, Download, Link, ExternalLink } from 'lucide-react';

const MAX_SELECTIONS = 5;

interface LinkItem {
    url: string;
    text?: string;
    predictedType?: string;
}

interface LinkListContent {
    total: number;
    byType?: Record<string, number>;
    links?: Record<string, LinkItem[]>;
}

interface LinkListArtifactCardProps {
    artifact: ArtifactPayload;
    onRespond: (response: unknown) => void;
    onCopyArtifact: (artifact: ArtifactPayload) => void;
    onDownloadArtifact: (artifact: ArtifactPayload) => void;
    copiedArtifactId: string | null;
    onAppendToInput?: (text: string) => void;
}

export default function LinkListArtifactCard({
    artifact,
    onRespond,
    onCopyArtifact,
    onDownloadArtifact,
    copiedArtifactId,
    onAppendToInput,
}: LinkListArtifactCardProps) {
    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const content: LinkListContent = (() => {
        if (typeof artifact.content === 'string') {
            try {
                return JSON.parse(artifact.content);
            } catch {
                return { total: 0, links: {} };
            }
        }
        return artifact.content as LinkListContent;
    })();

    const allLinks: (LinkItem & { category: string })[] = [];
    if (content.links) {
        for (const [category, links] of Object.entries(content.links)) {
            if (Array.isArray(links)) {
                for (const link of links) {
                    allLinks.push({ ...link, category });
                }
            }
        }
    }

    const toggleUrl = (url: string) => {
        setSelectedUrls(prev => {
            if (prev.includes(url)) {
                return prev.filter(u => u !== url);
            }
            if (prev.length >= MAX_SELECTIONS) {
                return prev;
            }
            return [...prev, url];
        });
    };

    const handleConfirm = () => {
        if (selectedUrls.length === 0) return;

        if (onAppendToInput) {
            onAppendToInput(selectedUrls.join(', '));
            setSelectedUrls([]);
        } else {
            setIsSubmitting(true);
            onRespond(selectedUrls);
        }
    };

    const isAtLimit = selectedUrls.length >= MAX_SELECTIONS;

    const getDisplayLabel = (link: LinkItem) => {
        if (link.text && link.text.trim()) return link.text;
        try {
            const parsed = new URL(link.url);
            return parsed.pathname === '/' ? parsed.hostname : parsed.pathname;
        } catch {
            return link.url;
        }
    };

    return (
        <div className="flex justify-start my-4">
            <div className="flex gap-3 max-w-[85%] w-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Link className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-white border border-emerald-200 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden flex-1">
                    <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800">{artifact.title}</p>
                            </div>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                {artifact.artifactType}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1.5 text-[13px] text-slate-500">
                            <p>Please provide the URLs you want to scrape, one per line:</p>
                            <p className="text-[12px] text-slate-400">You can paste any combination of the URLs listed below.</p>
                            <p className="text-[12px] text-slate-400">Or comma-separated.</p>
                            <p className="text-[12px] text-slate-400">You can also add additional URLs manually using: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">Add: https://example.com/page - Page Name</code></p>
                            <p className="text-[12px] font-medium text-slate-600">Select up to {MAX_SELECTIONS} options</p>
                        </div>
                    </div>

                    <div className="px-5 py-3 space-y-1.5 max-h-[350px] overflow-y-auto">
                        {allLinks.map((link, index) => {
                            const isSelected = selectedUrls.includes(link.url);
                            const isDisabled = isAtLimit && !isSelected;

                            return (
                                <label
                                    key={`${link.url}-${index}`}
                                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected
                                        ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                                        } ${isDisabled
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleUrl(link.url)}
                                        disabled={isDisabled || isSubmitting}
                                        className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[14px] font-medium text-slate-800 block leading-tight">
                                            {getDisplayLabel(link)}
                                        </span>
                                    </div>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-shrink-0 text-slate-400 hover:text-emerald-600 transition-colors mt-0.5"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </label>
                            );
                        })}
                    </div>

                    <div className="px-5 py-3 border-t border-emerald-100 flex items-center gap-2">
                        <button
                            onClick={handleConfirm}
                            disabled={isSubmitting || selectedUrls.length === 0}
                            className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : `Confirm Selection ${selectedUrls.length > 0 ? `(${selectedUrls.length}/${MAX_SELECTIONS})` : ''}`
                            }
                        </button>
                        <button
                            onClick={() => onCopyArtifact(artifact)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            {copiedArtifactId === artifact.artifactId ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => onDownloadArtifact(artifact)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
