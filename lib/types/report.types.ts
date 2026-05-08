export interface Report {
    id: number;
    siteId: number;
    pageUrl: string | null;
    reportType: string;
    contentMarkdown: string;
    urlsAnalyzed: number | null;
    totalIssues: number | null;
    dataJson: ReportDataJson;
    status: string;
    severity: string | null;
    tags: string[];
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReportDataJson {
    overview_metrics?: unknown[];
    url_results?: unknown[];
    failures?: Record<string, unknown>;
    keyword_analysis?: unknown[];
    duplicate_pairs?: unknown[];
    extra?: Record<string, unknown>;
}

export interface CreateReportRequest {
    siteId: number;
    pageUrl?: string;
    reportType: string;
    contentMarkdown: string;
    urlsAnalyzed?: number;
    totalIssues?: number;
    dataJson?: ReportDataJson;
    status?: string;
    severity?: string;
    tags?: string[];
    dateRangeStart?: string;
    dateRangeEnd?: string;
}

export interface UpdateReportRequest {
    siteId?: number;
    pageUrl?: string;
    reportType?: string;
    contentMarkdown?: string;
    urlsAnalyzed?: number;
    totalIssues?: number;
    dataJson?: ReportDataJson;
    status?: string;
    severity?: string;
    tags?: string[];
    dateRangeStart?: string;
    dateRangeEnd?: string;
}

export interface ListReportsParams {
    siteId?: number;
    pageUrl?: string;
    reportType?: string;
    status?: string;
    severity?: string;
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
    skip?: number;
    limit?: number;
}
