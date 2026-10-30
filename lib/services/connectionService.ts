import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/services/apiClient';
import type {
    CreateMagentoConnectionReq,
    CreateGscConnectionReq,
    CreateGmcConnectionReq,
    CreateGa4ConnectionReq,
    UpdateMagentoConnectionReq,
    UpdateGscConnectionReq,
    UpdateGmcConnectionReq,
    UpdateGa4ConnectionReq,
    TriggerSyncReq,
    TriggerSyncResponse,
    DataSourceConnection,
    DataSourceType,
    MagentoCredentialsResponse,
    GscCredentialsResponse,
    GmcCredentialsResponse,
    Ga4CredentialsResponse,
    SyncSchedule,
    SyncState,
    SyncLoadMode,
} from '@/lib/types/connection.types';

function connectionsUrl(workspaceId: string, ...segments: string[]): string {
    const base = `/api/v1/workspaces/${workspaceId}/connections`;
    return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
}

function toMagentoCredentials(raw: Record<string, unknown>): MagentoCredentialsResponse {
    return {
        baseUrl: raw.base_url as string,
        environment: (raw.environment as string | null) ?? null,
        storeCode: raw.store_code as string,
        loadMode: raw.load_mode as SyncLoadMode,
        pageSize: raw.page_size as number,
        pageDelay: raw.page_delay as number,
        hasCredentials: (raw.has_credentials as boolean) ?? true,
    };
}

function toGscCredentials(raw: Record<string, unknown>): GscCredentialsResponse {
    return {
        siteUrl: raw.site_url as string,
        hasCredentials: (raw.has_credentials as boolean) ?? true,
    };
}

function toGmcCredentials(raw: Record<string, unknown>): GmcCredentialsResponse {
    return {
        merchantId: raw.merchant_id as string,
        hasCredentials: (raw.has_credentials as boolean) ?? true,
    };
}

function toGa4Credentials(raw: Record<string, unknown>): Ga4CredentialsResponse {
    return {
        propertyId: raw.property_id as string,
        hasCredentials: (raw.has_credentials as boolean) ?? true,
    };
}

function toSchedule(raw: Record<string, unknown>): SyncSchedule {
    return {
        syncCron: (raw.sync_cron as string | null) ?? null,
        syncTimezone: (raw.sync_timezone as string) ?? 'UTC',
        blackoutStartHour: (raw.blackout_start_hour as number | null) ?? null,
        blackoutEndHour: (raw.blackout_end_hour as number | null) ?? null,
    };
}

function toConnection(raw: Record<string, unknown>): DataSourceConnection {
    return {
        id: raw.id as string,
        workspaceId: raw.workspace_id as string,
        sourceType: raw.source_type as DataSourceType,
        isActive: raw.is_active as boolean,
        createdAt: raw.created_at as string,
        updatedAt: (raw.updated_at as string | null) ?? null,
        magento: raw.magento_credentials ? toMagentoCredentials(raw.magento_credentials as Record<string, unknown>) : null,
        gsc: raw.gsc ? toGscCredentials(raw.gsc as Record<string, unknown>) : null,
        gmc: raw.gmc ? toGmcCredentials(raw.gmc as Record<string, unknown>) : null,
        ga4: raw.ga4 ? toGa4Credentials(raw.ga4 as Record<string, unknown>) : null,
        schedule: raw.schedule
            ? toSchedule(raw.schedule as Record<string, unknown>)
            : { syncCron: null, syncTimezone: 'UTC', blackoutStartHour: null, blackoutEndHour: null },
    };
}

function toSyncState(raw: Record<string, unknown>): SyncState {
    return {
        entityType: raw.entity_type as string,
        lastSyncStatus: (raw.last_sync_status as SyncState['lastSyncStatus']) ?? null,
        highWaterMark: (raw.high_water_mark as string | null) ?? null,
        recordsSynced: (raw.records_synced as number | null) ?? null,
        consecutiveFailures: (raw.consecutive_failures as number) ?? 0,
        syncStartedAt: (raw.sync_started_at as string | null) ?? null,
        lastSyncFinishedAt: (raw.last_sync_finished_at as string | null) ?? null,
        lastErrorMessage: (raw.last_error_message as string | null) ?? null,
        updatedAt: (raw.updated_at as string | null) ?? null,
    };
}

function buildScheduleBody(schedule?: CreateMagentoConnectionReq['schedule']): Record<string, unknown> | undefined {
    if (!schedule) return undefined;
    const body: Record<string, unknown> = {};
    if (schedule.syncCron !== undefined) body.sync_cron = schedule.syncCron;
    if (schedule.syncTimezone !== undefined) body.sync_timezone = schedule.syncTimezone;
    if (schedule.blackoutStartHour !== undefined) body.blackout_start_hour = schedule.blackoutStartHour;
    if (schedule.blackoutEndHour !== undefined) body.blackout_end_hour = schedule.blackoutEndHour;
    return body;
}

function buildMagentoPullSettingsBody(
    ps?: CreateMagentoConnectionReq['pullSettings'],
): Record<string, unknown> | undefined {
    if (!ps) return undefined;
    const body: Record<string, unknown> = {};
    if (ps.storeCode !== undefined) body.store_code = ps.storeCode;
    if (ps.loadMode !== undefined) body.load_mode = ps.loadMode;
    if (ps.pageSize !== undefined) body.page_size = ps.pageSize;
    if (ps.pageDelay !== undefined) body.page_delay = ps.pageDelay;
    return body;
}

export const connectionService = {
    async listConnections(workspaceId: string): Promise<DataSourceConnection[]> {
        const raw = (await apiGet(connectionsUrl(workspaceId))) as Record<string, unknown>[];
        return raw.map(toConnection);
    },

    async getConnection(workspaceId: string, sourceType: DataSourceType): Promise<DataSourceConnection> {
        const raw = (await apiGet(connectionsUrl(workspaceId, sourceType))) as Record<string, unknown>;
        return toConnection(raw);
    },

    async connectMagento(workspaceId: string, req: CreateMagentoConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {
            credentials: {
                base_url: req.credentials.baseUrl,
                access_token: req.credentials.accessToken,
            },
        };
        const ps = buildMagentoPullSettingsBody(req.pullSettings);
        if (ps) body.pull_settings = ps;
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPost(connectionsUrl(workspaceId, 'magento'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async connectGsc(workspaceId: string, req: CreateGscConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {
            credentials: {
                site_url: req.credentials.siteUrl,
                client_id: req.credentials.clientId,
                client_secret: req.credentials.clientSecret,
                refresh_token: req.credentials.refreshToken,
            },
        };
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPost(connectionsUrl(workspaceId, 'gsc'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async updateMagento(workspaceId: string, req: UpdateMagentoConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {};
        if (req.baseUrl !== undefined) body.base_url = req.baseUrl;
        if (req.accessToken !== undefined) body.access_token = req.accessToken;
        const ps = buildMagentoPullSettingsBody(req.pullSettings);
        if (ps) body.pull_settings = ps;
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPatch(connectionsUrl(workspaceId, 'magento'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async updateGsc(workspaceId: string, req: UpdateGscConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {};
        if (req.siteUrl !== undefined) body.site_url = req.siteUrl;
        if (req.clientId !== undefined) body.client_id = req.clientId;
        if (req.clientSecret !== undefined) body.client_secret = req.clientSecret;
        if (req.refreshToken !== undefined) body.refresh_token = req.refreshToken;
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPatch(connectionsUrl(workspaceId, 'gsc'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async disconnect(workspaceId: string, sourceType: DataSourceType): Promise<void> {
        await apiDelete(connectionsUrl(workspaceId, sourceType));
    },

    async connectGmc(workspaceId: string, req: CreateGmcConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {
            credentials: {
                merchant_id: req.credentials.merchantId,
                client_id: req.credentials.clientId,
                client_secret: req.credentials.clientSecret,
                refresh_token: req.credentials.refreshToken,
            },
        };
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPost(connectionsUrl(workspaceId, 'gmc'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async updateGmc(workspaceId: string, req: UpdateGmcConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {};
        if (req.merchantId !== undefined) body.merchant_id = req.merchantId;
        if (req.clientId !== undefined) body.client_id = req.clientId;
        if (req.clientSecret !== undefined) body.client_secret = req.clientSecret;
        if (req.refreshToken !== undefined) body.refresh_token = req.refreshToken;
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPatch(connectionsUrl(workspaceId, 'gmc'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async connectGa4(workspaceId: string, req: CreateGa4ConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {
            credentials: {
                property_id: req.credentials.propertyId,
                client_id: req.credentials.clientId,
                client_secret: req.credentials.clientSecret,
                refresh_token: req.credentials.refreshToken,
            },
        };
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPost(connectionsUrl(workspaceId, 'ga4'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async updateGa4(workspaceId: string, req: UpdateGa4ConnectionReq): Promise<DataSourceConnection> {
        const body: Record<string, unknown> = {};
        if (req.propertyId !== undefined) body.property_id = req.propertyId;
        if (req.clientId !== undefined) body.client_id = req.clientId;
        if (req.clientSecret !== undefined) body.client_secret = req.clientSecret;
        if (req.refreshToken !== undefined) body.refresh_token = req.refreshToken;
        const schedule = buildScheduleBody(req.schedule);
        if (schedule) body.schedule = schedule;

        const raw = (await apiPatch(connectionsUrl(workspaceId, 'ga4'), body)) as Record<string, unknown>;
        return toConnection(raw);
    },

    async triggerSync(
        workspaceId: string,
        sourceType: DataSourceType,
        req?: TriggerSyncReq,
    ): Promise<TriggerSyncResponse> {
        const body: Record<string, unknown> = {};
        if (req?.entityTypes !== undefined) body.entity_types = req.entityTypes;
        if (req?.forceFull !== undefined) body.force_full = req.forceFull;

        const raw = (await apiPost(connectionsUrl(workspaceId, sourceType, 'sync'), body)) as Record<string, unknown>;
        return {
            enqueued: (raw.enqueued as string[]) ?? [],
            jobIds: (raw.job_ids as string[]) ?? [],
            message: (raw.message as string) ?? 'Sync triggered',
        };
    },

    async getSyncStates(workspaceId: string, sourceType: DataSourceType): Promise<SyncState[]> {
        const raw = (await apiGet(connectionsUrl(workspaceId, sourceType, 'sync-states'))) as Record<string, unknown>[];
        return raw.map(toSyncState);
    },
};
