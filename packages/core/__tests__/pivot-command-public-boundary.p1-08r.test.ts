import { describe, expect, test } from '@jest/globals';
import { InsertCellsCommand } from '../src/InsertCellsCommand';
import { PivotEngine } from '../src/PivotEngine';
import { Worksheet } from '../src/worksheet';

describe('P1-08R Core public pivot and insertion boundaries', () => {
  test.each([
    ['down', { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } }],
    ['right', { start: { row: 1, col: 2 }, end: { row: 1, col: 2 } }],
    ['row', { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } }],
    ['column', { start: { row: 1, col: 2 }, end: { row: 1, col: 2 } }],
  ] as const)('InsertCellsCommand %s snapshot, copy, clear, and undo path', (mode, range) => {
    const worksheet = new Worksheet('Standalone', 4, 4);
    for (let row = 1; row <= 4; row++) {
      for (let col = 1; col <= 4; col++) worksheet.setCellValue({ row, col }, `${row}:${col}`);
    }
    const before = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => worksheet.getCellValue({ row: r + 1, col: c + 1 })),
    );
    const command = new InsertCellsCommand(worksheet, range, mode);

    command.execute();
    if (mode === 'down' || mode === 'row') expect(worksheet.getCellValue({ row: 2, col: 1 })).toBeNull();
    if (mode === 'right' || mode === 'column') expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
    command.undo();
    const after = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => worksheet.getCellValue({ row: r + 1, col: c + 1 })),
    );
    expect(after).toEqual(before);
  });

  test('PivotEngine generates standalone aggregates and writes its observed output rows', () => {
    const worksheet = new Worksheet('Standalone', 8, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'Region');
    worksheet.setCellValue({ row: 1, col: 2 }, 'Sales');
    worksheet.setCellValue({ row: 2, col: 1 }, 'East');
    worksheet.setCellValue({ row: 2, col: 2 }, 4);
    worksheet.setCellValue({ row: 3, col: 1 }, 'East');
    worksheet.setCellValue({ row: 3, col: 2 }, 6);
    worksheet.setCellValue({ row: 4, col: 1 }, 'West');
    worksheet.setCellValue({ row: 4, col: 2 }, 5);
    const engine = new PivotEngine(worksheet);
    const pivot = engine.generate({
      rows: [{ column: 1, label: 'Region' }],
      columns: [],
      values: [{ column: 2, aggregation: 'sum', label: 'Sales' }],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 4, col: 2 } },
    });
    expect(pivot.data.map((row) => row[0]?.value)).toEqual([10, 5]);

    engine.writeTo(worksheet, pivot, { row: 6, col: 1 });
    // Current direct writer observation: this fixture appears one row below the supplied row.
    expect(worksheet.getCellValue({ row: 6, col: 1 })).toBeNull();
    expect(worksheet.getCellValue({ row: 7, col: 1 })).toBe('East');
    expect(worksheet.getCellValue({ row: 7, col: 2 })).toBe(10);
    expect(worksheet.getCellValue({ row: 8, col: 1 })).toBe('West');
    expect(worksheet.getCellValue({ row: 8, col: 2 })).toBe(5);
  });
});
