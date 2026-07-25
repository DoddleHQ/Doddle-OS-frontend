'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Bot, Store, Wrench, Brain, Zap, Copy, Check, Download } from 'lucide-react';
import { useThread } from '@/lib/contexts/ThreadContext';
import { getLangGraphApiUrl } from '@/lib/config/langgraph.config';
import MarkdownRenderer from '@/components/content-factory/chat/artifacts/MarkdownRenderer';
import Notification from '@/components/ui/Notification';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool_call' | 'tool_result';
    content: string;
    timestamp: Date;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    isStreaming?: boolean;
    toolCallId?: string;
    isComplete?: boolean;
}

type AgentPhase = 'reasoning' | 'tool_calling' | 'tool_executing' | 'tool_result' | 'answering' | 'done';

interface StreamState {
    status: 'idle' | 'connecting' | 'streaming' | 'error';
    error: string | null;
    activeNode: string | null;
    phase: AgentPhase;
}

// ============================================================================
// Constants
// ============================================================================

const ASSISTANT_ID = 'merchant_analyst';

// ============================================================================
// New Analysis Page
// ============================================================================

/**
 * New Analysis Page - Continuous Chat Interface for Merchant Analyst
 *
 * Uses LangGraph messages protocol with full streaming (identical to Google Analyst):
 * - Input: { messages: [{ role: "user", content: "..." }] }
 * - Stream mode: ["messages", "updates"]
 * - Events: messages/partial, messages/complete, updates
 *
 * Phase-based state machine:
 *   reasoning → tool_calling → tool_executing → tool_result → reasoning (repeat) → answering → done
 *
 * Each agent response is automatically saved as a 'report' artifact.
 * Assistant messages include Copy and Download action buttons.
 */
export default function NewAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;

    const {
        createThreadFromStream,
        saveArtifact,
    } = useThread();

    const [chatInputValue, setChatInputValue] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamState, setStreamState] = useState<StreamState>({
        status: 'idle',
        error: null,
        activeNode: null,
        phase: 'reasoning',
    });
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const threadIdRef = useRef<string | null>(null);
    const dbThreadIdRef = useRef<string | null>(null);
    const sentMessageRef = useRef<string | null>(null);
    const messageHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
    const savedArtifactIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/workspaces');
        }
    }, [workspaceId, router]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, streamState.phase]);

    useEffect(() => {
        if (threadIdRef.current && !dbThreadIdRef.current && sentMessageRef.current) {
            const message = sentMessageRef.current;
            const titlePreview = message.length > 60 ? message.substring(0, 60) + '...' : message;

            createThreadFromStream({
                threadId: threadIdRef.current,
                workspaceId,
                moduleId: 'merchant-analyst',
                title: titlePreview || 'Merchant Analysis',
                description: `Merchant analysis: ${titlePreview || 'New session'}`,
            }).then((thread) => {
                const dbId = thread.id;
                if (!dbId) {
                    console.error('[MerchantAnalystNew] Thread created but returned no database ID:', thread);
                    return;
                }
                dbThreadIdRef.current = dbId;
            }).catch((err) => {
                console.error('[MerchantAnalystNew] Failed to create thread in database:', err);
            });
        }
    }, [threadIdRef.current, createThreadFromStream, workspaceId]);

    useEffect(() => {
        if (dbThreadIdRef.current) {
            const newUrl = `/workspaces/${workspaceId}/modules/analytics-action/merchant-analyst/${dbThreadIdRef.current}`;
            window.history.replaceState(null, '', newUrl);
        }
    }, [dbThreadIdRef.current, workspaceId]);

    const saveResponseAsArtifact = useCallback((content: string, messageId: string) => {
        if (!content.trim() || !dbThreadIdRef.current) return;
        if (savedArtifactIdsRef.current.has(messageId)) return;

        savedArtifactIdsRef.current.add(messageId);

        const firstLine = content.split('\n').find(line => line.trim().length > 0) || 'Analysis Response';
        const title = firstLine.replace(/^#+\s*/, '').substring(0, 100);

        saveArtifact(workspaceId, 'merchant-analyst', dbThreadIdRef.current, {
            artifactId: messageId,
            artifactType: 'report',
            title: `Analysis: ${title}`,
            content,
        });
    }, [workspaceId, saveArtifact]);

    const handleCopyMessage = useCallback(async (message: ChatMessage) => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopiedMessageId(message.id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('[MerchantAnalyst] Failed to copy:', err);
        }
    }, []);

    const handleDownloadMessage = useCallback((message: ChatMessage) => {
        try {
            const blob = new Blob([message.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis-${message.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[MerchantAnalyst] Failed to download:', err);
        }
    }, []);

    const handleSendMessage = useCallback(async (message: string) => {
        if (!message.trim()) return;

        setChatInputValue('');
        sentMessageRef.current = message;

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: message,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        messageHistoryRef.current.push({ role: 'user', content: message });

        try {
            setStreamState({ status: 'connecting', error: null, activeNode: null, phase: 'reasoning' });

            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            const baseUrl = getLangGraphApiUrl();

            let threadId = threadIdRef.current;
            if (!threadId) {
                const threadRes = await fetch(`${baseUrl}/threads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                    signal,
                });
                if (!threadRes.ok) {
                    throw new Error(`Failed to create thread: ${threadRes.status}`);
                }
                const threadData = await threadRes.json();
                threadId = threadData.thread_id;
                threadIdRef.current = threadId;
            }

            setStreamState({ status: 'streaming', error: null, activeNode: null, phase: 'reasoning' });

            const runRes = await fetch(`${baseUrl}/threads/${threadId}/runs/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assistant_id: ASSISTANT_ID,
                    input: {
                        messages: messageHistoryRef.current.map(m => ({
                            role: m.role === 'assistant' ? 'assistant' : 'user',
                            content: m.content,
                        })),
                    },
                    stream_mode: ['messages', 'updates'],
                    on_completion: 'keep',
                    on_disconnect: 'continue',
                }),
                signal,
            });

            if (!runRes.ok) {
                const errorText = await runRes.text();
                let errorMessage = `Server responded with ${runRes.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.detail || errorJson.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            if (!runRes.body) {
                throw new Error('No response body available for streaming');
            }

            const reader = runRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = '';
            let phase: AgentPhase = 'reasoning';
            let currentContent = '';
            let thinkingMsgId: string | null = null;
            let answeringMsgId: string | null = null;
            let lastToolCalls: Array<{ name: string; args: Record<string, unknown>; id: string }> = [];
            const toolCallIdMap = new Map<string, string>();

            const showThinking = () => {
                if (!thinkingMsgId) {
                    const id = `msg-${Date.now()}-thinking`;
                    thinkingMsgId = id;
                    setMessages(prev => [...prev, {
                        id,
                        role: 'system',
                        content: '🧠 Thinking...',
                        timestamp: new Date(),
                    }]);
                }
            };

            const hideThinking = () => {
                if (thinkingMsgId) {
                    const idToRemove = thinkingMsgId;
                    thinkingMsgId = null;
                    setMessages(prev => prev.filter(m => m.id !== idToRemove));
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === ': heartbeat') continue;

                    if (trimmedLine.startsWith('event: ')) {
                        currentEvent = trimmedLine.slice(7).trim();
                        continue;
                    }

                    if (!trimmedLine.startsWith('data: ')) continue;

                    try {
                        const jsonStr = trimmedLine.replace(/^data: /, '');
                        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) continue;

                        const data = JSON.parse(jsonStr);

                        if (currentEvent === 'messages/partial') {
                            const msg = data[0];

                            if (msg?.tool_calls && msg.tool_calls.length > 0) {
                                if (phase !== 'tool_calling') {
                                    phase = 'tool_calling';
                                    setStreamState(prev => ({ ...prev, phase: 'tool_calling' }));
                                    hideThinking();
                                }

                                const newToolCalls = msg.tool_calls.filter(
                                    (tc: { name: string; args: Record<string, unknown>; id?: string }) =>
                                        !lastToolCalls.some(ltc => ltc.name === tc.name)
                                );
                                for (const tc of newToolCalls) {
                                    const toolMsgId = `msg-${Date.now()}-tool-${tc.name}`;
                                    const toolMsg: ChatMessage = {
                                        id: toolMsgId,
                                        role: 'tool_call',
                                        content: `🔧 Calling ${tc.name}...`,
                                        timestamp: new Date(),
                                        toolName: tc.name,
                                        toolArgs: tc.args,
                                        toolCallId: tc.id,
                                        isComplete: false,
                                    };
                                    setMessages(prev => [...prev, toolMsg]);
                                    lastToolCalls.push({ ...tc, id: toolMsgId });
                                    toolCallIdMap.set(tc.name, toolMsgId);
                                }
                            }

                            else if (msg?.content && typeof msg.content === 'string' && msg.content.length > 0) {
                                if (msg.content !== currentContent) {
                                    currentContent = msg.content;

                                    if (phase !== 'answering') {
                                        phase = 'answering';
                                        setStreamState(prev => ({ ...prev, phase: 'answering' }));
                                        hideThinking();

                                        const newAnswerId = `msg-${Date.now()}-answer`;
                                        answeringMsgId = newAnswerId;
                                        setMessages(prev => [...prev, {
                                            id: newAnswerId,
                                            role: 'assistant',
                                            content: currentContent,
                                            timestamp: new Date(),
                                            isStreaming: true,
                                        }]);
                                    } else if (answeringMsgId) {
                                        setMessages(prev => prev.map(m =>
                                            m.id === answeringMsgId
                                                ? { ...m, content: currentContent }
                                                : m
                                        ));
                                    }
                                }
                            }

                            else if (phase === 'reasoning') {
                                showThinking();
                            }
                        }

                        if (currentEvent === 'messages/complete') {
                            const msg = data[0];
                            if (msg?.type === 'tool') {
                                phase = 'tool_result';
                                setStreamState(prev => ({ ...prev, phase: 'tool_result' }));

                                const toolCallMsgId = toolCallIdMap.get(msg.name);
                                if (toolCallMsgId) {
                                    setMessages(prev => prev.map(m =>
                                        m.id === toolCallMsgId
                                            ? { ...m, isComplete: true, content: `✅ ${msg.name} completed` }
                                            : m
                                    ));
                                }

                                const toolResultMsg: ChatMessage = {
                                    id: `msg-${Date.now()}-toolresult-${msg.name}`,
                                    role: 'tool_result',
                                    content: typeof msg.content === 'string'
                                        ? msg.content
                                        : JSON.stringify(msg.content, null, 2),
                                    timestamp: new Date(),
                                    toolName: msg.name,
                                };
                                setMessages(prev => [...prev, toolResultMsg]);
                            }
                        }

                        if (currentEvent === 'updates') {
                            const nodeName = Object.keys(data)[0];
                            if (nodeName) {
                                setStreamState(prev => ({ ...prev, activeNode: nodeName }));

                                if (nodeName === 'model') {
                                    if (phase === 'tool_calling') {
                                        phase = 'tool_executing';
                                        setStreamState(prev => ({ ...prev, phase: 'tool_executing' }));
                                    } else if (phase === 'answering') {
                                        phase = 'done';
                                        setStreamState(prev => ({ ...prev, phase: 'done' }));
                                    }
                                }

                                if (nodeName === 'tools') {
                                    phase = 'reasoning';
                                    currentContent = '';
                                    setStreamState(prev => ({ ...prev, phase: 'reasoning' }));
                                    showThinking();
                                }
                            }
                        }
                    } catch {
                        // Not valid JSON, skip
                    }
                }
            }

            reader.releaseLock();

            if (answeringMsgId) {
                const finalMsgId = answeringMsgId;
                const finalContent = currentContent;

                setMessages(prev => prev.map(m =>
                    m.id === finalMsgId
                        ? { ...m, isStreaming: false }
                        : m
                ));

                if (finalContent) {
                    messageHistoryRef.current.push({ role: 'assistant', content: finalContent });
                    saveResponseAsArtifact(finalContent, finalMsgId);
                }
            }

            hideThinking();
            setStreamState({ status: 'idle', error: null, activeNode: null, phase: 'reasoning' });

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setStreamState({ status: 'idle', error: null, activeNode: null, phase: 'reasoning' });
                return;
            }

            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            setStreamState({ status: 'error', error: errorMessage, activeNode: null, phase: 'reasoning' });
            console.error('[MerchantAnalyst] Error:', errorMessage);
        }
    }, [workspaceId, createThreadFromStream, saveArtifact, saveResponseAsArtifact]);

    const clearError = useCallback(() => {
        setStreamState(prev => ({ ...prev, error: null, status: prev.status === 'error' ? 'idle' : prev.status }));
    }, []);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    const isRunning = streamState.status === 'connecting' || streamState.status === 'streaming';

    const getPhaseStatusText = () => {
        if (streamState.status === 'connecting') return 'Connecting to Merchant Analyst...';
        switch (streamState.phase) {
            case 'reasoning': return '🧠 Thinking...';
            case 'tool_calling': return '🔧 Deciding which tools to use...';
            case 'tool_executing': return '⏳ Executing tools...';
            case 'tool_result': return '📊 Processing tool results...';
            case 'answering': return '✍️ Generating response...';
            case 'done': return '✅ Done';
            default: return 'Analyzing data...';
        }
    };

    const getPhaseIndicatorText = () => {
        if (streamState.status === 'connecting') return 'Connecting...';
        switch (streamState.phase) {
            case 'reasoning': return 'Thinking...';
            case 'tool_calling': return 'Deciding...';
            case 'tool_executing': return 'Executing...';
            case 'tool_result': return 'Processing...';
            case 'answering': return 'Writing...';
            default: return 'Working...';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
            <Notification
                message={streamState.error || ''}
                variant="error"
                visible={!!streamState.error}
                onClose={clearError}
            />

            {isRunning && (
                <div className={`flex-shrink-0 backdrop-blur border-b px-6 py-2.5 sticky top-0 z-10 transition-all ${
                    streamState.phase === 'tool_calling' || streamState.phase === 'tool_executing'
                        ? 'bg-blue-50/50 border-blue-100/50'
                        : streamState.phase === 'answering'
                            ? 'bg-indigo-50/50 border-indigo-100/50'
                            : 'bg-slate-50/50 border-slate-100/50'
                }`}>
                    <div className="max-w-6xl mx-auto">
                        <div className={`flex items-center justify-center gap-2 text-[13px] font-medium ${
                            streamState.phase === 'tool_calling' || streamState.phase === 'tool_executing'
                                ? 'text-blue-700'
                                : streamState.phase === 'answering'
                                    ? 'text-indigo-700'
                                    : 'text-slate-600'
                        }`}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{getPhaseStatusText()}</span>
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth"
            >
                <div className="w-full space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center mb-6 transform transition-transform hover:scale-105">
                                <Store className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-3 tracking-tight">
                                Merchant Analyst
                            </h2>
                            <p className="text-slate-500 max-w-md mb-8 text-lg">
                                Analyze your Google Merchant Center product feeds, account health, and performance data.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl">
                                {[
                                    'Show me disapproved products',
                                    'What are my feed issues?',
                                    'Analyze my Merchant Center account health',
                                    'Compare product performance across feeds',
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setChatInputValue(suggestion)}
                                        className="px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 hover:shadow-sm transition-all duration-200"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            copiedMessageId={copiedMessageId}
                            onCopy={handleCopyMessage}
                            onDownload={handleDownloadMessage}
                        />
                    ))}

                    {isRunning && !messages.some(m => m.isStreaming) && !messages.some(m => m.id.includes('-thinking')) && (
                        <div className="flex justify-start my-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {getPhaseIndicatorText()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isRunning}
                    placeholder={
                        isRunning
                            ? 'Waiting for response...'
                            : 'Ask about your Merchant Center data...'
                    }
                    inputValue={chatInputValue}
                    onInputChange={setChatInputValue}
                />
            </div>
        </div>
    );
}

// ============================================================================
// Message Bubble Component
// ============================================================================

interface MessageBubbleProps {
    message: ChatMessage;
    copiedMessageId: string | null;
    onCopy: (message: ChatMessage) => void;
    onDownload: (message: ChatMessage) => void;
}

function MessageBubble({ message, copiedMessageId, onCopy, onDownload }: MessageBubbleProps) {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end my-4">
                <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-br-sm max-w-[65%] shadow-sm min-w-0 overflow-hidden">
                    <MarkdownRenderer content={message.content} accentColor="blue" invert />
                </div>
            </div>
        );
    }

    if (message.role === 'system') {
        return (
            <div className="flex justify-center my-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className="bg-slate-100/80 text-slate-500 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <Brain className="w-3 h-3" />
                    <span>{message.content.replace('🧠 ', '')}</span>
                </div>
            </div>
        );
    }

    if (message.role === 'tool_call') {
        return (
            <div className="flex justify-start my-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-3 max-w-[75%]">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        message.isComplete ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                        {message.isComplete ? (
                            <Zap className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <Wrench className="w-4 h-4 text-blue-600" />
                        )}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl rounded-tl-sm transition-colors duration-300 ${
                        message.isComplete
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-blue-50 border border-blue-200'
                    }`}>
                        <div className={`flex items-center gap-2 text-sm font-medium ${
                            message.isComplete ? 'text-emerald-700' : 'text-blue-700'
                        }`}>
                            {!message.isComplete && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            {message.isComplete && (
                                <span className="text-emerald-500">✓</span>
                            )}
                            <span>{message.content}</span>
                        </div>
                        {message.toolArgs && Object.keys(message.toolArgs).length > 0 && (
                            <pre className={`mt-2 text-xs rounded-lg p-2 overflow-x-auto max-h-32 ${
                                message.isComplete
                                    ? 'text-emerald-600 bg-emerald-100/50'
                                    : 'text-blue-600 bg-blue-100/50'
                            }`}>
                                {JSON.stringify(message.toolArgs, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (message.role === 'tool_result') {
        return (
            <div className="flex justify-start my-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-3 max-w-[75%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl rounded-tl-sm">
                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium mb-1">
                            <span>✓ {message.toolName || 'Tool'} result</span>
                        </div>
                        <pre className="text-xs text-slate-700 bg-white/50 rounded-lg p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
                            {message.content}
                        </pre>
                    </div>
                </div>
            </div>
        );
    }

    // Assistant messages
    const isCopied = copiedMessageId === message.id;
    const isFinalized = !message.isStreaming && message.content.length > 0;

    return (
        <div className="flex justify-start my-4">
            <div className="flex gap-3 max-w-[75%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                </div>
                <div className={`bg-white border rounded-2xl rounded-tl-sm shadow-sm overflow-hidden ${
                    message.isStreaming
                        ? 'border-blue-200'
                        : 'border-slate-200'
                }`}>
                    <div className="px-5 py-4">
                        {message.content ? (
                            <MarkdownRenderer content={message.content} accentColor="slate" />
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}
                    </div>

                    {isFinalized && (
                        <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={() => onCopy(message)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Copy to clipboard"
                            >
                                {isCopied ? (
                                    <><Check className="w-3.5 h-3.5 text-emerald-500" /> <span className="text-emerald-600">Copied</span></>
                                ) : (
                                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                                )}
                            </button>
                            <button
                                onClick={() => onDownload(message)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Download as Markdown"
                            >
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Chat Input Component
// ============================================================================

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
    inputValue: string;
    onInputChange: (value: string) => void;
}

function ChatInput({ onSend, disabled, placeholder, inputValue, onInputChange }: ChatInputProps) {
    const handleSubmit = useCallback(() => {
        const trimmed = inputValue.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
        }
    }, [inputValue, disabled, onSend]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || 'Type your message...'}
                    disabled={disabled}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[24px] max-h-[120px]"
                    style={{ height: 'auto' }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                />
                <button
                    onClick={handleSubmit}
                    disabled={disabled || !inputValue.trim()}
                    className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
