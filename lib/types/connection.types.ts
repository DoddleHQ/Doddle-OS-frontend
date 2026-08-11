/**
 * Connection Types
 *
 * Types for the workspace data-source connection APIs.
 * Backend returns snake_case; the service mappers convert to camelCase.
 *
 * @see /api/v1/workspaces/{workspaceId}/connections
 */

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export type DataSourceType = 'magento' | 'ga4' | 'gsc' | 'gmc';
export type SyncLoadMode = 'full' | 'incremental';
export type SyncStatus = 'success' | 'failed' | 'running';
export type EntityType = string; // backend enum; kept loose for forward-compat

// ---------------------------------------------------------------------------
// Request shapes (camelCase — the service converts to snake_case on send)
// ---------------------------------------------------------------------------

export interface MagentoCredentialsReq {
    baseUrl: string;
    storeId: string;
    /** Write-only — never echoed back. */
    accessToken: string;
}

export interface GscCredentialsReq {
    siteUrl: string;
    clientId: string;
    /** Write-only. */
    clientSecret: string;
    /** Write-only. */
    refreshToken: string;
}

export interface MagentoPullSettingsReq {
    storeCode?: string; // default "all"
    loadMode?: SyncLoadMode; // default "incremental"
    pageSize?: number; // 100-5000, default 1000
    pageDelay?: number; // 0-30 seconds, default 0
}

export interface SyncScheduleReq {
    /** 5-field cron. null = manual-only. */
    syncCron?: string | null;
    /** IANA timezone. */
    syncTimezone?: string; // default "UTC"
    blackoutStartHour?: number | null; // 0-23
    blackoutEndHour?: number | null; // 0-23
}

export interface CreateMagentoConnectionReq {
    credentials: MagentoCredentialsReq;
    pullSettings?: MagentoPullSettingsReq;
    schedule?: SyncScheduleReq;
}

export interface CreateGscConnectionReq {
    credentials: GscCredentialsReq;
    schedule?: SyncScheduleReq;
}

// ---------------------------------------------------------------------------
// GMC (Google Merchant Center) — OAuth2-based, like GSC
// ---------------------------------------------------------------------------

export interface GmcCredentialsReq {
    merchantId: string;
    clientId: string;
    /** Write-only. */
    clientSecret: string;
    /** Write-only. */
    refreshToken: string;
}

export interface CreateGmcConnectionReq {
    credentials: GmcCredentialsReq;
    schedule?: SyncScheduleReq;
}

export interface UpdateGmcConnectionReq {
    merchantId?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    schedule?: SyncScheduleReq;
}

// ---------------------------------------------------------------------------
// GA4 (Google Analytics 4) — OAuth2-based
// ---------------------------------------------------------------------------

export interface Ga4CredentialsReq {
    propertyId: string;
    clientId: string;
    /** Write-only. */
    clientSecret: string;
    /** Write-only. */
    refreshToken: string;
}

export interface CreateGa4ConnectionReq {
    credentials: Ga4CredentialsReq;
    schedule?: SyncScheduleReq;
}

export interface UpdateGa4ConnectionReq {
    propertyId?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    schedule?: SyncScheduleReq;
}

export interface UpdateMagentoConnectionReq {
    baseUrl?: string;
    /** Provide only to rotate. */
    accessToken?: string;
    pullSettings?: MagentoPullSettingsReq;
    schedule?: SyncScheduleReq;
}

export interface UpdateGscConnectionReq {
    siteUrl?: string;
    clientId?: string;
    /** Provide only to rotate. */
    clientSecret?: string;
    /** Provide only to rotate. */
    refreshToken?: string;
    schedule?: SyncScheduleReq;
}

export interface TriggerSyncReq {
    entityTypes?: EntityType[] | null;
    /** Ignore high_water_mark and run a full backfill. */
    forceFull?: boolean;
}

// ---------------------------------------------------------------------------
// Response shapes (camelCase, mapped from snake_case by the service)
// ---------------------------------------------------------------------------

export interface MagentoCredentialsResponse {
    baseUrl: string;
    storeId: string;
    storeCode: string;
    loadMode: SyncLoadMode;
    pageSize: number;
    pageDelay: number;
    hasCredentials: boolean;
}

export interface GscCredentialsResponse {
    siteUrl: string;
    hasCredentials: boolean;
}

export interface GmcCredentialsResponse {
    merchantId: string;
    hasCredentials: boolean;
}

export interface Ga4CredentialsResponse {
    propertyId: string;
    hasCredentials: boolean;
}

export interface SyncSchedule {
    syncCron: string | null;
    syncTimezone: string;
    blackoutStartHour: number | null;
    blackoutEndHour: number | null;
}

export interface DataSourceConnection {
    id: string;
    workspaceId: string;
    sourceType: DataSourceType;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
    /** Populated when sourceType is 'magento'. */
    magento: MagentoCredentialsResponse | null;
    /** Populated when sourceType is 'gsc'. */
    gsc: GscCredentialsResponse | null;
    /** Populated when sourceType is 'gmc'. */
    gmc: GmcCredentialsResponse | null;
    /** Populated when sourceType is 'ga4'. */
    ga4: Ga4CredentialsResponse | null;
    schedule: SyncSchedule;
}

export interface TriggerSyncResponse {
    enqueued: string[];
    jobIds: string[];
    message: string;
}

export interface SyncState {
    entityType: EntityType;
    lastSyncStatus: SyncStatus | null;
    highWaterMark: string | null;
    recordsSynced: number | null;
    consecutiveFailures: number;
    syncStartedAt: string | null;
    lastSyncFinishedAt: string | null;
    lastErrorMessage: string | null;
    updatedAt: string | null;
}
