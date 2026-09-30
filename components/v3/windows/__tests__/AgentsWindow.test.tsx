import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentsWindow } from '@/components/v3/windows/AgentsWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3SessionsForAgent, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return {
    ...actual,
    fetchV3PowerAgents: jest.fn(),
    fetchV3SessionsForAgent: jest.fn(),
  };
});

const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;
const mockedSessions = fetchV3SessionsForAgent as jest.MockedFunction<typeof fetchV3SessionsForAgent>;

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

const session = (over: Partial<V3Session>): V3Session => ({
  id: 's1',
  title: 'Q4 site audit',
  agentKey: 'crawlability_audit',
  createdAt: '2026-09-30T10:00:00Z',
  updatedAt: '2026-09-30T11:00:00Z',
  ...over,
});

function setup() {
  useV3OS.setState({ windows: [], workspaceId: 'w1', selectedAgentKey: null });
}

describe('AgentsWindow · roster (power agents)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
    mockedSessions.mockResolvedValue([]);
  });

  it('suite-grouped cards: even sections pair up, a lone agent spans its row; search filters', async () => {
    mockedAgents.mockResolvedValue([
      agent({}),
      agent({ key: 'on_page_audit', name: 'On-Page', handle: '@On-Page', role: 'Meta & Content Elements' }),
      agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', role: 'Store Manager & Content', suite: 'Shopify Suite', icon: ShoppingBag }),
    ]);
    render(<AgentsWindow />);
    expect(await screen.findByText(/SEO Audit Suite · 2 agents/i)).toBeTruthy();
    expect(screen.getByText(/Shopify Suite · 1 agent/i)).toBeTruthy();
    expect(screen.getByText(/@Crawlability · Crawler & Indexer/i)).toBeTruthy();
    // every card is the compact horizontal row; lone Shopify card spans the row
    const seoCards = screen.getByText(/SEO Audit Suite · 2 agents/i)
      .parentElement!.querySelectorAll('.roster-grid .bento-item');
    expect(seoCards.length).toBe(2);
    expect(seoCards[0].className).toContain('h-row');
    expect(seoCards[0].className).not.toContain('span-row');
    expect(seoCards[1].className).not.toContain('span-row');
    const shopifyCard = screen.getByText(/Shopify Suite · 1 agent/i)
      .parentElement!.querySelector('.roster-grid .bento-item');
    expect(shopifyCard!.className).toContain('span-row');
    expect(shopifyCard!.className).toContain('h-row');
    fireEvent.change(screen.getByLabelText('Search power agents'), { target: { value: 'shopify' } });
    expect(screen.queryByText(/@Crawlability · Crawler & Indexer/i)).toBeNull();
    expect(screen.getByText(/@Shopify · Store Manager & Content/i)).toBeTruthy();
  });

  it('roster error surfaces with retry, no fake agents', async () => {
    mockedAgents.mockRejectedValue(new Error('HTTP 502'));
    render(<AgentsWindow />);
    await waitFor(() => expect(screen.getByText(/agents unavailable/i)).toBeTruthy());
    expect(screen.getByText('retry')).toBeTruthy();
  });

  it('clicking a card (or its Deploy chip) opens the execution view', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    render(<AgentsWindow />);
    const card = (await screen.findAllByText(/@Crawlability · Crawler & Indexer/i))[0].closest('.bento-item')!;
    fireEvent.click(card);
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
    fireEvent.click(await screen.findByText(/← all agents/i));
    useV3OS.getState().selectAgent(null);
    fireEvent.click((await screen.findAllByText(/Deploy/i))[0]);
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
  });
});

describe('AgentsWindow · execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
    mockedAgents.mockResolvedValue([agent({})]);
    mockedSessions.mockResolvedValue([]);
    useV3OS.getState().selectAgent('crawlability_audit');
  });

  it('shows the agent head and their real sessions', async () => {
    mockedSessions.mockResolvedValue([session({ title: 'Q4 site audit' })]);
    render(<AgentsWindow />);
    expect(await screen.findByText(/@Crawlability · Crawler & Indexer/i)).toBeTruthy();
    expect(await screen.findByText('Q4 site audit')).toBeTruthy();
    expect(screen.getByText(/session ·/i)).toBeTruthy();
  });

  it('empty state is honest when the agent has no sessions', async () => {
    mockedSessions.mockResolvedValue([]);
    render(<AgentsWindow />);
    await waitFor(() => expect(screen.getByText(/No sessions yet/i)).toBeTruthy());
  });

  it('session error surfaces with retry', async () => {
    mockedSessions.mockRejectedValue(new Error('api down'));
    render(<AgentsWindow />);
    await waitFor(() => expect(screen.getByText(/api down ·/i)).toBeTruthy());
  });

  it('the console echoes a queued task; the model glide switches models', async () => {
    mockedSessions.mockResolvedValue([]);
    render(<AgentsWindow />);
    await screen.findByText(/← all agents/i);
    const input = screen.getByLabelText(/assign @Crawlability a task/i);
    fireEvent.change(input, { target: { value: 'crawl the Q4 sitemap' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText(/crawl the Q4 sitemap/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Model: GPT-5/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Claude 4/i }));
    expect(screen.getByRole('button', { name: /Model: Claude 4/i })).toBeTruthy();
  });

  it('back link returns to the roster', async () => {
    mockedSessions.mockResolvedValue([]);
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText(/← all agents/i));
    expect(useV3OS.getState().selectedAgentKey).toBeNull();
    expect(await screen.findByLabelText('Search power agents')).toBeTruthy();
  });
});
