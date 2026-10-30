'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  streamGraph,
  resumeGraph,
  checkForInterrupt,
  createThread,
  type StreamEvent,
  type InterruptInfo,
  type BaseMessage,
} from '@/lib/utils/langgraph-sdk';

export interface UseGraphStreamOptions {
  assistantId: string;
  streamMode?: ('values' | 'messages')[];
}

export interface UseGraphStreamResult {
  messages: BaseMessage[];
  values: Record<string, unknown>;
  interrupt: InterruptInfo | null;
  isRunning: boolean;
  error: string | null;
  threadId: string | null;
  isComplete: boolean;

  start: (input: Record<string, unknown>) => Promise<void>;
  respond: (response: unknown) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useGraphStream(options: UseGraphStreamOptions): UseGraphStreamResult {
  const { assistantId, streamMode = ['values', 'messages'] } = options;

  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [interrupt, setInterrupt] = useState<InterruptInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const processStream = useCallback(async (
    generator: AsyncGenerator<StreamEvent>,
  ) => {
    try {
      for await (const event of generator) {
        if (abortRef.current?.signal.aborted) break;

        if (!threadId && event.threadId) {
          setThreadId(event.threadId);
        }

        if (event.type === 'values' && event.data && typeof event.data === 'object') {
          const data = event.data as Record<string, unknown>;
          setValues((prev) => ({ ...prev, ...data }));

          if (Array.isArray(data.messages)) {
            const newMessages = (data.messages as any[])
              .filter((m) => m && (m.content || m._getType))
              .map((m) => normalizeMessage(m));
            setMessages(newMessages);
          }
        } else if (event.type === 'messages' && event.data) {
          const msg = normalizeMessage(event.data);
          setMessages((prev) => {
            if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } else if (event.type === 'error') {
          setError(String(event.data) || 'Stream error');
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  }, [threadId]);

  const start = useCallback(async (input: Record<string, unknown>) => {
    setError(null);
    setIsComplete(false);
    setInterrupt(null);
    setIsRunning(true);

    abortRef.current = new AbortController();

    const tid = await createThread();
    setThreadId(tid);

    const generator = streamGraph({
      assistantId,
      input,
      streamMode,
      signal: abortRef.current.signal,
      config: { configurable: { thread_id: tid } },
    });

    await processStream(generator);
    setIsRunning(false);

    const interruptInfo = await checkForInterrupt(tid);
    if (interruptInfo) {
      setInterrupt(interruptInfo);
    } else {
      setIsComplete(true);
    }
  }, [assistantId, streamMode, processStream]);

  const respond = useCallback(async (response: unknown) => {
    if (!threadId) return;

    setError(null);
    setInterrupt(null);
    setIsRunning(true);

    abortRef.current = new AbortController();

    const generator = resumeGraph(threadId, assistantId, response, {
      streamMode,
      signal: abortRef.current.signal,
    });

    await processStream(generator);
    setIsRunning(false);

    const interruptInfo = await checkForInterrupt(threadId);
    if (interruptInfo) {
      setInterrupt(interruptInfo);
    } else {
      setIsComplete(true);
    }
  }, [threadId, assistantId, streamMode, processStream]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setValues({});
    setInterrupt(null);
    setIsRunning(false);
    setError(null);
    setThreadId(null);
    setIsComplete(false);
  }, []);

  return {
    messages,
    values,
    interrupt,
    isRunning,
    error,
    threadId,
    isComplete,
    start,
    respond,
    stop,
    reset,
  };
}

function normalizeMessage(raw: any): BaseMessage {
  const type = raw?._getType?.() || raw?.type || raw?.role || 'system';
  const roleMap: Record<string, BaseMessage['role']> = {
    human: 'human',
    ai: 'ai',
    system: 'system',
    tool: 'tool',
    user: 'human',
    assistant: 'ai',
  };

  return {
    id: raw?.id || raw?.additional_kwargs?.id,
    role: roleMap[type] || 'system',
    content: typeof raw?.content === 'string'
      ? raw.content
      : Array.isArray(raw?.content)
        ? raw.content.map((c: any) => c?.text || c?.content || '').join('')
        : JSON.stringify(raw?.content || ''),
    name: raw?.name,
    metadata: raw?.additional_kwargs || raw?.metadata,
  };
}
