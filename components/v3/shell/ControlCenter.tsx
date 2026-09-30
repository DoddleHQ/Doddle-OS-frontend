'use client';

import { useState } from 'react';
import { Wifi, Moon } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';

/** Quick settings popover: radios, focus, brightness, verbosity (reference #cc). */
export function ControlCenter() {
  const open = useV3OS((s) => s.ccOpen);
  const theme = useV3OS((s) => s.theme);
  const { toggleTheme, openApp, toggleCC } = useV3OS.getState();
  const [wifi, setWifi] = useState(true);
  const [focus, setFocus] = useState(false);
  const [brightness, setBrightness] = useState(70);
  const [verbosity, setVerbosity] = useState(40);

  if (!open) return null;

  const applyBrightness = (v: number) => {
    setBrightness(v);
    const wp = document.querySelector('.v3-wallpaper') as HTMLElement | null;
    if (wp) wp.style.filter = `brightness(${0.7 + v / 250})`;
  };

  return (
    <div className="v3-cc glass" role="dialog" aria-label="Control Center">
      <div className="flex items-center justify-between mb-3">
        <strong className="text-sm">Control Center</strong>
        <button className="chip" onClick={() => toggleCC(false)}>
          esc
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-xs mb-3">
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ border: '1px solid var(--glass-border)' }}>
          <Wifi size={16} /> Wi-Fi
          <button
            className={`lens-toggle ml-auto${wifi ? ' on' : ''}`}
            aria-label="Toggle Wi-Fi"
            aria-pressed={wifi}
            onClick={() => setWifi((v) => !v)}
          />
        </div>
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ border: '1px solid var(--glass-border)' }}>
          <Moon size={16} /> Focus
          <button
            className={`lens-toggle ml-auto${focus ? ' on' : ''}`}
            aria-label="Toggle Focus"
            aria-pressed={focus}
            onClick={() => setFocus((v) => !v)}
          />
        </div>
      </div>
      <label className="font-mono text-xs mb-1 block" htmlFor="cc-brightness">
        Brightness
      </label>
      <input
        id="cc-brightness"
        type="range"
        className="lens mb-2"
        min={0}
        max={100}
        value={brightness}
        style={{ ['--v' as string]: `${brightness}%` }}
        onChange={(e) => applyBrightness(Number(e.target.value))}
      />
      <label className="font-mono text-xs mb-1 block" htmlFor="cc-verbosity">
        Agent verbosity
      </label>
      <input
        id="cc-verbosity"
        type="range"
        className="lens"
        min={0}
        max={100}
        value={verbosity}
        style={{ ['--v' as string]: `${verbosity}%` }}
        onChange={(e) => {
          setVerbosity(Number(e.target.value));
          e.target.style.setProperty('--v', `${e.target.value}%`);
        }}
      />
      <div className="flex gap-2 mt-3">
        <button className="btn-ghost flex-1" onClick={toggleTheme}>
          toggle theme
        </button>
        <button
          className="btn-ghost flex-1"
          onClick={() => {
            toggleCC(false);
            openApp('hub');
          }}
        >
          settings
        </button>
      </div>
      <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
        appearance: {theme}
      </p>
    </div>
  );
}
