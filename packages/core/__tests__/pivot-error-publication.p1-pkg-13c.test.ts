import { describe, expect, test } from '@jest/globals';
import { GetPivotData } from '../src/GetPivotData';
import type { PivotTable, PivotConfig } from '../src/PivotEngine';
import { PivotRegistryImpl } from '../src/PivotRegistry';
import { PivotSnapshotStore } from '../src/PivotSnapshotStore';
import { transformToPivotSnapshot } from '../src/PivotSnapshotTransformer';

describe('PKG-13C standalone Pivot Error publication', () => {
  test('transform, store, and GetPivotData preserve the same Error instance and native fields', () => {
    const errorValue = new RangeError('#NUM!');
    errorValue.name = 'PivotCalculationRangeError';
    const config: PivotConfig = {
      rows: [{ column: 1, label: 'Group' }],
      columns: [],
      values: [{ type: 'aggregate', column: 2, aggregation: 'sum', label: 'Amount' }],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
    };
    const table: PivotTable = {
      rowHeaders: [['A']],
      columnHeaders: [],
      data: [[{
        value: null,
        values: { Amount: errorValue },
        rowKeys: ['A'],
        colKeys: [],
        aggregation: 'sum',
      }]],
    };
    const registry = new PivotRegistryImpl();
    const pivotId = registry.register({
      name: 'standalone Error publication',
      sourceRange: 'A1:B2',
      worksheetId: 'standalone',
      config,
    });
    const snapshot = transformToPivotSnapshot(pivotId, table, config);
    const store = new PivotSnapshotStore();

    store.set(pivotId, snapshot);
    const query = new GetPivotData(registry, store, { ensureFresh: () => undefined });
    const result = query.query(pivotId, 'Amount', [{ field: 'Group', value: 'A' }]);

    expect(snapshot.rows[0].Amount).toBe(errorValue);
    expect(store.get(pivotId)?.rows[0].Amount).toBe(errorValue);
    expect(result).toBe(errorValue);
    expect((result as Error).name).toBe('PivotCalculationRangeError');
    expect((result as Error).message).toBe('#NUM!');
    expect(errorValue).toBeInstanceOf(RangeError);
  });
});
