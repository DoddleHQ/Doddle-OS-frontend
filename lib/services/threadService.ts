import {
    AuditThread,
    AuditArtifact,
    CreateThreadRequest,
    UpdateThreadRequest,
    CreateArtifactRequest,
    ListThreadsParams,
    ListThreadsResponse,
    ListArtifactsResponse,
} from '@/lib/types/thread.types';

const USE_MOCK = true;

const mockThreadsStore = new Map<string, AuditThread>();
const mockArtifactsStore = new Map<string, AuditArtifact[]>();

function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function mockCreateThread(request: CreateThreadRequest): Promise<AuditThread> {
    await delay(300);

    const thread: AuditThread = {
        id: request.id,
        workspaceId: request.workspaceId,
        title: request.title || 'New Thread',
        status: 'running',
        moduleSlug: request.moduleSlug,
        input: request.input,
        artifactCount: 0,
        pageNames: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    mockThreadsStore.set(thread.id, thread);
    mockArtifactsStore.set(thread.id, []);

    return thread;
}

async function mockGetThread(threadId: string): Promise<AuditThread> {
    await delay(200);

    const thread = mockThreadsStore.get(threadId);
    if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
    }
    return thread;
}

async function mockUpdateThread(threadId: string, updates: UpdateThreadRequest): Promise<AuditThread> {
    await delay(200);

    const thread = mockThreadsStore.get(threadId);
    if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
    }

    const updated: AuditThread = {
        ...thread,
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    mockThreadsStore.set(threadId, updated);
    return updated;
}

async function mockListThreads(params: ListThreadsParams): Promise<ListThreadsResponse> {
    await delay(400);

    let threads = Array.from(mockThreadsStore.values())
        .filter(t => t.workspaceId === params.workspaceId)
        .filter(t => !params.moduleSlug || t.moduleSlug === params.moduleSlug)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = threads.length;

    if (params.offset) {
        threads = threads.slice(params.offset);
    }
    if (params.limit) {
        threads = threads.slice(0, params.limit);
    }

    return { threads, total };
}

async function mockCreateArtifact(request: CreateArtifactRequest): Promise<AuditArtifact> {
    await delay(150);

    const artifact: AuditArtifact = {
        id: generateId('artifact'),
        threadId: request.threadId,
        artifactId: request.artifactId,
        artifactType: request.artifactType,
        title: request.title,
        description: request.description,
        content: request.content,
        metadata: request.metadata as AuditArtifact['metadata'],
        createdAt: new Date().toISOString(),
    };

    const existing = mockArtifactsStore.get(request.threadId) || [];
    existing.push(artifact);
    mockArtifactsStore.set(request.threadId, existing);

    const thread = mockThreadsStore.get(request.threadId);
    if (thread) {
        thread.artifactCount = existing.length;
        if (!thread.pageNames.includes(request.title)) {
            thread.pageNames = [...thread.pageNames, request.title];
        }
        thread.updatedAt = new Date().toISOString();
        mockThreadsStore.set(request.threadId, thread);
    }

    return artifact;
}

async function mockListArtifacts(threadId: string): Promise<ListArtifactsResponse> {
    await delay(300);

    const artifacts = mockArtifactsStore.get(threadId) || [];
    return { artifacts };
}

export const threadService = {
    async createThread(request: CreateThreadRequest): Promise<AuditThread> {
        if (USE_MOCK) return mockCreateThread(request);
        throw new Error('API not configured');
    },

    async getThread(threadId: string): Promise<AuditThread> {
        if (USE_MOCK) return mockGetThread(threadId);
        throw new Error('API not configured');
    },

    async updateThread(threadId: string, updates: UpdateThreadRequest): Promise<AuditThread> {
        if (USE_MOCK) return mockUpdateThread(threadId, updates);
        throw new Error('API not configured');
    },

    async listThreads(params: ListThreadsParams): Promise<ListThreadsResponse> {
        if (USE_MOCK) return mockListThreads(params);
        throw new Error('API not configured');
    },

    async createArtifact(request: CreateArtifactRequest): Promise<AuditArtifact> {
        if (USE_MOCK) return mockCreateArtifact(request);
        throw new Error('API not configured');
    },

    async listArtifacts(threadId: string): Promise<ListArtifactsResponse> {
        if (USE_MOCK) return mockListArtifacts(threadId);
        throw new Error('API not configured');
    },
};
