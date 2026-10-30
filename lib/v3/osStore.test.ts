import { useV3OS } from '@/lib/v3/osStore';

const s = () => useV3OS.getState();

beforeEach(() => {
  localStorage.clear();
  useV3OS.setState({
    windows: [],
    spotlightOpen: false,
    notifsOpen: false,
    ccOpen: false,
    menu: null,
    theme: 'light',
  });
});

describe('v3 os store · windows', () => {
  it('openApp creates a window and focuses it; re-open un-minimizes and raises', () => {
    s().openApp('home');
    expect(s().windows.map((w) => w.id)).toEqual(['home']);
    expect(s().windows[0].mode).toBe('window');
    s().minWin('home');
    s().openApp('launchpad');
    s().openApp('home');
    const home = s().windows.find((w) => w.id === 'home')!;
    expect(home.minimized).toBe(false);
    expect(s().windows[s().windows.length - 1].id).toBe('home');
    expect(s().windows.find((w) => w.id === 'launchpad')?.mode).toBe('page');
  });

  it('closeWin removes; sections are exclusive — opening agents closed launchpad (v13 nav)', () => {
    s().openApp('home');
    s().openApp('launchpad');
    s().openApp('agents');
    expect(s().windows.map((w) => w.id)).toEqual(['home', 'agents']);
    s().closeWin('agents');
    expect(s().windows.map((w) => w.id)).toEqual(['home']);
  });

  it('setWinPos and setMode mutate only the target window', () => {
    s().openApp('home');
    s().setWinPos('home', 120, 40);
    s().setMode('home', 'page');
    const w = s().windows[0];
    expect(w.x).toBe(120);
    expect(w.y).toBe(40);
    expect(w.mode).toBe('page');
  });

  it('zooming a page-default app back to window mode gives it a sane width', () => {
    s().openApp('agents');
    s().setMode('agents', 'window');
    const w = s().windows[0];
    expect(w.mode).toBe('window');
    expect(w.width).toBe(560);
    expect(w.x).toBeGreaterThan(0);
  });

  it('focusWin raises the window without duplicating it', () => {
    s().openApp('home');
    s().openApp('launchpad');
    s().focusWin('home');
    const ids = s().windows.map((w) => w.id);
    expect(ids).toEqual(['launchpad', 'home']);
    expect(ids).toHaveLength(2);
  });
});

describe('v3 os store · workspaces + agent selection', () => {
  it('setWorkspaces falls back to the first real workspace when the stored id is gone', () => {
    useV3OS.setState({ workspaces: [], workspaceId: 'gone' });
    s().setWorkspaces([{ id: 'w1', name: 'One' }, { id: 'w2', name: 'Two' }]);
    expect(s().workspaceId).toBe('w1');
    expect(s().workspaces).toHaveLength(2);
    s().setWorkspace('w2');
    s().setWorkspaces([{ id: 'w1', name: 'One' }, { id: 'w2', name: 'Two' }]);
    expect(s().workspaceId).toBe('w2');
  });

  it('selectAgent switches between roster and an agent', () => {
    expect(s().selectedAgentKey).toBeNull();
    s().selectAgent('content-architect');
    expect(s().selectedAgentKey).toBe('content-architect');
    s().selectAgent(null);
    expect(s().selectedAgentKey).toBeNull();
  });
});

describe('v3 os store · overlays + theme', () => {
  it('closeTopOverlay clears in priority order: spotlight, notifs, cc, menu', () => {
    useV3OS.setState({ spotlightOpen: true, notifsOpen: true, ccOpen: true, menu: 'ws' });
    s().closeTopOverlay();
    expect(s().spotlightOpen).toBe(false);
    s().closeTopOverlay();
    expect(s().notifsOpen).toBe(false);
    s().closeTopOverlay();
    expect(s().ccOpen).toBe(false);
    s().closeTopOverlay();
    expect(s().menu).toBeNull();
  });

  it('opening one overlay closes the others', () => {
    useV3OS.setState({ notifsOpen: true, ccOpen: true });
    s().toggleSpot(true);
    expect(s().spotlightOpen).toBe(true);
    expect(s().notifsOpen).toBe(false);
    expect(s().ccOpen).toBe(false);
  });

  it('toggleTheme flips and persists through localStorage; hydrate restores it', () => {
    s().toggleTheme();
    expect(s().theme).toBe('dark');
    expect(localStorage.getItem('v3.theme')).toBe('dark');
    useV3OS.setState({ theme: 'light' });
    useV3OS.getState().hydrate();
    expect(s().theme).toBe('dark');
  });
});
