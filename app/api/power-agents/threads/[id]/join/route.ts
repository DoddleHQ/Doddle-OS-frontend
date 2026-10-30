import { NextRequest } from 'next/server';
import { getLangGraphApiUrl, langgraphAuthHeaders } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params;

  const runsRes = await fetch(`${base()}/threads/${threadId}/runs`, {
    headers: langgraphAuthHeaders(req),
  });
  if (!runsRes.ok) {
    return new Response(
      JSON.stringify({ error: `cannot list runs: ${runsRes.status}` }),
      { status: runsRes.status === 401 ? 401 : 502 },
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

  const upstream = await fetch(
    `${base()}/threads/${threadId}/runs/${activeRun.run_id}/stream?stream_mode=messages-tuple`,
    { headers: { Accept: 'text/event-stream', ...langgraphAuthHeaders(req) } },
  );

  if (upstream.status === 404) {
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
      { status: upstream.status === 401 ? 401 : 502 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
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
