'use client';

import { useState } from 'react';
import { Building2, CreditCard, Layers, Plug, ShieldAlert, Users } from 'lucide-react';
import { OPERATOR } from '@/lib/demo/data';

const TABS = [
  { group: 'Organization', items: [
    { id: 'users', label: 'users', icon: Users },
    { id: 'billing', label: 'billing', icon: CreditCard },
  ] },
  { group: 'Workspace Settings', items: [
    { id: 'workspaces', label: 'workspaces', icon: Layers },
    { id: 'guardrails', label: 'guardrails', icon: ShieldAlert },
    { id: 'integrations', label: 'integrations', icon: Plug },
  ] },
] as const;

type TabId = (typeof TABS)[number]['items'][number]['id'];

function WorkspacesTab() {
  return (
    <div className="max-w-4xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">agency_workspaces</h3>
        <button type="button" className="btn-outline">new_workspace()</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="agency-card p-5 !cursor-default">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-bold font-mono">Acme SaaS</h4>
            <span className="text-[10px] font-mono" style={{ color: 'var(--line-green)' }}>active</span>
          </div>
          <p className="text-xs text-[var(--ink-dim)]">Enterprise Data &amp; Marketing</p>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  return (
    <div className="max-w-4xl slide-in">
      <h3 className="text-lg font-bold mb-6 font-mono">user_management</h3>
      <div className="plate overflow-hidden">
        <div className="dense-row !cursor-default">
          <span className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-[6px] border border-[var(--hairline)] flex items-center justify-center text-[11px] font-bold font-mono">
              {OPERATOR.name.split(' ')[0][0]}
            </span>
            <span className="text-xs font-bold font-mono">{OPERATOR.name}</span>
          </span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--line-cobalt)' }}>root</span>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-4xl slide-in">
      <h3 className="text-lg font-bold mb-6 font-mono">billing_info</h3>
      <div className="agency-card p-6 !cursor-default max-w-sm relative">
        <span className="absolute top-0 right-0 text-[9px] font-bold font-mono px-2 py-1 text-white rounded-bl-[8px]" style={{ background: 'var(--line-cobalt)' }}>ACTIVE</span>
        <h4 className="text-sm font-bold font-mono" style={{ color: 'var(--line-cobalt)' }}>Agency Pro</h4>
        <div className="my-4">
          <span className="text-2xl font-bold font-mono tnum">$499</span>
          <span className="text-xs font-mono ml-1 text-[var(--ink-dim)]">/mo</span>
        </div>
      </div>
    </div>
  );
}

function GuardrailsTab() {
  return (
    <div className="max-w-3xl slide-in">
      <h3 className="text-lg font-bold mb-6 font-mono">workspace_guardrails</h3>
      <div className="agency-card p-5 !cursor-default">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold font-mono">Circuit Breaker</h4>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-[3px] border" style={{ color: 'var(--line-scarlet)', borderColor: 'color-mix(in srgb, var(--line-scarlet) 40%, transparent)' }}>mandatory</span>
        </div>
        <p className="text-xs text-[var(--ink-dim)]">Freeze swarm state on critical error and push to triage_queue.</p>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="max-w-4xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">workspace_integrations</h3>
        <button type="button" className="btn-outline">add_integration()</button>
      </div>
      <div className="agency-card p-5 !cursor-default max-w-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 rounded-[6px] border border-[var(--hairline-strong)] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.05.78 2.13v3.16c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
          </span>
          <div>
            <h4 className="text-sm font-bold font-mono">GitHub</h4>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--line-green)' }}>status: connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoAgencyHubPage() {
  const [tab, setTab] = useState<TabId>('workspaces');

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-8 md:px-10 py-5 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="w-6 h-6 md:w-7 md:h-7" style={{ color: 'var(--line-cobalt)' }} /> Agency Hub
          </h1>
          <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-2">Manage workspaces, users, billing, integrations, and guardrails.</p>
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
          {tab === 'workspaces' && <WorkspacesTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'billing' && <BillingTab />}
          {tab === 'guardrails' && <GuardrailsTab />}
          {tab === 'integrations' && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}
