import { render, screen, fireEvent } from '@testing-library/react';
import { AssignmentsWindow } from '@/components/v3/windows/AssignmentsWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Agent } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

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

describe('AssignmentsWindow · board on the real session feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try {
      window.localStorage.clear();
      window.localStorage.setItem('v3.firstVisit', String(Date.now() - 60_000));
    } catch {
      /* ignore */
    }
    useV3OS.setState({ windows: [], workspaceId: 'w1', sessionFeed: [], sessionFeedError: null });
    mockedAgents.mockResolvedValue([
      agent({}),
      agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', suite: 'Shopify Suite', icon: ShoppingBag }),
    ]);
  });

  it('groups sessions into agent columns with honest state chips', async () => {
    useV3OS.setState({
      sessionFeed: [
        { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date().toISOString() },
        { id: 't2', title: 'older sweep', agentKey: 'crawlability_audit', createdAt: null, updatedAt: '2026-09-20T10:00:00Z' },
        { id: 't3', title: 'PDP refresh', agentKey: 'shopify_agent', createdAt: null, updatedAt: new Date().toISOString() },
      ],
    });
    render(<AssignmentsWindow />);
    expect(await screen.findByText('@Crawlability')).toBeTruthy();
    expect(screen.getByText('@Shopify')).toBeTruthy();
    expect(screen.getByText('3 sessions · 2 awaiting review · 2 agents')).toBeTruthy();
    // fresh rows carry the review chip; the read one says reviewed
    expect(screen.getAllByText('review').length).toBe(2);
    expect(screen.getByText('reviewed')).toBeTruthy();
    expect(screen.queryByText(/idle · waiting/i)).toBeNull(); // every roster agent has activity
  });

  it('idle roster agents get a waiting column; clicking one opens its exec view', async () => {
    useV3OS.setState({
      sessionFeed: [{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date().toISOString() }],
    });
    render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByText('@Shopify')); // idle column entry
    expect(useV3OS.getState().selectedAgentKey).toBe('shopify_agent');
    expect(useV3OS.getState().windows.map((w) => w.id)).toContain('agents');
  });

  it('clicking a session deep-links that thread into the exec view', async () => {
    useV3OS.setState({
      sessionFeed: [{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date().toISOString() }],
    });
    render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByText('Q4 site audit'));
    const st = useV3OS.getState();
    expect(st.selectedAgentKey).toBe('crawlability_audit');
    expect(st.selectedThreadKey).toBe('t1');
    expect(st.windows.map((w) => w.id)).toContain('agents');
  });

  it('empty feed and feed errors are honest', async () => {
    render(<AssignmentsWindow />);
    expect(await screen.findByText(/No sessions yet — deploy a power agent/i)).toBeTruthy();
    useV3OS.setState({ sessionFeedError: 'HTTP 502' });
    const { unmount } = render(<AssignmentsWindow />);
    unmount();
    expect(screen.queryByText(/No sessions yet/i)).toBeNull();
  });
});
