'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Bot, BarChart3, Wrench, Brain, Zap, Copy, Check, Download } from 'lucide-react';
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
    toolCallId?: string;  // Links tool_call to tool_result for completion tracking
    isComplete?: boolean; // For tool_call: true when tool_result has arrived
}

/**
 * Agent execution phases — tracks the model ↔ tools loop.
 *
 * Flow: reasoning → tool_calling → tool_executing → tool_result → reasoning (repeat) → answering → done
 * For turns without tools: reasoning → answering → done
 */
type AgentPhase = 'reasoning' | 'tool_calling' | 'tool_executing' | 'tool_result' | 'answering' | 'done';

interface StreamState {
    status: 'idle' | 'connecting' | 'streaming' | 'error';
    error: string | null;
    activeNode: string | null;  // Current graph node (model, tools, etc.)
    phase: AgentPhase;          // Current phase of the agent execution loop
}

// ============================================================================
// Constants
// ============================================================================

const ASSISTANT_ID = 'google_analyst';

// ============================================================================
// New Analysis Page
// ============================================================================

/**
 * New Analysis Page - Continuous Chat Interface for Google Analyst
 *
 * Uses LangGraph messages protocol with full streaming:
 * - Input: { messages: [{ role: "user", content: "..." }] }
 * - Stream mode: ["messages", "updates"]
 * - Events: messages/partial (token-by-token), messages/complete (tool results),
 *           updates (node-level progress)
 *
 * Phase-based state machine tracks the agent loop:
 *   reasoning → tool_calling → tool_executing → tool_result → reasoning (repeat) → answering → done
 *
 * Each agent response is automatically saved as a 'report' artifact in the backend.
 * Assistant messages include Copy and Download action buttons.
 *
 * Supports continuous multi-turn conversation on a single thread.
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

    // Redirect if workspaceId is not available
    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/workspaces');
        }
    }, [workspaceId, router]);

    // Auto-scroll to bottom when new messages arrive or phase changes
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, streamState.phase]);

    // Create thread in database once we have a LangGraph thread ID
    useEffect(() => {
        if (threadIdRef.current && !dbThreadIdRef.current && sentMessageRef.current) {
            const message = sentMessageRef.current;
            const titlePreview = message.length > 60 ? message.substring(0, 60) + '...' : message;

            createThreadFromStream({
                threadId: threadIdRef.current,
                workspaceId,
                moduleId: 'google-analyst',
                title: titlePreview || 'Analytics Analysis',
                description: `Analytics analysis: ${titlePreview || 'New session'}`,
            }).then((thread) => {
                const dbId = thread.id;
                if (!dbId) {
                    console.error('[GoogleAnalystNew] Thread created but returned no database ID:', thread);
                    return;
                }
                dbThreadIdRef.current = dbId;
            }).catch((err) => {
                console.error('[GoogleAnalystNew] Failed to create thread in database:', err);
            });
        }
    }, [threadIdRef.current, createThreadFromStream, workspaceId]);

    // Replace URL with thread-based URL once DB thread is created
    useEffect(() => {
        if (dbThreadIdRef.current) {
            const newUrl = `/workspaces/${workspaceId}/modules/analytics-action/google-analyst/${dbThreadIdRef.current}`;
            window.history.replaceState(null, '', newUrl);
        }
    }, [dbThreadIdRef.current, workspaceId]);

    /**
     * Save an agent response as a 'report' artifact in the backend.
     * Uses the ThreadContext's saveArtifact which queues and retries.
     */
    const saveResponseAsArtifact = useCallback((content: string, messageId: string) => {
        if (!content.trim() || !dbThreadIdRef.current) return;
        if (savedArtifactIdsRef.current.has(messageId)) return;

        savedArtifactIdsRef.current.add(messageId);

        // Extract a title from the first line of the response
        const firstLine = content.split('\n').find(line => line.trim().length > 0) || 'Analysis Response';
        const title = firstLine.replace(/^#+\s*/, '').substring(0, 100);

        saveArtifact(workspaceId, 'google-analyst', dbThreadIdRef.current, {
            artifactId: messageId,
            artifactType: 'report',
            title: `Analysis: ${title}`,
            content,
        });
    }, [workspaceId, saveArtifact]);

    // Copy message content to clipboard
    const handleCopyMessage = useCallback(async (message: ChatMessage) => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopiedMessageId(message.id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('[GoogleAnalyst] Failed to copy:', err);
        }
    }, []);

    // Download message content as markdown file
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
            console.error('[GoogleAnalyst] Failed to download:', err);
        }
    }, []);

    /**
     * Send a message to the Google Analyst graph.
     * Uses stream_mode: ["messages", "updates"] for token-by-token streaming
     * with tool call visibility and node-level progress.
     */
    const handleSendMessage = useCallback(async (message: string) => {
        if (!message.trim()) return;

        setChatInputValue('');
        sentMessageRef.current = message;

        // Add user message to UI
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: message,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);

        // Add to message history for subsequent turns
        messageHistoryRef.current.push({ role: 'user', content: message });

        try {
            setStreamState({ status: 'connecting', error: null, activeNode: null, phase: 'reasoning' });

            // Create abort controller
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            const baseUrl = getLangGraphApiUrl();

            // Step 1: Create a thread if we don't have one yet
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

            // Step 2: Stream the agent response with messages + updates
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

            // ================================================================
            // Step 3: Parse SSE stream with phase-based state machine
            // ================================================================
            //
            // The LangGraph create_agent graph alternates between two nodes:
            //   model (LLM call) and tools (tool execution)
            //
            // Event sequence per turn:
            //   PHASE 1 (reasoning):  messages/partial ×N (content="") → messages/partial (content + tool_calls) → updates {"model":...}
            //   PHASE 2 (execution):  messages/complete (type="tool") → updates {"tools":...}
            //   PHASE 3 (answer):     messages/partial ×N (content streaming) → updates {"model":...}
            //
            // For chained tool calls, phases 1-2 repeat before phase 3.
            //
            // Key: GLM sends CUMULATIVE content, not deltas.

            const reader = runRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = '';

            // Phase tracking
            let phase: AgentPhase = 'reasoning';

            // Content tracking (cumulative from GLM)
            let currentContent = '';

            // Thinking indicator message ID (shown/hidden during reasoning)
            let thinkingMsgId: string | null = null;

            // Final answer streaming message ID
            let answeringMsgId: string | null = null;

            // Tool call tracking
            let lastToolCalls: Array<{ name: string; args: Record<string, unknown>; id: string }> = [];
            const toolCallIdMap = new Map<string, string>(); // toolName -> message id

            // Helper: show "Thinking..." indicator
            const showThinking = () => {
                if (!thinkingMsgId) {
                    const id = `msg-${Date.now()}-thinking`;
                    thinkingMsgId = id;
                    setMessages(prev => [...prev, {
                        id,
                        role: 'system',
                        content: 'Thinking...',
                        timestamp: new Date(),
                    }]);
                }
            };

            // Helper: hide "Thinking..." indicator
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

                    // Track SSE event type
                    if (trimmedLine.startsWith('event: ')) {
                        currentEvent = trimmedLine.slice(7).trim();
                        continue;
                    }

                    if (!trimmedLine.startsWith('data: ')) continue;

                    try {
                        const jsonStr = trimmedLine.replace(/^data: /, '');
                        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) continue;

                        const data = JSON.parse(jsonStr);

                        // ─── Handle messages/partial ───
                        if (currentEvent === 'messages/partial') {
                            const msg = data[0]; // First message in the array

                            // PHASE: Tool call detected — model decided to use tools
                            if (msg?.tool_calls && msg.tool_calls.length > 0) {
                                if (phase !== 'tool_calling') {
                                    phase = 'tool_calling';
                                    setStreamState(prev => ({ ...prev, phase: 'tool_calling' }));

                                    // Hide thinking indicator
                                    hideThinking();
                                }

                                // Add new tool call messages (dedup by name)
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

                            // PHASE: Final answer — content streaming with no tool_calls
                            else if (msg?.content && typeof msg.content === 'string' && msg.content.length > 0) {
                                // GLM sends cumulative content — compute delta
                                if (msg.content !== currentContent) {
                                    currentContent = msg.content;

                                    if (phase !== 'answering') {
                                        phase = 'answering';
                                        setStreamState(prev => ({ ...prev, phase: 'answering' }));

                                        // Hide thinking indicator
                                        hideThinking();

                                        // Create the answer streaming message
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
                                        // Update existing answer message with cumulative content
                                        setMessages(prev => prev.map(m =>
                                            m.id === answeringMsgId
                                                ? { ...m, content: currentContent }
                                                : m
                                        ));
                                    }
                                }
                            }

                            // PHASE: Reasoning — empty content, no tool calls
                            else if (phase === 'reasoning') {
                                showThinking();
                            }
                        }

                        // ─── Handle messages/complete (tool results) ───
                        if (currentEvent === 'messages/complete') {
                            const msg = data[0];
                            if (msg?.type === 'tool') {
                                phase = 'tool_result';
                                setStreamState(prev => ({ ...prev, phase: 'tool_result' }));

                                // Mark the corresponding tool_call as complete (stop spinner)
                                const toolCallMsgId = toolCallIdMap.get(msg.name);
                                if (toolCallMsgId) {
                                    setMessages(prev => prev.map(m =>
                                        m.id === toolCallMsgId
                                            ? { ...m, isComplete: true, content: `✅ ${msg.name} completed` }
                                            : m
                                    ));
                                }

                                // Add tool result message
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

                        // ─── Handle updates (node transitions) ───
                        if (currentEvent === 'updates') {
                            const nodeName = Object.keys(data)[0];
                            if (nodeName) {
                                setStreamState(prev => ({ ...prev, activeNode: nodeName }));

                                if (nodeName === 'model') {
                                    // Model node finished
                                    if (phase === 'tool_calling') {
                                        // Model produced tool calls → tools will now execute
                                        phase = 'tool_executing';
                                        setStreamState(prev => ({ ...prev, phase: 'tool_executing' }));
                                    } else if (phase === 'answering') {
                                        // Model produced final answer → agent is done
                                        phase = 'done';
                                        setStreamState(prev => ({ ...prev, phase: 'done' }));
                                    }
                                }

                                if (nodeName === 'tools') {
                                    // Tools node finished → next phase will be model (reasoning or answering)
                                    phase = 'reasoning';
                                    currentContent = ''; // Reset content tracker for next model turn
                                    setStreamState(prev => ({ ...prev, phase: 'reasoning' }));
                                    showThinking(); // Show thinking for next model turn
                                }
                            }
                        }
                    } catch {
                        // Not valid JSON, skip
                    }
                }
            }

            reader.releaseLock();

            // Finalize: mark the answer streaming message as complete
            if (answeringMsgId) {
                const finalMsgId = answeringMsgId;
                const finalContent = currentContent;

                setMessages(prev => prev.map(m =>
                    m.id === finalMsgId
                        ? { ...m, isStreaming: false }
                        : m
                ));

                // Add to message history for subsequent turns
                if (finalContent) {
                    messageHistoryRef.current.push({ role: 'assistant', content: finalContent });

                    // Save the response as an artifact in the backend
                    saveResponseAsArtifact(finalContent, finalMsgId);
                }
            }

            // Hide thinking indicator if still showing
            hideThinking();

            // Reset to idle — ready for next message
            setStreamState({ status: 'idle', error: null, activeNode: null, phase: 'reasoning' });

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setStreamState({ status: 'idle', error: null, activeNode: null, phase: 'reasoning' });
                return;
            }

            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            setStreamState({ status: 'error', error: errorMessage, activeNode: null, phase: 'reasoning' });
            console.error('[GoogleAnalyst] Error:', errorMessage);
        }
    }, [workspaceId, createThreadFromStream, saveArtifact, saveResponseAsArtifact]);

    // Clear error
    const clearError = useCallback(() => {
        setStreamState(prev => ({ ...prev, error: null, status: prev.status === 'error' ? 'idle' : prev.status }));
    }, []);

    // Don't render if workspaceId is not available
    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    const isRunning = streamState.status === 'connecting' || streamState.status === 'streaming';

    // Phase-specific status text for the top bar
    const getPhaseStatusText = () => {
        if (streamState.status === 'connecting') return 'Connecting to Google Analyst...';
        switch (streamState.phase) {
            case 'reasoning': return 'Thinking...';
            case 'tool_calling': return '🔧 Deciding which tools to use...';
            case 'tool_executing': return '⏳ Executing tools...';
            case 'tool_result': return '📊 Processing tool results...';
            case 'answering': return '✍️ Generating response...';
            case 'done': return '✅ Done';
            default: return 'Analyzing data...';
        }
    };

    // Phase-specific text for the inline typing indicator
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
            {/* Error notification */}
            <Notification
                message={streamState.error || ''}
                variant="error"
                visible={!!streamState.error}
                onClose={clearError}
            />

            {/* Status indicator when running */}
            {isRunning && (
                <div className={`flex-shrink-0 backdrop-blur border-b px-6 py-2.5 sticky top-0 z-10 transition-all ${
                    streamState.phase === 'tool_calling' || streamState.phase === 'tool_executing'
                        ? 'bg-blue-50/50 border-blue-100/50'
                        : streamState.phase === 'answering'
                            ? 'bg-orange-50/50 border-orange-100/50'
                            : 'bg-slate-50/50 border-slate-100/50'
                }`}>
                    <div className="max-w-6xl mx-auto">
                        <div className={`flex items-center justify-center gap-2 text-[13px] font-medium ${
                            streamState.phase === 'tool_calling' || streamState.phase === 'tool_executing'
                                ? 'text-blue-700'
                                : streamState.phase === 'answering'
                                    ? 'text-orange-700'
                                    : 'text-slate-600'
                        }`}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{getPhaseStatusText()}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth"
            >
                <div className="w-full space-y-6">
                    {/* Welcome message if no messages yet */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-500 rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center mb-6 transform transition-transform hover:scale-105">
                                <BarChart3 className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-3 tracking-tight">
                                Google Analyst
                            </h2>
                            <p className="text-slate-500 max-w-md mb-8 text-lg">
                                Ask about your analytics data — GA4 metrics, conversion trends, audience insights, or automated marketing maneuvers.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl">
                                {[
                                    'List my GA4 accounts',
                                    'What were my top traffic sources last month?',
                                    'Compare Meta Ads ROAS vs Google Ads ROAS',
                                    'What marketing maneuvers should I automate based on current data?',
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setChatInputValue(suggestion)}
                                        className="px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700 hover:shadow-sm transition-all duration-200"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat messages */}
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            copiedMessageId={copiedMessageId}
                            onCopy={handleCopyMessage}
                            onDownload={handleDownloadMessage}
                        />
                    ))}

                    {/* Inline typing indicator — shown when streaming but no visible streaming message */}
                    {isRunning && !messages.some(m => m.isStreaming) && !messages.some(m => m.id.includes('-thinking')) && (
                        <div className="flex justify-start my-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-orange-600" />
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

            {/* Chat Input */}
            <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isRunning}
                    placeholder={
                        isRunning
                            ? 'Waiting for response...'
                            : 'Ask about your analytics data...'
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
    // User messages — right aligned, orange
    if (message.role === 'user') {
        return (
            <div className="flex justify-end my-4">
                <div className="bg-orange-600 text-white px-5 py-3 rounded-2xl rounded-br-sm max-w-[65%] shadow-sm min-w-0 overflow-hidden">
                    <MarkdownRenderer content={message.content} accentColor="orange" invert />
                </div>
            </div>
        );
    }

    // System messages — center aligned, small (used for "Thinking..." indicator)
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

    // Tool call indicator — shows when agent decides to call a tool
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

    // Tool result — shows tool execution results
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

    // Assistant messages — left aligned with avatar + artifact action buttons
    const isCopied = copiedMessageId === message.id;
    const isFinalized = !message.isStreaming && message.content.length > 0;

    return (
        <div className="flex justify-start my-4">
            <div className="flex gap-3 max-w-[75%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                </div>
                <div className={`bg-white border rounded-2xl rounded-tl-sm shadow-sm overflow-hidden ${
                    message.isStreaming
                        ? 'border-orange-200'
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

                    {/* Action buttons — shown only for finalized (non-streaming) assistant messages */}
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
            <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
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
                    className="flex-shrink-0 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
