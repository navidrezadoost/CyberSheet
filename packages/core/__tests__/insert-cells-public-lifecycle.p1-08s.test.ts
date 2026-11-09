import { describe, expect, test } from '@jest/globals';
import { InsertCellsCommand } from '../src/InsertCellsCommand';
import { Worksheet } from '../src/worksheet';

function makeSheet() {
  const sheet = new Worksheet('InsertCells', 4, 4);
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 4; col++) {
      sheet.setCellValue({ row, col }, `${row}:${col}`);
    }
  }
  return sheet;
}

describe('P1-08S standalone InsertCells command lifecycle', () => {
  test.each([
    ['down', { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } }, { row: 3, col: 2 }, '2:2'],
    ['right', { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } }, { row: 2, col: 3 }, '2:2'],
    ['row', { start: { row: 2, col: 1 }, end: { row: 2, col: 4 } }, { row: 3, col: 2 }, '2:2'],
    ['column', { start: { row: 1, col: 2 }, end: { row: 4, col: 2 } }, { row: 2, col: 3 }, '2:2'],
  ] as const)('%s shifts source cells and undo restores the standalone matrix', (mode, range, shiftedAddress, shiftedValue) => {
    const sheet = makeSheet();
    const before = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => sheet.getCellValue({ row: r + 1, col: c + 1 })));
    const command = new InsertCellsCommand(sheet, range, mode);

    command.execute();
    expect(sheet.getCellValue(range.start)).toBeNull();
    expect(sheet.getCellValue(shiftedAddress)).toBe(shiftedValue);
    command.undo();
    expect(Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => sheet.getCellValue({ row: r + 1, col: c + 1 })))).toEqual(before);
  });
});
