'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface GlideOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

/**
 * The v13 glide menu: a compact mono dropdown that opens upward (composer
 * context). Presentational — the selection semantics belong to the caller.
 */
export function Glide({
  value,
  options,
  onChange,
  icon: Icon,
  ariaLabel,
}: {
  value: string;
  options: GlideOption[];
  onChange: (v: string) => void;
  icon?: LucideIcon;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`glide${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="glide-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {Icon && <Icon size={12} />}
        <span>{current?.label ?? value}</span>
        <ChevronDown size={12} />
      </button>
      <div className="glide-menu glass" role="listbox" aria-label={ariaLabel}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            className={o.value === value ? 'sel' : ''}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.icon && <o.icon size={12} />} {o.label}
            {o.hint && (
              <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 'auto' }}>
                {o.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
