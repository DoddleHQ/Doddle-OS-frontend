import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/v3/shell/Dashboard';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';
import { useV3OperatorName } from '@/lib/v3/data';

jest.mock('@/lib/v3/data', () => {
  const actual = jest.requireActual('@/lib/v3/data');
  return {
    ...actual,
    useV3OperatorName: () => 'Alex',
  };
});

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return {
    ...actual,
    fetchV3PowerAgents: jest.fn(),
    fetchV3Sessions: jest.fn(),
  };
});

const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;
const mockedSessions = fetchV3Sessions as jest.MockedFunction<typeof fetchV3Sessions>;

const agent = (over: Partial<V3Agent>): V3Agent => ({
  key: 'crawlability_audit',
  assistantId: 'as_1',
  name: 'Crawlability',
  role: 'Crawler & Indexer',
  handle: '@Crawlability',
  suite: 'SEO Audit Suite',
  icon: actualIcon(),
  ...over,
});
function actualIcon() {
  return jest.requireActual('lucide-react').Bot;
}

const session = (over: Partial<V3Session>): V3Session => ({
  id: 's1',
  title: 'Q4 site audit',
  agentKey: 'crawlability_audit',
  createdAt: '2026-09-30T10:00:00Z',
  updatedAt: '2026-09-30T11:00:00Z',
  ...over,
});

describe('Dashboard (real power-agent data)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useV3OS.setState({ windows: [], workspaceId: 'w1', workspaces: [{ id: 'w1', name: 'Acme' }], selectedAgentKey: null, sessionFeed: [], sessionFeedError: null });
    mockedAgents.mockResolvedValue([]);
  });

  it('greets the real operator and shows the latest session from the feed', async () => {
    mockedAgents.mockResolvedValue([agent({}), agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', suite: 'Shopify Suite' })]);
    useV3OS.setState({ sessionFeed: [session({})] });
    render(<Dashboard />);
    expect(screen.getByText(/Good (morning|afternoon|evening), Alex/i)).toBeTruthy();
    // title appears in the Active Execution card and telemetry
    await waitFor(() => expect(screen.getAllByText('Q4 site audit').length).toBeGreaterThan(0));
    expect(await screen.findByText(/session · .* · @Crawlability/i)).toBeTruthy();
  });

  it('hides while a window is open', () => {
    mockedAgents.mockResolvedValue([]);
    useV3OS.getState().openApp('home');
    const { container } = render(<Dashboard />);
    expect(container.firstElementChild?.className).toContain('dash-hidden');
  });

  it('shows the session-feed error honestly, never fake data', async () => {
    mockedAgents.mockResolvedValue([]);
    useV3OS.setState({ sessionFeed: [], sessionFeedError: 'offline' });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getAllByText(/session feed unavailable|offline/i).length).toBeGreaterThan(0));
  });

  it('AGENTS_IN_FLOW rows open the agents window with that agent selected', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    useV3OS.setState({ sessionFeed: [session({})] });
    render(<Dashboard />);
    const row = await screen.findByText(/@Crawlability · Crawler & Indexer/i);
    fireEvent.click(row);
    expect(useV3OS.getState().windows.map((w) => w.id)).toContain('agents');
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
  });
});
