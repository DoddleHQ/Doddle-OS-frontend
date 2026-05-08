'use client';

import React, { useState } from 'react';
import { threadService } from '@/lib/services/threadService';
import { AuditThread, AuditArtifact, ModuleId } from '@/lib/types/thread.types';

type LogEntry = { id: number; action: string; status: 'pending' | 'success' | 'error'; data?: any; error?: string; timestamp: string };

const MODULE_IDS: ModuleId[] = ['business-audit', 'content-factory', 'seo-cluster', 'social-growth', 'saas-launch-ops'];

function formatModuleName(slug: string): string {
    return slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function ApiPlaygroundPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState<string | null>(null);
    const [activeThreadId, setActiveThreadId] = useState('');
    const [threads, setThreads] = useState<AuditThread[]>([]);
    const [artifacts, setArtifacts] = useState<AuditArtifact[]>([]);

    const [playgroundWorkspaceId, setPlaygroundWorkspaceId] = useState('ws-default');

    const [createThreadId, setCreateThreadId] = useState(`lg-test-${Date.now()}`);
    const [createThreadTitle, setCreateThreadTitle] = useState('Test Audit Thread');
    const [createThreadDesc, setCreateThreadDesc] = useState('A test thread from the API playground');
    const [createThreadModule, setCreateThreadModule] = useState<ModuleId>('business-audit');

    const [listThreadsModule, setListThreadsModule] = useState<ModuleId>('business-audit');
    const [listThreadsSkip, setListThreadsSkip] = useState('');
    const [listThreadsLimit, setListThreadsLimit] = useState('');

    const [getThreadModule, setGetThreadModule] = useState<ModuleId>('business-audit');

    const [updateThreadModule, setUpdateThreadModule] = useState<ModuleId>('business-audit');
    const [updateThreadTitle, setUpdateThreadTitle] = useState('Updated Title');
    const [updateThreadDesc, setUpdateThreadDesc] = useState('Updated description');

    const [artifactModule, setArtifactModule] = useState<ModuleId>('business-audit');
    const [artifactContent, setArtifactContent] = useState('# Test Artifact\n\n## Findings\n\n- Item 1\n- Item 2\n- Item 3\n\n## Score: 85/100');
    const [artifactPageName, setArtifactPageName] = useState('Test Artifact');

    const logIdRef = React.useRef(0);

    function addLog(action: string, status: LogEntry['status'], data?: any, error?: string) {
        logIdRef.current += 1;
        setLogs(prev => [{
            id: logIdRef.current, action, status, data, error,
            timestamp: new Date().toLocaleTimeString(),
        }, ...prev]);
    }

    async function run(action: string, fn: () => Promise<any>) {
        setLoading(action);
        addLog(action, 'pending');
        try {
            const result = await fn();
            addLog(action, 'success', result);
            setLoading(null);
            return result;
        } catch (err: any) {
            addLog(action, 'error', undefined, err.message);
            setLoading(null);
            throw err;
        }
    }

    const handleCreateThread = async () => {
        const thread = await run('POST Create Thread', () =>
            threadService.createThread(playgroundWorkspaceId, {
                threadId: createThreadId,
                title: createThreadTitle,
                description: createThreadDesc,
                moduleId: createThreadModule,
            })
        );
        setActiveThreadId(thread.id);
        setThreads(prev => [thread, ...prev]);
    };

    const handleListThreads = async () => {
        const params: { moduleId: ModuleId; skip?: number; limit?: number } = { moduleId: listThreadsModule };
        if (listThreadsSkip) params.skip = Number(listThreadsSkip);
        if (listThreadsLimit) params.limit = Number(listThreadsLimit);
        const result = await run('GET List Threads', () =>
            threadService.listThreads(playgroundWorkspaceId, params)
        );
        setThreads(result);
    };

    const handleGetThread = async () => {
        if (!activeThreadId) return;
        await run('GET Thread', () =>
            threadService.getThread(playgroundWorkspaceId, getThreadModule, activeThreadId)
        );
    };

    const handleUpdateThread = async () => {
        if (!activeThreadId) return;
        const body: { title?: string; description?: string } = {};
        if (updateThreadTitle) body.title = updateThreadTitle;
        if (updateThreadDesc) body.description = updateThreadDesc;
        await run('PATCH Update Thread', () =>
            threadService.updateThread(playgroundWorkspaceId, updateThreadModule, activeThreadId, body)
        );
    };

    const handleDeleteThread = async (id: string, moduleId: ModuleId) => {
        await run('DELETE Thread', () =>
            threadService.deleteThread(playgroundWorkspaceId, moduleId, id)
        );
        setThreads(prev => prev.filter(t => t.id !== id));
        if (activeThreadId === id) setActiveThreadId('');
    };

    const handleCreateArtifact = async () => {
        if (!activeThreadId) return;
        const artifact = await run('POST Create Artifact', () =>
            threadService.createArtifact(playgroundWorkspaceId, artifactModule, activeThreadId, {
                content: artifactContent,
                pageName: artifactPageName,
                moduleId: artifactModule,
                data: {},
            })
        );
        setArtifacts(prev => [...prev, artifact]);
    };

    const handleListArtifacts = async () => {
        if (!activeThreadId) return;
        const result = await run('GET List Artifacts', () =>
            threadService.listArtifacts(playgroundWorkspaceId, artifactModule, activeThreadId)
        );
        setArtifacts(result);
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">API Playground</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Base URL: <code className="bg-neutral-100 px-2 py-0.5 rounded text-xs font-mono">{process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}</code>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        <label className="text-sm text-neutral-600">Workspace ID:</label>
                        <input
                            value={playgroundWorkspaceId}
                            onChange={e => setPlaygroundWorkspaceId(e.target.value)}
                            className="border border-neutral-200 rounded px-2 py-1 text-sm font-mono w-48"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <ActiveThreadId id={activeThreadId} onChange={setActiveThreadId} />

                        <SectionCard title="POST /threads — Create Thread" loading={loading} action="POST Create Thread" onSend={handleCreateThread}>
                            <Row label="Thread ID">
                                <input value={createThreadId} onChange={e => setCreateThreadId(e.target.value)} className={inputCls} />
                            </Row>
                            <Row label="Title">
                                <input value={createThreadTitle} onChange={e => setCreateThreadTitle(e.target.value)} className={inputCls} />
                            </Row>
                            <Row label="Description">
                                <input value={createThreadDesc} onChange={e => setCreateThreadDesc(e.target.value)} className={inputCls} />
                            </Row>
                            <Row label="Module ID">
                                <ModuleSelect value={createThreadModule} onChange={setCreateThreadModule} />
                            </Row>
                        </SectionCard>

                        <SectionCard title="GET /threads — List Threads" loading={loading} action="GET List Threads" onSend={handleListThreads}>
                            <Row label="Module ID">
                                <ModuleSelect value={listThreadsModule} onChange={setListThreadsModule} />
                            </Row>
                            <Row label="Skip">
                                <input value={listThreadsSkip} onChange={e => setListThreadsSkip(e.target.value)} className={inputCls} placeholder="0" type="number" />
                            </Row>
                            <Row label="Limit">
                                <input value={listThreadsLimit} onChange={e => setListThreadsLimit(e.target.value)} className={inputCls} placeholder="100" type="number" />
                            </Row>
                        </SectionCard>

                        <SectionCard title="GET /threads/{id} — Get Thread" loading={loading} action="GET Thread" onSend={handleGetThread}>
                            <Row label="Module ID">
                                <ModuleSelect value={getThreadModule} onChange={setGetThreadModule} />
                            </Row>
                        </SectionCard>

                        <SectionCard title="PATCH /threads/{id} — Update Thread" loading={loading} action="PATCH Update Thread" onSend={handleUpdateThread}>
                            <Row label="Module ID">
                                <ModuleSelect value={updateThreadModule} onChange={setUpdateThreadModule} />
                            </Row>
                            <Row label="Title">
                                <input value={updateThreadTitle} onChange={e => setUpdateThreadTitle(e.target.value)} className={inputCls} />
                            </Row>
                            <Row label="Description">
                                <input value={updateThreadDesc} onChange={e => setUpdateThreadDesc(e.target.value)} className={inputCls} />
                            </Row>
                        </SectionCard>

                        <SectionCard title="POST /threads/{id}/artifacts — Create Artifact" loading={loading} action="POST Create Artifact" onSend={handleCreateArtifact}>
                            <Row label="Module ID">
                                <ModuleSelect value={artifactModule} onChange={setArtifactModule} />
                            </Row>
                            <Row label="Page Name">
                                <input value={artifactPageName} onChange={e => setArtifactPageName(e.target.value)} className={inputCls} placeholder="Untitled Artifact" />
                            </Row>
                            <Row label="Content">
                                <textarea value={artifactContent} onChange={e => setArtifactContent(e.target.value)} rows={6} className={`${inputCls} resize-y`} />
                            </Row>
                        </SectionCard>

                        <SectionCard title="GET /threads/{id}/artifacts — List Artifacts" loading={loading} action="GET List Artifacts" onSend={handleListArtifacts}>
                            <Row label="Module ID">
                                <ModuleSelect value={artifactModule} onChange={setArtifactModule} />
                            </Row>
                        </SectionCard>

                        {threads.length > 0 && (
                            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
                                <h3 className="text-sm font-semibold text-neutral-800">Threads ({threads.length})</h3>
                                <div className="space-y-2 max-h-64 overflow-auto">
                                    {threads.map(t => (
                                        <div key={t.id} className="flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-lg p-3 text-sm">
                                            <div className="min-w-0 cursor-pointer" onClick={() => setActiveThreadId(t.id)}>
                                                <p className="font-medium truncate">{t.title}</p>
                                                <p className="text-xs text-neutral-400 font-mono">{t.id}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                <span className="text-xs text-neutral-500">{t.docCount} docs</span>
                                                <span className="text-xs text-neutral-400">{formatModuleName(t.moduleId)}</span>
                                                <button
                                                    onClick={() => setActiveThreadId(t.id)}
                                                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                                                >
                                                    Use
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteThread(t.id, t.moduleId)}
                                                    disabled={loading !== null}
                                                    className="px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                                                >
                                                    Del
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {artifacts.length > 0 && (
                            <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
                                <h3 className="text-sm font-semibold text-neutral-800">Artifacts ({artifacts.length})</h3>
                                <div className="space-y-2 max-h-64 overflow-auto">
                                    {artifacts.map(a => (
                                        <div key={a.id} className="bg-neutral-50 border border-neutral-100 rounded-lg p-3">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium text-neutral-700">{a.pageName || `Artifact #${a.id}`}</span>
                                                <span className="text-neutral-400">{new Date(a.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <pre className="text-xs text-neutral-700 overflow-auto max-h-24 whitespace-pre-wrap">{a.content}</pre>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="sticky top-8">
                            <h3 className="text-sm font-semibold text-neutral-800 mb-3">Request / Response Log</h3>
                            <div className="space-y-2 max-h-[85vh] overflow-auto">
                                {logs.length === 0 && (
                                    <p className="text-xs text-neutral-400 italic">No requests yet.</p>
                                )}
                                {logs.map(log => (
                                    <div key={log.id} className={`rounded-lg p-3 text-xs border ${
                                        log.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                                        log.status === 'success' ? 'bg-green-50 border-green-200' :
                                        'bg-red-50 border-red-200'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold">{log.action}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`uppercase font-bold text-[10px] ${
                                                    log.status === 'pending' ? 'text-yellow-600' :
                                                    log.status === 'success' ? 'text-green-600' : 'text-red-600'
                                                }`}>{log.status}</span>
                                                <span className="text-neutral-400">{log.timestamp}</span>
                                            </div>
                                        </div>
                                        {log.error && <p className="text-red-700 font-mono mt-1">{log.error}</p>}
                                        {log.data && (
                                            <pre className="mt-2 bg-white rounded p-2 overflow-auto max-h-48 border text-neutral-700 whitespace-pre-wrap">
                                                {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const inputCls = 'w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-neutral-600 w-24 flex-shrink-0 text-right">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

function ModuleSelect({ value, onChange }: { value: ModuleId; onChange: (v: ModuleId) => void }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value as ModuleId)} className={inputCls}>
            {MODULE_IDS.map(id => (
                <option key={id} value={id}>{formatModuleName(id)}</option>
            ))}
        </select>
    );
}

function SectionCard({ title, loading, action, onSend, disabled, children }: {
    title: string;
    loading: string | null;
    action: string;
    onSend: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-800 font-mono">{title}</h3>
                <SendButton onClick={onSend} loading={loading} action={action} disabled={disabled} />
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function ActiveThreadId({ id, onChange }: { id: string; onChange: (v: string) => void }) {
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <label className="text-sm font-medium text-blue-800 whitespace-nowrap">Active Thread ID:</label>
            <input
                value={id}
                onChange={e => onChange(e.target.value)}
                placeholder="Enter or select a thread ID"
                className="flex-1 px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-blue-300"
            />
        </div>
    );
}

function SendButton({ onClick, loading, action, disabled }: {
    onClick: () => void; loading: string | null; action: string; disabled?: boolean;
}) {
    const isLoading = loading === action;
    return (
        <button
            onClick={onClick}
            disabled={disabled || (loading !== null && !isLoading)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                disabled
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : isLoading
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95'
            }`}
        >
            {isLoading ? 'Sending...' : 'Send'}
        </button>
    );
}
