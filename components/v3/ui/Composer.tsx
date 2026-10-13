'use client';

import { useRef, useState } from 'react';
import { Cpu, Zap, Sparkles, Globe, X } from 'lucide-react';
import { Glide } from '@/components/v3/ui/Glide';

/** v13 model roster (design-ready — the chat API does not take these yet). */
export const COMPOSER_MODELS = [
  { value: 'Muse Spark 1.3', label: 'Muse Spark 1.3 Free', icon: Zap, hint: 'default' },
  { value: 'GPT-5', label: 'GPT-5', icon: Zap, hint: 'fast' },
  { value: 'Claude 4', label: 'Claude 4', icon: Sparkles, hint: 'deep' },
  { value: 'Gemini 3', label: 'Gemini 3', icon: Globe, hint: 'broad' },
];

/** v13 mode roster (Default auto-routes; the rest pre-steer the intent). */
export const COMPOSER_MODES = [
  { value: 'default', label: 'Default', hint: 'auto' },
  { value: 'research', label: 'Research' },
  { value: 'code', label: 'Code' },
  { value: 'data', label: 'Data' },
  { value: 'writing', label: 'Writing' },
];

/**
 * The v13 hero composer: glass textarea with an action bar — attach,
 * model glide, mode glide, and the >_ run button. Attachments and
 * model/mode picks are design-forward state (persisted locally); the
 * send action and @mention routing are real.
 */
export function Composer({
  value,
  onChange,
  onSend,
  placeholder,
  ariaLabel,
  model,
  onModel,
  mode,
  onMode,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  ariaLabel: string;
  model: string;
  onModel: (v: string) => void;
  mode: string;
  onMode: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);

  return (
    <div className="composer">
      <textarea
        className="composer-input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend();
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {files.length > 0 && (
        <div className="composer-files" role="list" aria-label="Attachments">
          {files.map((f) => (
            <span key={f} className="chip" role="listitem" title="attachments are demo-only until the API accepts them">
              {f}
              <button
                type="button"
                aria-label={`Remove ${f}`}
                onClick={() => setFiles((fs) => fs.filter((x) => x !== f))}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'inline-flex' }}
              >
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="composer-bar">
        <button type="button" className="composer-icon" title="Attach files" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
          +
        </button>
        <Glide value={model} options={COMPOSER_MODELS} onChange={onModel} icon={Cpu} ariaLabel="Model" />
        <Glide value={mode} options={COMPOSER_MODES} onChange={onMode} ariaLabel="Mode" />
        <button type="button" className="btn-deploy" style={{ marginLeft: 'auto' }} onClick={onSend} title="Start (⌘⏎)">
          &gt;_
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const names = Array.from(e.target.files ?? []).map((f) => f.name);
          if (names.length) setFiles((fs) => [...fs, ...names.filter((n) => !fs.includes(n))]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
