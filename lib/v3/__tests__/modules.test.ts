import { V3_MODULES, v3ModuleHref, v3SuggestModules } from '@/lib/v3/modules';

describe('lib/v3/modules — the real module catalog', () => {
  it('every module carries a real route shape for its workspace', () => {
    expect(v3ModuleHref('seo-cluster', 'ws9')).toBe('/workspaces/ws9/modules/seo-cluster');
    expect(v3ModuleHref('brand-persona', 'ws9')).toBe('/workspaces/ws9/brand-persona'); // root route
    expect(V3_MODULES.length).toBeGreaterThanOrEqual(10);
    expect(V3_MODULES.every((m) => m.name && m.blurb && m.tags.length > 0 && m.icon)).toBe(true);
  });

  it('vehicle picker ranks keyword matches from a free-text outcome', () => {
    const picks = v3SuggestModules('keyword cluster for winter tires');
    expect(picks.length).toBeGreaterThan(0);
    expect(picks[0].module.slug).toBe('seo-cluster'); // strongest tag/name match first
    expect(picks.length).toBeLessThanOrEqual(3);

    const email = v3SuggestModules('set up an email nurture sequence');
    expect(email[0].module.slug).toBe('email-nurture');

    expect(v3SuggestModules('')).toEqual([]); // empty brief → no fake suggestions
    expect(v3SuggestModules('zzz qqq vvv')).toEqual([]); // no match → honest empty
  });
});
