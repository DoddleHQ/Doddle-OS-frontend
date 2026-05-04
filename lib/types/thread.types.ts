import { ArtifactType } from './graph-events.types';

export type ThreadStatus = 'idle' | 'running' | 'hitl_pending' | 'complete' | 'error';

export interface AuditThread {
    id: string;
    workspaceId: string;
    title: string;
    status: ThreadStatus;
    moduleSlug: string;
    input: Record<string, unknown>;
    artifactCount: number;
    pageNames: string[];
    createdAt: string;
    updatedAt: string;
}

export interface AuditArtifact {
    id: string;
    threadId: string;
    artifactId: string;
    artifactType: ArtifactType;
    title: string;
    description?: string;
    content: unknown;
    metadata?: {
        mimeType?: string;
        size?: number;
        [key: string]: unknown;
    };
    createdAt: string;
}

export interface CreateThreadRequest {
    id: string;
    workspaceId: string;
    title?: string;
    moduleSlug: string;
    input: Record<string, unknown>;
}

export interface CreateThreadResponse {
    thread: AuditThread;
}

export interface UpdateThreadRequest {
    title?: string;
    status?: ThreadStatus;
    pageNames?: string[];
}

export interface CreateArtifactRequest {
    threadId: string;
    artifactId: string;
    artifactType: ArtifactType;
    title: string;
    description?: string;
    content: unknown;
    metadata?: Record<string, unknown>;
}

export interface ListThreadsParams {
    workspaceId: string;
    moduleSlug?: string;
    limit?: number;
    offset?: number;
}

export interface ListThreadsResponse {
    threads: AuditThread[];
    total: number;
}

export interface ListArtifactsParams {
    threadId: string;
}

export interface ListArtifactsResponse {
    artifacts: AuditArtifact[];
}
