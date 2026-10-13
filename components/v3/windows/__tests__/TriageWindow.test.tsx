import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TriageWindow } from '@/components/v3/windows/TriageWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Agent } from '@/lib/v3/powerAgents';
// path navigation: router/pathname stubs
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
}));

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

function seedFeed() {
  window.localStorage.setItem('v3.firstVisit', String(Date.now() - 24 * 3600_000));
  useV3OS.setState({
    workspaceId: 'w1',
    sessionFeed: [
      { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
      { id: 't2', title: 'already reviewed', agentKey: 'crawlability_audit', createdAt: '2026-09-30T09:00:00Z', updatedAt: '2026-09-30T09:30:00Z' },
    ],
    windows: [],
  });
  window.localStorage.setItem('v3.seen.th.t2', String(Date.now())); // t2 is read
}

describe('TriageWindow · 3-pane on real unread sessions', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    mockedAgents.mockResolvedValue([agent({})]);
    seedFeed();
    // default history mock; individual tests override
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('queue lists only unread sessions; the reviewed one is absent', async () => {
    render(<TriageWindow />);
    expect((await screen.findAllByText('Q4 site audit')).length).toBeGreaterThanOrEqual(1); // queue row + details
    expect(screen.queryByText('already reviewed')).toBeNull();
    expect(screen.getByText(/QUEUE · REVIEW — NOTHING SHIPS WITHOUT YOU/i)).toBeTruthy();
  });

  it('loads the selected run history into the conversation pane', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'crawl the sitemap' }] }] }),
    }) as unknown as typeof fetch;
    render(<TriageWindow />);
    await screen.findByText(/loading run…|crawl the sitemap/);
    await waitFor(() => expect(screen.getByText('crawl the sitemap')).toBeTruthy());
    expect(screen.getByText('Q4 site audit', { selector: '.pane-label span' })).toBeTruthy();
  });

  it('Approve marks the run reviewed — it leaves the queue', async () => {
    render(<TriageWindow />);
    fireEvent.click(await screen.findByRole('button', { name: /^Approve$/i }));
    await waitFor(() => expect(screen.getByText(/Inbox zero\. New agent results land here\./i)).toBeTruthy());
    expect(window.localStorage.getItem('v3.seen.th.t1')).toBeTruthy();
  });

  it('Request changes reveals the feedback line; Send deep-links into the exec view', async () => {
    render(<TriageWindow />);
    fireEvent.click(await screen.findByRole('button', { name: /^Request changes$/i }));
    const input = await screen.findByPlaceholderText('What should change?');
    fireEvent.change(input, { target: { value: 'tighten the summary' } });
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));
    const st = useV3OS.getState();
    expect(st.selectedAgentKey).toBe('crawlability_audit');
    expect(st.selectedThreadKey).toBe('t1');
  });

  it('an empty queue shows the honest all-clear state', async () => {
    useV3OS.setState({ sessionFeed: [] });
    render(<TriageWindow />);
    expect(await screen.findByText(/Inbox zero\. New agent results land here\./i)).toBeTruthy();
    expect(screen.getAllByText(/inbox zero/i).length).toBeGreaterThan(0);
  });
});
