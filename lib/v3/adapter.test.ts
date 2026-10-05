import { v3Data } from '@/lib/v3/adapter';

describe('v3 demo adapter (spark only — triage went real)', () => {
  it('serves the decorative spark series', () => {
    expect(v3Data.getSparkSeries().length).toBeGreaterThan(2);
  });
});
