import { Address, CellValue } from './types';

export type FillPattern = 'copy' | 'series' | 'fill-formatting-only' | 'fill-without-formatting';

export interface FillOptions {
  pattern?: FillPattern;
  step?: number; // for numeric/date series
}

/**
 * Auto-fill logic: detects patterns and fills target range based on source range
 */
export function autoFill(
  sourceRange: { r1: number; c1: number; r2: number; c2: number },
  targetRange: { r1: number; c1: number; r2: number; c2: number },
  getCellValue: (addr: Address) => CellValue,
  options: FillOptions = {}
): Map<string, CellValue> {
  const result = new Map<string, CellValue>();
  const pattern = options.pattern ?? detectPattern(sourceRange, getCellValue);
  
  const sourceRows = sourceRange.r2 - sourceRange.r1 + 1;
  const sourceCols = sourceRange.c2 - sourceRange.c1 + 1;
  const targetRows = targetRange.r2 - targetRange.r1 + 1;
  const targetCols = targetRange.c2 - targetRange.c1 + 1;

  if (pattern === 'copy') {
    // Tile the source pattern across target
    for (let tr = targetRange.r1; tr <= targetRange.r2; tr++) {
      for (let tc = targetRange.c1; tc <= targetRange.c2; tc++) {
        const srcRow = sourceRange.r1 + ((tr - targetRange.r1) % sourceRows);
        const srcCol = sourceRange.c1 + ((tc - targetRange.c1) % sourceCols);
        const val = getCellValue({ row: srcRow, col: srcCol });
        result.set(`${tr}:${tc}`, val);
      }
    }
  } else if (pattern === 'series') {
    // Detect numeric or date series from source
    const firstVal = getCellValue({ row: sourceRange.r1, col: sourceRange.c1 });
    if (typeof firstVal === 'number') {
      const step = options.step ?? detectNumericStep(sourceRange, getCellValue);
      let current = firstVal + step * sourceRows; // continue from where source left off
      for (let tr = targetRange.r1; tr <= targetRange.r2; tr++) {
        for (let tc = targetRange.c1; tc <= targetRange.c2; tc++) {
          result.set(`${tr}:${tc}`, current);
          current += step;
        }
      }
    } else {
      // Fallback to copy
      for (let tr = targetRange.r1; tr <= targetRange.r2; tr++) {
        for (let tc = targetRange.c1; tc <= targetRange.c2; tc++) {
          const srcRow = sourceRange.r1 + ((tr - targetRange.r1) % sourceRows);
          const srcCol = sourceRange.c1 + ((tc - targetRange.c1) % sourceCols);
          const val = getCellValue({ row: srcRow, col: srcCol });
          result.set(`${tr}:${tc}`, val);
        }
      }
    }
  }

  return result;
}

function detectPattern(
  range: { r1: number; c1: number; r2: number; c2: number },
  getCellValue: (addr: Address) => CellValue
): FillPattern {
  // Check if we have a numeric series
  const vals: number[] = [];
  for (let r = range.r1; r <= range.r2; r++) {
    for (let c = range.c1; c <= range.c2; c++) {
      const v = getCellValue({ row: r, col: c });
      if (typeof v === 'number') vals.push(v);
      else return 'copy'; // mixed types -> copy
    }
  }
  if (vals.length < 2) return 'copy';
  const diffs = vals.slice(1).map((v, i) => v - vals[i]);
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const consistent = diffs.every(d => Math.abs(d - avgDiff) < 0.0001);
  return consistent && avgDiff !== 0 ? 'series' : 'copy';
}

function detectNumericStep(
  range: { r1: number; c1: number; r2: number; c2: number },
  getCellValue: (addr: Address) => CellValue
): number {
  const vals: number[] = [];
  for (let r = range.r1; r <= range.r2; r++) {
    for (let c = range.c1; c <= range.c2; c++) {
      const v = getCellValue({ row: r, col: c });
      if (typeof v === 'number') vals.push(v);
    }
  }
  if (vals.length < 2) return 1;
  const diffs = vals.slice(1).map((v, i) => v - vals[i]);
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}
