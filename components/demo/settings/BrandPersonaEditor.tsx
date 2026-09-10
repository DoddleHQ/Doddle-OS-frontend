'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Save } from 'lucide-react';
import { workspaceService } from '@/lib/services/workspaceService';
import { notify } from '@/lib/stores/notificationStore';

/**
 * Brand persona markdown editor — fetches, edits, and persists the
 * workspace's brand persona via workspaceService.getPersona/upsertPersona.
 * The persona feeds agent prompts (tone, terminology, style guidelines).
 */
export function BrandPersonaEditor({ workspaceId }: { workspaceId: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPersona, setHasPersona] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const persona = await workspaceService.getPersona(workspaceId);
      if (persona && persona.content.trim()) {
        setContent(persona.content);
        setHasPersona(true);
      } else {
        setContent(placeholderPersona);
        setHasPersona(false);
      }
      setDirty(false);
    } catch {
      setContent(placeholderPersona);
      setHasPersona(false);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await workspaceService.upsertPersona(workspaceId, content);
      setHasPersona(true);
      setDirty(false);
      notify('Brand persona saved — agents will use this context', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save persona', 'error');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[5px] px-4 py-3 text-xs font-mono text-[var(--ink)] transition-colors leading-relaxed resize-none';

  if (loading) {
    return (
      <div className="max-w-3xl slide-in">
        <div className="agency-card p-6 !cursor-default">
          <div className="skeleton h-4 rounded mb-3" style={{ width: '30%' }} />
          <div className="skeleton h-32 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold font-mono">Brand Persona</h3>
          <p className="text-xs text-[var(--ink-dim)] mt-1">
            Agents read this before writing — tone, terminology, style guidelines, and guardrails.
          </p>
        </div>
        <span
          className={`service-chip ${hasPersona ? '' : ''}`}
          style={{ ['--chip' as string]: hasPersona ? 'var(--line-green)' : 'var(--line-amber)' }}
        >
          {hasPersona ? 'configured' : 'Not Set'}
        </span>
      </div>

      {/* Status banner */}
      {!hasPersona && (
        <div className="agency-card p-4 mb-4 !cursor-default" style={{ borderColor: 'color-mix(in srgb, var(--line-amber) 30%, transparent)', background: 'color-mix(in srgb, var(--line-amber) 4%, transparent)' }}>
          <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
            <span className="font-bold font-mono" style={{ color: 'var(--line-amber)' }}>warning:</span>{' '}
            No persona configured yet. Agents will use generic copy without your brand&apos;s voice.
            Edit the markdown below and press save.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`hub-tab flex items-center gap-2 px-3 py-1.5 text-[10px] ${mode === 'edit' ? 'active' : ''}`}
          >
            edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`hub-tab flex items-center gap-2 px-3 py-1.5 text-[10px] ${mode === 'preview' ? 'active' : ''}`}
          >
            <FileText className="w-3 h-3" /> preview
          </button>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-[10px] font-mono" style={{ color: 'var(--line-amber)' }}>unsaved</span>}
          <button
            type="button"
            className="btn-primary !py-2 !px-4"
            onClick={save}
            disabled={saving || !content.trim() || !dirty}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {saving ? 'Saving…' : 'Save Persona'}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {mode === 'edit' ? (
        <div className="agency-card p-0 overflow-hidden !cursor-default">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            rows={18}
            className={`${field} !border-none !rounded-none`}
            spellCheck={false}
            placeholder="# Brand Persona&#10;&#10;## Voice & Tone&#10;- ...&#10;&#10;## Terminology&#10;- ..."
          />
        </div>
      ) : (
        <div className="agency-card p-5 !cursor-default">
          <div className="text-xs font-mono text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
            {content || '(empty)'}
          </div>
        </div>
      )}

      {/* Guardrails summary (static, from the reference) */}
      <div className="mt-6">
        <p className="label-rule mb-3">Guardrails</p>
        <div className="agency-card p-5 !cursor-default" style={{ borderColor: 'color-mix(in srgb, var(--line-scarlet) 25%, transparent)' }}>
          <h4 className="text-sm font-bold font-mono mb-2">Circuit Breaker</h4>
          <p className="text-xs text-[var(--ink-dim)]">
            Freeze swarm state on critical error and push to triage_queue.{' '}
            <span style={{ color: 'var(--line-scarlet)' }}>(Mandatory)</span>
          </p>
        </div>
      </div>
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
