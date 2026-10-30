export type ModuleId = 'business-audit' | 'content-factory' | 'content-architect' | 'magento-content-writer' | 'magento-content' | 'interactive-website-architect' | 'seo-cluster' | 'social-growth' | 'saas-launch-ops' | 'analytics-action' | 'google-analyst' | 'merchant-analyst' | 'brand-persona';

export type ThreadStatus = 'running' | 'complete' | 'error';

export interface AuditThread {
    id: string;
    workspaceId: string;
    moduleId: ModuleId;
    langId?: string | null;
    title: string;
    description: string;
    status: ThreadStatus;
    docCount: number;
    pageNames: string[];
    createdAt: string;
    updatedAt: string | null;
}

export interface AuditArtifact {
    id: number | string;
    threadId: string;
    moduleId: ModuleId;
    data: Record<string, unknown>;
    content: string;
    pageName: string;
    createdAt: string;
}

export interface CreateThreadRequest {
    threadId: string;
    moduleId: string;
    title: string;
    description: string;
    status?: string;
}

export interface UpdateThreadRequest {
    title?: string;
    description?: string;
    status?: string;
}

export interface CreateArtifactRequest {
    content: string;
    pageName?: string;
    moduleId: string;
    data?: Record<string, unknown>;
}

export interface ListThreadsParams {
    moduleId: ModuleId;
    status?: string;
    skip?: number;
    limit?: number;
}
