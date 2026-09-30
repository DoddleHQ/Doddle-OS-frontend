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
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ text: 'crawl the sitemap' }));
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

  it('wraps 4+ consecutive tool calls into one expandable group row', async () => {
    chatState.messages = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'tool-read_file', toolCallId: 'c1', state: 'output-available' },
          { type: 'tool-read_file', toolCallId: 'c2', state: 'output-available' },
          { type: 'tool-read_file', toolCallId: 'c3', state: 'output-available' },
          { type: 'tool-read_file', toolCallId: 'c4', state: 'output-available' },
          { type: 'tool-grep', toolCallId: 'c5', state: 'output-available' },
          { type: 'text', text: 'Done crawling.' },
        ],
      },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    // one collapsed head: mixed names → "steps ×5", individual rows hidden
    const head = await screen.findByRole('button', { name: /steps/i });
    expect(head.textContent).toContain('×5');
    expect(head.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(/read_file · done/i)).toBeNull();
    // expand → children appear
    fireEvent.click(head);
    expect(screen.getAllByText(/read_file · done/i)).toHaveLength(4);
    expect(screen.getByText(/grep · done/i)).toBeTruthy();
  });

  it('groups tool runs ACROSS messages: no repeated stray rows between assistant turns', async () => {
    chatState.messages = [
      { id: 'a1', role: 'assistant', parts: [{ type: 'tool-wp_get_page', toolCallId: 'p1', state: 'output-available' }, { type: 'tool-wp_get_site_settings', toolCallId: 'p2', state: 'output-available' }] },
      { id: 'a2', role: 'assistant', parts: [{ type: 'tool-wp_get_page', toolCallId: 'p3', state: 'output-available' }] },
      { id: 'a3', role: 'assistant', parts: [{ type: 'tool-wp_get_posts', toolCallId: 'p4', state: 'output-available' }] },
      { id: 'a4', role: 'assistant', parts: [{ type: 'text', text: 'Drafted the page.' }] },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    // four consecutive tools across four messages → ONE group row, no strays
    const head = await screen.findByRole('button', { name: /steps/i });
    expect(head.textContent).toContain('×4');
    expect(screen.queryByText(/wp_get_page · done/i)).toBeNull();
    expect(screen.getByText('Drafted the page.')).toBeTruthy();
  });

  it('a user turn breaks the tool run', async () => {
    chatState.messages = [
      { id: 'a1', role: 'assistant', parts: [{ type: 'tool-grep', toolCallId: 'g1', state: 'output-available' }] },
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'and now?' }] },
      { id: 'a2', role: 'assistant', parts: [{ type: 'tool-grep', toolCallId: 'g2', state: 'output-available' }, { type: 'tool-grep', toolCallId: 'g3', state: 'output-available' }, { type: 'tool-grep', toolCallId: 'g4', state: 'output-available' }, { type: 'tool-grep', toolCallId: 'g5', state: 'output-available' }] },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    expect(await screen.findByText(/and now?/i)).toBeTruthy();
    // after the user turn: the same-name 4-run groups under its own label;
    // the lone earlier one stays individual
    const head = screen.getByRole('button', { name: /grep/i });
    expect(head.textContent).toContain('×4');
    expect(screen.getAllByText(/grep · done/i)).toHaveLength(1);
  });

  it('same-name runs keep their tool name as the group label', async () => {
    chatState.messages = [
      {
        id: 'a2',
        role: 'assistant',
        parts: Array.from({ length: 6 }, (_, i) => ({ type: 'tool-scrape_page', toolCallId: `s${i}`, state: 'input-available' })),
      },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    const head = await screen.findByRole('button', { name: /scrape_page/i });
    expect(head.textContent).toContain('×6');
    expect(head.className).toContain('running');
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

  it('sending with no thread selected creates the session first, then sends', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${String(input)}`);
      if (String(input).endsWith('/api/power-agents/threads') && init?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 'tnew', title: 'New session' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }) as unknown as typeof fetch;
    render(<AgentsWindow />);
    const input = await screen.findByLabelText(/message @Crawlability/i);
    fireEvent.change(input, { target: { value: 'start fresh' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ text: 'start fresh' }));
    expect(calls.some((c) => c === 'POST /api/power-agents/threads')).toBe(true);
    // thread creation happens before the send is dispatched
    expect(calls.indexOf('POST /api/power-agents/threads')).toBeLessThan(calls.length);
    const chip = await screen.findByRole('button', { name: /Rename New session/i });
    expect(chip).toBeTruthy();
  });

  it('rename edits inline and PATCHes the title', async () => {
    mockFetchJson(/power-agents\/threads\?/, [{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]);
    const patch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return patch(input, init);
      if (/threads\?/.test(String(input))) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }) as unknown as typeof fetch;
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByRole('button', { name: /Rename Q4 site audit/i }));
    const renameInput = screen.getByLabelText(/Rename Q4 site audit/i);
    fireEvent.change(renameInput, { target: { value: 'October crawl' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('October crawl')).toBeTruthy());
    expect(patch).toHaveBeenCalledWith('/api/power-agents/threads/t1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('delete asks to confirm, then removes the session (and clears it if active)', async () => {
    mockFetchJson(/power-agents\/threads\?/, [{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]);
    const del = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') return del(input, init);
      if (/threads\?/.test(String(input))) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }) as unknown as typeof fetch;
    render(<AgentsWindow />);
    // first click arms, second confirms
    fireEvent.click(await screen.findByRole('button', { name: /Delete Q4 site audit/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm delete Q4 site audit/i }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/power-agents/threads/t1', expect.objectContaining({ method: 'DELETE' })));
    await waitFor(() => expect(screen.queryByText('Q4 site audit')).toBeNull());
  });

  it('the conversation pane is a fixed-height, internally scrolling container', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    const { container } = render(<AgentsWindow />);
    await waitFor(() => {
      expect(container.querySelector('.v3-chat-wrap')).toBeTruthy();
      expect(container.querySelector('.v3-chat')).toBeTruthy();
    });
  });

  it('the run-context column shows session facts and live run stats', async () => {
    chatState.messages = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'go' }] },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'tool-read_file', toolCallId: 'c1', state: 'output-available' },
          { type: 'tool-grep', toolCallId: 'c2', state: 'input-available' },
          { type: 'text', text: 'ok' },
        ],
      },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    expect(await screen.findByText('This run')).toBeTruthy();
    expect(screen.getByText('messages').parentElement!.textContent).toContain('2');
    const toolStat = screen.getByText('tool calls').parentElement!;
    expect(toolStat.textContent).toContain('2');
    expect(screen.getByText('in flight').parentElement!.textContent).toContain('1');
    expect(screen.getByText(/starts on first message/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /\+ new session/i })).toBeTruthy();
  });

  it('back link returns to the roster', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText(/← all agents/i));
    expect(useV3OS.getState().selectedAgentKey).toBeNull();
    expect(await screen.findByLabelText('Search power agents')).toBeTruthy();
  });
});
