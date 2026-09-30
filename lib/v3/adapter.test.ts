import { v3Data } from '@/lib/v3/adapter';

describe('v3 demo adapter (triage + spark only)', () => {
  it('serves the demo triage queue and spark series', () => {
    expect(v3Data.getReviewQueue().length).toBeGreaterThan(0);
    expect(v3Data.getReviewQueue()[0].kind).toBe('APPROVAL_REQ');
    expect(v3Data.getSparkSeries().length).toBeGreaterThan(2);
  });
});
