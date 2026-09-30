import { render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/v3/shell/Dashboard';
import { useV3OS } from '@/lib/v3/osStore';

describe('Dashboard', () => {
  it('shows greeting, morph headline, ask bar, quick actions, and four bento cards', () => {
    useV3OS.setState({ windows: [] });
    render(<Dashboard />);
    expect(screen.getByText(/Good (morning|afternoon|evening), Alex/i)).toBeTruthy();
    expect(screen.getByText('Ready?')).toBeTruthy();
    expect(screen.getByText('Assignments')).toBeTruthy();
    expect(screen.getByText('Agents')).toBeTruthy();
    expect(screen.getByText(/Active Execution/i)).toBeTruthy();
    expect(screen.getByText(/Triage Queue/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Describe what you're working on/i)).toBeTruthy();
  });

  it('is hidden (dash-hidden class) while a window is open', () => {
    useV3OS.setState({ windows: [] });
    useV3OS.getState().openApp('home');
    const { container } = render(<Dashboard />);
    expect(container.firstElementChild?.className).toContain('dash-hidden');
  });

  it('renders telemetry from the adapter', () => {
    useV3OS.setState({ windows: [] });
    render(<Dashboard />);
    // thread title appears in the Active Execution card and telemetry
    expect(screen.getAllByText('SEO content sprint — Q4 cluster').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/@Google_Analyst/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/@Content_Architect/i).length).toBeGreaterThan(0);
  });
});
