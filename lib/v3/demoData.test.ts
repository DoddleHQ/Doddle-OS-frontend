import { DEMO_AGENTS, demoSessions } from '@/lib/v3/demoData';
import { v3SessionStatus } from '@/lib/v3/data';

describe('demoData — versatile seeds until real data exists', () => {
  beforeEach(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it('covers every suite with a 9-agent roster', () => {
    const suites = new Set(DEMO_AGENTS.map((a) => a.suite));
    expect(suites.size).toBe(6);
    expect(DEMO_AGENTS.every((a) => a.handle.startsWith('@'))).toBe(true);
  });

  it('yields the full status mix: one running, a few awaiting review, mostly done', () => {
    const list = demoSessions();
    const statuses = list.map((s) => v3SessionStatus(s));
    expect(statuses.filter((s) => s === 'running').length).toBe(1);
    expect(statuses.filter((s) => s === 'attention').length).toBe(2);
    expect(statuses.filter((s) => s === 'done').length).toBeGreaterThanOrEqual(9);
  });

  it('spreads runs across the 21-day window and covers most agents', () => {
    const list = demoSessions();
    const days = new Set(list.map((s) => new Date(s.updatedAt ?? 0).toDateString()));
    expect(days.size).toBeGreaterThanOrEqual(9); // throughput trend has bars
    const agents = new Set(list.map((s) => s.agentKey));
    expect(agents.size).toBeGreaterThanOrEqual(8); // utilization spread
    expect(list.every((s) => s.id.startsWith('demo_'))).toBe(true);
  });

  it('is idempotent: seen markers for done runs survive regeneration', () => {
    demoSessions();
    const marked = Object.keys(window.localStorage.valueOf()).filter((k) => k.startsWith('v3.seen.th.demo_'));
    expect(marked.length).toBeGreaterThanOrEqual(9);
    demoSessions();
    const again = Object.keys(window.localStorage.valueOf()).filter((k) => k.startsWith('v3.seen.th.demo_'));
    expect(again.length).toBe(marked.length);
  });
});
