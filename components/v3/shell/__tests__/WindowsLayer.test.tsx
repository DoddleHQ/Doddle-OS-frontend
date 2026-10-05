// the agents window pulls in the ai-sdk; jsdom lacks TransformStream, so mock it
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({ messages: [], setMessages: jest.fn(), sendMessage: jest.fn(), status: 'ready', stop: jest.fn(), error: null }),
}));
jest.mock('ai', () => ({ DefaultChatTransport: jest.fn().mockImplementation(() => ({})) }));

import { render, screen, fireEvent } from '@testing-library/react';
import { WindowsLayer } from '@/components/v3/shell/WindowsLayer';
import { useV3OS } from '@/lib/v3/osStore';

beforeEach(() => useV3OS.setState({ windows: [], spotlightOpen: false }));

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

  it('launchpad renders the real module catalog, not an empty state', () => {
    useV3OS.getState().openApp('launchpad');
    render(<WindowsLayer />);
    expect(screen.getByLabelText('Describe the outcome')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open SEO Cluster/i })).toBeTruthy();
  });

  it('renders an empty-state window for a later-screen app', () => {
    useV3OS.getState().openApp('hub');
    render(<WindowsLayer />);
    expect(screen.getByText(/Arriving in screen 7/i)).toBeTruthy();
  });

  it('reports renders the real triage queue, not an empty state', () => {
    useV3OS.getState().openApp('reports');
    render(<WindowsLayer />);
    expect(screen.getByText(/Queue · awaiting your review/i)).toBeTruthy();
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
