import { describe, expect, test } from '@jest/globals';
import { GetPivotData } from '../src/GetPivotData';
import { PivotEngine } from '../src/PivotEngine';
import { PivotSnapshotStore } from '../src/PivotSnapshotStore';
import { PivotRegistryImpl } from '../src/PivotRegistry';
import { transformToPivotSnapshot } from '../src/PivotSnapshotTransformer';
import { Worksheet } from '../src/worksheet';
import type { PivotConfig } from '../src/PivotEngine';

function makeWorksheet(): Worksheet {
  const sheet = new Worksheet('Named Pivot', 20, 12);
  // Deliberately begin at B3 to exercise absolute source-column offsets.
  const source = [
    ['Category', 'Cost', 'Revenue', 'Units'],
    ['North', 30, 100, 2],
    ['North', 10, 200, 3],
    ['South', 5, 40, 1],
  ] as const;
  for (let r = 0; r < source.length; r++) {
    for (let c = 0; c < source[r].length; c++) {
      sheet.setCellValue({ row: 3 + r, col: 2 + c }, source[r][c]);
    }
  }
  return sheet;
}

const config: PivotConfig = {
  rows: [{ column: 2, label: 'Category' }],
  columns: [],
  // Reordered primary field plus two independent aggregates over Revenue.
  values: [
    { column: 3, aggregation: 'sum', label: 'Cost' },
    { column: 4, aggregation: 'sum', label: 'Revenue' },
    { column: 4, aggregation: 'average', label: 'AverageRevenue' },
    { column: 5, aggregation: 'sum', label: 'Units' },
  ],
  sourceRange: { start: { row: 3, col: 2 }, end: { row: 6, col: 5 } },
  calculatedFields: [
    { name: 'Profit', formula: 'revenue - COST' },
    { name: 'Margin', formula: 'profit / Revenue' },
  ],
};

describe('P1-08AH standalone pivot named-binding integration', () => {
  test('aggregates reordered and repeated source fields and evaluates dependent names', () => {
    const sheet = makeWorksheet();
    const table = new PivotEngine(sheet).generate(config);

    expect(table.data[0][0].value).toBe(40); // primary Cost remains primary
    expect(table.grandTotal).toBe(45);
    expect(table.data[0][0].values).toMatchObject({
      Cost: 40,
      Revenue: 300,
      AverageRevenue: 150,
      Units: 5,
      Profit: 260,
      Margin: 260 / 300,
    });
    expect(table.data[1][0].values).toMatchObject({
      Cost: 5,
      Revenue: 40,
      AverageRevenue: 40,
      Units: 1,
      Profit: 35,
      Margin: 35 / 40,
    });

    const registry = new PivotRegistryImpl();
    const pivotId = registry.register({
      name: 'P1-08AH standalone',
      sourceRange: 'B3:E6',
      worksheetId: 'standalone',
      config,
    });
    const snapshot = transformToPivotSnapshot(pivotId, table, config);
    expect(snapshot.valueFields).toEqual([
      'Cost', 'Revenue', 'AverageRevenue', 'Units', 'Profit', 'Margin',
    ]);
    expect(snapshot.rows[0]).toMatchObject({
      Category: 'North',
      Cost: 40,
      Revenue: 300,
      AverageRevenue: 150,
      Units: 5,
      Profit: 260,
      Margin: 260 / 300,
    });
    const snapshotStore = new PivotSnapshotStore();
    snapshotStore.set(pivotId, snapshot);
    const query = new GetPivotData(registry, snapshotStore, { ensureFresh: () => undefined } as never);
    expect(query.query(pivotId, 'Profit', [{ field: 'Category', value: 'North' }])).toBe(260);
    expect(query.query(pivotId, 'Margin', [{ field: 'Category', value: 'South' }])).toBe(35 / 40);
  });

  test('preserves null aggregates separately from declared-but-unavailable values', () => {
    const sheet = new Worksheet('Empty Aggregate', 10, 6);
    sheet.setCellValue({ row: 1, col: 2 }, 'Group');
    sheet.setCellValue({ row: 1, col: 3 }, 'Present');
    sheet.setCellValue({ row: 1, col: 4 }, 'Empty');
    sheet.setCellValue({ row: 2, col: 2 }, 'A');
    sheet.setCellValue({ row: 2, col: 3 }, 8);

    const emptyConfig: PivotConfig = {
      rows: [{ column: 2, label: 'Group' }],
      columns: [],
      values: [
        { column: 3, aggregation: 'sum', label: 'Present' },
        { column: 4, aggregation: 'sum', label: 'Empty' },
      ],
      sourceRange: { start: { row: 1, col: 2 }, end: { row: 2, col: 4 } },
      calculatedFields: [
        { name: 'EmptyPlusOne', formula: 'Empty + 1' },
        { name: 'UnknownPlusOne', formula: 'Unknown + 1' },
      ],
    };
    const table = new PivotEngine(sheet).generate(emptyConfig);

    expect(table.data[0][0].values?.Empty).toBeNull();
    expect(table.data[0][0].values?.EmptyPlusOne).toBeNull();
    expect(table.data[0][0].values?.UnknownPlusOne).toBeInstanceOf(Error);
    expect((table.data[0][0].values?.UnknownPlusOne as Error).message).toBe('#REF!');
    const snapshot = transformToPivotSnapshot('p1-08ah-null-errors' as never, table, emptyConfig);
    expect(snapshot.rows[0].Empty).toBeNull();
    expect(snapshot.rows[0].UnknownPlusOne).toBeInstanceOf(Error);

    const registry = new PivotRegistryImpl();
    const pivotId = registry.register({
      name: 'P1-08AH null and error results',
      sourceRange: 'B1:D2',
      worksheetId: 'standalone-empty',
      config: emptyConfig,
    });
    const snapshots = new PivotSnapshotStore();
    snapshots.set(pivotId, transformToPivotSnapshot(pivotId, table, emptyConfig));
    const query = new GetPivotData(registry, snapshots, { ensureFresh: () => undefined } as never);
    expect(query.query(pivotId, 'Empty', [{ field: 'Group', value: 'A' }])).toBeNull();
    expect(query.query(pivotId, 'UnknownPlusOne', [{ field: 'Group', value: 'A' }])).toBeInstanceOf(Error);
    expect(query.query(pivotId, 'Missing', [{ field: 'Group', value: 'A' }])).toBe('#REF!');
  });

  test('preserves a named aggregate zero through snapshot lookup and GetPivotData', () => {
    const sheet = new Worksheet('Zero Aggregate', 10, 6);
    sheet.setCellValue({ row: 1, col: 2 }, 'Group');
    sheet.setCellValue({ row: 1, col: 3 }, 'Amount');
    sheet.setCellValue({ row: 1, col: 4 }, 'Units');
    sheet.setCellValue({ row: 2, col: 2 }, 'A');
    sheet.setCellValue({ row: 2, col: 3 }, 0);
    sheet.setCellValue({ row: 2, col: 4 }, 0);
    const zeroConfig: PivotConfig = {
      rows: [{ column: 2, label: 'Group' }],
      columns: [],
      values: [
        { column: 3, aggregation: 'sum', label: 'Amount' },
        { column: 4, aggregation: 'sum', label: 'Units' },
      ],
      sourceRange: { start: { row: 1, col: 2 }, end: { row: 2, col: 4 } },
    };
    const table = new PivotEngine(sheet).generate(zeroConfig);
    expect(table.data[0][0].value).toBe(0);
    expect(table.data[0][0].values?.Amount).toBe(0);
    const registry = new PivotRegistryImpl();
    const pivotId = registry.register({ name: 'P1-08AH zero', sourceRange: 'B1:D2', worksheetId: 'zero', config: zeroConfig });
    const snapshots = new PivotSnapshotStore();
    snapshots.set(pivotId, transformToPivotSnapshot(pivotId, table, zeroConfig));
    const query = new GetPivotData(registry, snapshots, { ensureFresh: () => undefined } as never);
    expect(query.query(pivotId, 'Amount', [{ field: 'Group', value: 'A' }])).toBe(0);
    expect(query.query(pivotId, 'Amount', [{ field: 'Group', value: 'missing' }])).toBe('#N/A');
  });

  test('rejects case-only collisions across aggregate names', () => {
    const sheet = makeWorksheet();
    let caught: unknown;
    try {
      new PivotEngine(sheet).generate({
        rows: [{ column: 2, label: 'Category' }],
        columns: [],
        values: [
          { column: 3, aggregation: 'sum', label: 'Cost' },
          { column: 4, aggregation: 'sum', label: 'cost' },
        ],
        sourceRange: config.sourceRange,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: 'INVALID_FORMULA' });
  });
});
