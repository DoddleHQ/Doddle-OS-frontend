'use client';

import { useState } from 'react';
import { Settings, User } from 'lucide-react';
import { OPERATOR } from '@/lib/demo/data';

export default function DemoSettingsPage() {
  const [name, setName] = useState(OPERATOR.name);
  const [role, setRole] = useState(OPERATOR.role);

  const field = 'w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[5px] px-3 py-2 text-xs font-mono text-[var(--ink)] transition-colors';

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-8 md:px-10 py-5 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="w-6 h-6 md:w-7 md:h-7" /> Platform Settings
          </h1>
          <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-2">Manage persona and global application preferences.</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
        <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r agency-border agency-panel p-4">
          <div className="flex md:flex-col gap-1">
            <button type="button" className="hub-tab active flex items-center gap-3 px-3 py-2 text-xs">
              <User className="w-4 h-4 shrink-0" /> profile
            </button>
          </div>
        </aside>

        <div className="flex-1 md:overflow-y-auto p-8 md:p-10">
          <div className="max-w-2xl slide-in">
            <h3 className="text-lg font-bold mb-6 font-mono">config_profile()</h3>
            <div className="agency-card p-6 !cursor-default flex flex-col sm:flex-row gap-6 items-start">
              <span className="w-20 h-20 rounded-[10px] border border-[var(--hairline-strong)] flex items-center justify-center text-2xl font-bold font-mono shrink-0">
                {name.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?'}
              </span>
              <div className="flex-1 w-full space-y-4">
                <div>
                  <label htmlFor="display-name" className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1.5">Display Name</label>
                  <input id="display-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} />
                </div>
                <div>
                  <label htmlFor="role" className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1.5">Role / Persona</label>
                  <input id="role" type="text" value={role} onChange={(e) => setRole(e.target.value)} className={field} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
