import { render, screen, fireEvent } from '@testing-library/react';
import { Spotlight } from '@/components/v3/shell/Spotlight';
import { useV3OS } from '@/lib/v3/osStore';

beforeEach(() => useV3OS.setState({ spotlightOpen: true, theme: 'light', windows: [] }));

describe('Spotlight', () => {
  it('lists apps and actions', () => {
    render(<Spotlight />);
    expect(screen.getByText(/Home — status & reviews/i)).toBeTruthy();
    expect(screen.getByText(/Launchpad — what to launch/i)).toBeTruthy();
    expect(screen.getByText(/Toggle appearance/i)).toBeTruthy();
  });

  it('filters by keyword', () => {
    render(<Spotlight />);
    fireEvent.change(screen.getByPlaceholderText(/Spotlight/i), { target: { value: 'appearance' } });
    expect(screen.getByText(/Toggle appearance/i)).toBeTruthy();
    expect(screen.queryByText(/Home — status & reviews/i)).toBeNull();
  });

  it('Enter runs the first visible item (opens launchpad)', () => {
    render(<Spotlight />);
    fireEvent.change(screen.getByPlaceholderText(/Spotlight/i), { target: { value: 'launch' } });
    fireEvent.keyDown(screen.getByPlaceholderText(/Spotlight/i), { key: 'Enter' });
    expect(useV3OS.getState().windows.map((w) => w.id)).toContain('launchpad');
    expect(useV3OS.getState().spotlightOpen).toBe(false);
  });

  it('click-outside closes without running anything', () => {
    render(<Spotlight />);
    fireEvent.click(screen.getByTestId('spotlight-overlay'));
    expect(useV3OS.getState().spotlightOpen).toBe(false);
    expect(useV3OS.getState().windows).toHaveLength(0);
  });
});
