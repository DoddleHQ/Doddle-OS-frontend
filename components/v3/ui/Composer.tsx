'use client';

import { useRef, useState } from 'react';
import { Zap, Sparkles, Globe, Layers, Bot, X } from 'lucide-react';
import { Glide } from '@/components/v3/ui/Glide';
import { V3_MODULES } from '@/lib/v3/modules';

export const COMPOSER_MODELS = [
  { value: 'Muse Spark 1.3', label: 'Muse Spark 1.3 Free', icon: Zap, hint: 'default' },
  { value: 'GPT-5', label: 'GPT-5', icon: Zap, hint: 'fast' },
  { value: 'Claude 4', label: 'Claude 4', icon: Sparkles, hint: 'deep' },
  { value: 'Gemini 3', label: 'Gemini 3', icon: Globe, hint: 'broad' },
];

const BLUEPRINT_OPTIONS = V3_MODULES.map((m) => ({ value: m.name, label: m.name }));
const BLUEPRINT_SLUGS = new Map(V3_MODULES.map((m) => [m.name, m.slug] as const));

export const COMPOSER_MODES = [
  { value: 'default', label: 'Default', hint: 'auto' },
  { value: 'research', label: 'Research' },
  { value: 'code', label: 'Code' },
  { value: 'data', label: 'Data' },
  { value: 'writing', label: 'Writing' },
];

export function Composer({
  value,
  onChange,
  onSend,
  placeholder,
  ariaLabel,
  mode,
  onMode,
  blueprint,
  blueprintLabel,
  onBlueprint,
  agentPick,
  agentOptions,
  onAgentPick,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  ariaLabel: string;
  mode: string;
  onMode: (v: string) => void;
  blueprint: string | null;
  blueprintLabel: string;
  onBlueprint: (v: string | null) => void;
  agentPick?: string | null;
  agentOptions?: { value: string; label: string }[];
  onAgentPick?: (v: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);

  return (
    <div className="composer" id="dash-composer">
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
        <Glide value={mode} options={COMPOSER_MODES} onChange={onMode} ariaLabel="Mode" />
        <Glide
          value={blueprintLabel}
          options={BLUEPRINT_OPTIONS}
          icon={Layers}
          ariaLabel="Pick a blueprint"
          onChange={(name) => onBlueprint(BLUEPRINT_SLUGS.get(name) ?? null)}
        />
        {agentOptions && onAgentPick && (
          <Glide
            value={agentPick ?? 'Agent'}
            options={agentOptions}
            icon={Bot}
            ariaLabel="Pick an agent"
            onChange={(name) => onAgentPick(name || null)}
          />
        )}
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
