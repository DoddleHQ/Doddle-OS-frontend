'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Database, Globe, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { connectionService } from '@/lib/services/connectionService';
import { FREQUENCY_OPTIONS, cronToFrequency } from '@/lib/utils/cron';
import type { DataSourceConnection, DataSourceType, SyncState } from '@/lib/types/connection.types';
import type { SyncFrequency as CronSyncFrequency } from '@/lib/utils/cron';

interface SourceConfig {
  type: DataSourceType;
  label: string;
  icon: ReactNode;
  fields: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; secret?: boolean }[];
}

const SOURCES: SourceConfig[] = [
  {
    type: 'magento',
    label: 'Magento',
    icon: <Database size={14} />,
    fields: [
      { name: 'baseUrl', label: 'Base URL', placeholder: 'https://your-store.com', required: true },
      { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: '••••••••', required: true, secret: true },
    ],
  },
  {
    type: 'gsc',
    label: 'Google Search Console',
    icon: <Globe size={14} />,
    fields: [
      { name: 'siteUrl', label: 'Site URL', placeholder: 'https://your-site.com', required: true },
      { name: 'clientId', label: 'Client ID', placeholder: '••••.apps.googleusercontent.com', required: true },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••', required: true, secret: true },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: '••••••••', required: true, secret: true },
    ],
  },
];

type ActionStatus = { kind: 'ok' | 'err'; text: string } | null;

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid var(--edge)',
  borderRadius: 6,
  padding: '7px 10px',
  fontFamily: 'inherit',
  fontSize: 12,
  color: 'var(--ink)',
  outline: 'none',
};

function StatusLine({ status }: { status: ActionStatus }) {
  if (!status) return null;
  return (
    <p className="font-mono text-[10px] mt-2" style={{ color: status.kind === 'ok' ? 'var(--green)' : 'var(--pink)' }}>
      {status.text}
    </p>
  );
}

function SyncRow({ state }: { state: SyncState }) {
  const ok = state.lastSyncStatus === 'success';
  const failed = state.lastSyncStatus === 'failed';
  const running = state.lastSyncStatus === 'running';
  const tint = ok ? 'var(--green)' : failed ? 'var(--pink)' : running ? 'var(--accent)' : 'var(--muted)';
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${running ? 'animate-pulse' : ''}`}
        style={{ background: tint }}
      />
      <span className="font-mono text-[11px] truncate flex-1" style={{ color: 'var(--ink)' }}>
        {state.entityType}
      </span>
      <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--muted)' }}>
        {state.recordsSynced != null ? `${state.recordsSynced.toLocaleString()} records` : '—'}
      </span>
      <span className="font-mono text-[10px] shrink-0 ml-2" style={{ color: tint }}>
        {state.lastSyncStatus ?? 'never'}
      </span>
      {state.consecutiveFailures > 0 && (
        <span className="chip shrink-0 ml-1" style={{ color: 'var(--amber)' }}>
          <AlertTriangle size={10} /> {state.consecutiveFailures}
        </span>
      )}
    </div>
  );
}

function SourceCard({ workspaceId, config }: { workspaceId: string; config: SourceConfig }) {
  const [connection, setConnection] = useState<DataSourceConnection | null>(null);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [frequency, setFrequency] = useState<CronSyncFrequency>('manual');
  const [status, setStatus] = useState<ActionStatus>(null);

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
    } finally {
      setLoading(false);
    }
  }, [workspaceId, config.type]);

  useEffect(() => {
    load();
  }, [load]);

  const connect = async () => {
    const missing = config.fields.filter((f) => f.required && !formValues[f.name]?.trim());
    if (missing.length > 0) {
      setStatus({ kind: 'err', text: `missing: ${missing.map((f) => f.label).join(', ')}` });
      return;
    }
    setConnecting(true);
    setStatus(null);
    try {
      const credentials: Record<string, string> = {};
      for (const f of config.fields) {
        if (formValues[f.name]?.trim()) credentials[f.name] = formValues[f.name].trim();
      }
      const freqOption = FREQUENCY_OPTIONS.find((o) => o.value === frequency);
      const schedule = freqOption?.cron ? { syncCron: freqOption.cron } : { syncCron: null };
      if (config.type === 'magento') {
        await connectionService.connectMagento(workspaceId, { credentials: credentials as never, schedule });
      } else if (config.type === 'gsc') {
        await connectionService.connectGsc(workspaceId, { credentials: credentials as never, schedule });
      }
      setStatus({ kind: 'ok', text: `${config.label} connected` });
      setShowForm(false);
      setFormValues({});
      await load();
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : `failed to connect ${config.label}` });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(`Disconnect ${config.label}? Sync will stop.`)) return;
    try {
      await connectionService.disconnect(workspaceId, config.type);
      setStatus({ kind: 'ok', text: `${config.label} disconnected` });
      setConnection(null);
      setSyncStates([]);
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'failed to disconnect' });
    }
  };

  const syncNow = async () => {
    try {
      const result = await connectionService.triggerSync(workspaceId, config.type);
      setStatus({ kind: 'ok', text: `sync started · ${result.jobIds.length} job(s) queued` });
      setTimeout(() => load(), 2000);
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'failed to trigger sync' });
    }
  };

  const changeSchedule = async (newFreq: CronSyncFrequency) => {
    setFrequency(newFreq);
    const opt = FREQUENCY_OPTIONS.find((o) => o.value === newFreq);
    try {
      if (config.type === 'magento') {
        await connectionService.updateMagento(workspaceId, { schedule: { syncCron: opt?.cron ?? null } });
      } else if (config.type === 'gsc') {
        await connectionService.updateGsc(workspaceId, { schedule: { syncCron: opt?.cron ?? null } });
      }
      setStatus({ kind: 'ok', text: 'schedule updated' });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'failed to update schedule' });
    }
  };

  const connected = connection?.isActive === true;

  return (
    <div className="rounded-lg p-3" style={{ border: '1px solid var(--edge)' }}>
      <div className="flex items-center gap-2.5">
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ border: `1px solid ${connected ? 'var(--green)' : 'var(--edge)'}`, color: connected ? 'var(--green)' : 'var(--muted)' }}
        >
          {config.icon}
        </span>
        <span className="min-w-0">
          <span className="block font-mono font-bold text-xs truncate" style={{ color: 'var(--ink)' }}>
            {config.label}
          </span>
          <span
            className="block font-mono text-[10px] truncate"
            style={{ color: connected ? 'var(--green)' : 'var(--muted)' }}
          >
            {connected ? 'connected' : loading ? 'checking…' : 'not connected'}
          </span>
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {connected && (
            <>
              <button className="btn-ghost" onClick={syncNow} title="Trigger sync now">
                <RefreshCw size={12} /> sync
              </button>
              <button className="btn-ghost" onClick={disconnect} title="Disconnect" style={{ color: 'var(--pink)' }}>
                <Trash2 size={12} />
              </button>
            </>
          )}
          {!connected && !showForm && (
            <button className="btn-ghost" onClick={() => setShowForm(true)}>
              <Plug size={12} /> connect
            </button>
          )}
        </span>
      </div>

      {connected && syncStates.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--edge)' }}>
          {syncStates.slice(0, 5).map((s) => (
            <SyncRow key={s.entityType} state={s} />
          ))}
        </div>
      )}

      {connected && (
        <div className="mt-2 pt-2 flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--edge)' }}>
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
            sync frequency
          </span>
          <select
            value={frequency}
            onChange={(e) => changeSchedule(e.target.value as CronSyncFrequency)}
            className="font-mono text-[10px] cursor-pointer"
            style={{ ...inputStyle, width: 'auto', padding: '4px 8px', color: 'var(--ink)' }}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showForm && !connected && (
        <div className="mt-2 pt-2 space-y-2.5" style={{ borderTop: '1px solid var(--edge)' }}>
          {config.fields.map((f) => (
            <div key={f.name}>
              <label className="block font-mono text-[10px] mb-1" style={{ color: 'var(--muted)' }}>
                {f.label} {f.required && <span style={{ color: 'var(--pink)' }}>*</span>}
              </label>
              <input
                type={f.type ?? 'text'}
                value={formValues[f.name] ?? ''}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
                style={inputStyle}
                autoComplete="off"
              />
            </div>
          ))}
          <div>
            <label className="block font-mono text-[10px] mb-1" style={{ color: 'var(--muted)' }}>
              sync frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as CronSyncFrequency)}
              className="font-mono text-xs cursor-pointer"
              style={inputStyle}
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-0.5">
            <button className="btn-deploy flex-1 flex items-center justify-center gap-1.5" onClick={connect} disabled={connecting}>
              <Check size={12} /> {connecting ? 'connecting…' : 'connect'}
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>
              cancel
            </button>
          </div>
        </div>
      )}

      <StatusLine status={status} />
    </div>
  );
}

export function ConnectionsPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <div>
      <p className="pane-label" style={{ marginBottom: 10 }}>
        DATA CONNECTIONS
      </p>
      <p className="font-mono text-[10px] mb-3" style={{ color: 'var(--muted)' }}>
        Connect data sources. Agents use these connections to read your catalog and search data.
      </p>
      <div className="space-y-2.5">
        {SOURCES.map((config) => (
          <SourceCard key={config.type} workspaceId={workspaceId} config={config} />
        ))}
      </div>
    </div>
  );
}
