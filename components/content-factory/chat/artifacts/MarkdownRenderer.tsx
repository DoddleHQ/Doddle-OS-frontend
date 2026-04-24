'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
    content: string;
    accentColor?: string;
    invert?: boolean;
}

const STATUS_EMOJI_REPLACEMENTS: Array<[RegExp, string]> = [
    [/\u2705/g, '\u2713'],
    [/\u274C/g, '\u2717'],
    [/\u2B55/g, '\u2713'],
    [/\uD83D\uDFE2/g, '\u2713'],
    [/\uD83D\uDD34/g, '\u2717'],
    [/\uD83D\uDFE1/g, '\u25CB'],
    [/\u26A0\uFE0F/g, '\u26A0'],
    [/\u26A0/g, '\u26A0'],
    [/\u2139\uFE0F/g, '\u25CF'],
    [/\u2139/g, '\u25CF'],
];

function normalizeStatusEmojis(text: string): string {
    let result = text;
    for (const [pattern, replacement] of STATUS_EMOJI_REPLACEMENTS) {
        result = result.replace(pattern, replacement);
    }
    return result;
}

export default function MarkdownRenderer({ content, accentColor = 'slate', invert = false }: MarkdownRendererProps) {
    const normalizedContent = normalizeStatusEmojis(content);

    const linkColorClass = invert
        ? `prose-a:text-white/90 hover:prose-a:text-white`
        : `prose-a:text-${accentColor}-600 hover:prose-a:text-${accentColor}-800`;

    const txt = invert ? 'text-white' : 'text-slate-600';
    const txtHead = invert ? 'text-white' : 'text-slate-800';
    const txtSub = invert ? 'text-white/90' : 'text-slate-700';
    const txtStrong = invert ? 'text-white font-bold' : 'font-semibold text-slate-800';
    const border = invert ? 'border-white/20' : 'border-slate-200';
    const bgEven = invert ? 'bg-white/5' : 'bg-slate-50/50';
    const bgHead = invert ? 'bg-white/10' : 'bg-slate-50';
    const bgCode = invert ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800';
    const bgBlockquote = invert ? 'bg-white/5' : 'bg-slate-50/50';
    const borderBq = invert ? 'border-white/30' : 'border-slate-300';

    const components = {
        table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
            <div className="overflow-x-auto my-2 -mx-1 px-1">
                <table {...props} className={`min-w-max text-xs border-collapse border ${border}`}>
                    {children}
                </table>
            </div>
        ),
        th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
            <th {...props} className={`${bgHead} ${txtSub} px-3 py-2 text-left font-semibold border ${border} whitespace-nowrap`}>
                {children}
            </th>
        ),
        td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
            <td {...props} className={`px-3 py-2 border ${border} max-w-[280px] break-words ${txt}`}>
                {children}
            </td>
        ),
        tr: ({ children, ...props }: React.ComponentPropsWithoutRef<'tr'>) => (
            <tr {...props} className={`even:${bgEven}`}>
                {children}
            </tr>
        ),
        pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
            <pre {...props} className="bg-slate-900 text-slate-100 text-xs rounded-xl overflow-x-auto whitespace-pre-wrap break-words p-3 my-2 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit [&>code]:rounded-none [&>code]:text-xs">
                {children}
            </pre>
        ),
        code: ({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
            const isInline = !className;
            if (isInline) {
                return (
                    <code className={`text-xs ${bgCode} px-1.5 py-0.5 rounded font-mono [overflow-wrap:anywhere]`} {...props}>
                        {children}
                    </code>
                );
            }
            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
        a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={invert
                    ? 'text-white/90 hover:text-white hover:underline break-words [overflow-wrap:anywhere]'
                    : `text-${accentColor}-600 hover:text-${accentColor}-800 hover:underline break-words [overflow-wrap:anywhere]`
                }
                {...props}
            >
                {children}
            </a>
        ),
        blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
            <blockquote {...props} className={`border-l-4 ${borderBq} pl-4 my-2 ${txt} italic ${bgBlockquote} py-1 pr-2 rounded-r-lg`}>
                {children}
            </blockquote>
        ),
        p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
            <p {...props} className={`text-[13px] leading-relaxed ${txt} my-1.5`}>
                {children}
            </p>
        ),
        ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
            <ul {...props} className={`text-[13px] ${txt} my-1 list-disc pl-5 space-y-0.5`}>
                {children}
            </ul>
        ),
        ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
            <ol {...props} className={`text-[13px] ${txt} my-1 list-decimal pl-5 space-y-0.5`}>
                {children}
            </ol>
        ),
        li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
            <li {...props} className={`text-[13px] ${txt} leading-relaxed [overflow-wrap:anywhere]`}>
                {children}
            </li>
        ),
        h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
            <h1 {...props} className={`text-lg font-semibold ${txtHead} mt-4 mb-2`}>
                {children}
            </h1>
        ),
        h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
            <h2 {...props} className={`text-base font-semibold ${txtHead} mt-3 mb-2`}>
                {children}
            </h2>
        ),
        h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
            <h3 {...props} className={`text-sm font-semibold ${txtHead} mt-2 mb-1`}>
                {children}
            </h3>
        ),
        h4: ({ children, ...props }: React.ComponentPropsWithoutRef<'h4'>) => (
            <h4 {...props} className={`text-xs font-semibold ${txtSub} mt-2 mb-1`}>
                {children}
            </h4>
        ),
        hr: (props: React.ComponentPropsWithoutRef<'hr'>) => (
            <hr {...props} className={`${border} my-3`} />
        ),
        strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
            <strong {...props} className={txtStrong}>
                {children}
            </strong>
        ),
    };

    return (
        <div className={`prose prose-sm prose-slate max-w-none [overflow-wrap:anywhere] break-words
            ${linkColorClass}
        `}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={components}
            >
                {normalizedContent}
            </ReactMarkdown>
        </div>
    );
}
