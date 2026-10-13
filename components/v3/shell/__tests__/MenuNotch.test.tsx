import { render, screen, fireEvent } from '@testing-library/react';
import { MenuNotch } from '@/components/v3/shell/MenuNotch';
import { useV3OS } from '@/lib/v3/osStore';
// path navigation: router/pathname stubs
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
}));

beforeEach(() =>
  useV3OS.setState({
    sessionFeed: [],
    windows: [],
    menu: null,
    spotlightOpen: false,
    notifsOpen: false,
    ccOpen: false,
    workspaces: [
      { id: 'w1', name: 'Acme Marketing' },
      { id: 'w2', name: 'Growth Labs' },
    ],
    workspaceId: 'w1',
  }),
);

describe('MenuNotch', () => {
  it('renders workspace label and app/system buttons', () => {
    render(<MenuNotch />);
    expect(screen.getByTitle('Workspace')).toBeTruthy();
    expect(screen.getByTitle('Home · full OS')).toBeTruthy();
    expect(screen.getByTitle('Launchpad · define')).toBeTruthy();
    expect(screen.getByTitle('Agents · roster')).toBeTruthy();
    expect(screen.getByTitle('Assignments · track')).toBeTruthy();
    expect(screen.getByTitle('Spotlight · ⌘K')).toBeTruthy();
    expect(screen.getByTitle('Triage · review')).toBeTruthy();
    expect(screen.getByTitle('Reports · progress')).toBeTruthy();
  });

  it('shows the current workspace name from the store', () => {
    render(<MenuNotch />);
    expect(screen.getByTitle('Workspace').textContent).toContain('Acme Marketing');
  });

  it('Home is a real link to /v3 (v13 full-OS navigation)', () => {
    render(<MenuNotch />);
    const home = screen.getByTitle('Home · full OS');
    expect(home.getAttribute('href')).toBe('/v3');
    expect(home.tagName).toBe('A');
  });

  it('shows the triage badge from the real unread feed count', () => {
    try {
      window.localStorage.clear();
      window.localStorage.setItem('v3.firstVisit', String(Date.now() - 60_000));
    } catch {
      /* ignore */
    }
    useV3OS.setState({
      sessionFeed: [{ id: 't9', title: 'fresh', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date().toISOString() }],
    });
    const { rerender } = render(<MenuNotch />);
    expect(screen.getByTitle('Triage · review').textContent).toContain('1');
    useV3OS.setState({ sessionFeed: [] });
    rerender(<MenuNotch />);
    expect(screen.getByTitle('Triage · review').textContent).not.toContain('1');
  });

  it('clicking Workspace toggles the ws menu', () => {
    render(<MenuNotch />);
    fireEvent.click(screen.getByTitle('Workspace'));
    expect(useV3OS.getState().menu).toBe('ws');
    fireEvent.click(screen.getByTitle('Workspace'));
    expect(useV3OS.getState().menu).toBeNull();
  });
});
