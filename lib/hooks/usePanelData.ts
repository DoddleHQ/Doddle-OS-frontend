'use client';

import { useEffect, useState } from 'react';
import { AGENT_LIST } from '@/components/v2/content-factory/agents';
import { threadService } from '@/lib/services/threadService';
import type { AuditArtifact, AuditThread, ModuleId } from '@/lib/types/thread.types';

export const THREAD_MODULES: ModuleId[] = Array.from(
    new Set<ModuleId>([...AGENT_LIST.map((a) => a.moduleId), 'content-factory', 'magento-content-writer'])
);

async function fetchAllThreads(workspaceId: string): Promise<AuditThread[]> {
    const lists = await Promise.all(
        THREAD_MODULES.map((m) =>
            threadService.listThreads(workspaceId, { moduleId: m, limit: 20 }).catch(() => [])
        )
    );
    return lists
        .flat()
        .sort(
            (a, b) =>
                new Date(b.updatedAt ?? b.createdAt).getTime() -
                new Date(a.updatedAt ?? a.createdAt).getTime()
        );
}

export function threadHref(workspaceId: string, thread: AuditThread): string {
    const m = thread.moduleId;
    if (AGENT_LIST.some((a) => a.moduleId === m)) {
        return `/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${m}/${thread.id}`;
    }
    if (m === 'magento-content-writer') {
        return `/legacy/workspaces/${workspaceId}/modules/content-factory/${m}/${thread.id}`;
    }
    return `/legacy/workspaces/${workspaceId}/modules/${m}`;
}

export function useAttentionThreads(workspaceId: string, enabled: boolean) {
    const [threads, setThreads] = useState<AuditThread[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let mounted = true;
        setLoading(true);
        fetchAllThreads(workspaceId)
            .then((all) => {
                if (mounted) setThreads(all.filter((t) => t.status === 'error'));
            })
            .catch(() => {
                if (mounted) setThreads([]);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [workspaceId, enabled]);

    return { threads, loading };
}

export interface VaultArtifact extends AuditArtifact {
    threadTitle: string;
}

export function useRecentArtifacts(workspaceId: string, enabled: boolean) {
    const [artifacts, setArtifacts] = useState<VaultArtifact[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let mounted = true;
        setLoading(true);
        (async () => {
            try {
                const threads = await fetchAllThreads(workspaceId);
                const recent = threads.slice(0, 5);
                const lists = await Promise.all(
                    recent.map((t) =>
                        threadService
                            .listArtifacts(workspaceId, t.moduleId, t.id)
                            .catch(() => [] as AuditArtifact[])
                    )
                );
                if (!mounted) return;
                const merged: VaultArtifact[] = lists.flatMap((arts, i) =>
                    arts.map((a) => ({ ...a, threadTitle: recent[i].title || 'Untitled' }))
                );
                merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setArtifacts(merged.slice(0, 10));
            } catch {
                if (mounted) setArtifacts([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [workspaceId, enabled]);

    return { artifacts, loading };
}
