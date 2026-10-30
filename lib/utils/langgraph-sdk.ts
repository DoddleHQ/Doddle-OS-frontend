import { Client } from '@langchain/langgraph-sdk';
import { getLangGraphApiUrl } from '@/lib/config/langgraph.config';

export interface GraphRunOptions {
  assistantId: string;
  input?: Record<string, unknown>;
  config?: {
    configurable?: Record<string, unknown>;
    [key: string]: unknown;
  };
  streamMode?: StreamMode | StreamMode[];
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
  value: unknown;
  step?: number;
  taskId?: string;
}

export interface GraphStreamResult {
  values: Record<string, unknown>;
  messages: BaseMessage[];
  interrupted: boolean;
  interrupt?: InterruptInfo;
  threadId: string;
}

export interface BaseMessage {
  id?: string;
  role: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export function createGraphClient(): Client {
  const apiUrl = getLangGraphApiUrl();
  return new Client({ apiUrl });
}

export async function createThread(): Promise<string> {
  const client = createGraphClient();
  const thread = await client.threads.create();
  return thread.thread_id;
}

export async function* streamGraph(
  options: GraphRunOptions,
): AsyncGenerator<StreamEvent> {
  const client = createGraphClient();

  const threadId = options.config?.configurable?.thread_id as string
    || await createThread();

  const streamMode = options.streamMode || ['values', 'messages'];
  const modes = Array.isArray(streamMode) ? streamMode : [streamMode];

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

  for await (const chunk of stream) {
    yield {
      type: chunk.event as StreamEvent['type'],
      data: chunk.data,
      threadId,
    };
  }
}

export async function checkForInterrupt(
  threadId: string,
): Promise<InterruptInfo | null> {
  const client = createGraphClient();

  try {
    const state = await client.threads.getState(threadId);

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

  const interrupt = await checkForInterrupt(threadId);

  return {
    values,
    messages,
    interrupted: !!interrupt,
    interrupt: interrupt || undefined,
    threadId,
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

export type StreamEvent = {
  type: StreamMode | 'metadata' | 'error';
  data: unknown;
  threadId: string;
};
