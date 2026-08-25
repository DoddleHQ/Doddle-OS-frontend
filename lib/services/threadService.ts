import {
    AuditThread,
    AuditArtifact,
    CreateThreadRequest,
    UpdateThreadRequest,
    CreateArtifactRequest,
    ListThreadsParams,
    ModuleId,
    ThreadStatus,
} from '@/lib/types/thread.types';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/services/apiClient';

// ---------------------------------------------------------------------------
// Raw API response shapes (camelCase from backend)
// ---------------------------------------------------------------------------

interface RawThread {
    id?: string;
    threadId?: string;
    langId?: string;
    workspaceId: string;
    moduleId: string;
    title: string;
    description: string;
    status: string;
    artifactCount?: number;
    pageNames: string[];
    createdAt: string;
    updatedAt: string | null;
}

interface RawArtifact {
    /** The API returns the obfuscated `artifactId`; the numeric `id` is legacy. */
    id?: number;
    artifactId?: string;
    threadId: string;
    moduleId: string;
    data: Record<string, unknown>;
    content: string;
    pageName: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toThread(raw: RawThread): AuditThread {
    return {
        id: raw.id || raw.threadId || '',
        workspaceId: raw.workspaceId,
        moduleId: raw.moduleId as ModuleId,
        langId: raw.langId ?? null,
        title: raw.title,
        description: raw.description,
        status: raw.status as ThreadStatus,
        docCount: raw.artifactCount ?? 0,
        pageNames: raw.pageNames || [],
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

function toArtifact(raw: RawArtifact): AuditArtifact {
    return {
        id: raw.artifactId ?? raw.id ?? 0,
        threadId: raw.threadId,
        moduleId: raw.moduleId as ModuleId,
        data: raw.data,
        content: raw.content,
        pageName: raw.pageName,
        createdAt: raw.createdAt,
    };
}

// ---------------------------------------------------------------------------
// URL helper
// ---------------------------------------------------------------------------

function threadsUrl(workspaceId: string, moduleId: string, ...segments: string[]): string {
    const base = `/api/v1/workspaces/${workspaceId}/modules/${moduleId}/threads`;
    return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
}

// ---------------------------------------------------------------------------
// Thread Service
// ---------------------------------------------------------------------------

export const threadService = {
    async listThreads(workspaceId: string, params: ListThreadsParams): Promise<AuditThread[]> {
        const url = threadsUrl(workspaceId, params.moduleId);
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.set('status', params.status);
        if (params.skip) searchParams.set('skip', String(params.skip));
        if (params.limit) searchParams.set('limit', String(params.limit));
        const fullUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;

        const raw: RawThread[] = await apiGet(fullUrl);
        return raw.map(toThread);
    },

    async createThread(workspaceId: string, request: CreateThreadRequest): Promise<AuditThread> {
        const url = threadsUrl(workspaceId, request.moduleId);
        const raw: RawThread = await apiPost(url, {
            // The backend expects `langId` (LangGraph thread ID), not `threadId`.
            // `request.threadId` carries the LangGraph-assigned ID from the stream.
            langId: request.threadId,
            moduleId: request.moduleId,
            title: request.title,
            description: request.description,
            status: request.status || 'running',
        });
        return toThread(raw);
    },

    async getThread(workspaceId: string, moduleId: ModuleId, threadId: string): Promise<AuditThread> {
        const url = threadsUrl(workspaceId, moduleId, threadId);
        const raw: RawThread = await apiGet(url);
        return toThread(raw);
    },

    async updateThread(
        workspaceId: string,
        moduleId: ModuleId,
        threadId: string,
        updates: UpdateThreadRequest
    ): Promise<AuditThread> {
        const url = threadsUrl(workspaceId, moduleId, threadId);
        const raw: RawThread = await apiPatch(url, updates);
        return toThread(raw);
    },

    async deleteThread(workspaceId: string, moduleId: ModuleId, threadId: string): Promise<void> {
        const url = threadsUrl(workspaceId, moduleId, threadId);
        await apiDelete(url);
    },

    async createArtifact(
        workspaceId: string,
        moduleId: ModuleId,
        threadId: string,
        request: CreateArtifactRequest
    ): Promise<AuditArtifact> {
        const url = `${threadsUrl(workspaceId, moduleId, threadId)}/artifacts`;
        const raw: RawArtifact = await apiPost(url, {
            data: request.data || {},
            content: request.content,
            pageName: request.pageName || 'Untitled Artifact',
            moduleId: request.moduleId,
        });
        return toArtifact(raw);
    },

    async listArtifacts(
        workspaceId: string,
        moduleId: ModuleId,
        threadId: string
    ): Promise<AuditArtifact[]> {
        const url = `${threadsUrl(workspaceId, moduleId, threadId)}/artifacts`;
        const raw: RawArtifact[] = await apiGet(url);
        return raw.map(toArtifact);
    },
};
