import { render, screen, fireEvent } from '@testing-library/react';
import { LaunchpadWindow } from '@/components/v3/windows/LaunchpadWindow';
import { useV3OS } from '@/lib/v3/osStore';

describe('LaunchpadWindow · define + catalog (real routes)', () => {
  beforeEach(() => {
    useV3OS.setState({ workspaceId: 'ws1' });
  });

  it('renders the full real module catalog with live links', () => {
    render(<LaunchpadWindow />);
    const seo = screen.getByRole('link', { name: /Open SEO Cluster/i });
    expect(seo.getAttribute('href')).toBe('/workspaces/ws1/modules/seo-cluster');
    const persona = screen.getByRole('link', { name: /Open Brand Persona/i });
    expect(persona.getAttribute('href')).toBe('/workspaces/ws1/brand-persona');
    expect(screen.getByText(/10\/10/)).toBeTruthy(); // count chip
  });

  it('typing an outcome surfaces ranked vehicle suggestions', () => {
    render(<LaunchpadWindow />);
    fireEvent.change(screen.getByLabelText('Describe the outcome'), {
      target: { value: 'keyword cluster for winter tires' },
    });
    const best = screen.getByText('best');
    expect(best).toBeTruthy();
    expect(best.closest('a')!.getAttribute('href')).toContain('seo-cluster');
  });

  it('domain chips and search narrow the catalog', () => {
    render(<LaunchpadWindow />);
    fireEvent.click(screen.getByRole('button', { name: /seo · 2/i }));
    expect(screen.queryByRole('link', { name: /Open Content Factory/i })).toBeNull();
    expect(screen.getByRole('link', { name: /Open SEO Cluster/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /all · 10/i }));
    fireEvent.change(screen.getByLabelText('Search modules'), { target: { value: 'launch' } });
    expect(screen.getByRole('link', { name: /Open SaaS Launch Ops/i })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Open Email Nurture/i })).toBeNull();
  });
});
