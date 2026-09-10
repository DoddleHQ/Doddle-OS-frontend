'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { workspaceService } from '@/lib/services/workspaceService';
import { notify } from '@/lib/stores/notificationStore';

/** Styled markdown renderer — CSS-based styling, no custom components needed. */
function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

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
          <Markdown content={content} />
        </div>
      ) : (
        <div className="plate p-8 text-center">
          <Pencil className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-xs text-[var(--ink-faint)]">Click Edit to create your brand persona</p>
          <button type="button" className="btn-outline mt-4 !py-2 !px-4" onClick={openEditor}>
            <Pencil className="w-3 h-3" /> Create Persona
          </button>
        </div>
      )}

      {/* Edit modal — portaled to document.body to escape overflow-clipped parents */}
      {modalOpen && <PersonaModal draft={draft} setDraft={setDraft} saving={saving} save={save} close={() => setModalOpen(false)} />}
    </div>
  );
}

/** Portaled modal — renders at document.body so the backdrop covers the full viewport */
function PersonaModal({ draft, setDraft, saving, save, close }: {
  draft: string;
  setDraft: (v: string) => void;
  saving: boolean;
  save: () => void;
  close: () => void;
}) {
  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="plate w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{ animation: 'modal-enter 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b agency-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold font-mono">Edit Brand Persona</h3>
            <p className="text-[10px] text-[var(--ink-faint)] font-mono mt-0.5">Markdown supported</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="dock-icon w-8 h-8 flex items-center justify-center border border-[var(--hairline)] rounded-[6px]"
            aria-label="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[8px] px-4 py-3 text-xs font-mono text-[var(--ink)] transition-colors leading-relaxed resize-none"
            spellCheck={false}
            placeholder="# Brand Persona..."
            autoFocus
          />
        </div>

        <div className="px-5 py-4 border-t agency-border flex items-center justify-between shrink-0">
          <p className="text-[10px] font-mono text-[var(--ink-faint)]">Changes apply after saving</p>
          <div className="flex gap-2">
            <button type="button" className="btn-outline !py-2 !px-4" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn-primary !py-2 !px-4" onClick={save} disabled={saving || !draft.trim()}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
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
