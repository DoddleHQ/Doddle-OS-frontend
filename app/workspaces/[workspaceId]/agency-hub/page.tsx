'use client';
import { useParams } from 'next/navigation';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Building2, Check, CreditCard, Layers, Plug, ShieldAlert, Users, X } from 'lucide-react';

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

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-block w-9 h-5 rounded-[4px] transition-colors shrink-0"
      style={{
        background: checked ? 'var(--line-cobalt)' : 'var(--hairline-strong)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute top-[2px] w-4 h-4 rounded-[2px] bg-white transition-transform"
        style={{ left: '2px', transform: checked ? 'translateX(16px)' : 'none' }}
      />
    </button>
  );
}

function WorkspacesTab() {
  return (
    <div className="max-w-4xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">Workspaces</h3>
        <button type="button" className="btn-outline">New Workspace</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="agency-card p-5 !cursor-default" style={{ borderColor: 'color-mix(in srgb, var(--line-cobalt) 40%, transparent)' }}>
          <div className="flex justify-between items-start mb-2">
            <span className="w-10 h-10 rounded-[6px] flex items-center justify-center text-sm font-bold font-mono" style={{ background: 'var(--net-tunnel)', color: 'var(--ink)' }}>AC</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--line-cobalt)' }}>Active</span>
          </div>
          <h4 className="text-sm font-bold font-mono">Acme SaaS</h4>
          <p className="text-xs text-[var(--ink-dim)] mt-1 mb-3">Enterprise Data &amp; Marketing</p>
          <p className="text-[10px] font-mono text-[var(--ink-faint)] pt-3 border-t agency-border">Isolated Compute Harness (Node-A4)</p>
        </div>
        <div className="agency-card p-5 !cursor-default !bg-transparent">
          <div className="flex justify-between items-start mb-2">
            <span className="w-10 h-10 rounded-[6px] border border-[var(--hairline-strong)] flex items-center justify-center text-sm font-bold font-mono text-[var(--ink-dim)]">DI</span>
          </div>
          <h4 className="text-sm font-bold font-mono">Doddle Internal</h4>
          <p className="text-xs text-[var(--ink-dim)] mt-1 mb-3">Platform Development</p>
          <button type="button" className="btn-outline w-full !py-1.5 !text-[10px]">Switch</button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const { user } = useAuth();
  return (
    <div className="max-w-4xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">User Management</h3>
        <button type="button" className="btn-outline">Invite Member</button>
      </div>
      <div className="plate overflow-hidden">
        <div className="dense-row !cursor-default">
          <span className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-[6px] border border-[var(--hairline)] flex items-center justify-center text-[11px] font-bold font-mono">
              {(user?.name || 'Operator').split(' ')[0][0]}
            </span>
            <span className="flex flex-col">
              <span className="text-xs font-bold font-mono">{(user?.name || 'Operator')}</span>
              <span className="text-[10px] text-[var(--ink-dim)]">{(user?.name || 'Operator')}</span>
            </span>
          </span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--line-cobalt)' }}>root</span>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const plans = [
    { name: 'Individual', price: '$99', period: '/yr', featured: false, features: ['1 User Seat', '1-on-1 Direct Agents', 'No Swarms'] },
    { name: 'Agency Pro', price: '$499', period: '/mo', featured: true, features: ['Dedicated Isolated Harness', '3 Workspaces Included', '5 Human Seats', 'Full Swarms & Blueprints'] },
    { name: 'Enterprise', price: '$999', period: '/mo', featured: false, features: ['Single-Tenant VPC', 'Unlimited Human Seats', 'Custom MCP Deployments', 'SLA & Priority Support'] },
  ];
  return (
    <div className="max-w-4xl slide-in">
      <h3 className="text-lg font-bold mb-2 font-mono">Billing</h3>
      <p className="text-xs text-[var(--ink-dim)] mb-6">Manage your compute tier and API overages.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`agency-card p-6 flex flex-col relative !cursor-default ${plan.featured ? '' : '!bg-transparent'}`}
            style={plan.featured ? { borderColor: 'color-mix(in srgb, var(--line-cobalt) 45%, transparent)' } : undefined}
          >
            {plan.featured && (
              <span className="absolute top-0 right-0 text-[9px] font-bold font-mono px-2 py-1 text-white rounded-bl-[8px]" style={{ background: 'var(--line-cobalt)' }}>CURRENT</span>
            )}
            <h4 className="text-sm font-bold font-mono mb-4" style={{ color: plan.featured ? 'var(--line-cobalt)' : 'var(--ink)' }}>{plan.name}</h4>
            <div className="mb-4">
              <span className="text-2xl font-bold font-mono tnum">{plan.price}</span>
              <span className="text-xs font-mono ml-1 text-[var(--ink-dim)]">{plan.period}</span>
            </div>
            <ul className="text-xs text-[var(--ink-dim)] space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  {f.startsWith('No ') || f.includes('unlimited') ? (
                    <X className="w-3 h-3 text-[var(--ink-faint)] shrink-0" />
                  ) : (
                    <Check className="w-3 h-3 shrink-0" style={{ color: plan.featured ? 'var(--line-cobalt)' : 'var(--line-green)' }} />
                  )}
                  {f}
                </li>
              ))}
            </ul>
            {plan.featured ? (
              <button type="button" className="w-full py-2 rounded-[5px] text-xs font-bold border border-[var(--hairline)] text-[var(--ink-faint)] cursor-not-allowed">Active Plan</button>
            ) : (
              <button type="button" className="btn-outline w-full !py-2">{plan.name === 'Enterprise' ? 'Contact Sales' : 'Downgrade'}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GuardrailsTab() {
  const [tierStates, setTierStates] = useState([true, true, true]);
  const tiers = [
    { name: 'Tier 1: Autonomous Retry', desc: 'Orchestrator feeds error logs back to the agent with a debug prompt. Max 2 attempts before escalation.', ink: 'var(--line-green)', locked: false },
    { name: 'Tier 2: Swarm Reroute', desc: 'Orchestrator reassigns the failed sub-task to a diagnostic specialist.', ink: 'var(--line-amber)', locked: false },
    { name: 'Tier 3: Circuit Breaker & Triage Push', desc: 'Freeze swarm state and push to Human Triage Center.', ink: 'var(--line-scarlet)', locked: true },
  ];
  return (
    <div className="max-w-3xl slide-in">
      <h3 className="text-lg font-bold mb-2 font-mono">Guardrails</h3>
      <p className="text-xs text-[var(--ink-dim)] mb-6">Define how the Orchestrator handles failures before routing to the Triage Center.</p>
      <div className="space-y-4">
        {tiers.map((tier, i) => (
          <div key={tier.name} className="agency-card p-5 !cursor-default" style={{ borderColor: `color-mix(in srgb, ${tier.ink} 30%, transparent)` }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold font-mono">{tier.name}</h4>
              <Toggle
                checked={tierStates[i] ?? true}
                disabled={tier.locked}
                onChange={() => setTierStates((prev) => prev.map((v, j) => (j === i ? !v : v)))}
              />
            </div>
            <p className="text-xs text-[var(--ink-dim)]">
              {tier.desc} {tier.locked && <span style={{ color: 'var(--line-scarlet)' }}>(Mandatory)</span>}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t agency-border">
        <h4 className="text-sm font-bold font-mono mb-3">Global API Spend Limit (Per Swarm Run)</h4>
        <div className="flex items-center gap-4 max-w-md">
          <input type="range" min={1} max={50} defaultValue={10} className="flex-1 accent-[var(--line-cobalt)]" aria-label="Spend limit in dollars" />
          <span className="text-sm font-bold font-mono border border-[var(--hairline)] px-3 py-1 rounded-[5px] tnum">$10.00</span>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: 'GitHub', status: 'connected', detail: 'Write Access', icon: 'github' },
    { name: 'ClickHouse Node', status: 'connected', detail: 'Local instance', icon: 'database' },
  ];
  return (
    <div className="max-w-4xl slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold font-mono">Integrations</h3>
        <button type="button" className="btn-outline">Add Integration</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {integrations.map((int) => (
          <div key={int.name} className="agency-card p-5 flex items-center justify-between !cursor-default">
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 rounded-[6px] border border-[var(--hairline-strong)] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.05.78 2.13v3.16c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
              </span>
              <div>
                <h4 className="text-sm font-bold font-mono">{int.name}</h4>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--line-green)' }}>status: {int.status}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[var(--ink-faint)]">{int.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemoAgencyHubPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { user } = useAuth();

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
        <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r agency-border agency-panel p-3 md:p-4">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible -mx-1 px-1">
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
