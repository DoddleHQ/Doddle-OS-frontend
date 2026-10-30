import { SEED_SPARK } from './seed';

export interface V3DemoAdapter {
  getSparkSeries(): number[];
}

export const v3Data: V3DemoAdapter = {
  getSparkSeries: () => SEED_SPARK,
};
