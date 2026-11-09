import { CommandManager } from '../src/CommandManager';
import { DeleteCellsCommand, type DeleteCellsMode } from '../src/DeleteCellsCommand';
import { Worksheet } from '../src/worksheet';

const validRange = {
  start: { row: 2, col: 2 },
  end: { row: 3, col: 3 },
};

const invalidRanges = [
  ['row start below one', { start: { row: 0, col: 1 }, end: { row: 1, col: 1 } }],
  ['column start below one', { start: { row: 1, col: 0 }, end: { row: 1, col: 1 } }],
  ['row end outside dimensions', { start: { row: 1, col: 1 }, end: { row: 6, col: 1 } }],
  ['column end outside dimensions', { start: { row: 1, col: 1 }, end: { row: 1, col: 6 } }],
  ['reversed row start outside dimensions', { start: { row: 6, col: 1 }, end: { row: 1, col: 1 } }],
  ['reversed column start outside dimensions', { start: { row: 1, col: 6 }, end: { row: 1, col: 1 } }],
  ['oversized row span', { start: { row: 1, col: 1 }, end: { row: 6, col: 5 } }],
  ['oversized column span', { start: { row: 1, col: 1 }, end: { row: 5, col: 6 } }],
] as const;

const modes: DeleteCellsMode[] = ['up', 'left', 'row', 'column'];

function makeWorksheet(): Worksheet {
  const worksheet = new Worksheet('J01 deletion bounds', 5, 5);
  for (let row = 1; row <= 5; row++) {
    for (let col = 1; col <= 5; col++) {
      worksheet.setCellValue({ row, col }, row * 10 + col);
    }
  }
  worksheet.setCellStyle({ row: 5, col: 5 }, { italic: true, color: '#345678' });
  return worksheet;
}

function snapshot(worksheet: Worksheet) {
  const cells = [];
  for (let row = 1; row <= worksheet.rowCount; row++) {
    for (let col = 1; col <= worksheet.colCount; col++) {
      const cell = worksheet.getCell({ row, col });
      cells.push({ row, col, value: cell?.value, formula: cell?.formula, style: cell?.style });
    }
  }
  return cells;
}

describe('P1-08J.01 DeleteCellsCommand range boundary', () => {
  test.each(modes.flatMap((mode) => invalidRanges.map(([label, range]) => ({ mode, label, range }))))(
    '$mode rejects $label before mutation and events',
    ({ mode, range }) => {
      const worksheet = makeWorksheet();
      const before = snapshot(worksheet);
      const events: string[] = [];
      worksheet.on((event) => events.push(event.type));
      const manager = new CommandManager();

      expect(() => manager.execute(new DeleteCellsCommand(worksheet, range, mode))).toThrow(RangeError);
      expect(snapshot(worksheet)).toEqual(before);
      expect(events).toEqual([]);
      expect(manager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 0 });
    },
  );

  test.each(modes.flatMap((mode) => [
    { mode, label: 'reversed row endpoints', range: { start: { row: 3, col: 2 }, end: { row: 2, col: 3 } }, normalized: { start: { row: 2, col: 2 }, end: { row: 3, col: 3 } } },
    { mode, label: 'reversed column endpoints', range: { start: { row: 2, col: 3 }, end: { row: 3, col: 2 } }, normalized: { start: { row: 2, col: 2 }, end: { row: 3, col: 3 } } },
  ]))('$mode normalizes $label within worksheet bounds', ({ mode, range, normalized }) => {
    const reversedWorksheet = makeWorksheet();
    const normalizedWorksheet = makeWorksheet();
    new DeleteCellsCommand(reversedWorksheet, range, mode).execute();
    new DeleteCellsCommand(normalizedWorksheet, normalized, mode).execute();
    expect(snapshot(reversedWorksheet)).toEqual(snapshot(normalizedWorksheet));
  });

  test.each(modes)('%s rejection preserves existing undo and redo history', (mode) => {
    const worksheet = makeWorksheet();
    const manager = new CommandManager();
    manager.execute(new DeleteCellsCommand(worksheet, validRange, mode));
    expect(manager.undo()).toBe(true);
    const historyBefore = manager.getHistorySize();
    const worksheetBefore = snapshot(worksheet);

    expect(() => manager.execute(new DeleteCellsCommand(
      worksheet,
      { start: { row: 99, col: 1 }, end: { row: 99, col: 5 } },
      mode,
    ))).toThrow(RangeError);
    expect(manager.getHistorySize()).toEqual(historyBefore);
    expect(snapshot(worksheet)).toEqual(worksheetBefore);
    expect(manager.redo()).toBe(true);
    expect(manager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
  });
});
