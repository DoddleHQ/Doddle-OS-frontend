import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphApiUrl, langgraphAuthHeaders } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';

interface ThreadRow {
  thread_id: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }
  const res = await fetch(`${getLangGraphApiUrl()}/threads/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...langgraphAuthHeaders(req) },
    body: JSON.stringify({
      metadata: { workspace_id: workspaceId },
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
    rows
      .filter((t) => t.metadata?.agent_key)
      .map((t) => ({
        id: t.thread_id,
        title: (t.metadata?.title as string) ?? 'Untitled session',
        agentKey: (t.metadata?.agent_key as string) ?? null,
        triageStatus: (t.metadata?.triage_status as string) ?? null,
        createdAt: t.created_at ?? null,
        updatedAt: t.updated_at ?? null,
      })),
  );
}
