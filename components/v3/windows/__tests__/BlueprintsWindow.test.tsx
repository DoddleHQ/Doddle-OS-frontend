import { render, screen, fireEvent } from '@testing-library/react';
import { BlueprintsWindow } from '@/components/v3/windows/BlueprintsWindow';
import { useV3OS } from '@/lib/v3/osStore';

describe('BlueprintsWindow · layered library (real routes)', () => {
  beforeEach(() => {
    useV3OS.setState({ workspaceId: 'ws1' });
  });

  it('renders the four v13 layers over the real module catalog', () => {
    render(<BlueprintsWindow />);
    expect(screen.getByText(/STRATEGY · BOUNDARIES/i)).toBeTruthy();
    expect(screen.getByText(/STRUCTURE · BLUEPRINTS/i)).toBeTruthy();
    expect(screen.getByText(/EXECUTION · DAILY DOING/i)).toBeTruthy();
    expect(screen.getByText(/REVIEW · OPTIMIZATION LOOP/i)).toBeTruthy();
    const seo = screen.getByRole('link', { name: /Open SEO Cluster/i });
    expect(seo.getAttribute('href')).toBe('/workspaces/ws1/modules/seo-cluster');
    expect(screen.getByText(/10 items?/i)).toBeTruthy();
  });

  it('layer chips and search narrow the library', () => {
    render(<BlueprintsWindow />);
    fireEvent.click(screen.getByRole('button', { name: /^strategy · /i }));
    expect(screen.queryByRole('link', { name: /Open SEO Cluster/i })).toBeNull(); // seo is structure
    expect(screen.getByRole('link', { name: /Open Brand Persona/i })).toBeTruthy(); // brand is strategy
    fireEvent.click(screen.getByRole('button', { name: /^strategy · /i }));
    fireEvent.change(screen.getByLabelText('Search the library'), { target: { value: 'email' } });
    expect(screen.getByRole('link', { name: /Open Email Nurture/i })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Open SEO Cluster/i })).toBeNull();
  });
});
