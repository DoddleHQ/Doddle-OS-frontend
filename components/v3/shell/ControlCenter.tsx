'use client';

import { useState } from 'react';
import { useV3OS, type Backdrop } from '@/lib/v3/osStore';

const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: 'aurora', label: 'Aurora' },
  { id: 'lattice', label: 'Lattice' },
  { id: 'halo', label: 'Halo' },
  { id: 'calm', label: 'Calm' },
];

/** The v13 control center, exact: Dark glass toggle, brightness lens
 *  slider, and the backdrop picker grid. */
export function ControlCenter() {
  const open = useV3OS((s) => s.ccOpen);
  const theme = useV3OS((s) => s.theme);
  const backdrop = useV3OS((s) => s.backdrop);
  const { toggleTheme, setBackdrop, toggleCC } = useV3OS.getState();
  const [brightness, setBrightness] = useState(70);

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
      <div className="flex items-center justify-between">
        <span>Dark glass</span>
        <button
          className={`lens-toggle${theme === 'dark' ? ' on' : ''}`}
          aria-label="Toggle dark glass"
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <p className="mb-1">Display brightness (lens slider)</p>
        <input
          type="range"
          className="lens"
          aria-label="Display brightness"
          min={0}
          max={100}
          value={brightness}
          style={{ ['--v' as string]: `${brightness}%` }}
          onChange={(e) => applyBrightness(Number(e.target.value))}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <p className="mb-1">Backdrop · Forge backgrounds</p>
        <div className="grid grid-cols-4 gap-2" id="bg-picks">
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              className={`bg-pick${backdrop === b.id ? ' sel' : ''}`}
              onClick={() => setBackdrop(b.id)}
              aria-pressed={backdrop === b.id}
            >
              <span className={`bg-thumb ${b.id}`} />
              <span className="font-mono" style={{ fontSize: 9 }}>
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
