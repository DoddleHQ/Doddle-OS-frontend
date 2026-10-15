import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportsWindow } from '@/components/v3/windows/HistoryWindow';
import { useV3OS } from '@/lib/v3/osStore';
// path navigation: router/pathname stubs
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
  useSearchParams: () => new URLSearchParams(),
}));
import { fetchV3PowerAgents, type V3Agent } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

const Bot = jest.requireActual('lucide-react').Bot;

describe('ReportsWindow · v13 win-reports (analytics + gallery)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    mockedAgents.mockResolvedValue([
      { key: 'crawlability_audit', assistantId: 'as_1', name: 'Crawlability', role: 'Crawler', handle: '@Crawlability', suite: 'SEO Audit Suite', icon: Bot } as V3Agent,
    ]);
    useV3OS.setState({
      windows: [],
      workspaceId: 'ws1',
      workspaces: [{ id: 'ws1', name: 'Acme' }],
      sessionFeed: [
        { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: '2026-09-30T11:00:00Z' },
        { id: 't2', title: 'robots recheck', agentKey: 'crawlability_audit', createdAt: '2026-09-28T10:00:00Z', updatedAt: null },
      ],
      sessionFeedError: null,
    });
  });

  it('renders the analytics pane, gallery rows with badges, risk bars, and actions', async () => {
    render(<ReportsWindow />);
    expect(screen.getByText('Reports · progress')).toBeTruthy();
    expect(screen.getByText(/ANALYTICS · LAST 30 DAYS/i)).toBeTruthy();
    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByText('DONE RATE')).toBeTruthy();
    expect(screen.getByText(/THROUGHPUT · DONE PER DAY/i)).toBeTruthy();
    expect(screen.getByText(/ARTEFACT GALLERY · COMPLETED WORK/i)).toBeTruthy();
    expect((await screen.findAllByText('Q4 site audit')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Research').length).toBeGreaterThan(0); // category badges
    expect(screen.getAllByRole('button', { name: /export/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /seal /i }).length).toBe(2);
    expect(screen.getAllByText('RISK').length).toBe(2);
    expect(screen.getByText(/LIFECYCLE BOARD/i)).toBeTruthy();
  });

  it('seal toggles the locked state; select updates the bulk bar', async () => {
    render(<ReportsWindow />);
    fireEvent.click(await screen.findByRole('button', { name: /Seal Q4 site audit/i }));
    expect(screen.getByRole('button', { name: /Unseal Q4 site audit/i })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Select Q4 site audit'));
    expect(screen.getByText(/1 selected/i)).toBeTruthy();
    expect(screen.getByText('export JSON')).toBeTruthy();
  });

  it('search narrows the gallery', async () => {
    render(<ReportsWindow />);
    fireEvent.change(await screen.findByLabelText('Search reports'), { target: { value: 'robots' } });
    expect(screen.getAllByText('robots recheck').length).toBeGreaterThan(0);
    expect(document.querySelector('#rep-gallery')?.textContent?.includes('Q4 site audit')).toBe(false); // gallery narrows; project rows still list it
  });

  it('project rows open the report detail with the run conversation', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'crawl the sitemap' }] }] }),
    }) as unknown as typeof fetch;
    const { rerender } = render(<ReportsWindow />);
    fireEvent.click((await screen.findAllByText('open report →'))[0]);
    expect(await screen.findByText('← all reports')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('crawl the sitemap').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('← all reports'));
    rerender(<ReportsWindow />);
    expect(screen.getByText(/PROJECT REPORTS · PER CAMPAIGN/i)).toBeTruthy();
  });

  it('empty and error states are honest', () => {
    useV3OS.setState({ sessionFeed: [] });
    const { rerender } = render(<ReportsWindow />);
    expect(screen.getByText(/Nothing completed here yet/i)).toBeTruthy();
    useV3OS.setState({ sessionFeedError: 'HTTP 502' });
    rerender(<ReportsWindow />);
    expect(screen.getByText(/session feed unavailable/i)).toBeTruthy();
  });
});
