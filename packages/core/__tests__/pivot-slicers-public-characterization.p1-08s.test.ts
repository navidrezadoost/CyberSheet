import { describe, expect, test } from '@jest/globals';
import { Worksheet } from '../src/worksheet';
import { PivotEngine, type PivotConfig } from '../src/PivotEngine';

function fixture() {
  const worksheet = new Worksheet('Standalone', 20, 5);
  const rows: Array<[string, string, number]> = [
    ['West', 'A', 1000], ['West', 'B', 1500], ['East', 'A', 800],
    ['East', 'B', 1200], ['North', 'A', 900], ['North', 'B', 1100],
  ];
  [['Region', 'Category', 'Revenue'], ...rows].forEach((row, r) => row.forEach((value, c) => {
    worksheet.setCellValue({ row: r + 1, col: c + 1 }, value as string | number);
  }));
  const config: PivotConfig = {
    rows: [{ column: 1, label: 'Region' }],
    columns: [{ column: 2, label: 'Category' }],
    values: [{ column: 3, aggregation: 'sum', label: 'Revenue' }],
    sourceRange: { start: { row: 1, col: 1 }, end: { row: 7, col: 3 } },
  };
  return { worksheet, config, engine: new PivotEngine(worksheet) };
}

describe('P1-08S standalone public slicer query behavior', () => {
  test('standalone slicer queries filter by the configured field label', () => {
    const { engine, config } = fixture();
    const include = engine.generate({ ...config, slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' } } });
    expect(include.rowHeaders).toEqual([['West']]);
    expect(include.columnHeaders).toEqual([['A'], ['B']]);

    const exclude = engine.generate({ ...config, slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'exclude' } } });
    expect(exclude.rowHeaders).toEqual([['East'], ['North']]);
    expect(exclude.columnHeaders).toEqual([['A'], ['B']]);

    const empty = engine.generate({ ...config, slicers: { region: { field: 'Region', selectedValues: [], mode: 'include' } } });
    expect(empty.rowHeaders).toEqual([['West'], ['East'], ['North']]);
    expect(engine.generate(config).rowHeaders).toEqual([['West'], ['East'], ['North']]);
  });

  test('slicers compose on their named fields', () => {
    const { engine, config } = fixture();
    const intersection = engine.generate({ ...config, slicers: {
      region: { field: 'Region', selectedValues: ['West'], mode: 'include' },
      category: { field: 'Category', selectedValues: ['A'], mode: 'include' },
    } });
    expect(intersection.rowHeaders).toEqual([['West']]);
    expect(intersection.columnHeaders).toEqual([['A']]);

    const none = engine.generate({ ...config, slicers: {
      one: { field: 'Region', selectedValues: ['West'], mode: 'include' },
      two: { field: 'Region', selectedValues: ['East'], mode: 'include' },
    } });
    expect(none.data).toHaveLength(0);
  });

  test('records pivot data cardinality relative to category headers', () => {
    const { engine, config } = fixture();
    const pivot = engine.generate({ ...config, columns: [] });
    expect(pivot.rowHeaders).toEqual([['West'], ['East'], ['North']]);
    expect(pivot.data).toHaveLength(3);
    // In this public result shape, category labels are separate from data rows.
    // This fixture does not reproduce the historical three-row mismatch.
  });

  test('multiple values, missing values, nulls, determinism, and insertion order are characterized', () => {
    const { worksheet, engine, config } = fixture();
    const multi = engine.generate({ ...config, slicers: { region: { field: 'Region', selectedValues: ['West', 'East'], mode: 'include' } } });
    expect(multi.rowHeaders).toEqual([['West'], ['East']]);
    const missing = engine.generate({ ...config, slicers: { region: { field: 'Region', selectedValues: ['No such region'], mode: 'include' } } });
    expect(missing.data).toHaveLength(0);

    worksheet.setCellValue({ row: 8, col: 1 }, null);
    worksheet.setCellValue({ row: 8, col: 2 }, 'A');
    worksheet.setCellValue({ row: 8, col: 3 }, 500);
    const withNull = { ...config, sourceRange: { ...config.sourceRange, end: { row: 8, col: 3 } }, slicers: { region: { field: 'Region', selectedValues: [null], mode: 'include' as const } } };
    expect(engine.generate(withNull).rowHeaders).toEqual([['']]);

    const one = { ...config, slicers: { region: { field: 'Region', selectedValues: ['West'], mode: 'include' as const } } };
    const reordered = { ...config, slicers: { category: { field: 'Category', selectedValues: ['A'], mode: 'include' as const }, region: { field: 'Region', selectedValues: ['West'], mode: 'include' as const } } };
    expect(Array.from({ length: 5 }, () => engine.generate(one).rowHeaders.length)).toEqual([1, 1, 1, 1, 1]);
    expect(engine.generate(reordered).rowHeaders).toEqual([['West']]);
    expect(engine.generate(reordered)).toEqual(engine.generate({ ...config, slicers: {
      region: { field: 'Region', selectedValues: ['West'], mode: 'include' },
      category: { field: 'Category', selectedValues: ['A'], mode: 'include' },
    } }));
  });
});
