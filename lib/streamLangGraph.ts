import { getLangGraphApiUrl, getLangGraphConfig } from './config/langgraph.config';
import { debugLog } from './utils/debugLog';

export interface StreamOptions {
    assistantId: string;
    input?: Record<string, any>;
    threadId?: string;
    command?: {
        goto?: {
            node: string;
            input?: Record<string, any>;
        };
        resume?: any;
    };
    signal?: AbortSignal;
    onEvent?: (event: any) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
}

export interface StreamResponse<T> {
    success: boolean;
    data?: T;
    threadId?: string;
    interrupts?: any[];
    error?: string;
}

export interface ThreadState {
    values: Record<string, any>;
    next: string[];
    tasks: Array<{
        id: string;
        name: string;
        interrupts?: Array<{
            value: any;
            resumable: boolean;
            ns?: string[];
        }>;
    }>;
    metadata?: Record<string, any>;
    checkpoint?: Record<string, any>;
}

export function getLangGraphBaseUrl(): string {
    return getLangGraphApiUrl();
}

export async function createThread(metadata?: Record<string, any>): Promise<string> {
    const baseUrl = getLangGraphBaseUrl();

    const response = await fetch(`${baseUrl}/threads`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            metadata: metadata || {},
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create thread: ${response.status}`);
    }

    const data = await response.json();
    return data.thread_id;
}

export async function getThreadState(threadId: string): Promise<ThreadState | null> {
    const baseUrl = getLangGraphBaseUrl();

    try {
        const response = await fetch(`${baseUrl}/threads/${threadId}/state`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`Failed to get thread state: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching thread state:', error);
        return null;
    }
}

export async function streamLangGraphEvents<T = any>(options: StreamOptions): Promise<StreamResponse<T>> {
    const { assistantId, input, threadId, command, signal, onEvent, onError, onComplete } = options;

    const baseUrl = getLangGraphBaseUrl();
    let currentThreadId = threadId;

    try {
        if (!currentThreadId && input) {
            currentThreadId = await createThread({
                assistant_id: assistantId,
            });
        }

        const requestBody: Record<string, any> = {
            assistant_id: assistantId,
            stream_mode: ["custom"],
            stream_subgraphs: true,
            checkpoint_during: true,
            stream_resumable: true,
            on_completion: "keep",
            on_disconnect: "continue",
            after_seconds: 0,
            durability: "async",
        };

        if (input) {
            requestBody.input = input;
        }

        if (command) {
            requestBody.command = command;
        }

        const endpoint = currentThreadId
            ? `${baseUrl}/threads/${currentThreadId}/runs/stream`
            : `${baseUrl}/runs/stream`;

        debugLog('[LangGraph] Starting stream request:', {
            endpoint,
            assistantId,
            threadId: currentThreadId,
            hasInput: !!input,
            hasCommand: !!command,
            command: command ? JSON.stringify(command).substring(0, 200) : undefined,
        });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            signal,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server responded with ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.detail || errorJson.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            const error = new Error(errorMessage);
            if (onError) {
                onError(error);
            }
            return {
                success: false,
                threadId: currentThreadId,
                error: errorMessage
            };
        }

        if (!response.body) {
            const error = new Error('No response body available for streaming');
            if (onError) {
                onError(error);
            }
            return {
                success: false,
                threadId: currentThreadId,
                error: 'No response body available for streaming'
            };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedData += chunk;

                const lines = accumulatedData.split('\n');
                accumulatedData = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    if (!trimmedLine || trimmedLine === ': heartbeat') continue;

                    if (trimmedLine.startsWith('event:')) {
                        continue;
                    }

                    if (!trimmedLine.startsWith('data: ')) continue;

                    try {
                        const jsonStr = trimmedLine.replace(/^data: /, '');

                        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) continue;

                        const parsed = JSON.parse(jsonStr);

                        const events = Array.isArray(parsed) ? parsed : [parsed];

                        for (const event of events) {
                            debugLog('[SSE Event]', event?.type || 'unknown', JSON.stringify(event).substring(0, 200));

                            if (onEvent) {
                                onEvent(event);
                            }
                        }
                    } catch (e) {
                        debugLog('Non-JSON SSE data:', trimmedLine);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        let interrupts: any[] | undefined;
        if (currentThreadId) {
            try {
                debugLog('[LangGraph] Stream ended. Checking thread state for interrupts...');
                const threadState = await getThreadState(currentThreadId);
                debugLog('[LangGraph] Thread state:', JSON.stringify({
                    hasValues: !!threadState?.values,
                    next: threadState?.next,
                    tasksCount: threadState?.tasks?.length,
                    tasks: threadState?.tasks?.map(t => ({
                        id: t.id,
                        name: t.name,
                        interruptsCount: t.interrupts?.length,
                        interrupts: t.interrupts?.map(i => ({
                            resumable: i.resumable,
                            valueType: typeof i.value,
                            valuePreview: typeof i.value === 'string'
                                ? i.value.substring(0, 200)
                                : JSON.stringify(i.value).substring(0, 200),
                        })),
                    })),
                }, null, 2));

                if (threadState?.tasks) {
                    const pendingInterrupts = threadState.tasks
                        .filter(task => task.interrupts && task.interrupts.length > 0)
                        .flatMap(task => task.interrupts!.map(interrupt => ({
                            ...interrupt,
                            taskId: task.id,
                            taskName: task.name,
                        })));

                    if (pendingInterrupts.length > 0) {
                        interrupts = pendingInterrupts;
                        debugLog('[LangGraph] Detected pending interrupts:', pendingInterrupts.length);
                    } else {
                        debugLog('[LangGraph] No pending interrupts found in thread state');
                    }
                } else {
                    debugLog('[LangGraph] No tasks in thread state (threadState null?', !threadState, ')');
                }
            } catch (e) {
                console.error('[LangGraph] Error checking thread state:', e);
            }
        } else {
            debugLog('[LangGraph] No thread ID available to check for interrupts');
        }

        if (onComplete) {
            onComplete();
        }

        return {
            success: true,
            threadId: currentThreadId,
            interrupts,
        };

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            if (onError) {
                onError(error);
            }
            return {
                success: false,
                threadId: currentThreadId,
                error: 'Stream was aborted'
            };
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (onError) {
            onError(error instanceof Error ? error : new Error(errorMessage));
        }

        return {
            success: false,
            threadId: currentThreadId,
            error: errorMessage
        };
    }
}

export async function resumeLangGraphWorkflow<T = any>(
    threadId: string,
    assistantId: string,
    resumeValue: any,
    options?: {
        signal?: AbortSignal;
        onEvent?: (event: any) => void;
        onError?: (error: Error) => void;
        onComplete?: () => void;
    }
): Promise<StreamResponse<T>> {
    return streamLangGraphEvents<T>({
        assistantId,
        threadId,
        command: {
            resume: resumeValue
        },
        ...options
    });
}
