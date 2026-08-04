'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/*
 * AuthInput — standard, accessible, industry-conventional.
 *
 * Per impeccable's Operate guidance: "earned familiarity," "same form-control
 * vocabulary," "don't reinvent standard affordances." So this is a textbook
 * input — the kind a fluent user trusts immediately:
 *
 *   - Label ABOVE the field (always visible, sans, not mono/display)
 *   - Standard box input with a clear 1px border
 *   - Placeholder inside the field
 *   - Focus: 2px vermilion ring with offset (focus-visible for keyboard)
 *   - Error: vermilion text below the field
 *   - Trailing slot for eye-toggle etc
 *
 * No floating labels, no inset glows, no invented affordances.
 */

interface AuthInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  trailing?: ReactNode;
}

export function AuthInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error = null,
  trailing,
}: AuthInputProps) {
  return (
    <div>
      {/* Label — above the field, standard sans */}
      <label
        htmlFor={id}
        className="block text-[13px] font-medium mb-1.5"
        style={{ color: error ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink)' }}
      >
        {label}
      </label>

      {/* Input box */}
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="v2-auth-input w-full px-3.5 py-2.5 text-[15px] outline-none transition-all"
          style={{
            color: 'var(--v2-paper-ink)',
            background: 'rgba(255,255,255,0.5)',
            border: `1px solid ${error ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)'}`,
            borderRadius: '8px',
            paddingRight: trailing ? '40px' : '14px',
          }}
        />

        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>

      {/* Error — below the field */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[12px] mt-1.5"
            style={{ color: 'var(--v2-vermilion)' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
