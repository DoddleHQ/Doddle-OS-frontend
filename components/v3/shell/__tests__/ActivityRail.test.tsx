import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityRail } from '@/components/v3/shell/ActivityRail';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';
// path navigation: router/pathname stubs
const pushes: string[] = [];
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (p: string) => pushes.push(p), replace: jest.fn() }),
  usePathname: () => '/v3',
}));

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

const soon = () => new Date(Date.now() + 36e5).toISOString();
const session = (over: Partial<V3Session>): V3Session => ({
  id: 's1',
  title: 'Q4 site audit',
  agentKey: 'crawlability_audit',
  createdAt: soon(),
  updatedAt: soon(),
  ...over,
});

describe('ActivityRail (reference #activity-rail DOM)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushes.length = 0;
    useV3OS.setState({ windows: [], workspaceId: 'w1', railPinned: false, selectedAgentKey: null });
  });

  it('renders the hover zone + id’d rail; blocks carry title/--p/bar and navigate to agents', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    mockedSessions.mockResolvedValue([session({ id: 'a', title: 'Q4 site audit' })]);
    const { container } = render(<ActivityRail />);
    const rail = await waitFor(() => {
      const el = container.querySelector('#activity-rail');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    // zone is the previous sibling — v13's hover-reveal selector depends on it
    const zone = container.querySelector('#rail-hover-zone');
    expect(zone?.nextElementSibling).toBe(rail);

    const block = screen.getByRole('button', { name: /Q4 site audit/i });
    expect(block.getAttribute('title')).toContain('Q4 site audit — attention');
    expect(block.querySelector('.bar')).toBeTruthy();
    expect(block.className).toContain('kind-review');
    fireEvent.click(block);
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
    expect(pushes).toContain('/v3/agents');
  });

  it('unread sessions sit in DOING (attention), read ones in DONE', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    mockedSessions.mockResolvedValue([
      session({ id: 'a', title: 'Fresh run' }),
      session({ id: 'b', title: 'Old run', updatedAt: '2026-09-30T11:00:00Z', createdAt: '2026-09-30T10:00:00Z' }),
    ]);
    const { container } = render(<ActivityRail />);
    await waitFor(() => expect(container.querySelectorAll('.rail-btn').length).toBe(2));
    expect(container.querySelector('#rail-doing')?.querySelectorAll('.rail-btn.st-attention').length).toBe(1);
    expect(container.querySelector('#rail-done')?.querySelectorAll('.rail-btn.st-done').length).toBe(1);
  });

  it('caps the rail at five blocks', async () => {
    mockedAgents.mockResolvedValue([]);
    mockedSessions.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => session({ id: `s${i}`, title: `S${i}` })),
    );
    const { container } = render(<ActivityRail />);
    await waitFor(() => expect(container.querySelectorAll('.rail-btn').length).toBe(5));
  });

  it('shows the v13 idle marker when nothing is in flow', async () => {
    mockedAgents.mockResolvedValue([]);
    mockedSessions.mockResolvedValue([]);
    render(<ActivityRail />);
    await waitFor(() => expect(screen.getByText('—')).toBeTruthy());
  });
});
