import { describe, expect, test } from 'vitest';
import {
  computeColPageBreaks,
  computeRowPageBreaks,
  getDefaultPageMetrics,
} from '../src/ViewModeRenderer';

describe('ViewModeRenderer', () => {
  test('computes row page breaks from accumulated height', () => {
    const rows = [1, 2, 3, 4, 5];
    const breaks = computeRowPageBreaks(rows, () => 40, 100);
    expect(breaks).toEqual([2, 4]);
  });

  test('computes column page breaks from accumulated width', () => {
    const breaks = computeColPageBreaks(5, () => 80, 200);
    expect(breaks).toEqual([2, 4]);
  });

  test('default page metrics use letter size and margins', () => {
    const metrics = getDefaultPageMetrics(1);
    expect(metrics.paperWidthPx).toBeCloseTo(8.5 * 96);
    expect(metrics.contentWidthPx).toBeGreaterThan(0);
    expect(metrics.contentHeightPx).toBeGreaterThan(0);
  });
});
