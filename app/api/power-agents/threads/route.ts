import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphApiUrl, langgraphAuthHeaders } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/power-agents/threads?agentKey=crawlability_audit
 * Lists that agent's sessions (threads), newest first.
 *
 * POST /api/power-agents/threads { agentKey, assistantId, title? }
 * Creates a new session thread with agent metadata.
 */

interface ThreadRow {
  thread_id: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function GET(req: NextRequest) {
  const agentKey = req.nextUrl.searchParams.get('agentKey');
  if (!agentKey) {
    return NextResponse.json({ error: 'agentKey required' }, { status: 400 });
  }
  const res = await fetch(`${getLangGraphApiUrl()}/threads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...langgraphAuthHeaders(req) },
    body: JSON.stringify({
      metadata: { agent_key: agentKey },
      limit: 50,
      sort_by: 'updated_at',
      sort_order: 'desc',
    }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `threads search failed: ${res.status}` },
      { status: res.status === 401 ? 401 : 502 },
    );
  }
  const rows = (await res.json()) as ThreadRow[];
  return NextResponse.json(
    rows.map((t) => ({
      id: t.thread_id,
      title: (t.metadata?.title as string) ?? 'Untitled session',
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    agentKey: string;
    assistantId: string;
    title?: string;
  };
  if (!body.agentKey || !body.assistantId) {
    return NextResponse.json(
      { error: 'agentKey and assistantId required' },
      { status: 400 },
    );
  }
  const res = await fetch(`${getLangGraphApiUrl()}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...langgraphAuthHeaders(req) },
    body: JSON.stringify({
      metadata: {
        assistant_id: body.assistantId,
        agent_key: body.agentKey,
        title: body.title ?? 'New session',
      },
    }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `thread creation failed: ${res.status}` },
      { status: res.status === 401 ? 401 : 502 },
    );
  }
  const thread = (await res.json()) as ThreadRow;
  return NextResponse.json({ id: thread.thread_id, title: body.title ?? 'New session' });
}
