import { TextDecoder, TextEncoder } from 'node:util';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentsWindow } from '@/components/v3/windows/AgentsWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, fetchV3Sessions, fetchV3SessionsForAgent, type V3Agent, type V3Session } from '@/lib/v3/powerAgents';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
}));

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return {
    ...actual,
    fetchV3PowerAgents: jest.fn(),
    fetchV3Sessions: jest.fn(),
    fetchV3SessionsForAgent: jest.fn(),
  };
});

const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;
const mockedFeed = fetchV3Sessions as jest.MockedFunction<typeof fetchV3Sessions>;
const mockedSessions = fetchV3SessionsForAgent as jest.MockedFunction<typeof fetchV3SessionsForAgent>;

const chatState: { messages: UIMessageLike[]; status: string; error: { message: string } | null } = {
  messages: [],
  status: 'ready',
  error: null,
};
const sendMessage = jest.fn();
const setMessages = jest.fn();
const stopRun = jest.fn();
type UIMessageLike = { id: string; role: string; createdAt?: string; parts: Array<{ type: string; text?: string; toolCallId?: string; state?: string }> };
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: chatState.messages, setMessages, sendMessage, status: chatState.status, stop: stopRun, error: chatState.error }),
}));
jest.mock('ai', () => ({ DefaultChatTransport: jest.fn().mockImplementation(() => ({})) }));

if (typeof global.TextDecoder === 'undefined') {
  (global as Record<string, unknown>).TextDecoder = TextDecoder;
  (global as Record<string, unknown>).TextEncoder = TextEncoder;
}

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
  try {
    window.localStorage.clear();
  } catch {
  }
}

describe('AgentsWindow · roster (v13 exact DOM)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
    mockedSessions.mockResolvedValue([]);
    mockedFeed.mockResolvedValue([]);
  });

  it('launcher parity: hero, mode + agent glides, Launch agent ⏎; ACTIVE/IDLE columns', async () => {
    mockedAgents.mockResolvedValue([
      agent({}),
      agent({ key: 'on_page_audit', name: 'On-Page', handle: '@On-Page', role: 'Meta & Content Elements' }),
      agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', role: 'Store Manager & Content', suite: 'Shopify Suite', icon: ShoppingBag }),
    ]);
    window.localStorage.setItem('v3.firstVisit', String(Date.now() - 24 * 3600_000));
    useV3OS.setState({ sessionFeed: [session({ id: 'f1', agentKey: 'crawlability_audit', updatedAt: new Date().toISOString() })] });
    render(<AgentsWindow />);
    expect(await screen.findByText('Which agent does the work?')).toBeTruthy();
    expect(screen.getByText('Describe it — we match the workspace agent, then it runs here.')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Launch agent/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Pick an agent' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mode' })).toBeTruthy();
    expect(screen.getByText('ACTIVE / IN FLOW')).toBeTruthy();
    expect(screen.getByText('IDLE / UNUSED')).toBeTruthy();
    expect(screen.getByText('1 in flow')).toBeTruthy();
    expect(screen.getByText('2 available')).toBeTruthy();
    expect(document.querySelector('#agent-roster-active')?.querySelectorAll('.agent-card-v').length).toBe(1);
    expect(document.querySelector('#agent-roster-idle')?.querySelectorAll('.agent-card-v').length).toBe(2);
    const cards = document.querySelectorAll('.agent-card-v');
    expect(cards[0].className).toContain('profile-card');
    expect(screen.getByText('● carrying 1 · 35%')).toBeTruthy();
    expect(screen.getAllByText('idle — unused').length).toBe(2);
    fireEvent.change(screen.getByLabelText('Describe the work'), { target: { value: 'shopify' } });
    expect(screen.queryByText('@Crawlability')).toBeNull();
    fireEvent.keyDown(screen.getByLabelText('Describe the work'), { key: 'Enter' });
    expect(useV3OS.getState().selectedAgentKey).toBe('shopify_agent');
  });

  it('card Deploy button and quick-switch dock both open the execution view', async () => {
    mockedAgents.mockResolvedValue([agent({})]);
    render(<AgentsWindow />);
    fireEvent.change(await screen.findByLabelText('Describe the work'), { target: { value: 'audit' } });
    fireEvent.click((await screen.findAllByRole('button', { name: /^Launch agent ⏎$/i }))[0]);
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
    fireEvent.click(await screen.findByText(/← all agents/i));
    useV3OS.getState().selectAgent(null);
    const dockBtn = await screen.findByTitle('@Crawlability');
    fireEvent.click(dockBtn);
    expect(useV3OS.getState().selectedAgentKey).toBe('crawlability_audit');
  });

  it('roster error surfaces with retry, no fake agents', async () => {
    mockedAgents.mockRejectedValue(new Error('HTTP 502'));
    render(<AgentsWindow />);
    await waitFor(() => expect(screen.getByText(/agents unavailable/i)).toBeTruthy());
    expect(screen.getByText('retry')).toBeTruthy();
  });
});

describe('AgentsWindow · execution (v13 exact DOM)', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    setup();
    mockedAgents.mockResolvedValue([agent({})]);
    mockedSessions.mockResolvedValue([]);
    mockedFeed.mockResolvedValue([]);
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

  it('centered head pane + THREADS glass table from the threads API', async () => {
    mockFetchJson(/power-agents\/threads\?/, [
      { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: '2026-09-30T11:00:00Z' },
    ]);
    render(<AgentsWindow />);
    expect((await screen.findAllByText('@Crawlability')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('THREADS · TASKS THIS AGENT IS CARRYING')).toBeTruthy();
    expect(await screen.findByText('Q4 site audit')).toBeTruthy();
  });

  it('empty threads state is honest', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    await screen.findByText(/no threads yet — the first task starts one/i);
  });

  it('clicking a thread loads its history into the terminal log', async () => {
    mockFetchJson(/power-agents\/threads\?/, [{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]);
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText('Q4 site audit'));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/power-agents\/threads\/t1$/)),
    );
    await waitFor(() => expect(setMessages).toHaveBeenCalled());
  });

  it('the composer sends a real message via the chat transport (⌘⏎)', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    const input = await screen.findByLabelText(/message @Crawlability/i);
    fireEvent.change(input, { target: { value: 'crawl the sitemap' } });
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ text: 'crawl the sitemap' }));
  });

  it('terminal feed: $ user lines, markdown replies, tool rows with grouping', async () => {
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
    expect(screen.getByText('crawl the sitemap')).toBeTruthy();
    expect(document.querySelector('.terminal')).toBeTruthy();
  });

  it('same-name repeats collapse per name; distinct tools never merge', async () => {
    chatState.messages = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'tool-read_file', toolCallId: 'c1', state: 'output-available' },
          { type: 'tool-grep', toolCallId: 'c5', state: 'output-available' },
          { type: 'tool-read_file', toolCallId: 'c2', state: 'output-available' },
          { type: 'tool-read_file', toolCallId: 'c3', state: 'output-available' },
          { type: 'tool-read_file', toolCallId: 'c4', state: 'output-available' },
          { type: 'text', text: 'Done crawling.' },
        ],
      },
    ];
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    const head = await screen.findByRole('button', { name: /read_file/i });
    expect(head.textContent).toContain('×4');
    expect(screen.getByText(/grep · done/i)).toBeTruthy();
    fireEvent.click(head);
    expect(screen.getAllByText(/read_file · done/i)).toHaveLength(4);
  });

  it('run states: deployed → done — awaiting your review; sess-state line', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    const { unmount } = render(<AgentsWindow />);
    expect(await screen.findByText('deployed')).toBeTruthy();
    expect(screen.getByText(/idle — nothing running/i)).toBeTruthy();
    unmount();
    chatState.messages = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'go' }] }];
    render(<AgentsWindow />);
    expect(await screen.findAllByText(/done — awaiting your review/i)).toBeTruthy();
  });

  it('busy runs show Stop in the composer bar', async () => {
    chatState.status = 'streaming';
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    expect(await screen.findByRole('button', { name: /Stop the run/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Stop the run/i }));
    expect(stopRun).toHaveBeenCalled();
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
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ text: 'start fresh' }));
    expect(calls.some((c) => c === 'POST /api/power-agents/threads')).toBe(true);
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
    fireEvent.click(await screen.findByRole('button', { name: /Delete Q4 site audit/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm delete Q4 site audit/i }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/power-agents/threads/t1', expect.objectContaining({ method: 'DELETE' })));
    await waitFor(() => expect(screen.queryByText('Q4 site audit')).toBeNull());
  });

  it('unread thread rows show a new chip that clears once viewed', async () => {
    window.localStorage.setItem('v3.firstVisit', String(Date.now() - 60_000));
    mockFetchJson(/power-agents\/threads\?/, [
      { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date().toISOString() },
      { id: 't2', title: 'older sweep', agentKey: 'crawlability_audit', createdAt: null, updatedAt: '2026-09-20T10:00:00Z' },
    ]);
    render(<AgentsWindow />);
    const chipOf = (title: string) =>
      screen.getAllByText(title).map((e) => e.closest('.thread-row')).find(Boolean)!.querySelector('.v3-unread-chip');
    await screen.findByText('Q4 site audit');
    expect(chipOf('Q4 site audit')).toBeTruthy();
    expect(chipOf('older sweep')).toBeNull();
    fireEvent.click(screen.getAllByText('Q4 site audit').map((e) => e.closest('.thread-row')).find(Boolean)!);
    await waitFor(() => expect(chipOf('Q4 site audit')).toBeNull());
    expect(window.localStorage.getItem('v3.seen.th.t1')).toBeTruthy();
  });

  it('switching to a busy thread joins its live stream (token-level resume)', async () => {
    const enc = new TextEncoder();
    const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
    const makeReader = (chunks: Uint8Array[]) => {
      let i = 0;
      return {
        read: async () => (i < chunks.length ? { done: false as const, value: chunks[i++] } : { done: true as const, value: undefined }),
      };
    };
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (/\/threads\/t1$/.test(url)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              messages: [
                { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'crawl the sitemap' }] },
                { id: 'a1', role: 'assistant', parts: [] },
              ],
              busy: true,
            }),
        });
      }
      if (/\/threads\/t1\/join$/.test(url)) {
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () =>
              makeReader([
                sse({ type: 'text-delta', delta: 'Hello' }),
                sse({ type: 'text-delta', delta: ' world' }),
                sse({ type: 'finish' }),
              ]),
          },
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: null, updatedAt: null }]) });
    }) as unknown as typeof fetch;
    setMessages.mockImplementation((updater: unknown) => {
      chatState.messages =
        typeof updater === 'function' ? (updater as (m: typeof chatState.messages) => typeof chatState.messages)(chatState.messages) : (updater as typeof chatState.messages);
    });
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText('Q4 site audit'));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/threads\/t1\/join$/), expect.anything()),
    );
    await waitFor(() => expect(screen.getByText(/Hello world/i)).toBeTruthy(), { timeout: 3000 });
  });

  it('back link returns to the roster', async () => {
    mockFetchJson(/power-agents\/threads\?/, []);
    render(<AgentsWindow />);
    fireEvent.click(await screen.findByText(/← all agents/i));
    expect(useV3OS.getState().selectedAgentKey).toBeNull();
    expect(await screen.findByLabelText('Describe the work')).toBeTruthy();
  });
});
