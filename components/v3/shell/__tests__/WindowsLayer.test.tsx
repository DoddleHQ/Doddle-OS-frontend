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

  it('renders an empty-state window for a later-screen app', () => {
    useV3OS.getState().openApp('launchpad');
    render(<WindowsLayer />);
    expect(screen.getByText(/Arriving in screen 2/i)).toBeTruthy();
  });

  it('renders the home window content (greeting + ask bar)', () => {
    useV3OS.getState().openApp('home');
    render(<WindowsLayer />);
    expect(screen.getByText(/Good (morning|afternoon|evening), Alex/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Describe what you're working on/i)).toBeTruthy();
  });
});
