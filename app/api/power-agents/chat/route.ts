import { NextRequest } from 'next/server';
import { getLangGraphApiUrl } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/power-agents/chat
 *
 * The AI SDK standard bridge: consumes the LangGraph server's multi-mode
 * SSE (messages-tuple for token deltas + updates for complete tool calls)
 * and re-emits the Vercel AI SDK **UI Message Stream protocol**, so the
 * frontend uses stock `useChat` + AI Elements-style components.
 *
 * Body: { assistantId: string; threadId?: string; messages: UIMessage[] }
 * Responds: SSE (UI Message Stream parts) + `x-langgraph-thread-id`
 */

const base = () => getLangGraphApiUrl();

interface ToolCall {
  id?: string;
  name?: string;
  args?: unknown;
}

interface LGMessage {
  type?: string;
  content?: string | Array<{ type: string; text?: string }>;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === 'object' && p && 'text' in p ? String(p.text) : '',
      )
      .join('');
  }
  return '';
}

function sse(part: unknown): string {
  return `data: ${JSON.stringify(part)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    assistantId: string;
    threadId?: string;
    agentKey?: string;
    messages: Array<{ role: string; content: string }>;
  };

  const { assistantId, messages } = body;
  if (!assistantId) {
    return new Response(JSON.stringify({ error: 'assistantId required' }), {
      status: 400,
    });
  }

  // create or reuse the LangGraph thread (history lives server-side).
  // Lazily-created threads carry agent metadata so they appear in the
  // agent's session list via /threads/search.
  let threadId = body.threadId;
  if (!threadId) {
    const tRes = await fetch(`${base()}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: body.agentKey
          ? {
              assistant_id: assistantId,
              agent_key: body.agentKey,
              title: 'New session',
            }
          : { assistant_id: assistantId, title: 'New session' },
      }),
    });
    if (!tRes.ok) {
      return new Response(
        JSON.stringify({ error: `thread creation failed: ${tRes.status}` }),
        { status: 502 },
      );
    }
    threadId = ((await tRes.json()) as { thread_id: string }).thread_id;
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const input = { messages: [{ role: 'user', content: lastUser?.content ?? '' }] };

  const upstream = await fetch(`${base()}/threads/${threadId}/runs/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assistant_id: assistantId,
      input,
      stream_mode: ['messages-tuple', 'updates'],
      stream_subgraphs: false,
    }),
  });

  if (upstream.status === 404) {
    // the thread was deleted (another tab, backend cleanup) — tell the
    // client distinctly instead of a generic bad gateway
    return new Response(
      JSON.stringify({
        error: 'session no longer exists — start a new session',
      }),
      { status: 404 },
    );
  }
  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({
        error: `langgraph: ${upstream.status} ${errText.slice(0, 200)}`,
      }),
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Enqueues throw once the client connection is gone (proxy cut,
      // navigation) — route every write through a guard so the loop exits
      // cleanly instead of throwing inside the stream.
      let alive = true;
      const safeEnqueue = (chunk: string) => {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          alive = false;
        }
      };
      const push = (part: unknown) => safeEnqueue(sse(part));
      // SSE comment — ignored by every stream parser, but keeps bytes
      // flowing through reverse proxies so their idle read-timeout doesn't
      // kill the connection during silent phases (model thinking, long
      // tool calls like Lighthouse).
      const ping = () => safeEnqueue(': ping\n\n');

      const toolNames = new Map<string, string>(); // toolCallId -> name
      let step = 0;
      let stepOpen = false;
      let textId: string | null = null; // one text part per step, not per token

      const beginStep = () => {
        if (!stepOpen) {
          push({ type: 'start-step', step: ++step });
          stepOpen = true;
        }
      };
      const endStep = () => {
        if (textId) {
          push({ type: 'text-end', id: textId });
          textId = null;
        }
        if (stepOpen) {
          push({ type: 'finish-step', step });
          stepOpen = false;
        }
      };

      // ── messages-tuple: token deltas (skip tool fragments) ──────────
      const onMessagesTuple = (payload: unknown) => {
        const tuple = Array.isArray(payload) ? payload : [payload];
        const chunk = tuple[0] as LGMessage;
        if (!chunk || typeof chunk !== 'object') return;
        // streaming chunks serialize their class name ("AIMessageChunk");
        // complete messages use "ai". Accept both.
        const isAI = chunk.type === 'ai' || chunk.type === 'AIMessageChunk';
        if (!isAI) return; // skip human/tool/other types
        const text = textOf(chunk.content);
        if (text) {
          beginStep();
          // open the text part once per step; all deltas share its id
          if (!textId) {
            textId = `t-${step}`;
            push({ type: 'text-start', id: textId });
          }
          push({ type: 'text-delta', id: textId, delta: text });
        }
      };

      // ── updates: complete tool calls + tool results per node ────────
      const onUpdates = (payload: unknown) => {
        if (!payload || typeof payload !== 'object') return;
        for (const [node, value] of Object.entries(payload as Record<string, unknown>)) {
          if (node.startsWith('__')) continue;
          const msgs =
            (value as { messages?: LGMessage[] } | null)?.messages ?? [];
          for (const msg of msgs) {
            if (msg.type === 'ai' && msg.tool_calls?.length) {
              beginStep();
              for (const tc of msg.tool_calls) {
                const id = tc.id ?? `tool-${step}-${toolNames.size}`;
                toolNames.set(id, tc.name ?? 'tool');
                let parsedArgs: Record<string, unknown> = {};
                if (typeof tc.args === 'string') {
                  try {
                    parsedArgs = JSON.parse(tc.args);
                  } catch {
                    parsedArgs = { raw: tc.args };
                  }
                } else if (tc.args && typeof tc.args === 'object') {
                  parsedArgs = tc.args as Record<string, unknown>;
                }
                push({
                  type: 'tool-input-available',
                  toolCallId: id,
                  toolName: tc.name ?? 'tool',
                  input: parsedArgs,
                });
              }
            }
            if (msg.type === 'tool' && msg.tool_call_id) {
              endStep(); // tool output closes the assistant's step
              const name = toolNames.get(msg.tool_call_id) ?? msg.name ?? 'tool';
              push({
                type: 'tool-output-available',
                toolCallId: msg.tool_call_id,
                toolName: name,
                output: textOf(msg.content).slice(0, 8000),
              });
            }
          }
        }
      };

      push({ type: 'start' });
      // surface the thread id as a stream data part — the frontend reads
      // it from the finished message's parts (more reliable than headers)
      push({ type: 'data-thread-id', data: [threadId] });

      const reader = upstream.body!.getReader();
      let buffer = '';
      let mode = '';
      const HEARTBEAT_MS = 15_000;
      let pending = reader.read();
      try {
        for (;;) {
          const won = await Promise.race([
            pending,
            new Promise<'beat'>((r) =>
              setTimeout(() => r('beat'), HEARTBEAT_MS),
            ),
          ]);
          if (won === 'beat') {
            ping();
            if (!alive) break;
            continue;
          }
          pending = reader.read();
          const { done, value } = won;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).replace(/\r$/, '');
            buffer = buffer.slice(nl + 1);

            if (line.startsWith('event:')) {
              mode = line.slice(6).trim();
              continue;
            }
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;

            let parsed: unknown;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }
            if (mode === 'messages' || mode === 'messages-tuple') {
              onMessagesTuple(parsed);
            } else if (mode === 'updates') {
              onUpdates(parsed);
            }
          }
        }
        endStep();
      } catch (err) {
        push({ type: 'error', errorText: String(err) });
      } finally {
        push({ type: 'finish' });
        if (!alive) reader.cancel().catch(() => {});
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // Tell nginx (and compatible proxies) not to buffer this response —
      // buffering turns token streaming into multi-second bursts.
      'X-Accel-Buffering': 'no',
      'x-langgraph-thread-id': threadId,
      'x-vercel-ai-ui-message-stream': 'v1',
    },
  });
}
