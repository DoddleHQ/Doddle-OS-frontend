import { fetchV3PowerAgents, fetchV3Sessions, fetchV3SessionsForAgent, powerAgentMeta } from '@/lib/v3/powerAgents';

describe('powerAgents meta', () => {
  it('maps known agent keys to names, roles, handles, and suites', () => {
    expect(powerAgentMeta('crawlability_audit')).toMatchObject({ name: 'Crawlability', handle: '@Crawlability', suite: 'SEO Audit Suite' });
    expect(powerAgentMeta('devops_agent')).toMatchObject({ name: 'DevOps', suite: 'DevOps Suite' });
    expect(powerAgentMeta('shopify_agent')).toMatchObject({ name: 'Shopify', suite: 'Shopify Suite' });
    expect(powerAgentMeta('product_content')).toMatchObject({ suite: 'Website Content Suite' });
  });

  it('falls back gracefully for unknown keys', () => {
    expect(powerAgentMeta('brand_new_agent')).toMatchObject({ name: 'brand new', handle: '@brand_new', role: 'Specialist' });
  });
});

describe('powerAgents fetchers', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  function mockFetch(json: unknown, ok = true, status = 200) {
    return jest.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(json) });
  }

  it('fetchV3PowerAgents maps the live roster', async () => {
    global.fetch = mockFetch([{ id: 'crawlability_audit', assistantId: 'as_1' }]) as unknown as typeof fetch;
    const agents = await fetchV3PowerAgents();
    expect(agents[0]).toMatchObject({ key: 'crawlability_audit', assistantId: 'as_1', handle: '@Crawlability' });
  });

  it('fetchV3Sessions hits the workspace feed with the workspace id', async () => {
    const f = mockFetch([{ id: 't1', title: 'Q4 audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]);
    global.fetch = f as unknown as typeof fetch;
    const sessions = await fetchV3Sessions('w1');
    expect(f).toHaveBeenCalledWith('/api/power-agents/feed?workspaceId=w1');
    expect(sessions[0]).toMatchObject({ id: 't1', agentKey: 'crawlability_audit' });
  });

  it('fetchV3SessionsForAgent hits the per-agent route', async () => {
    const f = mockFetch([{ id: 't1', title: 'S', createdAt: null, updatedAt: null }]);
    global.fetch = f as unknown as typeof fetch;
    await fetchV3SessionsForAgent('w1', 'crawlability_audit');
    expect(f).toHaveBeenCalledWith('/api/power-agents/threads?agentKey=crawlability_audit&workspaceId=w1');
  });

  it('non-ok responses throw with the status', async () => {
    global.fetch = mockFetch({ error: 'nope' }, false, 502) as unknown as typeof fetch;
    await expect(fetchV3PowerAgents()).rejects.toThrow('HTTP 502');
  });
});
