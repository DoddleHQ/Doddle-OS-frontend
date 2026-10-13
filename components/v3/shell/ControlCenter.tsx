'use client';

import { useState } from 'react';
import { Wifi, Moon } from 'lucide-react';
import { useV3OS } from '@/lib/v3/osStore';

/** The v13 control center, exact: Wi-Fi / Focus lens toggles, brightness and
 *  agent-verbosity lens sliders, toggle-theme + settings buttons. */
export function ControlCenter() {
  const open = useV3OS((s) => s.ccOpen);
  const { toggleTheme, toggleCC } = useV3OS.getState();
  const [brightness, setBrightness] = useState(70);
  const [verbosity, setVerbosity] = useState(40);
  const [wifi, setWifi] = useState(true);
  const [focus, setFocus] = useState(false);

  if (!open) return null;

  const applyBrightness = (v: number) => {
    setBrightness(v);
    const wp = document.querySelector('.v3-wallpaper') as HTMLElement | null;
    if (wp) wp.style.filter = `brightness(${0.7 + v / 250})`;
  };

  return (
    <div id="cc" className="glass" role="dialog" aria-label="Control Center">
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
            className={`lens-toggle${wifi ? ' on' : ''} ml-auto`}
            aria-label="Toggle Wi-Fi"
            aria-pressed={wifi}
            onClick={() => setWifi((v) => !v)}
          />
        </div>
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ border: '1px solid var(--glass-border)' }}>
          <Moon size={16} /> Focus
          <button
            className={`lens-toggle${focus ? ' on' : ''} ml-auto`}
            aria-label="Toggle Focus"
            aria-pressed={focus}
            onClick={() => setFocus((v) => !v)}
          />
        </div>
      </div>
      <p className="font-mono text-xs mb-1">Brightness</p>
      <input
        type="range"
        className="lens mb-2"
        aria-label="Brightness"
        defaultValue={70}
        style={{ ['--v' as string]: `${brightness}%` }}
        onInput={(e) => applyBrightness(Number((e.target as HTMLInputElement).value))}
      />
      <p className="font-mono text-xs mb-1">Agent verbosity</p>
      <input
        type="range"
        className="lens"
        aria-label="Agent verbosity"
        defaultValue={40}
        style={{ ['--v' as string]: `${verbosity}%` }}
        onInput={(e) => setVerbosity(Number((e.target as HTMLInputElement).value))}
      />
      <div className="flex gap-2 mt-3">
        <button className="btn-ghost flex-1" onClick={toggleTheme}>toggle theme</button>
        <button className="btn-ghost flex-1" onClick={() => toggleCC(false)}>settings</button>
      </div>
    </div>
  );
}
