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

// the same streaming utils the real exec view uses — mocked for tests
const chatState: { messages: UIMessageLike[]; status: string; error: { message: string } | null } = {
  messages: [],
  status: 'ready',
  error: null,
};
const sendMessage = jest.fn();
const setMessages = jest.fn();
const stopRun = jest.fn();
type UIMessageLike = { id: string; role: string; parts: Array<{ type: string; text?: string; toolCallId?: string; state?: string }> };
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: chatState.messages, setMessages, sendMessage, status: chatState.status, stop: stopRun, error: chatState.error }),
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

describe('AgentsWindow · execution (real chat wiring)', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    setup();
    mockedAgents.mockResolvedValue([agent({})]);
    mockedSessions.mockResolvedValue([]);
    useV3OS.getState().selectAgent('crawlability_audit');
    chatState.messages = [];
    chatState.status = 'ready';
    chatState.error = null;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockFetchJson(url: RegExp, json: unknown) {
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) => {
      if (url.test(String(input))) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(json) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }) as unknown as typeof fetch;
  }

  it('shows the agent head and their sessions from the threads API', async () => {
    mockFetchJson(/power-agents\/threads\?/, [
      { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: '2026-09-30T11:00:00Z' },
    ]);
    render(<AgentsWindow />);
    expect(await screen.findByText(/@Crawlability · Crawler & Indexer/i)).toBeTruthy();
    expect(await screen.findByText('Q4 site audit')).toBeTruthy();
    expect(screen.getByText(/Conversation · @Crawlability · new session/i)).toBeTruthy();
  });

  it('empty state is honest when no sessions exist', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    await screen.findByText(/No sessions yet — the first task starts one/i);
  });

  it('clicking a session loads its history into the chat', async () => {
    mockFetchJson(/power-agents\/threads\?/, [{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]);
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText('Q4 site audit'));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/power-agents\/threads\/t1$/)),
    );
    await waitFor(() => expect(setMessages).toHaveBeenCalled());
  });

  it('the console sends a real message via the chat transport', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    const input = await screen.findByLabelText(/message @Crawlability/i);
    fireEvent.change(input, { target: { value: 'crawl the sitemap' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(sendMessage).toHaveBeenCalledWith({ text: 'crawl the sitemap' });
  });

  it('renders tool rows and assistant markdown from streamed messages', async () => {
    chatState.messages = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'crawl the sitemap' }] },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'tool-read_file', toolCallId: 'c1', state: 'output-available' },
          { type: 'tool-fetch_sitemap_urls', toolCallId: 'c2', state: 'input-available' },
          { type: 'text', text: 'Crawled **42 URLs**. Report below.' },
        ],
      },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    expect(await screen.findByText(/read_file · done/i)).toBeTruthy();
    expect(screen.getByText(/fetch_sitemap_urls · running…/i)).toBeTruthy();
    expect(screen.getByText('Crawled 42 URLs. Report below.')).toBeTruthy();
    expect(screen.getByText('$', { selector: '.v3-msg-user .v3-msg-prompt' })).toBeTruthy();
  });

  it('busy runs show Stop; stream errors surface honestly', async () => {
    chatState.status = 'streaming';
    mockFetchJson(/power-agents\/threads\?/, []);
    const { rerender } = render(<AgentsWindow />);
    expect(await screen.findByRole('button', { name: /Stop the run/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Stop the run/i }));
    expect(stopRun).toHaveBeenCalled();
    chatState.status = 'ready';
    chatState.error = { message: 'HTTP 502' };
    rerender(<AgentsWindow />);
    expect(await screen.findByText(/stream error: HTTP 502/i)).toBeTruthy();
  });

  it('back link returns to the roster', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText(/← all agents/i));
    expect(useV3OS.getState().selectedAgentKey).toBeNull();
    expect(await screen.findByLabelText('Search power agents')).toBeTruthy();
  });
});
