import { describe, expect, test } from '@jest/globals';
import { Worksheet } from '../src/worksheet';
import { PivotEngine, type PivotConfig } from '../src/PivotEngine';

function sheetWithColumns(columns: string[], values: Array<Array<string | number>>) {
  const worksheet = new Worksheet('Slicer-index', 20, columns.length);
  [columns, ...values].forEach((row, r) => row.forEach((value, c) => {
    worksheet.setCellValue({ row: r + 1, col: c + 1 }, value);
  }));
  return worksheet;
}

function config(): PivotConfig {
  return {
    rows: [{ column: 1, label: 'Region' }],
    columns: [],
    values: [{ column: 3, aggregation: 'sum', label: 'Revenue' }],
    sourceRange: { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
  };
}

describe('P1-08T standalone PivotEngine slicer field indexing', () => {
  test('Region and Category slicers read their own one-based source columns', () => {
    const sheet = sheetWithColumns(
      ['Region', 'Category', 'Revenue'],
      [['West', 'A', 10], ['East', 'A', 20], ['West', 'B', 30], ['East', 'B', 40]],
    );
    const engine = new PivotEngine(sheet);
    const base = config();

    const west = engine.generate({ ...base, slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } } });
    expect(west.rowHeaders).toEqual([['West']]);
    expect(west.data.flat().map((cell) => cell.value)).toEqual([40]);

    const categoryConfig: PivotConfig = {
      ...base,
      rows: [],
      columns: [{ column: 2, label: 'Category' }],
    };
    const categoryA = engine.generate({ ...categoryConfig, slicers: { category: { field: 'Category', selectedValues: ['A'], mode: 'include' } } });
    expect(categoryA.columnHeaders).toEqual([['A']]);
    expect(categoryA.data.flat().map((cell) => cell.value)).toEqual([30]);
  });

  test('source column order does not redirect a Region slicer to the adjacent value field', () => {
    const sheet = sheetWithColumns(
      ['Category', 'Region', 'Revenue'],
      [['A', 'West', 10], ['A', 'East', 20], ['B', 'West', 30], ['B', 'East', 40]],
    );
    const engine = new PivotEngine(sheet);
    const reordered: PivotConfig = {
      rows: [{ column: 2, label: 'Region' }],
      columns: [],
      values: [{ column: 3, aggregation: 'sum', label: 'Revenue' }],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
    };

    const west = engine.generate({ ...reordered, slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } } });
    expect(west.rowHeaders).toEqual([['West']]);
    expect(west.data.flat().map((cell) => cell.value)).toEqual([40]);
  });

  test('field coordinates are resolved relative to a source range that starts after column one', () => {
    const sheet = sheetWithColumns(
      ['unused', 'Region', 'Category', 'Revenue'],
      [['x', 'West', 'A', 10], ['x', 'East', 'A', 20], ['x', 'West', 'B', 30], ['x', 'East', 'B', 40]],
    );
    const subset: PivotConfig = {
      rows: [{ column: 2, label: 'Region' }],
      columns: [],
      values: [{ column: 4, aggregation: 'sum', label: 'Revenue' }],
      sourceRange: { start: { row: 1, col: 2 }, end: { row: 5, col: 4 } },
    };
    const result = new PivotEngine(sheet).generate({
      ...subset,
      slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } },
    });
    expect(result.rowHeaders).toEqual([['West']]);
    expect(result.data.flat().map((cell) => cell.value)).toEqual([40]);
  });

  test('unknown slicer labels retain the existing ignored-field behavior', () => {
    const sheet = sheetWithColumns(
      ['Region', 'Category', 'Revenue'],
      [['West', 'A', 10], ['East', 'A', 20], ['West', 'B', 30], ['East', 'B', 40]],
    );
    const engine = new PivotEngine(sheet);
    const base = config();

    const withoutSlicer = engine.generate(base);
    const unknown = engine.generate({ ...base, slicers: { unknown: { field: 'Missing', selectedValues: ['x'], mode: 'include' } } });
    expect(unknown).toEqual(withoutSlicer);
  });

  test('an out-of-range configured slicer field follows the existing empty-match behavior without throwing', () => {
    const sheet = sheetWithColumns(
      ['Region', 'Category', 'Revenue'],
      [['West', 'A', 10], ['East', 'A', 20]],
    );
    const outOfRange: PivotConfig = {
      ...config(),
      rows: [{ column: 99, label: 'Region' }],
    };
    expect(() => new PivotEngine(sheet).generate({
      ...outOfRange,
      slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } },
    })).not.toThrow();
    expect(new PivotEngine(sheet).generate({
      ...outOfRange,
      slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } },
    }).data).toEqual([]);
  });

  test('non-slicer aggregation output remains unchanged', () => {
    const sheet = sheetWithColumns(
      ['Region', 'Category', 'Revenue'],
      [['West', 'A', 10], ['East', 'A', 20], ['West', 'B', 30], ['East', 'B', 40]],
    );
    const result = new PivotEngine(sheet).generate(config());

    expect(result.rowHeaders).toEqual([['West'], ['East']]);
    expect(result.data.flat().map((cell) => cell.value)).toEqual([40, 60]);
  });
});
