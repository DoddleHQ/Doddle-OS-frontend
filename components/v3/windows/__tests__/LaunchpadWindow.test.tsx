import { render, screen, fireEvent } from '@testing-library/react';
import { LaunchpadWindow } from '@/components/v3/windows/LaunchpadWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { fetchV3PowerAgents } from '@/lib/v3/powerAgents';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

describe('LaunchpadWindow · v13 exact launcher DOM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const Bot = jest.requireActual('lucide-react').Bot;
    mockedAgents.mockResolvedValue([
      { key: 'crawlability_audit', assistantId: 'as_1', name: 'Crawlability', role: 'Crawler & Indexer', handle: '@Crawlability', suite: 'SEO Audit Suite', icon: Bot },
    ]);
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
    expect(screen.getByText('Research & articles').closest('button')!.getAttribute('data-cat')).toBe('research');
  });

  it('typing an outcome surfaces the matched blueprint, stages and swarm', async () => {
    render(<LaunchpadWindow />);
    fireEvent.change(screen.getByLabelText('Describe the outcome'), {
      target: { value: 'keyword cluster for winter tires' },
    });
    const rows = screen.getAllByText(/SEO Cluster/);
    expect(rows.length).toBeGreaterThan(0);
    expect(screen.getByText(/MATCHED BLUEPRINT · SEO CLUSTER/i)).toBeTruthy();
    expect(screen.getByText('Full run — SEO Cluster')).toBeTruthy();
    expect(screen.getByText('keyword clusters')).toBeTruthy();
    expect(await screen.findByText('Swarm:')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Launch campaign →/i })).toBeTruthy();
    expect(screen.getByText('matched · SEO Cluster')).toBeTruthy();
  });
});
