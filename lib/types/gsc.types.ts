export interface GSCData {
    id: number;
    siteId: number;
    date: string;
    page: string;
    query: string;
    country: string;
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

export interface GSCDataBulkCreateRequest {
    records: GSCDataCreateRecord[];
}

export interface GSCDataCreateRecord {
    siteId: number;
    date: string;
    page: string;
    query: string;
    country?: string;
    device?: string;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
}

export interface GSCDataBulkCreateResponse {
    upserted: number;
}

export interface GSCSyncResponse {
    message: string;
}

export interface ListGSCDataParams {
    siteId?: number;
    page?: string;
    query?: string;
    dateFrom?: string;
    dateTo?: string;
    skip?: number;
    limit?: number;
}
