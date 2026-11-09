import { afterEach, describe, expect, test } from '@jest/globals';
import { PivotEngine, type PivotConfig } from '../src/PivotEngine';
import {
  computeGroupKey,
  extractValue,
  groupStateStore,
  getRelevantColumns,
  hashRowRelevant,
} from '../src/PivotGroupStateStore';
import { Worksheet } from '../src/worksheet';

function setGrid(sheet: Worksheet, startCol: number, rows: Array<Array<string | number>>) {
  rows.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
    sheet.setCellValue({ row: rowIndex + 1, col: startCol + colIndex }, value);
  }));
}

function standardConfig(startCol: number): PivotConfig {
  return {
    rows: [{ column: startCol, label: 'Region' }],
    columns: [],
    values: [{ column: startCol + 2, aggregation: 'sum', label: 'Revenue' }],
    sourceRange: {
      start: { row: 1, col: startCol },
      end: { row: 5, col: startCol + 2 },
    },
  };
}

afterEach(() => groupStateStore.clear());

describe('P1-08V pivot source-coordinate characterization', () => {
  test('range beginning at worksheet column one groups and aggregates by configured worksheet columns', () => {
    const sheet = new Worksheet('A-start', 8, 4);
    setGrid(sheet, 1, [
      ['Region', 'Category', 'Revenue'],
      ['West', 'A', 10],
      ['East', 'A', 20],
      ['West', 'B', 30],
      ['East', 'B', 40],
    ]);

    const result = new PivotEngine(sheet).generate(standardConfig(1));

    expect(result.rowHeaders).toEqual([['West'], ['East']]);
    expect(result.data.flat().map((cell) => cell.value)).toEqual([40, 60]);
    expect(result.grandTotal).toBe(100);
  });

  test('range beginning after column one offsets configured fields from the source start', () => {
    const sheet = new Worksheet('D-start', 8, 6);
    setGrid(sheet, 4, [
      ['Region', 'Category', 'Revenue'],
      ['West', 'A', 10],
      ['East', 'A', 20],
      ['West', 'B', 30],
      ['East', 'B', 40],
    ]);
    const config = standardConfig(4);
    config.sourceRange.end.col = 6;

    const result = new PivotEngine(sheet).generate(config);

    expect(result.rowHeaders).toEqual([['West'], ['East']]);
    expect(result.data.flat().map((cell) => cell.value)).toEqual([40, 60]);
    expect(result.grandTotal).toBe(100);
  });

  test('reordered source fields retain worksheet-column identity for dimensions and values', () => {
    const sheet = new Worksheet('reordered', 8, 4);
    setGrid(sheet, 1, [
      ['Category', 'Revenue', 'Region'],
      ['A', 10, 'West'],
      ['A', 20, 'East'],
      ['B', 30, 'West'],
      ['B', 40, 'East'],
    ]);
    const config: PivotConfig = {
      rows: [{ column: 3, label: 'Region' }],
      columns: [],
      values: [{ column: 2, aggregation: 'sum', label: 'Revenue' }],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
    };

    const result = new PivotEngine(sheet).generate(config);

    expect(result.rowHeaders).toEqual([['West'], ['East']]);
    expect(result.data.flat().map((cell) => cell.value)).toEqual([40, 60]);
    expect(result.grandTotal).toBe(100);
  });

  test('incremental group-state mapping resolves dimensions, hashes, and multiple aggregates relatively', () => {
    const sheet = new Worksheet('group-state', 4, 7);
    const config: PivotConfig = {
      rows: [{ column: 4, label: 'Region' }],
      columns: [],
      values: [
        { column: 6, aggregation: 'sum', label: 'Revenue' },
        { column: 7, aggregation: 'sum', label: 'Cost' },
      ],
      sourceRange: { start: { row: 1, col: 4 }, end: { row: 3, col: 7 } },
    };
    const sourceRows = [
      ['Region', 'Category', 'Revenue', 'Cost'],
      ['West', 'A', 10, 3],
      ['East', 'A', 20, 5],
    ] as Array<Array<string | number>>;
    const id = 'p1-08v-coordinate-state' as import('../src/PivotRegistry').PivotId;

    expect(getRelevantColumns(config)).toEqual([4, 6, 7]);
    expect(hashRowRelevant(sourceRows[1], [0, 2, 3])).not.toBe(hashRowRelevant(sourceRows[2], [0, 2, 3]));
    expect(computeGroupKey(sourceRows[1], config)).toBe('string:West');
    expect(extractValue(sourceRows[1], config.values[0] as import('../src/PivotEngine').AggregateValueSpec, config.sourceRange.start.col)).toBe(10);
    new PivotEngine(sheet).populateGroupState(id, config, sourceRows);
    const state = groupStateStore.get(id)!;
    expect([...state.groups.keys()]).toEqual(['string:West', 'string:East']);
    expect(state.groups.get('string:West')!.rowCount).toBe(1);
    expect(state.groups.get('string:West')!.values.Revenue.get()).toBe(10);
    expect(state.groups.get('string:West')!.values.Cost.get()).toBe(3);
    expect(state.groups.get('string:East')!.values.Revenue.get()).toBe(20);
    expect(state.groups.get('string:East')!.values.Cost.get()).toBe(5);
  });

  test('row and column dimensions combine with a slicer and preserve totals', () => {
    const sheet = new Worksheet('row-column-slicer', 8, 4);
    setGrid(sheet, 1, [
      ['Region', 'Category', 'Revenue'],
      ['West', 'A', 10],
      ['West', 'B', 30],
      ['East', 'A', 20],
      ['East', 'B', 40],
    ]);
    const config: PivotConfig = {
      rows: [{ column: 1, label: 'Region' }],
      columns: [{ column: 2, label: 'Category' }],
      values: [{ column: 3, aggregation: 'sum', label: 'Revenue' }],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
      slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } },
    };

    const result = new PivotEngine(sheet).generate(config);

    expect(result.rowHeaders).toEqual([['West']]);
    expect(result.columnHeaders).toEqual([['A'], ['B']]);
    expect(result.data[0].map((cell) => cell.value)).toEqual([10, 30]);
    expect(result.grandTotal).toBe(40);
  });

  test('separate numeric aggregate configurations resolve each source column correctly', () => {
    const sheet = new Worksheet('multiple-values', 8, 4);
    setGrid(sheet, 1, [
      ['Region', 'Revenue', 'Cost'],
      ['West', 10, 3],
      ['East', 20, 5],
      ['West', 30, 7],
      ['East', 40, 11],
    ]);
    const base = {
      rows: [{ column: 1, label: 'Region' }],
      columns: [],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
    };

    const revenue = new PivotEngine(sheet).generate({
      ...base,
      values: [{ column: 2, aggregation: 'sum', label: 'Revenue' }],
    });
    const cost = new PivotEngine(sheet).generate({
      ...base,
      values: [{ column: 3, aggregation: 'sum', label: 'Cost' }],
    });

    expect(revenue.data.flat().map((cell) => cell.value)).toEqual([40, 60]);
    expect(cost.data.flat().map((cell) => cell.value)).toEqual([10, 16]);
    expect(revenue.grandTotal).toBe(100);
    expect(cost.grandTotal).toBe(26);
    expect(revenue.rowHeaders).toEqual(cost.rowHeaders);
    expect(revenue.data).toHaveLength(cost.data.length);
  });
});
