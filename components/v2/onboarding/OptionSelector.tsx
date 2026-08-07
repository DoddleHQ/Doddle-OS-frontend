'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

/*
 * OptionSelector — pickable card spread for structured onboarding questions.
 *
 * Cards fan out on the desk with stagger (80ms between cards, Motion Design
 * multi-element pattern). Clicking a card lifts it (scale 1.05, shadow deepen,
 * 200ms ease-out — Premium archetype), locks it in (vermilion border). Unselected
 * cards fade to 40% opacity (staging principle — hero gets focus).
 *
 * Supports single-select and multi-select modes.
 */

const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

export interface Option {
  id: string;
  label: string;
  desc?: string;
}

interface OptionSelectorProps {
  options: Option[];
  multi?: boolean;
  maxSelections?: number;
  onConfirm: (selected: string[]) => void;
  confirmLabel?: string;
}

export function OptionSelector({
  options,
  multi = false,
  maxSelections,
  onConfirm,
  confirmLabel = 'Confirm',
}: OptionSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);

  const toggle = (id: string) => {
    if (locked) return;
    if (multi) {
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id);
        if (maxSelections && prev.length >= maxSelections) return prev;
        return [...prev, id];
      });
    } else {
      setSelected([id]);
      // Auto-confirm for single-select after a brief settle
      setTimeout(() => {
        setLocked(true);
        setTimeout(() => onConfirm([id]), 200);
      }, 300);
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    setLocked(true);
    setTimeout(() => onConfirm(selected), 200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full mb-4"
    >
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {options.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          const allLocked = locked && !isSelected;
          return (
            <motion.button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              disabled={locked}
              initial={{ opacity: 0, y: 16, rotate: i % 2 === 0 ? -1 : 1 }}
              animate={{
                opacity: allLocked ? 0.35 : 1,
                y: 0,
                rotate: 0,
                scale: isSelected ? 1.02 : 1,
              }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: PREMIUM_EASE }}
              whileHover={!locked ? { scale: 1.03, y: -2 } : {}}
              whileTap={!locked ? { scale: 0.98 } : {}}
              className="text-left p-3.5 rounded-[10px] transition-all relative overflow-hidden"
              style={{
                background: isSelected ? 'rgba(200,50,27,0.06)' : 'rgba(255,255,255,0.35)',
                border: isSelected ? '1px solid var(--v2-vermilion)' : '1px solid var(--v2-paper-rule)',
                cursor: locked ? 'default' : 'pointer',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--v2-paper-ink)' }}>
                    {opt.label}
                  </h4>
                  {opt.desc && (
                    <p className="v2-mono text-[10.5px] leading-tight" style={{ color: 'var(--v2-paper-ink-2)' }}>
                      {opt.desc}
                    </p>
                  )}
                </div>
                {/* Selection indicator */}
                <motion.div
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  animate={{
                    background: isSelected ? 'var(--v2-vermilion)' : 'transparent',
                    borderColor: isSelected ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
                    scale: isSelected ? [0.8, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 0.3, ease: PREMIUM_EASE }}
                  style={{ border: '1.5px solid var(--v2-paper-rule-strong)' }}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <Check className="w-3 h-3" style={{ color: 'var(--v2-vermilion-ink)' }} strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Confirm button for multi-select */}
      {multi && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selected.length > 0 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 flex justify-end"
        >
          <button
            onClick={handleConfirm}
            disabled={selected.length === 0 || locked}
            className="px-5 py-2.5 v2-label text-[11px] rounded-[8px] transition-all"
            style={{
              background: selected.length > 0 ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
              color: 'var(--v2-vermilion-ink)',
              opacity: selected.length === 0 || locked ? 0.5 : 1,
              cursor: selected.length === 0 || locked ? 'default' : 'pointer',
              boxShadow: selected.length > 0 ? '0 4px 14px rgba(200,50,27,0.2)' : 'none',
            }}
          >
            {confirmLabel} {selected.length > 0 && `(${selected.length})`}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
