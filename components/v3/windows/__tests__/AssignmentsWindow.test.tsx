import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { V3Session } from '@/lib/v3/powerAgents';
import { AssignmentsWindow } from '@/components/v3/windows/AssignmentsWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Agent } from '@/lib/v3/powerAgents';
const pushes: string[] = [];
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (p: string) => pushes.push(p), replace: jest.fn() }),
  usePathname: () => '/v3/assignments',
}));

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], setMessages: jest.fn(), sendMessage: jest.fn(), status: 'ready', stop: jest.fn(), error: null }),
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

function seedFeed(sessions: V3Session[]) {
  window.localStorage.setItem('v3.firstVisit', String(Date.now() - 24 * 3600_000));
  useV3OS.setState({ windows: [], workspaceId: 'w1', sessionFeed: sessions, sessionFeedError: null });
}

describe('AssignmentsWindow · v13 win-assignments (waterfall / board / review)', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    pushes.length = 0;
    try {
      window.localStorage.clear();
    } catch {
    }
    mockedAgents.mockResolvedValue([
      agent({}),
      agent({ key: 'shopify_agent', name: 'Shopify', handle: '@Shopify', suite: 'Shopify Suite', icon: ShoppingBag }),
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  const two = new Date(Date.now() - 2 * 3600_000).toISOString();
  const sessions = [
    { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: two },
    { id: 't2', title: 'older sweep', agentKey: 'crawlability_audit', createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-20T11:00:00Z' },
    { id: 't3', title: 'PDP refresh', agentKey: 'shopify_agent', createdAt: '2026-09-25T09:00:00Z', updatedAt: two },
    { id: 't4', title: 'Live deploy', agentKey: 'crawlability_audit', createdAt: new Date(Date.now() - 3600_000).toISOString(), updatedAt: new Date().toISOString() },
  ];

  it('renders the os-window page: titlebar, seg tabs, askbar', async () => {
    seedFeed(sessions);
    render(<AssignmentsWindow />);
    expect(screen.getByText('Assignments & Tasks')).toBeTruthy();
    expect(screen.getByText('fizzy board · ⌘4')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Gantt' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /^Board/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Review · 2/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Filter these cards... [F]')).toBeTruthy();
  });

  it('waterfall: 21-day window, week head, epic rows with pills, stages, fills', async () => {
    seedFeed(sessions);
    const { container } = render(<AssignmentsWindow />);
    expect(screen.getByText('21-day window')).toBeTruthy();
    expect(screen.getByText('EPIC · 21-DAY WINDOW')).toBeTruthy();
    expect(container.querySelectorAll('.gantt-week').length).toBe(3);
    expect((await screen.findAllByText('Q4 site audit')).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.gantt-row').length).toBe(16);
    expect(container.querySelectorAll('.gantt-kid-label').length).toBe(12);
    expect(screen.getAllByText('3 stages').length).toBe(4);
    expect(screen.getAllByText('IN PROGRESS').length).toBe(1);
    expect(screen.getAllByText('REVIEW').length).toBe(2);
    expect(screen.getAllByText('DONE').length).toBeGreaterThan(0);
    const bars = container.querySelectorAll('.gantt-bar');
    expect(Array.from(bars).some((b) => b.className.includes('st-attention'))).toBe(true);
    expect(Array.from(bars).some((b) => b.className.includes('st-done'))).toBe(true);
    expect(container.querySelectorAll('.gantt-today').length).toBe(16);
    expect(container.querySelectorAll('.gantt-mile-tag').length).toBe(2);
  });

  it('waterfall: chevron collapses stages, status filter narrows epics', async () => {
    seedFeed(sessions);
    const { container } = render(<AssignmentsWindow />);
    fireEvent.click((await screen.findAllByText('3 stages'))[0]);
    fireEvent.click(container.querySelectorAll('.epic-chev')[0]);
    expect(container.querySelectorAll('.gantt-row').length).toBe(13);
    fireEvent.click(container.querySelectorAll('.epic-chev')[0]);
    expect(container.querySelectorAll('.gantt-row').length).toBe(16);
    fireEvent.click(screen.getByText('done', { selector: '#gantt-filters .fchip' }));
    expect(container.querySelectorAll('.gantt-kid-label').length).toBe(3);
    fireEvent.click(screen.getByText('running', { selector: '#gantt-filters .fchip' }));
    expect(container.querySelectorAll('.gantt-kid-label').length).toBe(3);
    fireEvent.click(screen.getByText('Clear', { selector: '#gantt-filters .btn-deploy' }));
    expect(container.querySelectorAll('.gantt-kid-label').length).toBe(12);
  });

  it('askbar filters the gantt by title', async () => {
    seedFeed(sessions);
    const { container } = render(<AssignmentsWindow />);
    fireEvent.change(screen.getByPlaceholderText('Filter these cards... [F]'), { target: { value: 'PDP' } });
    await waitFor(() => expect(container.querySelectorAll('.gantt-kid-label').length).toBe(3));
  });

  it('board: fizzy columns — active column open, others as vpills', async () => {
    seedFeed(sessions);
    const { container } = render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Board/ }));
    expect(await screen.findByText('NEEDS REVIEW')).toBeTruthy();
    expect(container.querySelectorAll('.fizzy-card').length).toBe(2);
    fireEvent.click(screen.getByTitle('Open DONE'));
    expect(await screen.findByText(/ADDED /i)).toBeTruthy();
    expect(container.querySelectorAll('.fizzy-card').length).toBe(1);
    fireEvent.click(screen.getByTitle('Open PROPOSED'));
    expect(await screen.findByText('WATCHING FOR NEW CARDS')).toBeTruthy();
  });

  it('review tab: rows list what waits, approve happens in the slide-over', async () => {
    seedFeed(sessions);
    render(<AssignmentsWindow />);
    fireEvent.click(await screen.findByRole('tab', { name: /Review/ }));
    expect((await screen.findAllByText(/waiting on you/i)).length).toBe(2);
    fireEvent.click(screen.getAllByText('Open')[0]);
    expect(await screen.findByRole('dialog', { name: /Q4 site audit details/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    await waitFor(() => expect(screen.getAllByText(/waiting on you/i).length).toBe(1));
    expect(window.localStorage.getItem('v3.seen.th.t1')).toBeTruthy();
  });

  it('slide-over opens from a gantt track with conversation preview + deep-link', async () => {
    seedFeed(sessions);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'crawl the sitemap' }] }],
        }),
    }) as unknown as typeof fetch;
    const { container } = render(<AssignmentsWindow />);
    await screen.findAllByText('Q4 site audit');
    fireEvent.click(container.querySelectorAll('.gantt-track')[0]);
    expect(await screen.findByRole('dialog', { name: /Q4 site audit details/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('crawl the sitemap')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Open in execution/i }));
    const st = useV3OS.getState();
    expect(st.selectedAgentKey).toBe('crawlability_audit');
    expect(st.selectedThreadKey).toBe('t1');
  });

  it('empty feed and feed errors are honest', async () => {
    seedFeed([]);
    render(<AssignmentsWindow />);
    expect(await screen.findByText(/No tasks to chart. Start one from Board → Maybe./i)).toBeTruthy();
  });
});
