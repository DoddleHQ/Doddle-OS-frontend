import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/v3/shell/Dashboard';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';
import { useV3OperatorName } from '@/lib/v3/data';
// path navigation: capture pushes
const pushes: string[] = [];
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (p: string) => pushes.push(p), replace: jest.fn() }),
  usePathname: () => '/v3',
}));

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
  };
});

const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

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
    pushes.length = 0;
    useV3OS.setState({ windows: [], workspaceId: 'w1', workspaces: [{ id: 'w1', name: 'Acme' }], selectedAgentKey: null, sessionFeed: [], sessionFeedError: null });
    mockedAgents.mockResolvedValue([]);
  });

  it('greets the real operator and shows the latest session from the feed', async () => {
    mockedAgents.mockResolvedValue([agent({}), agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', suite: 'Shopify Suite' })]);
    useV3OS.setState({ sessionFeed: [session({})] });
    render(<Dashboard />);
    expect(screen.getByText(/Good (morning|afternoon|evening), Alex/i)).toBeTruthy();
    // headline session appears in the Active Execution card and telemetry; the
    // v13 sub line is the static hint
    await waitFor(() => expect(screen.getAllByText('Q4 site audit').length).toBeGreaterThan(0));
    expect(screen.getAllByText('in-progress tasks appear here first').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Q4 site audit — \d+%/i).length).toBeGreaterThan(0);
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

  it('hero quick links and bento cards navigate exactly like indexv13', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    useV3OS.setState({ sessionFeed: [session({})] });
    render(<Dashboard />);
    expect(screen.getByRole('link', { name: /↗ Research task/i }).getAttribute('href')).toBe('/v3/launchpad?type=research');
    expect(screen.getByRole('link', { name: /↗ Deploy research agent/i }).getAttribute('href')).toBe('/v3/agents');
    expect(screen.getByRole('link', { name: /Needs review/ }).getAttribute('href')).toBe('/v3/triage');
    // cards: assignments, agents, active execution → assignments, triage
    expect(screen.getByRole('link', { name: /Assignments/i }).getAttribute('href')).toBe('/v3/assignments');
    expect(screen.getByRole('link', { name: /^Agents/i }).getAttribute('href')).toBe('/v3/agents');
    expect(screen.getByRole('link', { name: /Active Execution/i }).getAttribute('href')).toBe('/v3/assignments');
    expect(screen.getByRole('link', { name: /Triage Queue/i }).getAttribute('href')).toBe('/v3/triage');
    expect(screen.getByRole('link', { name: /open agents/i }).getAttribute('href')).toBe('/v3/agents');
  });

  it('AGENTS_IN_FLOW mirrors v13: busy agent row + idle row', async () => {
    mockedAgents.mockResolvedValue([agent({}), agent({ key: 'gitops_agent', handle: '@GitOps', suite: 'GitOps Suite' })]);
    useV3OS.setState({ sessionFeed: [session({})] });
    render(<Dashboard />);
    expect(await screen.findByText('@Crawlability')).toBeTruthy();
    expect(screen.getAllByText(/Q4 site audit — \d+%/i).length).toBeGreaterThan(0);
    expect(screen.getByText('@GitOps')).toBeTruthy();
    expect(screen.getByText('Waiting for a task')).toBeTruthy();
  });
});
