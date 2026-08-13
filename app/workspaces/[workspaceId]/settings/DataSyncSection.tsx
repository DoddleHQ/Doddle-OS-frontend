'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
    Loader2,
    RefreshCw,
    Zap,
    Trash2,
    Check,
    AlertCircle,
    Database,
    Search,
    ChevronDown,
    ChevronUp,
    ShoppingBag,
    BarChart3,
} from 'lucide-react';
import { connectionService } from '@/lib/services/connectionService';
import type {
    DataSourceConnection,
    SyncState,
    CreateMagentoConnectionReq,
    CreateGscConnectionReq,
    CreateGmcConnectionReq,
    CreateGa4ConnectionReq,
} from '@/lib/types/connection.types';
import { FREQUENCY_OPTIONS, cronToFrequency, type SyncFrequency } from '@/lib/utils/cron';
import { notify } from '@/lib/stores/notificationStore';

/*
 * DataSyncSection — data-source connection management.
 *
 * Four sources grouped by category:
 *   E-commerce: Magento
 *   Google: Search Console, Merchant Center, Analytics 4
 *
 * Each source is a collapsible panel showing connect/disconnect/sync.
 * Follows impeccable Operate rules.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function DataSyncSection({ workspaceId }: { workspaceId: string }) {
    const [connections, setConnections] = useState<DataSourceConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSource, setExpandedSource] = useState<string | null>(null);

    const fetchConnections = useCallback(async () => {
        try {
            setLoading(true);
            const data = await connectionService.listConnections(workspaceId);
            setConnections(data);
        } catch {
            // Silently fail — the connect forms still work without the list
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    const upsertConnection = useCallback((conn: DataSourceConnection) => {
        setConnections((prev) => {
            const filtered = prev.filter((c) => c.sourceType !== conn.sourceType);
            return [...filtered, conn];
        });
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const findConn = (type: string) => connections.find((c) => c.sourceType === type && c.isActive);
    const toggleSource = (source: string) =>
        setExpandedSource((prev) => (prev === source ? null : source));

    const panelProps = {
        workspaceId,
        onChanged: fetchConnections,
        onConnect: upsertConnection,
        loading,
        expanded: expandedSource,
        onToggle: toggleSource,
    };

    return (
        <div className="space-y-6">
            {/* E-commerce */}
            <CategoryGroup label="E-commerce">
                <SourcePanel
                    {...panelProps}
                    sourceType="magento"
                    title="Magento"
                    subtitle="Product + order data sync"
                    icon={<Database className="w-4 h-4" strokeWidth={1.75} />}
                    connection={findConn('magento')}
                    expanded={expandedSource === 'magento'}
                    onToggle={() => toggleSource('magento')}
                />
            </CategoryGroup>

            {/* Google */}
            <CategoryGroup label="Google">
                <SourcePanel
                    {...panelProps}
                    sourceType="gsc"
                    title="Search Console"
                    subtitle="Search performance data"
                    icon={<Search className="w-4 h-4" strokeWidth={1.75} />}
                    connection={findConn('gsc')}
                    expanded={expandedSource === 'gsc'}
                    onToggle={() => toggleSource('gsc')}
                />
                <SourcePanel
                    {...panelProps}
                    sourceType="gmc"
                    title="Merchant Center"
                    subtitle="Product feed + shopping data"
                    icon={<ShoppingBag className="w-4 h-4" strokeWidth={1.75} />}
                    connection={findConn('gmc')}
                    expanded={expandedSource === 'gmc'}
                    onToggle={() => toggleSource('gmc')}
                />
                <SourcePanel
                    {...panelProps}
                    sourceType="ga4"
                    title="Analytics 4"
                    subtitle="Traffic + engagement metrics"
                    icon={<BarChart3 className="w-4 h-4" strokeWidth={1.75} />}
                    connection={findConn('ga4')}
                    expanded={expandedSource === 'ga4'}
                    onToggle={() => toggleSource('ga4')}
                />
            </CategoryGroup>
        </div>
    );
}

/* === Category group label === */
function CategoryGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div
                className="v2-label mb-2.5"
                style={{ fontSize: '0.62rem', color: 'var(--v2-paper-ink-2)', letterSpacing: '0.1em' }}
            >
                {label}
            </div>
            <div className="space-y-2.5">{children}</div>
        </div>
    );
}

/* === Source panel (collapsible) === */
function SourcePanel({
    sourceType,
    title,
    subtitle,
    icon,
    connection,
    workspaceId,
    expanded,
    onToggle,
    onChanged,
    onConnect,
    loading,
}: {
    sourceType: 'magento' | 'gsc' | 'gmc' | 'ga4';
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    connection?: DataSourceConnection;
    workspaceId: string;
    expanded: boolean;
    onToggle: () => void;
    onChanged: () => void;
    onConnect: (conn: DataSourceConnection) => void;
    loading: boolean;
}) {
    const isConnected = !!connection;

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="rounded-[10px] overflow-hidden"
            style={{ border: '1px solid var(--v2-paper-rule)' }}
        >
            {/* Header row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                style={{ background: expanded ? 'rgba(0,0,0,0.02)' : 'transparent' }}
                onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
            >
                <div className="flex items-center gap-2.5">
                    <span
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                        style={{
                            background: isConnected ? 'rgba(127,176,105,0.1)' : 'rgba(0,0,0,0.03)',
                        }}
                    >
                        <span style={{ color: isConnected ? 'var(--v2-sage)' : 'var(--v2-paper-ink-2)' }}>
                            {icon}
                        </span>
                    </span>
                    <div>
                        <div
                            style={{
                                fontFamily: 'var(--v2-font-sans)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: 'var(--v2-paper-ink)',
                                lineHeight: 1.3,
                            }}
                        >
                            {title}
                        </div>
                        <div
                            className="v2-mono"
                            style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}
                        >
                            {subtitle}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge connected={isConnected} loading={loading && !isConnected} />
                    {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--v2-paper-ink-2)' }} />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--v2-paper-ink-2)' }} />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="overflow-hidden"
                    style={{ borderTop: '1px solid var(--v2-paper-rule)' }}
                >
                    <div className="p-4 text-left">
                        {isConnected ? (
                            <ConnectedView
                                sourceType={sourceType}
                                connection={connection!}
                                workspaceId={workspaceId}
                                onChanged={onChanged}
                            />
                        ) : sourceType === 'magento' ? (
                            <MagentoConnectForm workspaceId={workspaceId} onConnected={onChanged} onConnect={onConnect} />
                        ) : sourceType === 'gsc' ? (
                            <GscConnectForm workspaceId={workspaceId} onConnected={onChanged} onConnect={onConnect} />
                        ) : sourceType === 'gmc' ? (
                            <GmcConnectForm workspaceId={workspaceId} onConnected={onChanged} onConnect={onConnect} />
                        ) : (
                            <Ga4ConnectForm workspaceId={workspaceId} onConnected={onChanged} onConnect={onConnect} />
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

/* === Status badge === */
function StatusBadge({ connected, loading }: { connected: boolean; loading: boolean }) {
    if (loading) return <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--v2-paper-ink-2)' }} />;
    return (
        <span
            className="v2-label text-[7px] px-1.5 py-0.5 rounded"
            style={{
                color: connected ? 'var(--v2-sage)' : 'var(--v2-paper-ink-2)',
                border: `1px solid ${connected ? 'rgba(127,176,105,0.25)' : 'var(--v2-paper-rule)'}`,
            }}
        >
            {connected ? 'Connected' : 'Not connected'}
        </span>
    );
}

/* === Connected view (summary + actions) === */
function ConnectedView({
    sourceType,
    connection,
    workspaceId,
    onChanged,
}: {
    sourceType: 'magento' | 'gsc' | 'gmc' | 'ga4';
    connection: DataSourceConnection;
    workspaceId: string;
    onChanged: () => void;
}) {
    const [syncing, setSyncing] = useState(false);
    const [syncStates, setSyncStates] = useState<SyncState[]>([]);
    const [showSyncStates, setShowSyncStates] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const result = await connectionService.triggerSync(workspaceId, sourceType);
            notify(result.message, 'success');
            // Fetch sync states after triggering
            const states = await connectionService.getSyncStates(workspaceId, sourceType);
            setSyncStates(states);
            setShowSyncStates(true);
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(`Disconnect ${sourceType.toUpperCase()}? This will stop all scheduled syncs.`)) return;
        try {
            setDisconnecting(true);
            await connectionService.disconnect(workspaceId, sourceType);
            notify(`${sourceType.toUpperCase()} disconnected`, 'success');
            onChanged();
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Disconnect failed', 'error');
        } finally {
            setDisconnecting(false);
        }
    };

    const fetchSyncStates = async () => {
        try {
            const states = await connectionService.getSyncStates(workspaceId, sourceType);
            setSyncStates(states);
            setShowSyncStates(true);
        } catch {
            notify('Failed to load sync state', 'error');
        }
    };

    return (
        <div className="space-y-3">
            {/* Connection details */}
            {sourceType === 'magento' && connection.magento && (
                <>
                    <DetailRow label="Base URL" value={connection.magento.baseUrl} mono />
                    <DetailRow label="Store ID" value={connection.magento.storeId} mono />
                    <DetailRow label="Store code" value={connection.magento.storeCode} mono />
                    <DetailRow label="Load mode" value={connection.magento.loadMode} />
                    <DetailRow label="Page size" value={String(connection.magento.pageSize)} mono />
                    <DetailRow label="Credentials" value={connection.magento.hasCredentials ? 'Stored' : 'Missing'}
                        valueColor={connection.magento.hasCredentials ? 'var(--v2-sage)' : 'var(--v2-vermilion)'} />
                </>
            )}
            {sourceType === 'gsc' && connection.gsc && (
                <>
                    <DetailRow label="Site URL" value={connection.gsc.siteUrl} mono />
                    <DetailRow label="Credentials" value={connection.gsc.hasCredentials ? 'Stored' : 'Missing'}
                        valueColor={connection.gsc.hasCredentials ? 'var(--v2-sage)' : 'var(--v2-vermilion)'} />
                </>
            )}
            {sourceType === 'gmc' && connection.gmc && (
                <>
                    <DetailRow label="Merchant ID" value={connection.gmc.merchantId} mono />
                    <DetailRow label="Credentials" value={connection.gmc.hasCredentials ? 'Stored' : 'Missing'}
                        valueColor={connection.gmc.hasCredentials ? 'var(--v2-sage)' : 'var(--v2-vermilion)'} />
                </>
            )}
            {sourceType === 'ga4' && connection.ga4 && (
                <>
                    <DetailRow label="Property ID" value={connection.ga4.propertyId} mono />
                    <DetailRow label="Credentials" value={connection.ga4.hasCredentials ? 'Stored' : 'Missing'}
                        valueColor={connection.ga4.hasCredentials ? 'var(--v2-sage)' : 'var(--v2-vermilion)'} />
                </>
            )}

            {/* Schedule */}
            <DetailRow
                label="Sync frequency"
                value={FREQUENCY_OPTIONS.find((f) => f.value === cronToFrequency(connection.schedule.syncCron))?.label || connection.schedule.syncCron || 'Manual only'}
            />
            <DetailRow
                label="Timezone"
                value={connection.schedule.syncTimezone}
                mono
            />

            {/* Sync states */}
            {showSyncStates && syncStates.length > 0 && (
                <div className="pt-2" style={{ borderTop: '1px solid var(--v2-paper-rule)' }}>
                    <div className="v2-label text-[7px] mb-2" style={{ color: 'var(--v2-paper-ink-2)' }}>Sync State</div>
                    {syncStates.map((s) => (
                        <SyncStateRow key={s.entityType} state={s} />
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--v2-paper-rule)' }}>
                <ActionButton
                    onClick={handleSync}
                    disabled={syncing}
                    variant="primary"
                    icon={syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    label={syncing ? 'Syncing…' : 'Sync now'}
                />
                <ActionButton
                    onClick={fetchSyncStates}
                    variant="ghost"
                    icon={<RefreshCw className="w-3 h-3" />}
                    label="Refresh state"
                />
                <ActionButton
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    variant="danger"
                    icon={disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    label="Disconnect"
                />
            </div>
        </div>
    );
}

/* === Sync state row === */
function SyncStateRow({ state }: { state: SyncState }) {
    const statusColor =
        state.lastSyncStatus === 'success'
            ? 'var(--v2-sage)'
            : state.lastSyncStatus === 'failed'
                ? 'var(--v2-vermilion)'
                : state.lastSyncStatus === 'running'
                    ? 'var(--v2-vermilion)'
                    : 'var(--v2-paper-ink-2)';

    return (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
                <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: statusColor }}
                />
                <span className="v2-mono" style={{ fontSize: '0.68rem', color: 'var(--v2-paper-ink)' }}>
                    {state.entityType}
                </span>
            </div>
            <div className="flex items-center gap-3">
                {state.recordsSynced !== null && (
                    <span className="v2-mono tabular-nums" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
                        {state.recordsSynced.toLocaleString()} records
                    </span>
                )}
                {state.lastSyncFinishedAt && (
                    <span className="v2-mono" style={{ fontSize: '0.65rem', color: 'var(--v2-paper-ink-2)' }}>
                        {new Date(state.lastSyncFinishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
}

/* === Magento connect form === */
function MagentoConnectForm({
    workspaceId,
    onConnected,
    onConnect,
}: {
    workspaceId: string;
    onConnected: () => void;
    onConnect: (conn: DataSourceConnection) => void;
}) {
    const [baseUrl, setBaseUrl] = useState('');
    const [storeId, setStoreId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [storeCode, setStoreCode] = useState('all');
    const [loadMode, setLoadMode] = useState<'full' | 'incremental'>('incremental');
    const [frequency, setFrequency] = useState<SyncFrequency>('daily');
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        if (!baseUrl || !storeId || !accessToken) {
            notify('Base URL, Store ID, and Access Token are required', 'error');
            return;
        }
        try {
            setConnecting(true);
            const cronExpr = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.cron ?? null;
            const req: CreateMagentoConnectionReq = {
                credentials: { baseUrl, storeId, accessToken },
                pullSettings: { storeCode, loadMode },
                schedule: { syncCron: cronExpr, syncTimezone: 'UTC' },
            };
            const conn = await connectionService.connectMagento(workspaceId, req);
            onConnect(conn); // optimistic — badge flips immediately
            notify('Magento connected', 'success');
            onConnected(); // refetch in background to confirm
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Connection failed', 'error');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <FormGrid
            onConnect={handleConnect}
            connecting={connecting}
            fields={[
                { label: 'Base URL', value: baseUrl, onChange: setBaseUrl, placeholder: 'https://your-store.com', mono: true },
                { label: 'Store ID', value: storeId, onChange: setStoreId, placeholder: 'tenant-slug', mono: true },
                { label: 'Access Token', value: accessToken, onChange: setAccessToken, placeholder: 'Magento integration token', type: 'password', mono: true },
            ]}
            extraFields={
                <>
                    <div>
                        <FieldLabel>Load mode</FieldLabel>
                        <select
                            value={loadMode}
                            onChange={(e) => setLoadMode(e.target.value as 'full' | 'incremental')}
                            className="w-full px-2 py-1.5 rounded-[6px] outline-none"
                            style={selectStyle}
                        >
                            <option value="incremental">Incremental</option>
                            <option value="full">Full</option>
                        </select>
                    </div>
                    <FrequencySelect value={frequency} onChange={setFrequency} />
                </>
            }
        />
    );
}

/* === GSC connect form === */
function GscConnectForm({
    workspaceId,
    onConnected,
    onConnect,
}: {
    workspaceId: string;
    onConnected: () => void;
    onConnect: (conn: DataSourceConnection) => void;
}) {
    const [siteUrl, setSiteUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [refreshToken, setRefreshToken] = useState('');
    const [frequency, setFrequency] = useState<SyncFrequency>('daily');
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        if (!siteUrl || !clientId || !clientSecret || !refreshToken) {
            notify('All fields are required', 'error');
            return;
        }
        try {
            setConnecting(true);
            const cronExpr = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.cron ?? null;
            const conn = await connectionService.connectGsc(workspaceId, {
                credentials: { siteUrl, clientId, clientSecret, refreshToken },
                schedule: { syncCron: cronExpr, syncTimezone: 'UTC' },
            });
            onConnect(conn); // optimistic — badge flips immediately
            notify('Google Search Console connected', 'success');
            onConnected(); // refetch in background to confirm
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Connection failed', 'error');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <FormGrid
            onConnect={handleConnect}
            connecting={connecting}
            fields={[
                { label: 'Site URL', value: siteUrl, onChange: setSiteUrl, placeholder: 'sc-domain:example.com', mono: true },
                { label: 'Client ID', value: clientId, onChange: setClientId, placeholder: 'Google OAuth2 client ID', mono: true },
                { label: 'Client Secret', value: clientSecret, onChange: setClientSecret, placeholder: 'Google OAuth2 client secret', type: 'password', mono: true },
                { label: 'Refresh Token', value: refreshToken, onChange: setRefreshToken, placeholder: 'OAuth2 refresh token', type: 'password', mono: true },
            ]}
            extraFields={
                <FrequencySelect value={frequency} onChange={setFrequency} />
            }
        />
    );
}

/* === GMC connect form === */
function GmcConnectForm({
    workspaceId,
    onConnected,
    onConnect,
}: {
    workspaceId: string;
    onConnected: () => void;
    onConnect: (conn: DataSourceConnection) => void;
}) {
    const [merchantId, setMerchantId] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [refreshToken, setRefreshToken] = useState('');
    const [frequency, setFrequency] = useState<SyncFrequency>('daily');
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        if (!merchantId || !clientId || !clientSecret || !refreshToken) {
            notify('All fields are required', 'error');
            return;
        }
        try {
            setConnecting(true);
            const cronExpr = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.cron ?? null;
            const conn = await connectionService.connectGmc(workspaceId, {
                credentials: { merchantId, clientId, clientSecret, refreshToken },
                schedule: { syncCron: cronExpr, syncTimezone: 'UTC' },
            });
            onConnect(conn);
            notify('Google Merchant Center connected', 'success');
            onConnected();
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Connection failed', 'error');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <FormGrid
            onConnect={handleConnect}
            connecting={connecting}
            fields={[
                { label: 'Merchant ID', value: merchantId, onChange: setMerchantId, placeholder: '123456789', mono: true },
                { label: 'Client ID', value: clientId, onChange: setClientId, placeholder: 'Google OAuth2 client ID', mono: true },
                { label: 'Client Secret', value: clientSecret, onChange: setClientSecret, placeholder: 'Google OAuth2 client secret', type: 'password', mono: true },
                { label: 'Refresh Token', value: refreshToken, onChange: setRefreshToken, placeholder: 'OAuth2 refresh token', type: 'password', mono: true },
            ]}
            extraFields={<FrequencySelect value={frequency} onChange={setFrequency} />}
        />
    );
}

/* === GA4 connect form === */
function Ga4ConnectForm({
    workspaceId,
    onConnected,
    onConnect,
}: {
    workspaceId: string;
    onConnected: () => void;
    onConnect: (conn: DataSourceConnection) => void;
}) {
    const [propertyId, setPropertyId] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [refreshToken, setRefreshToken] = useState('');
    const [frequency, setFrequency] = useState<SyncFrequency>('daily');
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        if (!propertyId || !clientId || !clientSecret || !refreshToken) {
            notify('All fields are required', 'error');
            return;
        }
        try {
            setConnecting(true);
            const cronExpr = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.cron ?? null;
            const conn = await connectionService.connectGa4(workspaceId, {
                credentials: { propertyId, clientId, clientSecret, refreshToken },
                schedule: { syncCron: cronExpr, syncTimezone: 'UTC' },
            });
            onConnect(conn);
            notify('Google Analytics 4 connected', 'success');
            onConnected();
        } catch (err) {
            notify(err instanceof Error ? err.message : 'Connection failed', 'error');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <FormGrid
            onConnect={handleConnect}
            connecting={connecting}
            fields={[
                { label: 'Property ID', value: propertyId, onChange: setPropertyId, placeholder: '123456789', mono: true },
                { label: 'Client ID', value: clientId, onChange: setClientId, placeholder: 'Google OAuth2 client ID', mono: true },
                { label: 'Client Secret', value: clientSecret, onChange: setClientSecret, placeholder: 'Google OAuth2 client secret', type: 'password', mono: true },
                { label: 'Refresh Token', value: refreshToken, onChange: setRefreshToken, placeholder: 'OAuth2 refresh token', type: 'password', mono: true },
            ]}
            extraFields={<FrequencySelect value={frequency} onChange={setFrequency} />}
        />
    );
}

/* === Shared form primitives === */

const selectStyle: React.CSSProperties = {
    fontFamily: 'var(--v2-font-sans)',
    fontSize: '0.75rem',
    color: 'var(--v2-paper-ink)',
    background: 'rgba(255,255,255,0.4)',
    border: '1px solid var(--v2-paper-rule)',
};

const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--v2-font-sans)',
    fontSize: '0.75rem',
    color: 'var(--v2-paper-ink)',
    background: 'rgba(255,255,255,0.4)',
    border: '1px solid var(--v2-paper-rule)',
};

function FrequencySelect({ value, onChange }: { value: SyncFrequency; onChange: (v: SyncFrequency) => void }) {
    return (
        <div>
            <FieldLabel>Sync frequency</FieldLabel>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as SyncFrequency)}
                className="w-full px-2 py-1.5 rounded-[6px] outline-none"
                style={selectStyle}
            >
                {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block mb-1" style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.7rem', fontWeight: 500, color: 'var(--v2-paper-ink-2)' }}>
            {children}
        </label>
    );
}

function FormField({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    mono = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    mono?: boolean;
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-2 py-1.5 rounded-[6px] outline-none"
                style={mono ? { ...inputStyle, fontFamily: 'var(--v2-font-mono)' } : inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--v2-vermilion)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--v2-paper-rule)'; }}
            />
        </div>
    );
}

function FormGrid({
    fields,
    extraFields,
    onConnect,
    connecting,
}: {
    fields: Array<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }>;
    extraFields?: React.ReactNode;
    onConnect: () => void;
    connecting: boolean;
}) {
    return (
        <div className="space-y-3">
            {fields.map((f) => (
                <FormField key={f.label} {...f} />
            ))}
            {extraFields && <div className="grid grid-cols-2 gap-2">{extraFields}</div>}
            <p className="v2-mono" style={{ fontSize: '0.62rem', color: 'var(--v2-paper-ink-2)', lineHeight: 1.5 }}>
                Credentials are encrypted at rest and never returned in API responses.
            </p>
            <button
                onClick={onConnect}
                disabled={connecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] v2-label text-[10px] transition-opacity"
                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)', opacity: connecting ? 0.5 : 1 }}
            >
                {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Connect
            </button>
        </div>
    );
}

function DetailRow({
    label,
    value,
    mono = false,
    valueColor,
}: {
    label: string;
    value: string;
    mono?: boolean;
    valueColor?: string;
}) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.78rem', color: 'var(--v2-paper-ink-2)' }}>
                {label}
            </span>
            <span
                className="truncate ml-3 text-right"
                style={{
                    fontFamily: mono ? 'var(--v2-font-mono)' : 'var(--v2-font-sans)',
                    fontSize: mono ? '0.72rem' : '0.78rem',
                    color: valueColor || 'var(--v2-paper-ink)',
                    maxWidth: '60%',
                }}
            >
                {value}
            </span>
        </div>
    );
}

function ActionButton({
    onClick,
    disabled,
    variant,
    icon,
    label,
}: {
    onClick: () => void;
    disabled?: boolean;
    variant: 'primary' | 'ghost' | 'danger';
    icon: React.ReactNode;
    label: string;
}) {
    const styles: Record<typeof variant, React.CSSProperties> = {
        primary: { background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' },
        ghost: { background: 'transparent', color: 'var(--v2-paper-ink-2)', border: '1px solid var(--v2-paper-rule)' },
        danger: { background: 'transparent', color: 'var(--v2-vermilion)', border: '1px solid rgba(200,50,27,0.2)' },
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] v2-label text-[9px] transition-opacity"
            style={{ ...styles[variant], opacity: disabled ? 0.5 : 1 }}
        >
            {icon}
            {label}
        </button>
    );
}
