export type DataSourceType = 'magento' | 'ga4' | 'gsc' | 'gmc';
export type SyncLoadMode = 'full' | 'incremental';
export type SyncStatus = 'success' | 'failed' | 'running';
export type EntityType = string;

export interface MagentoCredentialsReq {
    baseUrl: string;
    accessToken: string;
}

export interface GscCredentialsReq {
    siteUrl: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export interface MagentoPullSettingsReq {
    storeCode?: string;
    loadMode?: SyncLoadMode;
    pageSize?: number;
    pageDelay?: number;
}

export interface SyncScheduleReq {
    syncCron?: string | null;
    syncTimezone?: string;
    blackoutStartHour?: number | null;
    blackoutEndHour?: number | null;
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

export interface GmcCredentialsReq {
    merchantId: string;
    clientId: string;
    clientSecret: string;
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

export interface Ga4CredentialsReq {
    propertyId: string;
    clientId: string;
    clientSecret: string;
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
    accessToken?: string;
    pullSettings?: MagentoPullSettingsReq;
    schedule?: SyncScheduleReq;
}

export interface UpdateGscConnectionReq {
    siteUrl?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    schedule?: SyncScheduleReq;
}

export interface TriggerSyncReq {
    entityTypes?: EntityType[] | null;
    forceFull?: boolean;
}

export interface MagentoCredentialsResponse {
    baseUrl: string;
    environment: string | null;
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
    magento: MagentoCredentialsResponse | null;
    gsc: GscCredentialsResponse | null;
    gmc: GmcCredentialsResponse | null;
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
