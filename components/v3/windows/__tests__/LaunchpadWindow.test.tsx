import { render, screen, fireEvent } from '@testing-library/react';
import { LaunchpadWindow } from '@/components/v3/windows/LaunchpadWindow';
import { useV3OS } from '@/lib/v3/osStore';
// path navigation: router/pathname stubs
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
  useSearchParams: () => new URLSearchParams(),
}));

describe('LaunchpadWindow · v13 exact launcher DOM', () => {
  beforeEach(() => {
    useV3OS.setState({ workspaceId: 'ws1', sessionFeed: [] });
  });

  it('hero, composer with blueprint glide, and the six v13 category cards', () => {
    render(<LaunchpadWindow />);
    expect(screen.getByText('What are you working on?')).toBeTruthy();
    expect(screen.getByText('Describe it — we match the blueprint + agent.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pick a blueprint' })).toBeTruthy();
    expect(screen.getByText('>_', { selector: '#task-creator button' })).toBeTruthy();
    expect(screen.getByText('LAUNCH CAMPAIGN · BLUEPRINT + SWARM')).toBeTruthy();
    for (const label of ['Research & articles', 'Code review & PRs', 'Data analysis & pipelines', 'Draft & content', 'Admin & organization', 'Design & assets']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // category cards route to real module pages
    expect(screen.getByText('Research & articles').closest('button')!.getAttribute('data-cat')).toBe('research');
  });

  it('typing an outcome surfaces ranked vehicle stages with real routes', () => {
    render(<LaunchpadWindow />);
    fireEvent.change(screen.getByLabelText('Describe the outcome'), {
      target: { value: 'keyword cluster for winter tires' },
    });
    const rows = screen.getAllByText(/SEO Cluster/);
    expect(rows.length).toBeGreaterThan(0); // vehicle stage row
    expect(screen.getAllByText(/match \d+/).length).toBeGreaterThan(0); // match badges
    expect(screen.getByRole('button', { name: /Launch campaign →/i })).toBeTruthy();
  });
});
