import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { PivotEngine, type PivotConfig } from '../src/PivotEngine';
import { PivotRegistryImpl, type PivotId } from '../src/PivotRegistry';
import { PivotRecomputeEngineImpl } from '../src/PivotRecomputeEngine';
import { groupStateStore } from '../src/PivotGroupStateStore';
import { PivotSnapshotStore } from '../src/PivotSnapshotStore';
import { transformToPivotSnapshot } from '../src/PivotSnapshotTransformer';
import { Worksheet } from '../src/worksheet';
import type { ExtendedCellValue } from '../src/types';

const config: PivotConfig = {
  rows: [{ column: 3, label: 'Region' }],
  columns: [],
  values: [
    { type: 'aggregate', column: 4, aggregation: 'sum', label: 'Revenue' },
    { type: 'aggregate', column: 5, aggregation: 'sum', label: 'Cost' },
  ],
  calculatedFields: [
    { name: 'Profit', formula: 'Revenue - Cost' },
    { name: 'Margin', formula: 'Profit / Revenue' },
  ],
  sourceRange: {
    start: { row: 4, col: 3 },
    end: { row: 7, col: 5 },
  },
};

function readSource(worksheet: Worksheet): ExtendedCellValue[][] {
  const data: ExtendedCellValue[][] = [];
  for (let row = config.sourceRange.start.row; row <= config.sourceRange.end.row; row++) {
    const values: ExtendedCellValue[] = [];
    for (let col = config.sourceRange.start.col; col <= config.sourceRange.end.col; col++) {
      values.push(worksheet.getCellValue({ row, col }));
    }
    data.push(values);
  }
  return data;
}

function generateSnapshot(worksheet: Worksheet, id: PivotId) {
  const engine = new PivotEngine(worksheet);
  const table = engine.generate(config);
  return transformToPivotSnapshot(id, table, config);
}

function comparableRows(rows: readonly Record<string, unknown>[] | undefined) {
  return [...(rows ?? [])]
    .map((row) => Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))))
    .sort((a, b) => String(a.Region).localeCompare(String(b.Region)));
}

describe('P1-08AH calculated fields and partial-recompute interaction', () => {
  beforeEach(() => groupStateStore.clear());
  afterEach(() => groupStateStore.clear());

  test('uses the full builder for calculated pivots after source mutations', () => {
    const worksheet = new Worksheet('Calculated partial', 12, 8);
    const matrix: ExtendedCellValue[][] = [
      ['Region', 'Revenue', 'Cost'],
      ['West', 10, 4],
      ['West', 20, 5],
      ['East', 7, 2],
    ];
    matrix.forEach((row, rowOffset) => row.forEach((value, colOffset) => {
      worksheet.setCellValue(
        { row: config.sourceRange.start.row + rowOffset, col: config.sourceRange.start.col + colOffset },
        value,
      );
    }));

    const registry = new PivotRegistryImpl();
    const snapshots = new PivotSnapshotStore();
    const id = registry.register({
      name: 'Calculated partial recompute',
      config,
      sourceRange: 'C4:E7',
      worksheetId: worksheet.getWorksheetId(),
    });
    let fullBuildCalls = 0;
    const recompute = new PivotRecomputeEngineImpl(
      registry,
      snapshots,
      (pivotId, pivotConfig) => {
        fullBuildCalls++;
        const engine = new PivotEngine(worksheet);
        const table = engine.generate(pivotConfig);
        const snapshot = transformToPivotSnapshot(pivotId, table, pivotConfig);
        engine.populateGroupState(pivotId, pivotConfig, readSource(worksheet));
        return snapshot;
      },
      () => readSource(worksheet),
    );

    registry.markDirty(id);
    recompute.ensureFresh(id);
    const initial = snapshots.get(id);
    let expectedFullBuildCalls = 1;
    expect(initial?.rows.find((row) => row.Region === 'West')).toMatchObject({
      Revenue: 30,
      Cost: 9,
      Profit: 21,
      Margin: 0.7,
    });
    expect(fullBuildCalls).toBe(1);

    const assertFullResult = () => {
      registry.markDirty(id);
      recompute.ensureFresh(id);
      expectedFullBuildCalls++;
      expect(comparableRows(snapshots.get(id)?.rows)).toEqual(
        comparableRows(generateSnapshot(worksheet, id).rows),
      );
      expect(fullBuildCalls).toBe(expectedFullBuildCalls);
      expect(registry.get(id)?.dirty).toBe(false);
      expect(registry.get(id)?.rebuilding).toBe(false);
    };

    // A single aggregate input edit.
    worksheet.setCellValue({ row: 5, col: 4 }, 15);
    assertFullResult();
    expect(snapshots.get(id)?.rows.find((row) => row.Region === 'West')).toMatchObject({
      Revenue: 35,
      Cost: 9,
      Profit: 26,
      Margin: 26 / 35,
    });

    // A group-dimension edit moves the source row to another output group.
    worksheet.setCellValue({ row: 6, col: 3 }, 'North');
    assertFullResult();

    // Multiple aggregate inputs in one source row change together.
    worksheet.setCellValue({ row: 7, col: 4 }, 9);
    worksheet.setCellValue({ row: 7, col: 5 }, 6);
    assertFullResult();

    // Repeated edits to the same source cell must not reuse stale calculated state.
    worksheet.setCellValue({ row: 5, col: 4 }, 18);
    assertFullResult();
    worksheet.setCellValue({ row: 5, col: 4 }, 19);
    assertFullResult();

    // A dirty notification for a field outside the pivot source remains safe.
    worksheet.setCellValue({ row: 5, col: 8 }, 'unrelated');
    assertFullResult();

    expect(registry.get(id)?.dirty).toBe(false);
    expect(registry.get(id)?.rebuilding).toBe(false);
  });
});
