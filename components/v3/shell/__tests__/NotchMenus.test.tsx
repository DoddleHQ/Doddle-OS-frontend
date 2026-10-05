import { render, screen, waitFor } from '@testing-library/react';
import { NotchMenus } from '@/components/v3/shell/NotchMenus';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3Sessions } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3Sessions: jest.fn() };
});
const mockedFeed = fetchV3Sessions as jest.MockedFunction<typeof fetchV3Sessions>;

describe('NotchMenus · workspace switcher (v13 entries, real metrics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    try {
      window.localStorage.clear(); // unread baseline is persisted
    } catch {
      /* ignore */
    }
  });

  it('active workspace shows its live session metric; others show their real domain', async () => {
    window.localStorage.setItem('v3.firstVisit', String(Date.now() - 60_000));
    useV3OS.setState({
      menu: 'ws',
      workspaceId: 'w1',
      workspaces: [
        { id: 'w1', name: 'Acme Growth', domain: 'acme.com', orgName: 'Acme' },
        { id: 'w2', name: 'Northwind', domain: 'northwind.io', orgName: 'Northwind' },
      ],
    });
    mockedFeed.mockResolvedValue([
      { id: 't1', title: 'Q4 crawl', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date().toISOString() },
    ]);
    render(<NotchMenus />);
    expect(await screen.findByText('1 session · 1 new')).toBeTruthy(); // live metric carries unread
    expect(screen.getByText('northwind.io')).toBeTruthy(); // real domain — never a fake metric
    expect(screen.getByText('on')).toBeTruthy();
  });

  it('feed failure degrades to a quiet zero, never a fake number', async () => {
    useV3OS.setState({
      menu: 'ws',
      workspaceId: 'w1',
      workspaces: [{ id: 'w1', name: 'Acme', domain: null, orgName: 'Acme' }],
    });
    mockedFeed.mockRejectedValue(new Error('HTTP 502'));
    render(<NotchMenus />);
    await waitFor(() => expect(screen.getByText('0 sessions')).toBeTruthy());
  });
});
