import { render, screen, fireEvent } from '@testing-library/react';
import { BlueprintsWindow } from '@/components/v3/windows/BlueprintsWindow';
import { useV3OS } from '@/lib/v3/osStore';
// path navigation: router/pathname stubs
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/v3',
  useSearchParams: () => new URLSearchParams(),
}));
import { fetchV3PowerAgents } from '@/lib/v3/powerAgents';

jest.mock('@/lib/v3/powerAgents', () => {
  const actual = jest.requireActual('@/lib/v3/powerAgents');
  return { ...actual, fetchV3PowerAgents: jest.fn() };
});
const mockedAgents = fetchV3PowerAgents as jest.MockedFunction<typeof fetchV3PowerAgents>;

describe('BlueprintsWindow · v13 win-library (layered catalog)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAgents.mockResolvedValue([]);
    useV3OS.setState({ workspaceId: 'ws1', sessionFeed: [] });
  });

  it('renders the reference titlebar, hero, askbar and the four v13 layers', () => {
    render(<BlueprintsWindow />);
    expect(screen.getByText('Blueprints')).toBeTruthy();
    expect(screen.getByText('catalog · pick a vehicle')).toBeTruthy();
    expect(screen.getByText('Blueprint Library')).toBeTruthy();
    expect(screen.getByText('Boundaries, pipelines, checklists — pick a vehicle to launch it.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search blueprints, SOPs, playbooks…')).toBeTruthy();
    expect(screen.getByText(/STRATEGY · BOUNDARIES/i)).toBeTruthy();
    expect(screen.getByText(/STRUCTURE · BLUEPRINTS/i)).toBeTruthy();
    expect(screen.getByText(/EXECUTION · DAILY DOING/i)).toBeTruthy();
    expect(screen.getByText(/REVIEW · OPTIMIZATION/i)).toBeTruthy();
    expect(screen.getByText('10 items')).toBeTruthy();
  });

  it('layer chips and search narrow the library; cards open the detail pane', () => {
    render(<BlueprintsWindow />);
    fireEvent.click(screen.getByRole('button', { name: 'strategy' }));
    expect(screen.queryByText('SEO Cluster')).toBeNull(); // seo is structure
    expect(screen.getByText('Brand Persona')).toBeTruthy(); // brand is strategy
    fireEvent.click(screen.getByRole('button', { name: 'all' }));
    fireEvent.change(screen.getByLabelText('Search the library'), { target: { value: 'email' } });
    expect(screen.getByText('Email Nurture')).toBeTruthy();
    expect(screen.queryByText('SEO Cluster')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search the library'), { target: { value: '' } });
    // detail pane: back-link, chips, runs table, launch action
    fireEvent.click(screen.getByRole('button', { name: /SEO Cluster/ }));
    expect(screen.getByText('← library')).toBeTruthy();
    expect(screen.getByText(/engine · graph/i)).toBeTruthy();
    expect(screen.getByText(/No runs yet — launch it to start the first\./i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Launch this vehicle →/i })).toBeTruthy();
    fireEvent.click(screen.getByText('← library'));
    expect(screen.getByText(/STRATEGY · BOUNDARIES/i)).toBeTruthy();
  });
});
