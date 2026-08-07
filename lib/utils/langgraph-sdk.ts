/**
 * LangGraph SDK utilities for streaming graph interactions.
 *
 * This module provides typed helpers built on @langchain/langgraph-sdk for:
 * - Creating a configured client (reads the existing langgraph.config.ts env)
 * - Running a graph and streaming its events via async iterator
 * - Handling interrupts (human-in-the-loop) by checking thread state
 * - Resuming interrupted runs with user-provided responses
 *
 * Usage:
 *   import { createGraphClient, streamGraph, checkForInterrupt, resumeGraph } from '@/lib/utils/langgraph-sdk';
 *
 * The existing useLangGraphStream hook (lib/hooks/useLangGraphStream.ts) uses
 * a custom SSE-based approach. This module is the SDK-native replacement that
 * future agent interactions (onboarding, brand persona, etc.) should use.
 */

import { Client } from '@langchain/langgraph-sdk';
import { getLangGraphApiUrl } from '@/lib/config/langgraph.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphRunOptions {
  /** The graph/assistant ID to run (e.g., 'gtm_strategy', 'brand_persona') */
  assistantId: string;
  /** Initial input to the graph */
  input?: Record<string, unknown>;
  /** Configuration for the run (e.g., configurable values) */
  config?: {
    configurable?: Record<string, unknown>;
    [key: string]: unknown;
  };
  /** Stream modes to subscribe to. Defaults to ['values', 'messages']. */
  streamMode?: StreamMode | StreamMode[];
  /** Signal for aborting the stream */
  signal?: AbortSignal;
}

export type StreamMode =
  | 'values'
  | 'updates'
  | 'messages'
  | 'custom'
  | 'debug'
  | 'events';

export interface InterruptInfo {
  /** The interrupt value/payload from the graph */
  value: unknown;
  /** The step/node that produced the interrupt */
  step?: number;
  /** The task ID from the thread state */
  taskId?: string;
}

export interface GraphStreamResult {
  /** The final state values from the graph */
  values: Record<string, unknown>;
  /** All messages collected during the stream */
  messages: BaseMessage[];
  /** Whether the run hit an interrupt */
  interrupted: boolean;
  /** Interrupt details if interrupted */
  interrupt?: InterruptInfo;
  /** The thread ID used for this run */
  threadId: string;
}

export interface BaseMessage {
  id?: string;
  role: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Create a configured LangGraph SDK client using the existing env config.
 * Reuses getLangGraphApiUrl() from lib/config/langgraph.config.ts so all
 * environment handling (local/tunnel/production) stays in one place.
 */
export function createGraphClient(): Client {
  const apiUrl = getLangGraphApiUrl();
  return new Client({ apiUrl });
}

/**
 * Create a new thread and return its ID.
 * Use this before starting a graph run so you have a thread to attach runs to.
 */
export async function createThread(): Promise<string> {
  const client = createGraphClient();
  const thread = await client.threads.create();
  return thread.thread_id;
}

// ---------------------------------------------------------------------------
// Stream a graph run
// ---------------------------------------------------------------------------

/**
 * Run a graph and stream its events via async iterator.
 *
 * This is the core utility — it creates a thread (if none provided), starts
 * a run, and yields events as they arrive. Each event is typed based on the
 * stream mode(s) requested.
 *
 * @example
 * ```ts
 * for await (const event of streamGraph({
 *   assistantId: 'brand_persona',
 *   input: { business_description: 'We are a SaaS platform...' },
 *   streamMode: ['values', 'messages'],
 * })) {
 *   if (event.type === 'values') {
 *     console.log('State update:', event.data);
 *   } else if (event.type === 'messages') {
 *     console.log('Message:', event.data);
 *   }
 * }
 * ```
 */
export async function* streamGraph(
  options: GraphRunOptions,
): AsyncGenerator<StreamEvent> {
  const client = createGraphClient();

  // Create or reuse a thread
  const threadId = options.config?.configurable?.thread_id as string
    || await createThread();

  const streamMode = options.streamMode || ['values', 'messages'];
  const modes = Array.isArray(streamMode) ? streamMode : [streamMode];

  // Start the run with streaming
  const stream = client.runs.stream(
    threadId,
    options.assistantId,
    {
      input: options.input,
      config: options.config,
      streamMode: modes as any,
      signal: options.signal,
    },
  );

  // Yield events as they arrive
  for await (const chunk of stream) {
    yield {
      type: chunk.event as StreamEvent['type'],
      data: chunk.data,
      threadId,
    };
  }
}

// ---------------------------------------------------------------------------
// Interrupt handling
// ---------------------------------------------------------------------------

/**
 * Check if a thread has pending interrupts (human-in-the-loop).
 *
 * After a graph run completes (or pauses), call this to detect if the graph
 * is waiting for human input. If interrupted, the graph state will contain
 * task interrupts.
 *
 * @returns The interrupt info if pending, or null if no interrupt.
 */
export async function checkForInterrupt(
  threadId: string,
): Promise<InterruptInfo | null> {
  const client = createGraphClient();

  try {
    const state = await client.threads.getState(threadId);

    // Check for tasks with interrupts in the thread state
    const tasks = (state as any)?.tasks || [];
    for (const task of tasks) {
      if (task.interrupts && task.interrupts.length > 0) {
        const interrupt = task.interrupts[0];
        return {
          value: interrupt.value,
          step: (state as any)?.step,
          taskId: task.id,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resume an interrupted graph run by providing the human response.
 *
 * This creates a new run on the same thread with a Command that resumes
 * the graph from where it was interrupted, passing the user's response.
 *
 * @example
 * ```ts
 * // After detecting an interrupt:
 * const interrupt = await checkForInterrupt(threadId);
 * if (interrupt) {
 *   // Show UI for user to respond...
 *   // Then resume:
 *   for await (const event of resumeGraph(threadId, 'brand_persona', { answer: 'Yes' })) {
 *     // Handle events...
 *   }
 * }
 * ```
 */
export async function* resumeGraph(
  threadId: string,
  assistantId: string,
  response: unknown,
  options?: {
    streamMode?: StreamMode | StreamMode[];
    signal?: AbortSignal;
  },
): AsyncGenerator<StreamEvent> {
  const client = createGraphClient();

  const modes = options?.streamMode
    ? (Array.isArray(options.streamMode) ? options.streamMode : [options.streamMode])
    : ['values', 'messages'];

  const stream = client.runs.stream(
    threadId,
    assistantId,
    {
      command: { resume: response },
      streamMode: modes as any,
      signal: options?.signal,
    },
  );

  for await (const chunk of stream) {
    yield {
      type: chunk.event as StreamEvent['type'],
      data: chunk.data,
      threadId,
    };
  }
}

/**
 * Get the current state of a thread (values + messages).
 * Useful for restoring a conversation from a stored thread ID.
 */
export async function getThreadState(threadId: string): Promise<{
  values: Record<string, unknown>;
  messages: BaseMessage[];
  step: number;
}> {
  const client = createGraphClient();
  const state = await client.threads.getState(threadId);
  const values = (state as any)?.values || {};
  const messages = (values as any)?.messages || [];
  const step = (state as any)?.step || 0;

  return { values, messages, step };
}

/**
 * Wait for a graph run to complete (blocking).
 * Useful when you need the final result rather than streaming.
 */
export async function runGraphToCompletion(
  options: GraphRunOptions,
): Promise<GraphStreamResult> {
  const messages: BaseMessage[] = [];
  let values: Record<string, unknown> = {};
  let threadId = '';

  for await (const event of streamGraph(options)) {
    threadId = event.threadId;

    if (event.type === 'values' && typeof event.data === 'object' && event.data !== null) {
      values = { ...values, ...(event.data as Record<string, unknown>) };
      if ((event.data as any).messages) {
        for (const msg of (event.data as any).messages) {
          messages.push(normalizeMessage(msg));
        }
      }
    } else if (event.type === 'messages' && event.data) {
      messages.push(normalizeMessage(event.data));
    }
  }

  // Check for interrupts after the run
  const interrupt = await checkForInterrupt(threadId);

  return {
    values,
    messages,
    interrupted: !!interrupt,
    interrupt: interrupt || undefined,
    threadId,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeMessage(raw: any): BaseMessage {
  // Handle LangChain message format
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

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type StreamEvent = {
  type: StreamMode | 'metadata' | 'error';
  data: unknown;
  threadId: string;
};
