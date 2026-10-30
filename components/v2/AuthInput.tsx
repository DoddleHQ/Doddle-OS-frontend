'use client';

import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

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
      <label
        htmlFor={id}
        className="block text-[13px] font-medium mb-1.5"
        style={{ color: error ? 'var(--v2-vermilion)' : 'var(--v2-paper-ink)' }}
      >
        {label}
      </label>

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
