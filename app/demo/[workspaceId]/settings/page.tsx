import { useParams } from 'next/navigation';
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Activity, CreditCard, Plug, Settings, ShieldAlert, User } from 'lucide-react';
import { useOS } from '@/lib/demo/osStore';

const TABS = [
  { group: 'Personal', items: [{ id: 'profile', label: 'profile', icon: User }] },
  { group: 'Organization', items: [
    { id: 'billing', label: 'billing', icon: CreditCard },
    { id: 'guardrails', label: 'guardrails', icon: ShieldAlert },
    { id: 'analytics', label: 'analytics', icon: Activity },
  ] },
  { group: 'System & Core', items: [{ id: 'integrations', label: 'integrations', icon: Plug }] },
] as const;

type TabId = (typeof TABS)[number]['items'][number]['id'];

export default function DemoSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { user } = useAuth();

  const [tab, setTab] = useState<TabId>('profile');
  const [name, setName] = useState((user?.name || 'Operator'));
  const [role, setRole] = useState((user?.name || 'Operator'));
  const [expertise, setExpertise] = useState('Enterprise Architecture, ClickHouse optimization, Multi-tenant DB design.');
  const pushToast = useOS((s) => s.pushToast);

  const field = 'w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[5px] px-3 py-2 text-xs font-mono text-[var(--ink)] transition-colors';

  const updatePersona = () => {
    pushToast('Persona updated — agents will defer to the new context', 'success');
  };

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
          <div className="flex md:flex-col gap-1 overflow-x-auto">
            {TABS.map((group) => (
              <div key={group.group} className="flex md:flex-col gap-1 md:mt-5 first:md:mt-1">
                <p className="hidden md:block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)] font-mono mb-1.5 px-3">{group.group}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`hub-tab flex items-center gap-3 px-3 py-2 text-xs whitespace-nowrap ${tab === item.id ? 'active' : ''}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 md:overflow-y-auto p-8 md:p-10">
          {tab === 'profile' && (
            <div className="max-w-2xl slide-in">
              <h3 className="text-lg font-bold mb-6 font-mono">config_profile()</h3>
              <div className="agency-card p-6 mb-6 flex flex-col sm:flex-row gap-6 items-start !cursor-default">
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
              <div className="agency-card p-6 !cursor-default">
                <label htmlFor="expertise" className="block text-[10px] font-bold text-[var(--ink-dim)] uppercase tracking-wider mb-2 font-mono">Contextual Expertise <span className="normal-case font-normal">(agents defer to you here)</span></label>
                <textarea
                  id="expertise"
                  rows={3}
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className={`${field} resize-none`}
                />
                <div className="mt-4 flex justify-end">
                  <button type="button" className="btn-primary !py-2 !px-4" onClick={updatePersona}>Update Persona</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div className="max-w-4xl slide-in">
              <h3 className="text-lg font-bold mb-2 font-mono">billing_info</h3>
              <p className="text-xs text-[var(--ink-dim)] mb-6">Managed in the Agency Hub.</p>
              <div className="agency-card p-6 !cursor-default max-w-sm relative">
                <span className="absolute top-0 right-0 text-[9px] font-bold font-mono px-2 py-1 text-white rounded-bl-[8px]" style={{ background: 'var(--line-cobalt)' }}>ACTIVE</span>
                <h4 className="text-sm font-bold font-mono" style={{ color: 'var(--line-cobalt)' }}>Agency Pro</h4>
                <div className="my-4">
                  <span className="text-2xl font-bold font-mono tnum">$499</span>
                  <span className="text-xs font-mono ml-1 text-[var(--ink-dim)]">/mo</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'guardrails' && (
            <div className="max-w-3xl slide-in">
              <h3 className="text-lg font-bold mb-6 font-mono">agentic_guardrails</h3>
              <div className="agency-card p-5 !cursor-default" style={{ borderColor: 'color-mix(in srgb, var(--line-scarlet) 30%, transparent)' }}>
                <h4 className="text-sm font-bold font-mono mb-2">Circuit Breaker</h4>
                <p className="text-xs text-[var(--ink-dim)]">Freeze swarm state on critical error and push to triage_queue. <span style={{ color: 'var(--line-scarlet)' }}>(Mandatory)</span></p>
              </div>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="max-w-4xl slide-in">
              <h3 className="text-lg font-bold mb-6 font-mono">swarm_analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="agency-card p-5 !cursor-default">
                  <p className="label-rule mb-2">total_tasks_executed</p>
                  <p className="text-2xl font-bold tnum" style={{ color: 'var(--line-cobalt)' }}>1,248</p>
                  <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--line-green)' }}>↑ 12% this week</p>
                </div>
                <div className="agency-card p-5 !cursor-default">
                  <p className="label-rule mb-2">hitl_intervention_rate</p>
                  <p className="text-2xl font-bold tnum" style={{ color: 'var(--line-amber)' }}>8.4%</p>
                  <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--line-green)' }}>↓ 2.1% (agents improving)</p>
                </div>
                <div className="agency-card p-5 !cursor-default">
                  <p className="label-rule mb-2">compute_tokens_mtd</p>
                  <p className="text-2xl font-bold tnum">4.2M</p>
                  <p className="text-[10px] font-normal mt-1 text-[var(--ink-faint)]">Estimated overage: $0.00</p>
                </div>
              </div>
              <div className="agency-card p-8 h-48 flex items-center justify-center border-dashed !cursor-default !bg-transparent" style={{ borderColor: 'var(--hairline-strong)' }}>
                <p className="text-[var(--ink-faint)] text-sm flex items-center gap-2 font-mono">
                  <Activity className="w-5 h-5" /> velocity_chart_visualization()
                </p>
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="max-w-4xl slide-in">
              <h3 className="text-lg font-bold mb-6 font-mono">integrations_mcp</h3>
              <div className="agency-card p-5 flex items-center justify-between max-w-md !cursor-default">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-[6px] border border-[var(--hairline-strong)] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.05.78 2.13v3.16c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
                  </span>
                  <div>
                    <h4 className="text-sm font-bold font-mono">GitHub</h4>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--line-green)' }}>status: connected</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
