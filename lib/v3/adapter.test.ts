import { v3Data, OPERATOR_FIRST_NAME } from '@/lib/v3/adapter';

describe('v3 mock adapter', () => {
  it('serves three marketing workspaces with Marketing current', () => {
    const ws = v3Data.getWorkspaces();
    expect(ws).toHaveLength(3);
    expect(v3Data.getCurrentWorkspaceId()).toBe('marketing');
    expect(ws.map((w) => w.name).join()).toContain('Marketing');
  });

  it('serves the six-agent real fleet with @ handles', () => {
    const agents = v3Data.getAgents();
    expect(agents).toHaveLength(6);
    expect(agents.map((a) => a.handle)).toEqual(
      expect.arrayContaining([
        '@SEO_Scout',
        '@Content_Architect',
        '@Magento_Writer',
        '@Site_Architect',
        '@Google_Analyst',
        '@Merchant_Analyst',
      ]),
    );
  });

  it('serves the seven locked categories with spec colors', () => {
    const cats = v3Data.getCategories();
    expect(cats).toHaveLength(7);
    const byId = Object.fromEntries(cats.map((c) => [c.id, c.color]));
    expect(byId.research).toBe('#0891b2');
    expect(byId['site-audit']).toBe('#3b82f6');
    expect(byId.data).toBe('#10b981');
    expect(byId.content).toBe('#d97706');
    expect(byId.ads).toBe('#ea580c');
    expect(byId.social).toBe('#db2777');
    expect(byId.brand).toBe('#9333ea');
  });

  it('serves one active thread mid-run and a non-empty review queue', () => {
    const t = v3Data.getActiveThread();
    expect(t && t.progress).toBeGreaterThan(0);
    expect(t && t.progress).toBeLessThan(100);
    expect(v3Data.getReviewQueue().length).toBeGreaterThan(0);
    expect(OPERATOR_FIRST_NAME).toBe('Alex');
  });
});
