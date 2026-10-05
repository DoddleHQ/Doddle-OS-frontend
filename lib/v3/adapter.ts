import { SEED_SPARK } from './seed';

export interface V3DemoAdapter {
  getSparkSeries(): number[];
}

/**
 * Demo-only values (no real API yet). Real workspaces/agents/threads live in
 * lib/v3/data.ts — do not add seeded substitutes for them here.
 */
export const v3Data: V3DemoAdapter = {
  getSparkSeries: () => SEED_SPARK,
};
