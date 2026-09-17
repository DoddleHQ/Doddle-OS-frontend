import { NextRequest, NextResponse } from 'next/server';
import { getLangGraphApiUrl, langgraphAuthHeaders } from '@/lib/config/langgraph.config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/power-agents
 * Lists the assistants registered on the LangGraph server.
 * Server-side proxy so the browser never hits CORS or the raw server URL.
 */
export async function GET(req: NextRequest) {
  const base = getLangGraphApiUrl();
  try {
    const res = await fetch(`${base}/assistants/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...langgraphAuthHeaders(req) },
      body: JSON.stringify({ limit: 50 }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `langgraph server responded ${res.status}` },
        { status: res.status === 401 ? 401 : 502 },
      );
    }
    const assistants = (await res.json()) as Array<{
      assistant_id: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }>;
    return NextResponse.json(
      assistants
        .filter((a) => a.name)
        .map((a) => ({
          id: a.name as string,
          assistantId: a.assistant_id,
        })),
    );
  } catch (err) {
    return NextResponse.json(
      { error: `cannot reach langgraph server at ${base}: ${err}` },
      { status: 502 },
    );
  }
}
