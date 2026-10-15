import { render, screen, fireEvent } from '@testing-library/react';
import { Spotlight } from '@/components/v3/shell/Spotlight';
import { useV3OS } from '@/lib/v3/osStore';
// path navigation: capture pushes
const pushes: string[] = [];
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (p: string) => pushes.push(p), replace: jest.fn() }),
  usePathname: () => '/v3',
}));

beforeEach(() => useV3OS.setState({ spotlightOpen: true, theme: 'light', windows: [] }));

describe('Spotlight', () => {
  it('lists apps and actions', () => {
    render(<Spotlight />);
    expect(screen.getByText(/Home — status & reviews/i)).toBeTruthy();
    expect(screen.getByText(/Launchpad — what to launch/i)).toBeTruthy();
    expect(screen.getByText('Blueprints — library')).toBeTruthy();
    expect(screen.getByText(/Agents — contextual roster/i)).toBeTruthy();
    expect(screen.getByText('Triage Queue (needs you)')).toBeTruthy();
    expect(screen.getByText(/Reports — gallery \+ analytics/i)).toBeTruthy();
  });

  it('filters by keyword', () => {
    render(<Spotlight />);
    fireEvent.change(screen.getByPlaceholderText(/Spotlight/i), { target: { value: 'triage' } });
    expect(screen.getByText('Triage Queue (needs you)')).toBeTruthy();
    expect(screen.queryByText(/Home — status & reviews/i)).toBeNull();
  });

  it('Enter runs the first visible item (opens launchpad)', () => {
    render(<Spotlight />);
    fireEvent.change(screen.getByPlaceholderText(/Spotlight/i), { target: { value: 'launch' } });
    fireEvent.keyDown(screen.getByPlaceholderText(/Spotlight/i), { key: 'Enter' });
    expect(pushes).toContain('/v3/launchpad');
    // navigation is path-based now: the push above IS the launchpad open
    expect(useV3OS.getState().spotlightOpen).toBe(false);
  });

  it('click-outside closes without running anything', () => {
    render(<Spotlight />);
    fireEvent.click(screen.getByTestId('spotlight-overlay'));
    expect(useV3OS.getState().spotlightOpen).toBe(false);
    expect(useV3OS.getState().windows).toHaveLength(0);
  });
});
