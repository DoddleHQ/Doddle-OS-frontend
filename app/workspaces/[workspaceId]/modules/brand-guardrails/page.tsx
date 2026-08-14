'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Save, Loader2, FileText, AlertCircle } from 'lucide-react';
import { workspaceService } from '@/lib/services/workspaceService';
import { V2Markdown } from '@/components/v2/onboarding/V2Markdown';
import { notify } from '@/lib/stores/notificationStore';

/*
 * Brand Guardrails — brand persona editor.
 *
 * Fetches the workspace's brand persona (GET /workspaces/{id}/persona) and
 * shows it in an editable markdown editor. User edits → Save (PUT) → stored.
 *
 * Operate mode: single sans (Hanken Grotesk), accent reserved for actions,
 * functional 150-250ms motion, complete loading/error/empty states.
 * The editor is a simple textarea (edit mode) / markdown preview (read mode)
 * toggle — no heavy WYSIWYG dependency.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type ViewState = 'loading' | 'editing' | 'error' | 'empty';

export default function BrandGuardrailsPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    const [persona, setPersona] = useState('');
    const [original, setOriginal] = useState('');
    const [view, setView] = useState<ViewState>('loading');
    const [showPreview, setShowPreview] = useState(true);
    const [saving, setSaving] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    const fetchPersona = useCallback(async () => {
        try {
            setView('loading');
            const result = await workspaceService.getPersona(workspaceId);
            if (result && result.content && result.content.trim()) {
                setPersona(result.content);
                setOriginal(result.content);
                setView('editing');
            } else {
                setPersona('');
                setOriginal('');
                setView('empty');
            }
        } catch {
            setView('error');
        }
    }, [workspaceId]);

    useEffect(() => {
        setShowPreview(true); // Always start in preview mode
        fetchPersona();
    }, [fetchPersona]);

    const handleSave = async () => {
        if (saving || persona === original) return;
        try {
            setSaving(true);
            await workspaceService.upsertPersona(workspaceId, persona);
            setOriginal(persona);
            setUpdatedAt(new Date().toISOString());
            notify('Brand persona saved', 'success');
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = persona !== original;

    // === Loading state ===
    if (view === 'loading') {
        return (
            <div className="p-5 md:p-6 max-w-[720px] mx-auto">
                <div className="h-7 rounded mb-4" style={{ width: '40%', background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
                <div className="rounded-[10px] mb-4" style={{ height: '300px', background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
            </div>
        );
    }

    // === Error state ===
    if (view === 'error') {
        return (
            <div className="p-5 md:p-6 max-w-[720px] mx-auto">
                <div className="flex flex-col items-center py-16 text-center">
                    <AlertCircle className="w-8 h-8 mb-3" style={{ color: 'var(--v2-vermilion)' }} />
                    <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.9rem', fontWeight: 500, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                        Failed to load brand persona
                    </p>
                    <button
                        onClick={fetchPersona}
                        className="mt-3 px-4 py-2 rounded-[8px] v2-label text-[10px]"
                        style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 md:p-6 max-w-[720px] mx-auto">
            {/* Page heading */}
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="flex items-center justify-between mb-5"
            >
                <div>
                    <h1
                        style={{
                            fontFamily: 'var(--v2-font-sans)',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            color: 'var(--v2-paper-ink)',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Brand Guardrails
                    </h1>
                    <p className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink-2)', marginTop: '0.125rem' }}>
                        {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Define your brand voice, tone, and guidelines'}
                    </p>
                </div>
                {/* Preview / Edit toggle */}
                <div className="flex items-center gap-1">
                    <ToggleButton active={showPreview} onClick={() => setShowPreview(true)} label="Preview" />
                    <ToggleButton active={!showPreview} onClick={() => setShowPreview(false)} label="Edit" />
                </div>
            </motion.div>

            {/* Empty state — no persona yet */}
            {view === 'empty' && (
                <div
                    className="rounded-[10px] p-6 mb-4 text-center"
                    style={{ border: '1px dashed var(--v2-paper-rule)', background: 'rgba(255,255,255,0.3)' }}
                >
                    <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--v2-paper-ink-2)' }} strokeWidth={1.5} />
                    <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', color: 'var(--v2-paper-ink)', fontWeight: 500, marginBottom: '0.25rem' }}>
                        No brand persona yet
                    </p>
                    <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.75rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1rem' }}>
                        Start writing below or generate one from the Brand Persona setup.
                    </p>
                    <button
                        onClick={() => setView('editing')}
                        className="px-4 py-2 rounded-[8px] v2-label text-[10px]"
                        style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                    >
                        Start writing
                    </button>
                </div>
            )}

            {/* Editor / Preview */}
            {(view === 'editing' || view === 'empty') && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                >
                    {showPreview ? (
                        /* Preview mode — render markdown */
                        <div
                            className="rounded-[10px] p-5 min-h-[300px]"
                            style={{
                                background: 'rgba(255,255,255,0.4)',
                                border: '1px solid var(--v2-paper-rule)',
                            }}
                        >
                            {persona.trim() ? (
                                <V2Markdown content={persona} />
                            ) : (
                                <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)' }}>
                                    Nothing to preview yet.
                                </p>
                            )}
                        </div>
                    ) : (
                        /* Edit mode — textarea */
                        <textarea
                            value={persona}
                            onChange={(e) => setPersona(e.target.value)}
                            placeholder="# Brand Persona&#10;&#10;Describe your brand voice, target audience, tone guidelines, and core values here...&#10;&#10;## Voice&#10;Professional yet approachable...&#10;&#10;## Tone&#10;Confident, clear, and concise...&#10;&#10;## Target Audience&#10;Marketing teams and agency operators..."
                            className="w-full rounded-[10px] p-4 outline-none resize-none transition-colors"
                            style={{
                                minHeight: '400px',
                                fontFamily: 'var(--v2-font-mono)',
                                fontSize: '0.78rem',
                                lineHeight: 1.6,
                                color: 'var(--v2-paper-ink)',
                                background: 'rgba(255,255,255,0.4)',
                                border: '1px solid var(--v2-paper-rule)',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--v2-vermilion)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--v2-paper-rule)'; }}
                        />
                    )}
                </motion.div>
            )}

            {/* Action bar */}
            {(view === 'editing' || view === 'empty') && !showPreview && (
                <div className="flex items-center justify-between mt-4">
                    <p className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
                        Markdown supported
                    </p>
                    <motion.button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        whileTap={{ scale: hasChanges && !saving ? 0.97 : 1 }}
                        transition={{ duration: 0.1 }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 v2-label text-[11px] rounded-[8px] transition-opacity"
                        style={{
                            background: hasChanges ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
                            color: hasChanges ? 'var(--v2-vermilion-ink)' : 'var(--v2-paper-ink-2)',
                            opacity: saving ? 0.6 : 1,
                        }}
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? 'Saving…' : 'Save persona'}
                    </motion.button>
                </div>
            )}

            {/* Unsaved changes indicator */}
            {hasChanges && !showPreview && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="v2-mono mt-2"
                    style={{ fontSize: '0.62rem', color: 'var(--v2-vermilion)', textAlign: 'right' }}
                >
                    ● Unsaved changes
                </motion.p>
            )}
        </div>
    );
}

/* === Toggle button (Edit / Preview) === */
function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className="px-3 py-1 rounded-[6px] transition-colors"
            style={{
                fontFamily: 'var(--v2-font-sans)',
                fontSize: '0.72rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--v2-paper-ink)' : 'var(--v2-paper-ink-2)',
                background: active ? 'rgba(200,50,27,0.06)' : 'transparent',
            }}
        >
            {label}
        </button>
    );
}
