import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityRail } from '@/components/v3/shell/ActivityRail';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';

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

const session = (over: Partial<V3Session>): V3Session => ({
  id: 's1',
  title: 'Q4 site audit',
  agentKey: 'crawlability_audit',
  createdAt: '2026-09-30T10:00:00Z',
  updatedAt: '2026-09-30T11:00:00Z',
  ...over,
});

describe('ActivityRail (real sessions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useV3OS.setState({ windows: [], workspaceId: 'w1', railPinned: false, selectedAgentKey: null });
  });

  it('shows recent sessions with naming tooltips; click opens the agent', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    mockedSessions.mockResolvedValue([
      session({ id: 'a', title: 'Q4 site audit' }),
      session({ id: 'b', title: 'Shop sweep', agentKey: 'shopify_agent' }),
    ]);
    render(<ActivityRail />);
    const block = await screen.findByRole('button', { name: /Q4 site audit, session/i });
    expect(block.getAttribute('data-tip')).toContain('Q4 site audit');
    expect(block.getAttribute('data-tip')).toContain('@Crawlability');
    fireEvent.click(block);
    expect(useV3OS.getState().windows.map((w) => w.id)).toContain('agents');
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
  });

  it('caps the feed at five blocks and shows idle when empty', async () => {
    mockedAgents.mockResolvedValue([]);
    mockedSessions.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => session({ id: `s${i}`, title: `S${i}` })),
    );
    const { container } = render(<ActivityRail />);
    await waitFor(() => expect(container.querySelectorAll('.rail-btn.st-running').length).toBe(5));
  });

  it('idle state when no sessions', async () => {
    mockedAgents.mockResolvedValue([]);
    mockedSessions.mockResolvedValue([]);
    render(<ActivityRail />);
    await waitFor(() => expect(screen.getByText('idle')).toBeTruthy());
  });

  it('lists minimized windows as restorable blocks', () => {
    mockedAgents.mockResolvedValue([]);
    mockedSessions.mockResolvedValue([]);
    useV3OS.getState().openApp('home');
    useV3OS.getState().minWin('home');
    render(<ActivityRail />);
    expect(screen.getByRole('button', { name: /Home, minimized/i }).getAttribute('data-tip')).toContain('click to restore');
  });
});
