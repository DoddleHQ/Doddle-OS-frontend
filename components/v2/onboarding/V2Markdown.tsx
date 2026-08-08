'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

/*
 * V2Markdown — Specimen Terminal markdown renderer.
 *
 * Replaces the v1 MarkdownRenderer (which uses slate/blue tokens) with
 * v2 CSS-variable-based styling. Renders markdown content using
 * react-markdown + remark-gfm + rehype-raw (same deps as v1).
 *
 * All colors use v2 tokens: paper-ink for text, paper-rule for borders,
 * vermilion for links/accents. No slate, no blue.
 */

interface V2MarkdownProps {
  content: string;
}

export function V2Markdown({ content }: V2MarkdownProps) {
  if (!content) return null;

  // Normalize status emojis (same as v1)
  const normalized = content
    .replace(/✅/g, '✓')
    .replace(/❌/g, '✗')
    .replace(/⚠️/g, '⚠')
    .replace(/🎯/g, '→');

  return (
    <div className="v2-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="v2-display text-[1.4rem] mt-4 mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="v2-display text-[1.2rem] mt-3 mb-2" style={{ color: 'var(--v2-paper-ink)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold mt-3 mb-1" style={{ color: 'var(--v2-paper-ink)' }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="v2-label text-[10px] mt-2 mb-1" style={{ color: 'var(--v2-paper-ink-2)' }}>
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[13px] leading-[1.6] my-2" style={{ color: 'var(--v2-paper-ink)' }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: 'var(--v2-paper-ink)' }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{ color: 'var(--v2-paper-ink-2)' }}>{children}</em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors"
              style={{ color: 'var(--v2-vermilion)' }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-4" style={{ listStyle: 'disc' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 pl-4" style={{ listStyle: 'decimal' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[13px] leading-[1.5]" style={{ color: 'var(--v2-paper-ink)' }}>
              {children}
            </li>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre
                  className="my-2 p-3 rounded-[8px] overflow-x-auto text-[12px]"
                  style={{ background: 'var(--v2-ink-ground)', color: 'var(--v2-ink-text)' }}
                >
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded text-[12px]"
                style={{ background: 'rgba(200,50,27,0.06)', color: 'var(--v2-vermilion)' }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote
              className="my-2 pl-3 py-1"
              style={{ borderLeft: '2px solid var(--v2-vermilion)', color: 'var(--v2-paper-ink-2)' }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <table
              className="my-2 w-full border-collapse text-[12px]"
              style={{ border: '1px solid var(--v2-paper-rule)' }}
            >
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th
              className="px-3 py-2 text-left font-semibold"
              style={{ border: '1px solid var(--v2-paper-rule)', background: 'rgba(0,0,0,0.02)', color: 'var(--v2-paper-ink)' }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="px-3 py-2"
              style={{ border: '1px solid var(--v2-paper-rule)', color: 'var(--v2-paper-ink)' }}
            >
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-3 border-0 h-px" style={{ background: 'var(--v2-paper-rule)' }} />
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
