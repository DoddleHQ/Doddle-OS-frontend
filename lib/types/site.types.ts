export interface Site {
    id: number;
    domain: string;
    displayName: string | null;
    gscPropertyUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSiteRequest {
    domain: string;
    displayName?: string;
    gscPropertyUrl?: string;
}

export interface UpdateSiteRequest {
    displayName?: string;
    gscPropertyUrl?: string;
}

export interface ListSitesParams {
    skip?: number;
    limit?: number;
}
