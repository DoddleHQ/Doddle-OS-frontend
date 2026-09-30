import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityRail } from '@/components/v3/shell/ActivityRail';
import { useV3OS } from '@/lib/v3/osStore';

beforeEach(() => useV3OS.setState({ windows: [], railPinned: false }));

describe('ActivityRail', () => {
  it('shows the running thread with a naming tooltip (data-tip) and history', () => {
    render(<ActivityRail />);
    const doing = screen.getByRole('button', { name: /SEO content sprint.*running/i });
    expect(doing.getAttribute('data-tip')).toContain('SEO content sprint');
    expect(doing.getAttribute('data-tip')).toContain('running');
    expect(screen.getByRole('button', { name: /History/i })).toBeTruthy();
  });

  it('lists minimized windows as restorable blocks with name tooltips', () => {
    useV3OS.getState().openApp('home');
    useV3OS.getState().minWin('home');
    useV3OS.getState().openApp('agents');
    useV3OS.getState().minWin('agents');
    render(<ActivityRail />);
    const homeBlock = screen.getByRole('button', { name: /Home, minimized/i });
    expect(homeBlock.getAttribute('data-tip')).toContain('Home');
    expect(homeBlock.getAttribute('data-tip')).toContain('click to restore');
    expect(screen.getByRole('button', { name: /Agents, minimized/i })).toBeTruthy();
  });

  it('clicking a stashed block restores the window (un-minimized, visible)', () => {
    useV3OS.getState().openApp('home');
    useV3OS.getState().minWin('home');
    render(<ActivityRail />);
    fireEvent.click(screen.getByRole('button', { name: /Home, minimized/i }));
    const home = useV3OS.getState().windows.find((w) => w.id === 'home')!;
    expect(home.minimized).toBe(false);
  });

  it('hides the MIN group when nothing is minimized', () => {
    render(<ActivityRail />);
    expect(screen.queryByText('MIN')).toBeNull();
  });
});
