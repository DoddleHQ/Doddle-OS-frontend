'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { workspaceService } from '@/lib/services/workspaceService';
import { notify } from '@/lib/stores/notificationStore';

/**
 * Brand persona — renders as markdown, edits in a popup modal.
 * Persists via workspaceService.getPersona/upsertPersona.
 */
export function BrandPersonaEditor({ workspaceId }: { workspaceId: string }) {
  const [content, setContent] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPersona, setHasPersona] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const persona = await workspaceService.getPersona(workspaceId);
      if (persona && persona.content.trim()) {
        setContent(persona.content);
        setHasPersona(true);
      } else {
        setContent('');
        setHasPersona(false);
      }
    } catch {
      setContent('');
      setHasPersona(false);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const openEditor = () => {
    setDraft(content || placeholderPersona);
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await workspaceService.upsertPersona(workspaceId, draft);
      setContent(draft);
      setHasPersona(true);
      setModalOpen(false);
      notify('Brand persona saved — agents will use this context', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save persona', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl slide-in">
        <div className="plate p-6">
          <div className="skeleton h-4 rounded mb-3" style={{ width: '30%' }} />
          <div className="skeleton h-32 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold font-mono">Brand Persona</h3>
          <p className="text-xs text-[var(--ink-dim)] mt-1">
            Agents read this before writing — tone, terminology, style guidelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="service-chip"
            style={{ ['--chip' as string]: hasPersona ? 'var(--line-green)' : 'var(--line-amber)' }}
          >
            {hasPersona ? 'Configured' : 'Not Set'}
          </span>
          <button type="button" className="btn-primary !py-2 !px-4" onClick={openEditor}>
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
      </div>

      {/* Status banner */}
      {!hasPersona && (
        <div
          className="plate p-4 mb-4"
          style={{ borderColor: 'color-mix(in srgb, var(--line-amber) 30%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 4%, transparent)' }}
        >
          <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
            <span className="font-bold" style={{ color: 'var(--line-amber)' }}>No persona configured.</span>{' '}
            Agents will use generic copy without your brand&apos;s voice.
          </p>
        </div>
      )}

      {/* Rendered markdown */}
      {hasPersona ? (
        <div className="plate p-6">
          <div className="prose prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_strong]:font-semibold [&_code]:text-xs [&_code]:font-mono [&_code]:bg-[var(--bg-hover)] [&_code]:px-1 [&_code]:rounded">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="plate p-6 text-center">
          <Pencil className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[var(--ink-faint)]">Click Edit to create your brand persona</p>
        </div>
      )}

      {/* Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="plate w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 py-4 border-b agency-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold font-mono">Edit Brand Persona</h3>
                <p className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5">Markdown supported</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="dock-icon w-8 h-8 flex items-center justify-center border border-[var(--hairline)] rounded-[6px]"
                aria-label="Close editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body — textarea */}
            <div className="flex-1 overflow-y-auto p-4">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={18}
                className="w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[8px] px-4 py-3 text-xs font-mono text-[var(--ink)] transition-colors leading-relaxed resize-none"
                spellCheck={false}
                placeholder="# Brand Persona&#10;&#10;## Voice &amp; Tone&#10;- ..."
              />
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t agency-border flex items-center justify-between shrink-0">
              <p className="text-[10px] font-mono text-[var(--ink-faint)]">
                Changes apply after saving
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-outline !py-2 !px-4"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary !py-2 !px-4"
                  onClick={save}
                  disabled={saving || !draft.trim()}
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const placeholderPersona = `# Brand Persona

## Voice & Tone
- Professional but approachable
- Direct, no fluff
- Industry-appropriate terminology

## Style Guidelines
- Use active voice
- Keep product descriptions under 200 words
- Include key benefits early

## Terminology
- Define product-specific terms here
- Preferred synonyms and terms to avoid

## SEO Notes
- Primary keywords to target
- Meta title/description patterns
- Internal linking preferences
`;
