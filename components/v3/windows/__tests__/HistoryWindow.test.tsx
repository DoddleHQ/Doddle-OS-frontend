import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryWindow } from '@/components/v3/windows/HistoryWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents, type V3Agent } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

const Bot = jest.requireActual('lucide-react').Bot;

describe('HistoryWindow · artefacts gallery (v13 rep rows)', () => {
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
      sessionFeed: [
        { id: 't1', title: 'Q4 site audit', agentKey: 'crawlability_audit', createdAt: '2026-09-30T10:00:00Z', updatedAt: '2026-09-30T11:00:00Z' },
        { id: 't2', title: 'robots recheck', agentKey: 'crawlability_audit', createdAt: '2026-09-28T10:00:00Z', updatedAt: null },
      ],
      sessionFeedError: null,
    });
  });

  it('renders gallery rows with badges, risk bars, and actions', async () => {
    render(<HistoryWindow />);
    expect(await screen.findByText('Q4 site audit')).toBeTruthy();
    expect(screen.getByText('robots recheck')).toBeTruthy();
    expect(screen.getAllByText('SEO Audit').length).toBeGreaterThan(0); // category badges
    expect(screen.getAllByRole('button', { name: /export /i }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: /seal /i }).length).toBe(2);
    expect(screen.getByText(/2 items/i)).toBeTruthy();
  });

  it('seal toggles the locked state; select updates the count chip', async () => {
    render(<HistoryWindow />);
    fireEvent.click(await screen.findByRole('button', { name: /Seal Q4 site audit/i }));
    expect(screen.getByRole('button', { name: /Unseal Q4 site audit/i })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Select robots recheck'));
    expect(screen.getByText(/1 selected/i)).toBeTruthy();
  });

  it('search narrows the gallery', async () => {
    render(<HistoryWindow />);
    fireEvent.change(await screen.findByLabelText('Search finished work'), { target: { value: 'robots' } });
    expect(screen.getByText('robots recheck')).toBeTruthy();
    expect(screen.queryByText('Q4 site audit')).toBeNull();
    await waitFor(() => expect(screen.getByText(/1 item/i)).toBeTruthy());
  });

  it('empty and error states are honest', () => {
    useV3OS.setState({ sessionFeed: [] });
    const { rerender } = render(<HistoryWindow />);
    expect(screen.getByText(/Nothing completed here yet/i)).toBeTruthy();
    useV3OS.setState({ sessionFeedError: 'HTTP 502' });
    rerender(<HistoryWindow />);
    expect(screen.getByText(/session feed unavailable/i)).toBeTruthy();
  });
});
