'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, PenTool, Globe, Key, Rocket } from 'lucide-react';
import { useLangGraphStream } from '@/lib/hooks/useLangGraphStream';
import { useThread } from '@/lib/contexts/ThreadContext';
import {
    ChatMessage as ChatMessageType,
    ArtifactPayload,
    HITLRequestPayload,
    calculateOverallProgress,
} from '@/lib/types/graph-events.types';
import ChatInput from '@/components/content-factory/chat/ChatInput';
import HITLMessageCard from '@/components/content-factory/chat/HITLMessageCard';
import ArtifactCardRouter from '@/components/content-factory/chat/artifacts/ArtifactCardRouter';
import MarkdownRenderer from '@/components/content-factory/chat/artifacts/MarkdownRenderer';
import Notification from '@/components/ui/Notification';
import { extractArtifactMarkdown } from '@/components/content-factory/chat/artifacts/artifactContentUtils';

export default function MagentoContentWriterNewPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;

    const {
        createThreadFromStream,
        updateThread,
        saveArtifact,
    } = useThread();

    const [chatInputValue, setChatInputValue] = useState('');
    const [magentoDomain, setMagentoDomain] = useState('');
    const [magentoAccessToken, setMagentoAccessToken] = useState('');
    const [configDone, setConfigDone] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const magentoCredentialsRef = useRef<{ website_url: string; access_token: string } | null>(null);

    const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);

    const [successDismissed, setSuccessDismissed] = useState(false);
    const dbThreadIdRef = useRef<string | null>(null);
    const urlReplacedRef = useRef(false);
    const sentMessageRef = useRef<string | null>(null);
    const [dbThreadId, setDbThreadId] = useState<string | null>(null);

    const {
        state: streamState,
        startStream,
        addMessage,
        respondToHITL,
        clearError,
        isRunning,
        isHITLPending,
        isComplete,
        currentStep,
        progress,
        error,
        completeEvent,
        messages,
        artifacts,
    } = useLangGraphStream({
        graphId: 'magento_content_writer',
        workspaceId,
        onComplete: (summary) => {
            console.log('Magento Content Writer workflow completed:', summary);
        },
    });

    const handleConfigDone = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!magentoDomain.trim() || !magentoAccessToken.trim()) return;

        magentoCredentialsRef.current = {
            website_url: magentoDomain.trim(),
            access_token: magentoAccessToken.trim(),
        };

        setChatInputValue(`Connect to magento store at ${magentoDomain.trim()}`);
        setConfigDone(true);
    }, [magentoDomain, magentoAccessToken]);

    const handleSendMessage = useCallback((message: string) => {
        setChatInputValue('');
        sentMessageRef.current = message;

        if (isHITLPending && streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, message);
            return;
        }

        if (magentoCredentialsRef.current && !isRunning) {
            const { website_url, access_token } = magentoCredentialsRef.current;

            addMessage({
                type: 'user',
                content: message,
            });

            startStream({ website_url, access_token });

            magentoCredentialsRef.current = null;
        }
    }, [isRunning, isHITLPending, streamState.pendingHITL, startStream, respondToHITL, addMessage]);

    const handleHITLRespond = useCallback((response: unknown) => {
        if (streamState.pendingHITL) {
            respondToHITL(streamState.pendingHITL.requestId, response);
        }
    }, [streamState.pendingHITL, respondToHITL]);

    const handleCopyArtifact = useCallback(async (artifact: ArtifactPayload) => {
        const markdownContent = extractArtifactMarkdown(artifact);
        await navigator.clipboard.writeText(markdownContent);
        setCopiedArtifactId(artifact.artifactId);
        setTimeout(() => setCopiedArtifactId(null), 2000);
    }, []);

    const handleDownloadArtifact = useCallback((artifact: ArtifactPayload) => {
        const markdownContent = extractArtifactMarkdown(artifact);
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/legacy/workspaces');
        }
    }, [workspaceId, router]);

    useEffect(() => {
        if (streamState.threadId && !dbThreadIdRef.current) {
            const message = sentMessageRef.current || 'Magento Content Writer';

            createThreadFromStream({
                threadId: streamState.threadId,
                workspaceId,
                moduleId: 'magento-content-writer',
                title: `Magento Content: ${message.substring(0, 50)}`,
                description: `Magento content writer session: ${message.substring(0, 100)}`,
            }).then((thread) => {
                const dbId = thread.id;
                if (!dbId) {
                    console.error('[MagentoNew] Thread created but returned no database ID:', thread);
                    return;
                }
                dbThreadIdRef.current = dbId;
                setDbThreadId(dbId);
            }).catch((err) => {
                console.error('[MagentoNew] Failed to create thread in database:', err);
            });
        }
    }, [streamState.threadId, createThreadFromStream, workspaceId]);

    useEffect(() => {
        if (dbThreadId && !urlReplacedRef.current) {
            urlReplacedRef.current = true;
            const newUrl = `/legacy/workspaces/${workspaceId}/modules/content-factory/magento-content-writer/${dbThreadId}`;
            window.history.replaceState(null, '', newUrl);
        }
    }, [dbThreadId, workspaceId]);

    useEffect(() => {
        if (dbThreadId && artifacts.length > 0) {
            for (const artifact of artifacts) {
                saveArtifact(workspaceId, 'magento-content-writer', dbThreadId, artifact);
            }
        }
    }, [artifacts, dbThreadId, saveArtifact, workspaceId]);

    useEffect(() => {
        if (isComplete && dbThreadId && completeEvent) {
            updateThread(workspaceId, 'magento-content-writer', dbThreadId, {
                status: 'complete',
            });
        }
    }, [isComplete, completeEvent, dbThreadId, workspaceId, updateThread]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    const isInputDisabled = isRunning && !isHITLPending;

    const overallProgress = currentStep
        ? calculateOverallProgress(currentStep.stepNumber, currentStep.totalSteps, progress?.current ? (progress.current / progress.total) * 100 : undefined)
        : 0;

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-100px)] lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
            <Notification
                message={error?.message || ''}
                variant="error"
                visible={!!error}
                onClose={clearError}
            />

            <Notification
                message={completeEvent?.message || 'Content generation completed successfully!'}
                variant="success"
                visible={isComplete && completeEvent?.status === 'success' && !successDismissed}
                onClose={() => setSuccessDismissed(true)}
            />

            {isRunning && !isHITLPending && (
                <div className="flex-shrink-0 bg-purple-50/50 backdrop-blur border-b border-purple-100/50 px-6 py-2.5 sticky top-0 z-10 transition-all">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-purple-700 mb-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>
                                {currentStep
                                    ? `Step ${currentStep.stepNumber}/${currentStep.totalSteps}: ${currentStep.stepName}`
                                    : 'Processing...'
                                }
                            </span>
                        </div>
                        <div className="w-full bg-purple-100 rounded-full h-1.5">
                            <div
                                className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {isHITLPending && (
                <div className="flex-shrink-0 bg-amber-50/50 backdrop-blur border-b border-amber-100/50 px-6 py-2.5 sticky top-0 z-10 transition-all">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Waiting for your response - please check the chat or enter your feedback below</span>
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
                            <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl shadow-xl shadow-purple-500/20 flex items-center justify-center mb-6 transform transition-transform hover:scale-105">
                                <PenTool className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-3 tracking-tight">
                                Magento Content Writer
                            </h2>
                            <p className="text-slate-500 max-w-md mb-8 text-lg">
                                Write content for your product, category, and collection pages — and push it directly to Magento in the same flow.
                            </p>
                            <p className="text-sm text-slate-400">
                                Connect your Magento store using the form below to get started.
                            </p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <MessageRenderer
                            key={message.id}
                            message={message}
                            artifacts={artifacts}
                            pendingHITL={streamState.pendingHITL}
                            onHITLRespond={handleHITLRespond}
                            onCopyArtifact={handleCopyArtifact}
                            onDownloadArtifact={handleDownloadArtifact}
                            copiedArtifactId={copiedArtifactId}
                            onAppendToInput={(text: string) => {
                                setChatInputValue(prev => prev ? `${prev}\n${text}` : text);
                            }}
                        />
                    ))}

                    {isRunning && !isHITLPending && (
                        <div className="flex justify-start my-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                        <PenTool className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {progress?.message || 'Generating content...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {streamState.status === 'complete' && (
                        <div className="flex justify-center my-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 max-w-md text-center">
                                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                                <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                                    Content Generation Complete!
                                </h3>
                                <p className="text-sm text-neutral-600 mb-2">
                                    Your Magento content has been generated successfully.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
                {messages.length === 0 && !configDone && (
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center">
                                    <PenTool className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-slate-800">Connect to Magento Store</span>
                            </div>
                            <form onSubmit={handleConfigDone} className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 relative">
                                        <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={magentoDomain}
                                            onChange={(e) => setMagentoDomain(e.target.value)}
                                            placeholder="Magento store domain"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="password"
                                            value={magentoAccessToken}
                                            onChange={(e) => setMagentoAccessToken(e.target.value)}
                                            placeholder="Access token"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!magentoDomain.trim() || !magentoAccessToken.trim()}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-sm hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap flex items-center gap-2"
                                    >
                                        <Rocket className="w-4 h-4" />
                                        Done
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isInputDisabled}
                    placeholder={
                        isHITLPending
                            ? 'Enter your response...'
                            : isRunning
                                ? 'Waiting for content generation to complete...'
                                : 'Describe the Magento content you need...'
                    }
                    inputValue={chatInputValue}
                    onInputChange={setChatInputValue}
                />
            </div>
        </div>
    );
}

interface MessageRendererProps {
    message: ChatMessageType;
    artifacts: ArtifactPayload[];
    pendingHITL: HITLRequestPayload | null;
    onHITLRespond: (response: unknown) => void;
    onCopyArtifact: (artifact: ArtifactPayload) => void;
    onDownloadArtifact: (artifact: ArtifactPayload) => void;
    copiedArtifactId: string | null;
    onAppendToInput?: (text: string) => void;
}

function MessageRenderer({
    message,
    artifacts,
    pendingHITL,
    onHITLRespond,
    onCopyArtifact,
    onDownloadArtifact,
    copiedArtifactId,
    onAppendToInput,
}: MessageRendererProps) {
    const metadata = message.metadata;

    if (message.type === 'user') {
        return (
            <div className="flex justify-end my-4">
                <div className="bg-purple-600 text-white px-5 py-3 rounded-2xl rounded-br-sm max-w-[65%] shadow-sm min-w-0 overflow-hidden">
                    <MarkdownRenderer content={message.content} accentColor="purple" invert />
                </div>
            </div>
        );
    }

    if (message.type === 'system') {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-medium">
                    <MarkdownRenderer content={message.content} accentColor="slate" />
                </div>
            </div>
        );
    }

    if (message.type === 'step') {
        return (
            <div className="flex justify-start my-4">
                <div className="flex gap-3 max-w-[75%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <PenTool className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="bg-purple-50 border border-purple-200 px-5 py-3 rounded-2xl rounded-tl-sm">
                        <MarkdownRenderer content={message.content} accentColor="purple" />
                    </div>
                </div>
            </div>
        );
    }

    if (message.type === 'agent') {
        return (
            <div className="flex justify-start my-4">
                <div className="flex gap-3 max-w-[75%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-sm">
                        <PenTool className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                        <MarkdownRenderer content={message.content} accentColor="slate" />
                        {message.sender && (
                            <p className="text-xs text-slate-400 mt-2">{message.sender}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (message.type === 'artifact') {
        const artifactId = metadata?.artifactId;
        const artifact = artifacts.find(a => a.artifactId === artifactId);

        if (!artifact) return null;

        return (
            <ArtifactCardRouter
                artifact={artifact}
                onRespond={onHITLRespond}
                onCopyArtifact={onCopyArtifact}
                onDownloadArtifact={onDownloadArtifact}
                copiedArtifactId={copiedArtifactId}
                onAppendToInput={onAppendToInput}
            />
        );
    }

    if (message.type === 'hitl') {
        const isActive = pendingHITL !== null && pendingHITL.requestId === metadata?.requestId;
        const hitlData = isActive ? pendingHITL : (metadata?.data as HITLRequestPayload | undefined);

        if (hitlData && hitlData.options && hitlData.options.length > 0 && hitlData.requestType !== 'url_selection') {
            const hasLinkListArtifact = artifacts.some(a => a.artifactType === 'link_list');
            if (hitlData.requestType === 'multi_selection' && hasLinkListArtifact) {
                return null;
            }
            return (
                <div className="flex justify-start my-4">
                    <HITLMessageCard
                        request={hitlData}
                        onRespond={onHITLRespond as (response: Record<string, unknown>) => void}
                        onAppendToInput={onAppendToInput}
                        disabled={!isActive}
                    />
                </div>
            );
        }

        if (hitlData && hitlData.requestType === 'data_input' && hitlData.data?.fields) {
            return (
                <div className="flex justify-start my-4">
                    <HITLMessageCard
                        request={hitlData}
                        onRespond={onHITLRespond as (response: Record<string, unknown>) => void}
                        disabled={!isActive}
                    />
                </div>
            );
        }

        return (
            <div className="flex justify-start my-4">
                <div className="flex gap-3 max-w-[75%]">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        <AlertCircle className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <div className={`rounded-2xl rounded-tl-sm shadow-sm p-5 ${isActive ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                        <div className={`text-[15px] leading-relaxed ${isActive ? 'text-amber-900' : 'text-slate-600'} ${hitlData ? 'mb-4' : ''}`}>
                            <MarkdownRenderer content={message.content} accentColor="amber" />
                        </div>

                        {hitlData && (
                            <>
                                {hitlData.requestType === 'confirmation' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Please provide your confirmation in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'feedback' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Type your feedback in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'data_input' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Type your input in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'topic_input' && (
                                    <p className="text-xs text-amber-600 italic">
                                        Type your topic or question in the chat input below
                                    </p>
                                )}

                                {hitlData.requestType === 'url_selection' && hitlData.options && (
                                    <div className="space-y-2">
                                        {hitlData.options.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => onHITLRespond([option.value])}
                                                className="w-full text-left px-4 py-3 text-sm rounded-lg transition-colors bg-white border border-amber-200 hover:bg-amber-100"
                                            >
                                                <div className="font-medium text-slate-800">{option.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {hitlData.requestType === 'content_review' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onHITLRespond({ approved: true })}
                                            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => onHITLRespond({ approved: false })}
                                            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-white border border-amber-200 text-amber-800 hover:bg-amber-100"
                                        >
                                            Request Changes
                                        </button>
                                    </div>
                                )}

                                {!hitlData.options &&
                                    !['feedback', 'data_input', 'topic_input', 'content_review'].includes(hitlData.requestType || '') && (
                                        <p className="text-xs text-amber-600 italic">
                                            Type your response in the chat input below
                                        </p>
                                    )}
                            </>
                        )}

                        {!isActive && (
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Responded
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
