'use client';

import { useState } from 'react';
import { Cpu, ChevronDown, Zap, Sparkles, Globe, Square } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const V3_MODELS: { name: string; tag: string; icon: LucideIcon }[] = [
  { name: 'GPT-5', tag: 'fast', icon: Zap },
  { name: 'Claude 4', tag: 'deep', icon: Sparkles },
  { name: 'Gemini 3', tag: 'broad', icon: Globe },
];

export function EngConsole({
  placeholder,
  buttonLabel,
  hints = [],
  onRun,
  busy = false,
  onStop,
  showModels = true,
  disabled = false,
}: {
  placeholder: string;
  buttonLabel: string;
  hints?: string[];
  onRun: (text: string, model: string) => void;
  busy?: boolean;
  onStop?: () => void;
  showModels?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [model, setModel] = useState(V3_MODELS[0].name);
  const [menuOpen, setMenuOpen] = useState(false);
  const current = V3_MODELS.find((m) => m.name === model) ?? V3_MODELS[0];

  const run = () => {
    if (!text.trim() || busy || disabled) return;
    onRun(text.trim(), model);
    setText('');
  };

  return (
    <div className="eng">
      <div className="eng-row">
        <span className="eng-prompt">$</span>
        <input
          className="eng-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={disabled}
        />
        {showModels && (
          <div className={`glide${menuOpen ? ' open' : ''}`}>
            <button className="glide-btn" aria-label={`Model: ${model}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <Cpu size={12} /> <span>{model}</span> <ChevronDown size={12} />
            </button>
            <div className="glide-menu glass" role="menu" aria-label="Choose model">
              {V3_MODELS.map((m) => (
                <button key={m.name} role="menuitem" className={m.name === model ? 'sel' : ''} onClick={() => { setModel(m.name); setMenuOpen(false); }}>
                  <m.icon size={12} /> {m.name}
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 'auto' }}>
                    {m.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {busy ? (
          <button className="btn-deploy" onClick={() => onStop?.()} aria-label="Stop the run">
            <Square size={12} /> Stop
          </button>
        ) : (
          <button className="btn-deploy" onClick={run} disabled={disabled || !text.trim()}>
            {buttonLabel} <kbd>⏎</kbd>
          </button>
        )}
      </div>
      {hints.length > 0 && (
        <div className="eng-hints">
          {hints.map((h) => (
            <button key={h} onClick={() => setText((t) => (t ? `${t} ${h}` : h))}>
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
