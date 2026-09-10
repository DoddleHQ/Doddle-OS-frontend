'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Database, Globe, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { connectionService } from '@/lib/services/connectionService';
import { notify } from '@/lib/stores/notificationStore';
import { FREQUENCY_OPTIONS, cronToFrequency } from '@/lib/utils/cron';
import type {
  DataSourceConnection,
  DataSourceType,
  SyncState,
} from '@/lib/types/connection.types';
import type { SyncFrequency as CronSyncFrequency } from '@/lib/utils/cron';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceConfig {
  type: DataSourceType;
  label: string;
  group: string;
  icon: React.ReactNode;
  fields: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; secret?: boolean }[];
}

const SOURCES: SourceConfig[] = [
  {
    type: 'magento',
    label: 'Magento',
    group: 'E-commerce',
    icon: <Database className="w-4 h-4" />,
    fields: [
      { name: 'baseUrl', label: 'Base URL', placeholder: 'https://your-store.com', required: true },
      { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: '••••••••', required: true, secret: true },
    ],
  },
  {
    type: 'gsc',
    label: 'Google Search Console',
    group: 'Google',
    icon: <Globe className="w-4 h-4" />,
    fields: [
      { name: 'siteUrl', label: 'Site URL', placeholder: 'https://your-site.com', required: true },
      { name: 'clientId', label: 'Client ID', placeholder: '••••.apps.googleusercontent.com', required: true },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••', required: true, secret: true },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: '••••••••', required: true, secret: true },
    ],
  },
];

const field = 'w-full bg-transparent border border-[var(--hairline)] focus:border-[var(--hairline-strong)] outline-none rounded-[5px] px-3 py-2 text-xs font-mono text-[var(--ink)] transition-colors placeholder-[var(--ink-faint)]';

// ---------------------------------------------------------------------------
// Sync health row
// ---------------------------------------------------------------------------

function SyncStateRow({ state }: { state: SyncState }) {
  const ok = state.lastSyncStatus === 'success';
  const failed = state.lastSyncStatus === 'failed';
  const running = state.lastSyncStatus === 'running';
  const ink = ok ? 'var(--line-green)' : failed ? 'var(--line-scarlet)' : running ? 'var(--line-cobalt)' : 'var(--ink-faint)';

  return (
    <div className="dense-row !cursor-default !py-2.5">
      <span className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${running ? 'animate-pulse' : ''}`} style={{ background: ink }} />
        <span className="text-[11px] font-mono truncate">{state.entityType}</span>
      </span>
      <span className="text-[10px] font-mono text-[var(--ink-dim)] tnum shrink-0">
        {state.recordsSynced != null ? `${state.recordsSynced.toLocaleString()} records` : '—'}
      </span>
      <span className="text-[10px] font-mono shrink-0 ml-3" style={{ color: ink }}>
        {state.lastSyncStatus ?? 'never'}
      </span>
      {state.consecutiveFailures > 0 && (
        <span className="service-chip ml-2 shrink-0" style={{ ['--chip' as string]: 'var(--line-scarlet)' }}>
          <AlertTriangle className="w-2.5 h-2.5" /> {state.consecutiveFailures} fails
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-source panel
// ---------------------------------------------------------------------------

function SourcePanel({ workspaceId, config }: { workspaceId: string; config: SourceConfig }) {
  const [connection, setConnection] = useState<DataSourceConnection | null>(null);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [frequency, setFrequency] = useState<CronSyncFrequency>('manual');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const conns = await connectionService.listConnections(workspaceId);
      const conn = conns.find((c) => c.sourceType === config.type) ?? null;
      setConnection(conn);
      if (conn?.schedule?.syncCron) {
        setFrequency(cronToFrequency(conn.schedule.syncCron));
      }
      if (conn) {
        const states = await connectionService.getSyncStates(workspaceId, config.type);
        setSyncStates(states);
      }
    } catch {
      // Source not connected yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [workspaceId, config.type]);

  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    const missing = config.fields.filter((f) => f.required && !formValues[f.name]?.trim());
    if (missing.length > 0) {
      notify(`Missing: ${missing.map((f) => f.label).join(', ')}`, 'error');
      return;
    }
    setConnecting(true);
    try {
      const credentials: Record<string, string> = {};
      for (const f of config.fields) {
        if (formValues[f.name]?.trim()) credentials[f.name] = formValues[f.name].trim();
      }

      const freqOption = FREQUENCY_OPTIONS.find((o) => o.value === frequency);
      const schedule = freqOption?.cron
        ? { syncCron: freqOption.cron }
        : { syncCron: null };

      if (config.type === 'magento') {
        await connectionService.connectMagento(workspaceId, {
          credentials: credentials as never,
          schedule,
        });
      } else if (config.type === 'gsc') {
        await connectionService.connectGsc(workspaceId, { credentials: credentials as never, schedule });
      }

      notify(`${config.label} connected`, 'success');
      setShowForm(false);
      setFormValues({});
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : `Failed to connect ${config.label}`, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(`Disconnect ${config.label}? Sync will stop.`)) return;
    try {
      await connectionService.disconnect(workspaceId, config.type);
      notify(`${config.label} disconnected`, 'success');
      setConnection(null);
      setSyncStates([]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to disconnect', 'error');
    }
  };

  const syncNow = async () => {
    try {
      const result = await connectionService.triggerSync(workspaceId, config.type);
      notify(`Sync started — ${result.jobIds.length} job(s) queued`, 'success');
      // Refresh states after a short delay
      setTimeout(() => load(), 2000);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to trigger sync', 'error');
    }
  };

  const connected = connection?.isActive === true;

  return (
    <div className="agency-card !cursor-default" style={connected ? { borderColor: 'color-mix(in srgb, var(--line-green) 20%, transparent)' } : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b agency-border">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[6px] border flex items-center justify-center shrink-0" style={{ borderColor: connected ? 'var(--line-green)' : 'var(--hairline-strong)' }}>
            {config.icon}
          </span>
          <div>
            <h4 className="text-sm font-bold font-mono">{config.label}</h4>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: connected ? 'var(--line-green)' : 'var(--ink-faint)' }}>
              {connected ? 'connected' : loading ? 'checking…' : 'not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <>
              <button type="button" onClick={syncNow} className="btn-outline !py-1.5 !px-2.5 !text-[10px]" title="Trigger sync now">
                <RefreshCw className="w-3 h-3" /> sync
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="dock-icon w-7 h-7 flex items-center justify-center border border-[var(--hairline)] rounded-[5px] hover:text-[var(--line-scarlet)]"
                title="Disconnect"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          {!connected && !showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-outline !py-1.5 !px-3 !text-[10px]">
              <Plug className="w-3 h-3" /> connect()
            </button>
          )}
        </div>
      </div>

      {/* Sync health (when connected) */}
      {connected && syncStates.length > 0 && (
        <div className="border-b agency-border">
          {syncStates.slice(0, 5).map((s) => (
            <SyncStateRow key={s.entityType} state={s} />
          ))}
        </div>
      )}

      {/* Schedule (when connected) */}
      {connected && (
        <div className="px-5 py-3.5 flex items-center justify-between">
          <span className="label-rule !gap-2 !text-[9px]">Sync Frequency</span>
          <select
            value={frequency}
            onChange={async (e) => {
              const newFreq = e.target.value as CronSyncFrequency;
              setFrequency(newFreq);
              const opt = FREQUENCY_OPTIONS.find((o) => o.value === newFreq);
              try {
                // Update schedule via the appropriate update endpoint
                if (config.type === 'magento') {
                  await connectionService.updateMagento(workspaceId, { schedule: { syncCron: opt?.cron ?? null } });
                } else if (config.type === 'gsc') {
                  await connectionService.updateGsc(workspaceId, { schedule: { syncCron: opt?.cron ?? null } });
                }
                notify('Schedule updated', 'success');
              } catch (err) {
                notify(err instanceof Error ? err.message : 'Failed to update schedule', 'error');
              }
            }}
            className="bg-transparent border border-[var(--hairline)] rounded-[4px] text-[10px] font-mono px-2 py-1 text-[var(--ink)] outline-none cursor-pointer"
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Connect form (when not connected) */}
      {showForm && !connected && (
        <div className="p-5 space-y-3">
          {config.fields.map((f) => (
            <div key={f.name}>
              <label className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1">
                {f.label} {f.required && <span style={{ color: 'var(--line-scarlet)' }}>*</span>}
              </label>
              <input
                type={f.type ?? 'text'}
                value={formValues[f.name] ?? ''}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
                className={field}
                autoComplete="off"
              />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-mono text-[var(--ink-dim)] mb-1">Sync Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as CronSyncFrequency)}
              className={`${field} cursor-pointer`}
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-primary flex-1 !py-2" onClick={connect} disabled={connecting}>
              <Check className="w-3 h-3" /> {connecting ? 'Connecting…' : 'Connect'}
            </button>
            <button type="button" className="btn-outline !py-2 !px-4" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DataSync component
// ---------------------------------------------------------------------------

export function DataSyncSection({ workspaceId }: { workspaceId: string }) {
  const groups = [...new Set(SOURCES.map((s) => s.group))];

  return (
    <div className="max-w-3xl slide-in">
      <h3 className="text-lg font-bold mb-2 font-mono">Data Sync</h3>
      <p className="text-xs text-[var(--ink-dim)] mb-6">
        Connect data sources. Agents use these connections to read your catalog, analytics, and search data.
      </p>

      {groups.map((group) => (
        <div key={group} className="mb-6">
          <p className="label-rule mb-3">{group}</p>
          <div className="space-y-4">
            {SOURCES.filter((s) => s.group === group).map((source) => (
              <SourcePanel key={source.type} workspaceId={workspaceId} config={source} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
