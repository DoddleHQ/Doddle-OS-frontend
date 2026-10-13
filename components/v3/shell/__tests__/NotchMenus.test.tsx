import { render, screen } from '@testing-library/react';
import { NotchMenus } from '@/components/v3/shell/NotchMenus';
import { useV3OS } from '@/lib/v3/osStore';

describe('NotchMenus · workspace switcher (v13 entries, real metrics)', () => {
  beforeEach(() => {
    useV3OS.setState({ menu: null });
    try {
      window.localStorage.clear(); // unread baseline is persisted
    } catch {
      /* ignore */
    }
  });

  it('active workspace shows its live session metric; others show their real domain', async () => {
    window.localStorage.setItem('v3.firstVisit', String(Date.now() - 24 * 3600_000));
    useV3OS.setState({
      menu: 'ws',
      workspaceId: 'w1',
      workspaces: [
        { id: 'w1', name: 'Acme Growth', domain: 'acme.com', orgName: 'Acme' },
        { id: 'w2', name: 'Northwind', domain: 'northwind.io', orgName: 'Northwind' },
      ],
      sessionFeed: [
        { id: 't1', title: 'Q4 crawl', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
      ],
    });
    render(<NotchMenus />);
    expect(screen.getByText('1 session · 1 new')).toBeTruthy(); // live metric carries unread
    expect(screen.getByText('northwind.io')).toBeTruthy(); // real domain — never a fake metric
    expect(screen.getByText('on')).toBeTruthy();
  });

  it('an empty feed shows a quiet zero, never a fake number', () => {
    useV3OS.setState({
      menu: 'ws',
      workspaceId: 'w1',
      workspaces: [{ id: 'w1', name: 'Acme', domain: null, orgName: 'Acme' }],
      sessionFeed: [],
    });
    render(<NotchMenus />);
    expect(screen.getByText('0 sessions')).toBeTruthy();
  });
});
