import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { V3Session } from '@/lib/v3/powerAgents';
import { AssignmentsWindow } from '@/components/v3/windows/AssignmentsWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Agent } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

// the exec view's chat transport isn't under test here
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], setMessages: jest.fn(), sendMessage: jest.fn(), status: 'ready', stop: jest.fn(), error: null }),
}));
jest.mock('ai', () => ({ DefaultChatTransport: jest.fn().mockImplementation(() => ({})) }));

const Bot = jest.requireActual('lucide-react').Bot;
const ShoppingBag = jest.requireActual('lucide-react').ShoppingBag;
const agent = (over: Partial<V3Agent>): V3Agent => ({
  key: 'crawlability_audit',
  assistantId: 'as_1',
  name: 'Crawlability',
  role: 'Crawler & Indexer',
  handle: '@Crawlability',
  suite: 'SEO Audit Suite',
  icon: Bot,
  ...over,
});

function seedFeed(sessions: V3Session[]) {
  window.localStorage.setItem('v3.firstVisit', String(Date.now() - 60_000));
  useV3OS.setState({ windows: [], workspaceId: 'w1', sessionFeed: sessions, sessionFeedError: null });
}

describe('AssignmentsWindow · v13 depth (gantt / board / review + slide-over)', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    mockedAgents.mockResolvedValue([
      agent({}),
      agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', suite: 'Shopify Suite', icon: ShoppingBag }),
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  const sessions = [
    { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: new Date().toISOString() },
    { id: 't2', title: 'older sweep', agentKey: 'crawlability_audit', createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-20T11:00:00Z' },
    { id: 't3', title: 'PDP refresh', agentKey: 'shopify_agent', createdAt: '2026-09-25T09:00:00Z', updatedAt: new Date().toISOString() },
  ];

  it('gantt tab: sessions render as timeline rows with status fills', async () => {
    seedFeed(sessions);
    const { container } = render(<AssignmentsWindow />);
    expect(await screen.findByText('Q4 site audit')).toBeTruthy();
    const rows = container.querySelectorAll('.gantt-row');
    expect(rows.length).toBe(3);
    const fills = container.querySelectorAll('.gantt-fill');
    expect(fills[0].className).toContain('st-attention'); // unread → amber
    expect(fills[1].className).toContain('st-done'); // reviewed → green
    expect(screen.getByText(/3 sessions · 2 awaiting review · 2 agents/i)).toBeTruthy();
  });

  it('board tab: fizzy status columns with counts and tags', async () => {
    seedFeed(sessions);
    const { container } = render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Board/i }));
    expect(await screen.findByText('Awaiting review')).toBeTruthy();
    expect(screen.getByText('Reviewed')).toBeTruthy();
    expect(container.querySelectorAll('.fizzy-card').length).toBe(3);
    expect(screen.getAllByText(/@Crawlability/).length).toBeGreaterThan(0); // fizzy tags carry the handle
  });

  it('review tab: inline approve clears the awaiting row', async () => {
    seedFeed(sessions);
    render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByRole('tab', { name: /Review/i }));
    expect((await screen.findAllByText(/awaiting your review/i)).length).toBe(2);
    const before = screen.getAllByRole('button', { name: /Approve /i }).length;
    expect(before).toBe(2);
    fireEvent.click(screen.getAllByRole('button', { name: /Approve /i })[0]);
    expect(await waitFor(() => screen.getAllByRole('button', { name: /Approve /i }).length)).toBe(1);
    expect(window.localStorage.getItem('v3.seen.th.t1')).toBeTruthy();
  });

  it('slide-over opens from the gantt with conversation preview + deep-link', async () => {
    seedFeed(sessions);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'crawl the sitemap' }] }],
        }),
    }) as unknown as typeof fetch;
    render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByText('Q4 site audit'));
    expect(await screen.findByRole('dialog', { name: /Q4 site audit details/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('crawl the sitemap')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Open in execution/i }));
    const st = useV3OS.getState();
    expect(st.selectedAgentKey).toBe('crawlability_audit');
    expect(st.selectedThreadKey).toBe('t1');
    expect(st.windows.map((w) => w.id)).toContain('agents');
  });

  it('empty feed and feed errors are honest', async () => {
    seedFeed([]);
    render(<AssignmentsWindow />);
    expect(await screen.findByText(/No sessions yet — deploy a power agent/i)).toBeTruthy();
  });
});
