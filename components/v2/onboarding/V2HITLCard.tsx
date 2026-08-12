'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { HITLRequestPayload } from '@/lib/types/graph-events.types';
import { PREMIUM_EASE } from '@/components/v2/motion';

/*
 * V2HITLCard — Specimen Terminal replacement for HITLMessageCard.
 *
 * Handles all HITL types the brand_persona_generator graph emits:
 *   - confirmation → yes/no buttons
 *   - selection → radio-style pickable cards
 *   - multi_selection → checkbox cards
 *   - feedback / topic_input / data_input → textarea
 *   - content_review → approve/revise
 *
 * v2 design: paper-register cards with vermilion accents, no left-accent
 * stripes (impeccable ban), hairline borders, Hanken Grotesk labels.
 * Same response formats as v1 (confirmed, value, feedback) so the hook
 * doesn't need changes.
 */

interface V2HITLCardProps {
  request: HITLRequestPayload;
  onRespond: (response: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function V2HITLCard({ request, onRespond, disabled = false }: V2HITLCardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [textValue, setTextValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isDisabled = disabled || submitted;

  const type = request.requestType || request.inputType || 'selection';
  const message = request.message || request.prompt || '';
  const options = request.options || [];

  // --- Handlers (same response shapes as v1) ---
  const handleConfirm = (confirmed: boolean) => {
    setSubmitted(true);
    onRespond({ confirmed });
  };

  const handleSelection = (isMulti: boolean) => {
    setSubmitted(true);
    // Send both 'value' and 'selected' keys — different backend graphs check
    // different keys (content_architect niche selection checks 'selected',
    // other graphs use extract_user_response which checks 'value').
    if (isMulti) {
      onRespond({ value: selected, selected });
    } else {
      onRespond({ value: selected[0], selected: selected[0] });
    }
  };

  const handleText = () => {
    setSubmitted(true);
    onRespond({ feedback: textValue });
  };

  // Strip markdown from message for cleaner display
  const cleanMessage = message.replace(/^#+\s*/gm, '').replace(/\*\*/g, '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: PREMIUM_EASE }}
      className="mb-4"
    >
      <div
        className="p-4 rounded-[10px]"
        style={{
          background: 'rgba(255,255,255,0.4)',
          border: '1px solid var(--v2-paper-rule)',
        }}
      >
        {/* Label */}
        <div className="v2-label text-[8px] mb-2" style={{ color: 'var(--v2-vermilion)' }}>
          {type.replace(/_/g, ' ')}
        </div>

        {/* Message */}
        <p className="text-[14px] leading-[1.55] mb-4" style={{ color: 'var(--v2-paper-ink)' }}>
          {cleanMessage}
        </p>

        {/* === CONFIRMATION === */}
        {type === 'confirmation' && (
          <div className="flex gap-2">
            <V2Button onClick={() => handleConfirm(true)} disabled={isDisabled} variant="primary">Yes</V2Button>
            <V2Button onClick={() => handleConfirm(false)} disabled={isDisabled} variant="outline">No</V2Button>
          </div>
        )}

        {/* === SELECTION (single) === */}
        {type === 'selection' && options.length > 0 && (
          <div className="space-y-1.5">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <V2OptionCard
                  key={opt.id}
                  label={opt.label}
                  desc={opt.description}
                  selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSelected([opt.id])}
                />
              );
            })}
            <V2Button onClick={() => handleSelection(false)} disabled={isDisabled || selected.length === 0} variant="primary" className="mt-2">
              Confirm
            </V2Button>
          </div>
        )}

        {/* === MULTI_SELECTION === */}
        {type === 'multi_selection' && options.length > 0 && (
          <div className="space-y-1.5">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <V2OptionCard
                  key={opt.id}
                  label={opt.label}
                  desc={opt.description}
                  selected={isSelected}
                  disabled={isDisabled}
                  multi
                  onClick={() => {
                    if (isDisabled) return;
                    setSelected((prev) => prev.includes(opt.id) ? prev.filter(s => s !== opt.id) : [...prev, opt.id]);
                  }}
                />
              );
            })}
            <V2Button onClick={() => handleSelection(true)} disabled={isDisabled || selected.length === 0} variant="primary" className="mt-2">
              {selected.length > 0 ? `Confirm (${selected.length})` : 'Select options'}
            </V2Button>
          </div>
        )}

        {/* === URL_SELECTION (multi) === */}
        {type === 'url_selection' && options.length > 0 && (
          <div className="space-y-1.5">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <V2OptionCard
                  key={opt.id}
                  label={opt.label}
                  desc={opt.value ? String(opt.value) : undefined}
                  selected={isSelected}
                  disabled={isDisabled}
                  multi
                  onClick={() => {
                    if (isDisabled) return;
                    setSelected((prev) => prev.includes(opt.id) ? prev.filter(s => s !== opt.id) : [...prev, opt.id]);
                  }}
                />
              );
            })}
            <V2Button onClick={() => handleSelection(true)} disabled={isDisabled || selected.length === 0} variant="primary" className="mt-2">
              {selected.length > 0 ? `Confirm (${selected.length})` : 'Select URLs'}
            </V2Button>
          </div>
        )}

        {/* === FEEDBACK / TOPIC_INPUT / DATA_INPUT === */}
        {(type === 'feedback' || type === 'topic_input' || type === 'data_input') && (
          <div>
            {/* Structured fields for data_input */}
            {type === 'data_input' && Array.isArray(request.data?.fields) ? (
              <div className="space-y-3">
                {(request.data!.fields as Array<{ key: string; label: string; type?: string; placeholder?: string }>).map((field) => (
                  <StructuredField
                    key={field.key}
                    fieldKey={field.key}
                    label={field.label}
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    onFieldChange={(k, v) => setTextValue(prev => JSON.stringify({ ...JSON.parse(prev || '{}'), [k]: v }))}
                    disabled={isDisabled}
                  />
                ))}
                <V2Button onClick={() => { setSubmitted(true); onRespond(JSON.parse(textValue || '{}')); }} disabled={isDisabled} variant="primary">
                  Submit
                </V2Button>
              </div>
            ) : (
              /* Free-text textarea */
              <div>
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  disabled={isDisabled}
                  placeholder="Type your response..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-[14px] outline-none rounded-[8px] resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.4)',
                    border: '1px solid var(--v2-paper-rule-strong)',
                    color: 'var(--v2-paper-ink)',
                  }}
                />
                <V2Button onClick={handleText} disabled={isDisabled || !textValue.trim()} variant="primary" className="mt-2">
                  Send
                </V2Button>
              </div>
            )}
          </div>
        )}

        {/* === CONTENT_REVIEW === */}
        {type === 'content_review' && (
          <div className="flex gap-2">
            <V2Button onClick={() => handleConfirm(true)} disabled={isDisabled} variant="primary">
              <Check className="w-4 h-4 mr-1" /> Approve
            </V2Button>
            <V2Button onClick={() => { setSelected(['revise']); setTextValue(''); }} disabled={isDisabled} variant="outline">
              Revise
            </V2Button>
            {selected.includes('revise') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full mt-2"
              >
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  disabled={isDisabled}
                  placeholder="What needs to change?"
                  rows={2}
                  className="w-full px-3 py-2 text-[14px] outline-none rounded-[8px] resize-none"
                  style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}
                />
                <V2Button onClick={handleText} disabled={isDisabled || !textValue.trim()} variant="primary" className="mt-2">
                  Send feedback
                </V2Button>
              </motion.div>
            )}
          </div>
        )}

        {/* Submitted indicator */}
        {submitted && (
          <div className="mt-3 v2-mono text-[11px]" style={{ color: 'var(--v2-sage)' }}>
            ✓ Response sent
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- v2 UI primitives ---

function V2Button({ children, onClick, disabled, variant = 'primary', className = '' }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      className={`inline-flex items-center px-4 py-2 v2-label text-[10px] rounded-[8px] transition-colors ${className}`}
      style={{
        background: variant === 'primary' ? 'var(--v2-vermilion)' : 'transparent',
        color: variant === 'primary' ? 'var(--v2-vermilion-ink)' : 'var(--v2-paper-ink)',
        border: variant === 'primary' ? 'none' : '1px solid var(--v2-paper-rule-strong)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </motion.button>
  );
}

function V2OptionCard({ label, desc, selected, disabled, multi, onClick }: {
  label: string;
  desc?: string;
  selected: boolean;
  disabled?: boolean;
  multi?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left px-3 py-2.5 rounded-[8px] transition-all flex items-center justify-between gap-3"
      style={{
        background: selected ? 'rgba(200,50,27,0.06)' : 'rgba(255,255,255,0.3)',
        border: selected ? '1px solid var(--v2-vermilion)' : '1px solid var(--v2-paper-rule)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium block" style={{ color: 'var(--v2-paper-ink)' }}>{label}</span>
        {desc && typeof desc === 'string' && (
          <span className="v2-mono text-[10px] block mt-0.5" style={{ color: 'var(--v2-paper-ink-2)' }}>{desc}</span>
        )}
      </div>
      <motion.div
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
        animate={{
          background: selected ? 'var(--v2-vermilion)' : 'transparent',
          borderColor: selected ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
          scale: selected ? [0.8, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.25, ease: PREMIUM_EASE }}
        style={{ border: '1.5px solid var(--v2-paper-rule-strong)' }}
      >
        {selected && <Check className="w-3 h-3" style={{ color: 'var(--v2-vermilion-ink)' }} strokeWidth={3} />}
      </motion.div>
    </motion.button>
  );
}

function StructuredField({ fieldKey, label, type, placeholder, onFieldChange, disabled }: {
  fieldKey: string;
  label: string;
  type: string;
  placeholder?: string;
  onFieldChange: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--v2-paper-ink)' }}>{label}</label>
      <input
        type={type === 'password' ? 'password' : 'text'}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onFieldChange(fieldKey, e.target.value)}
        className="w-full px-3 py-2 text-[14px] outline-none rounded-[8px]"
        style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid var(--v2-paper-rule-strong)', color: 'var(--v2-paper-ink)' }}
      />
    </div>
  );
}
