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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_AUTH_TOKEN = process.env.NEXT_PUBLIC_API_AUTH_TOKEN || '';

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (API_AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${API_AUTH_TOKEN}`;
    }
    return headers;
}

interface RawThread {
    id: string;
    workspace_id: string;
    module_id: string;
    title: string;
    description: string;
    status: string;
    docCount: number;
    page_names: string[];
    created_at: string;
    updated_at: string | null;
}

interface RawArtifact {
    id: number;
    thread_id: string;
    module_id: string;
    data: Record<string, unknown>;
    content: string;
    page_name: string;
    created_at: string;
}

function toThread(raw: RawThread & { thread_id?: string }): AuditThread {
    return {
        id: raw.id || raw.thread_id || '',
        workspaceId: raw.workspace_id,
        moduleId: raw.module_id as ModuleId,
        title: raw.title,
        description: raw.description,
        status: raw.status as ThreadStatus,
        docCount: raw.docCount,
        pageNames: raw.page_names,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
    };
}

function toArtifact(raw: RawArtifact): AuditArtifact {
    return {
        id: raw.id,
        threadId: raw.thread_id,
        moduleId: raw.module_id as ModuleId,
        data: raw.data,
        content: raw.content,
        pageName: raw.page_name,
        createdAt: raw.created_at,
    };
}

function threadsUrl(workspaceId: string, moduleId: string, ...segments: string[]): string {
    const base = `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/modules/${moduleId}/threads`;
    return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
}

export const threadService = {
    async listThreads(workspaceId: string, params: ListThreadsParams): Promise<AuditThread[]> {
        const url = threadsUrl(workspaceId, params.moduleId);
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.set('status', params.status);
        if (params.skip) searchParams.set('skip', String(params.skip));
        if (params.limit) searchParams.set('limit', String(params.limit));
        const fullUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;

        const res = await fetch(fullUrl, { headers: authHeaders() });
        if (!res.ok) {
            throw new Error(`Failed to list threads (${res.status})`);
        }
        const raw: RawThread[] = await res.json();
        return raw.map(toThread);
    },

    async createThread(workspaceId: string, request: CreateThreadRequest): Promise<AuditThread> {
        const url = threadsUrl(workspaceId, request.moduleId);
        const res = await fetch(url, {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: request.threadId,
                thread_id: request.threadId,
                module_id: request.moduleId,
                title: request.title,
                description: request.description,
                status: request.status || 'running',
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Failed to create thread (${res.status})`);
        }
        const raw: RawThread = await res.json();
        return toThread(raw);
    },

    async getThread(workspaceId: string, moduleId: ModuleId, threadId: string): Promise<AuditThread> {
        const url = threadsUrl(workspaceId, moduleId, threadId);
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) {
            throw new Error(`Failed to get thread (${res.status})`);
        }
        const raw: RawThread = await res.json();
        return toThread(raw);
    },

    async updateThread(
        workspaceId: string,
        moduleId: ModuleId,
        threadId: string,
        updates: UpdateThreadRequest
    ): Promise<AuditThread> {
        const url = threadsUrl(workspaceId, moduleId, threadId);
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!res.ok) {
            throw new Error(`Failed to update thread (${res.status})`);
        }
        const raw: RawThread = await res.json();
        return toThread(raw);
    },

    async deleteThread(workspaceId: string, moduleId: ModuleId, threadId: string): Promise<void> {
        const url = threadsUrl(workspaceId, moduleId, threadId);
        const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) {
            throw new Error(`Failed to delete thread (${res.status})`);
        }
    },

    async createArtifact(
        workspaceId: string,
        moduleId: ModuleId,
        threadId: string,
        request: CreateArtifactRequest
    ): Promise<AuditArtifact> {
        const url = `${threadsUrl(workspaceId, moduleId, threadId)}/artifacts`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: request.data || {},
                content: request.content,
                page_name: request.pageName || 'Untitled Artifact',
                moduleId: request.moduleId,
            }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Failed to save artifact (${res.status})`);
        }
        const raw: RawArtifact = await res.json();
        return toArtifact(raw);
    },

    async listArtifacts(
        workspaceId: string,
        moduleId: ModuleId,
        threadId: string
    ): Promise<AuditArtifact[]> {
        const url = `${threadsUrl(workspaceId, moduleId, threadId)}/artifacts`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) {
            throw new Error(`Failed to list artifacts (${res.status})`);
        }
        const raw: RawArtifact[] = await res.json();
        return raw.map(toArtifact);
    },
};
