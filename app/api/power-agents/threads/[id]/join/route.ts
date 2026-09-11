import { NextRequest } from 'next/server';
import { getLangGraphApiUrl } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/power-agents/threads/:id/join
 *
 * Attaches to an active run's live stream on this thread and re-emits
 * the AI SDK UI Message Stream — so switching back to a busy thread
 * resumes token-level streaming exactly where it is. If no run is active,
 * returns a `data-no-active-run` part and closes.
 */

const base = () => getLangGraphApiUrl();

interface LGMessage {
  type?: string;
  content?: string | Array<{ type: string; text?: string }>;
  tool_calls?: Array<{ id?: string; name?: string; args?: unknown }>;
  tool_call_id?: string;
  name?: string;
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'object' && p && 'text' in p ? String(p.text) : ''))
      .join('');
  }
  return '';
}

function sse(part: unknown): string {
  return `data: ${JSON.stringify(part)}\n\n`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params;

  // find the active run on this thread
  const runsRes = await fetch(`${base()}/threads/${threadId}/runs`);
  if (!runsRes.ok) {
    return new Response(
      JSON.stringify({ error: `cannot list runs: ${runsRes.status}` }),
      { status: 502 },
    );
  }
  const runs = (await runsRes.json()) as Array<{
    run_id: string;
    status: string;
  }>;
  const activeRun = runs.find(
    (r) => r.status === 'running' || r.status === 'pending',
  );

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (!activeRun) {
    return new Response(
      encoder.encode(
        sse({ type: 'start' }) +
          sse({ type: 'data-no-active-run', data: [threadId] }) +
          sse({ type: 'finish' }),
      ),
      { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
    );
  }

  // join the run's stream — same SSE translation as the chat route
  const upstream = await fetch(
    `${base()}/threads/${threadId}/runs/${activeRun.run_id}/stream?stream_mode=messages-tuple`,
    { headers: { Accept: 'text/event-stream' } },
  );

  if (upstream.status === 404) {
    // Race: the run finished between listing it above and attaching to its
    // stream. That is success, not an error — answer with the no-active-run
    // stream so the client falls back to loading the thread's final state.
    return new Response(
      encoder.encode(
        sse({ type: 'start' }) +
          sse({ type: 'data-no-active-run', data: [threadId] }) +
          sse({ type: 'finish' }),
      ),
      { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: `join stream failed: ${upstream.status}` }),
      { status: 502 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Same guards as the chat route: heartbeat through proxy idle
      // timeouts, guarded enqueues for a gone client.
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
      const ping = () => safeEnqueue(': ping\n\n');

      let step = 0;
      let stepOpen = false;
      let textId: string | null = null;

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

      const onMessages = (payload: unknown) => {
        const tuple = Array.isArray(payload) ? payload : [payload];
        const chunk = tuple[0] as LGMessage;
        if (!chunk || typeof chunk !== 'object') return;
        const isAI = chunk.type === 'ai' || chunk.type === 'AIMessageChunk';
        if (!isAI) return;
        const text = textOf(chunk.content);
        if (text) {
          beginStep();
          if (!textId) {
            textId = `t-${step}`;
            push({ type: 'text-start', id: textId });
          }
          push({ type: 'text-delta', id: textId, delta: text });
        }
      };

      push({ type: 'start' });
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
              onMessages(parsed);
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
      'X-Accel-Buffering': 'no',
      'x-vercel-ai-ui-message-stream': 'v1',
    },
  });
}
