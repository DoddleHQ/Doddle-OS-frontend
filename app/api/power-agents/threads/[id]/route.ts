import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphApiUrl } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';

/**
 * GET    /api/power-agents/threads/:id  — restore: thread state → UIMessage[]
 * PATCH  /api/power-agents/threads/:id  — rename (metadata.title)
 * DELETE /api/power-agents/threads/:id  — delete the session
 */

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

/** Map LangGraph thread state messages into AI SDK UIMessage[] so a
 * restored session renders identically to a live one (text parts in the
 * feed, tool parts in the execution canvas). */
function toUIMessages(messages: LGMessage[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const outputs = new Map<string, string>();
  for (const m of messages) {
    if (m.type === 'tool' && m.tool_call_id) {
      outputs.set(m.tool_call_id, textOf(m.content));
    }
  }
  let i = 0;
  for (const m of messages) {
    if (m.type === 'human') {
      out.push({
        id: `restore-h-${i++}`,
        role: 'user',
        parts: [{ type: 'text', text: textOf(m.content) }],
      });
    } else if (m.type === 'ai') {
      const parts: Array<Record<string, unknown>> = [];
      const text = textOf(m.content);
      if (text) parts.push({ type: 'text', text, state: 'done' });
      for (const tc of m.tool_calls ?? []) {
        const toolName = tc.name ?? 'tool';
        const id = tc.id ?? `restore-t-${i}`;
        let input: Record<string, unknown> = {};
        if (typeof tc.args === 'string') {
          try { input = JSON.parse(tc.args); } catch { input = { raw: tc.args }; }
        } else if (tc.args && typeof tc.args === 'object') {
          input = tc.args as Record<string, unknown>;
        }
        parts.push({
          type: `tool-${toolName}`,
          toolCallId: id,
          state: 'output-available',
          input,
          output: outputs.get(id) ?? '',
        });
      }
      if (parts.length) {
        out.push({ id: `restore-a-${i++}`, role: 'assistant', parts });
      }
    }
  }
  return out;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${getLangGraphApiUrl()}/threads/${id}/state`);
  if (res.status === 404) {
    // thread is gone (deleted elsewhere) — say so distinctly so the
    // frontend can drop the stale chip instead of showing a server error
    return NextResponse.json({ error: 'thread not found' }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: `thread state failed: ${res.status}` },
      { status: 502 },
    );
  }
  const state = (await res.json()) as {
    values?: { messages?: LGMessage[] };
    metadata?: Record<string, unknown>;
  };

  // check if the thread has an active run (for stream-join on switch-back)
  const runsRes = await fetch(`${getLangGraphApiUrl()}/threads/${id}/runs`);
  const runs = runsRes.ok
    ? ((await runsRes.json()) as Array<{ status: string }>)
    : [];
  const isBusy = runs.some(
    (r) => r.status === 'running' || r.status === 'pending',
  );

  return NextResponse.json({
    id,
    title: (state.metadata?.title as string) ?? 'Untitled session',
    messages: toUIMessages(state.values?.messages ?? []),
    busy: isBusy,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as { title: string };
  const res = await fetch(`${getLangGraphApiUrl()}/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata: { title: body.title } }),
  });
  if (res.status === 404) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: `thread rename failed: ${res.status}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${getLangGraphApiUrl()}/threads/${id}`, {
    method: 'DELETE',
  });
  if (res.status === 404) {
    // already gone — treat as success so client cleanup proceeds
    return NextResponse.json({ ok: true });
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: `thread delete failed: ${res.status}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
