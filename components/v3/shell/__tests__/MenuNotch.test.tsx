import { render, screen, fireEvent } from '@testing-library/react';
import { MenuNotch } from '@/components/v3/shell/MenuNotch';
import { useV3OS } from '@/lib/v3/osStore';

beforeEach(() =>
  useV3OS.setState({ windows: [], menu: null, spotlightOpen: false, notifsOpen: false, ccOpen: false }),
);

describe('MenuNotch', () => {
  it('renders workspace label and app/system buttons', () => {
    render(<MenuNotch />);
    expect(screen.getByTitle('Workspace')).toBeTruthy();
    expect(screen.getByTitle('Home · ⌘1')).toBeTruthy();
    expect(screen.getByTitle('Launchpad · ⌘2')).toBeTruthy();
    expect(screen.getByTitle('Agents · ⌘3')).toBeTruthy();
    expect(screen.getByTitle('Assignments · ⌘4')).toBeTruthy();
    expect(screen.getByTitle('Spotlight · ⌘K')).toBeTruthy();
    expect(screen.getByTitle('Artefacts · ⌘6')).toBeTruthy();
    expect(screen.getByTitle('Tasks · ⌘7')).toBeTruthy();
  });

  it('shows the current workspace name from the store', () => {
    render(<MenuNotch />);
    expect(screen.getByTitle('Workspace').textContent).toContain('Marketing');
  });

  it('clicking Home opens the home window in the store', () => {
    render(<MenuNotch />);
    fireEvent.click(screen.getByTitle('Home · ⌘1'));
    expect(useV3OS.getState().windows.map((w) => w.id)).toContain('home');
  });

  it('shows the triage badge count from the review queue', () => {
    render(<MenuNotch />);
    expect(screen.getByTitle('Artefacts · ⌘6').textContent).toContain('1');
  });

  it('clicking Workspace toggles the ws menu', () => {
    render(<MenuNotch />);
    fireEvent.click(screen.getByTitle('Workspace'));
    expect(useV3OS.getState().menu).toBe('ws');
    fireEvent.click(screen.getByTitle('Workspace'));
    expect(useV3OS.getState().menu).toBeNull();
  });
});
