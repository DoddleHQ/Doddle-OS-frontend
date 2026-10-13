jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/components/v3/windows/TriageWindow', () => ({
  TriageWindow: () => <div data-testid="triage-stub" />,
}));
jest.mock('@/components/v3/windows/AssignmentsWindow', () => ({
  AssignmentsWindow: () => <div data-testid="assignments-stub" />,
}));
// the agents window pulls in the ai-sdk; jsdom lacks TransformStream, so mock it
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], setMessages: jest.fn(), sendMessage: jest.fn(), status: 'ready', stop: jest.fn(), error: null }),
}));
jest.mock('ai', () => ({ DefaultChatTransport: jest.fn().mockImplementation(() => ({})) }));

import { render, screen, fireEvent } from '@testing-library/react';
import { WindowsLayer } from '@/components/v3/shell/WindowsLayer';
import { useV3OS } from '@/lib/v3/osStore';

beforeEach(() => {
  useV3OS.setState({ windows: [], spotlightOpen: false, sessionFeed: [] });
  try { window.localStorage.setItem('v3.firstVisit', String(Date.now() - 24 * 3600_000)); } catch { /* ignore */ }
});

describe('WindowsLayer', () => {
  it('renders nothing when no windows are open', () => {
    const { container } = render(<WindowsLayer />);
    expect(container.querySelector('.os-window')).toBeNull();
  });

  it('renders the home window with titlebar and a working close button', () => {
    useV3OS.getState().openApp('home');
    render(<WindowsLayer />);
    expect(screen.getByText('Home')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(useV3OS.getState().windows).toHaveLength(0);
  });

  it('minimizes via the titlebar button', () => {
    useV3OS.getState().openApp('home');
    render(<WindowsLayer />);
    fireEvent.click(screen.getByLabelText('Minimize'));
    expect(useV3OS.getState().windows[0].minimized).toBe(true);
  });

  it('launchpad renders the v13 launcher, not an empty state', () => {
    useV3OS.getState().openApp('launchpad');
    render(<WindowsLayer />);
    expect(screen.getByText('What are you working on?')).toBeTruthy();
    expect(screen.getByText('Research & articles')).toBeTruthy();
  });

  it('renders an empty-state window for a later-screen app', () => {
    useV3OS.getState().openApp('hub');
    render(<WindowsLayer />);
    expect(screen.getByText(/Arriving in screen 7/i)).toBeTruthy();
  });

  it('reports renders the triage view when the queue has items', () => {
    useV3OS.setState({ sessionFeed: [{ id: 't9', title: 'fresh', agentKey: 'crawlability_audit', createdAt: null, updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString() }] });
    useV3OS.getState().openApp('reports');
    render(<WindowsLayer />);
    expect(screen.getByTestId('triage-stub')).toBeTruthy();
  });

  it('renders the home window content (greeting + ask bar)', () => {
    useV3OS.getState().openApp('home');
    render(<WindowsLayer />);
    // operator name arrives async from the API — assert the greeting stem only
    expect(screen.getByText(/^Good (morning|afternoon|evening)\.?/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Describe what you're working on/i)).toBeTruthy();
  });

  it('page mode: window carries the page class, Close works, Zoom restores window mode', () => {
    useV3OS.getState().openApp('home');
    useV3OS.getState().setMode('home', 'page');
    const { container } = render(<WindowsLayer />);
    // the page class drives CSS: t-min hidden, window fills the stage
    expect(container.querySelector('.os-window.page')).toBeTruthy();
    // zoom returns to window mode
    fireEvent.click(screen.getByLabelText('Zoom'));
    expect(useV3OS.getState().windows[0].mode).toBe('window');
    // and in page mode, close works
    useV3OS.getState().setMode('home', 'page');
    fireEvent.click(screen.getByLabelText('Close'));
    expect(useV3OS.getState().windows).toHaveLength(0);
  });
});
