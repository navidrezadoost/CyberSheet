import { CommandManager } from '../src/CommandManager';
import { DeleteCellsCommand } from '../src/DeleteCellsCommand';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

type CapturedCell = {
  address: Address;
  value: unknown;
  formula?: string;
  style?: unknown;
};

function makeWorksheet(): Worksheet {
  const worksheet = new Worksheet('H02 deletion', 5, 5);
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 4; col++) {
      worksheet.setCellValue({ row, col }, row * 10 + col);
    }
  }
  worksheet.setCellFormula({ row: 3, col: 3 }, '=A1+1', 33);
  worksheet.setCellStyle({ row: 4, col: 4 }, { italic: true, color: '#345678' });
  return worksheet;
}

function capture(worksheet: Worksheet): CapturedCell[] {
  const cells: CapturedCell[] = [];
  for (let row = 1; row <= 5; row++) {
    for (let col = 1; col <= 5; col++) {
      const address = { row, col };
      const cell = worksheet.getCell(address);
      cells.push({ address, value: cell?.value ?? null, formula: cell?.formula, style: cell?.style });
    }
  }
  return cells;
}

function applyDirectRowDelete(worksheet: Worksheet): void {
  for (let row = 2; row < worksheet.rowCount; row++) {
    for (let col = 1; col <= worksheet.colCount; col++) {
      const source = worksheet.getCell({ row: row + 1, col });
      const target = { row, col };
      worksheet.setCellValue(target, source?.value ?? null);
      worksheet.setCellFormula(target, source?.formula ?? '');
      worksheet.setCellStyle(target, source?.style);
    }
  }
  for (let col = 1; col <= worksheet.colCount; col++) {
    const address = { row: worksheet.rowCount, col };
    worksheet.setCellValue(address, null);
    worksheet.setCellFormula(address, '');
    worksheet.setCellStyle(address, undefined);
  }
}

function applyDirectColumnDelete(worksheet: Worksheet): void {
  for (let col = 2; col < worksheet.colCount; col++) {
    for (let row = 1; row <= worksheet.rowCount; row++) {
      const source = worksheet.getCell({ row, col: col + 1 });
      const target = { row, col };
      worksheet.setCellValue(target, source?.value ?? null);
      worksheet.setCellFormula(target, source?.formula ?? '');
      worksheet.setCellStyle(target, source?.style);
    }
  }
  for (let row = 1; row <= worksheet.rowCount; row++) {
    const address = { row, col: worksheet.colCount };
    worksheet.setCellValue(address, null);
    worksheet.setCellFormula(address, '');
    worksheet.setCellStyle(address, undefined);
  }
}

function restoreDirectSnapshot(worksheet: Worksheet, snapshot: CapturedCell[]): void {
  for (const cell of snapshot) {
    worksheet.restoreCellContent(cell.address, {
      value: cell.value as any,
      formula: cell.formula,
    });
    worksheet.setCellStyle(cell.address, cell.style as any);
  }
}

describe('P1-08H.02 row deletion undo characterization', () => {
  test('compares direct Worksheet writes with command execute, undo, and redo including state and events', () => {
    const direct = makeWorksheet();
    const commanded = makeWorksheet();
    const directBefore = capture(direct);
    const commandBefore = capture(commanded);
    expect(commandBefore).toEqual(directBefore);
    expect(direct.isWorkbookOwned()).toBe(false);
    expect(commanded.isWorkbookOwned()).toBe(false);

    const directEvents: string[] = [];
    const commandEvents: string[] = [];
    direct.on((event) => directEvents.push(event.type));
    commanded.on((event) => commandEvents.push(event.type));
    applyDirectRowDelete(direct);

    const manager = new CommandManager();
    manager.execute(new DeleteCellsCommand(
      commanded,
      { start: { row: 2, col: 1 }, end: { row: 2, col: 5 } },
      'row',
    ));
    expect(capture(commanded)).toEqual(capture(direct));
    expect(commanded.getCellValue({ row: 2, col: 3 })).toBe(33);
    expect(commanded.getCell({ row: 2, col: 3 })?.formula).toBe('=A1+1');
    expect(commanded.getCellValue({ row: 3, col: 3 })).toBe(43);
    expect(commandEvents).toContain('cell-changed');

    restoreDirectSnapshot(direct, directBefore);
    manager.undo();
    const directAfterUndo = capture(direct);
    const commandAfterUndo = capture(commanded);
    expect(directAfterUndo).toEqual(directBefore);
    expect(commandAfterUndo).not.toEqual(commandBefore);
    expect(commandAfterUndo.map(({ style }) => style)).toEqual(
      commandBefore.map(({ style }) => style),
    );
    expect(commanded.getCell({ row: 3, col: 3 })?.formula).toBe('=A1+1');
    expect(commanded.getCellValue({ row: 3, col: 3 })).toBe(43);
    expect(commanded.getCell({ row: 3, col: 4 })?.style).toBeUndefined();
    expect(commandBefore.find(({ address }) => address.row === 3 && address.col === 4)?.style).toBeUndefined();
    expect(commandEvents).toContain('style-changed');

    applyDirectRowDelete(direct);
    manager.redo();
    const directAfterRedo = capture(direct);
    const commandAfterRedo = capture(commanded);
    expect(commandAfterRedo).not.toEqual(directAfterRedo);
    expect(commandAfterRedo.map(({ style }) => style)).toEqual(
      directAfterRedo.map(({ style }) => style),
    );
    expect(commanded.getCell({ row: 2, col: 3 })?.formula).toBe('=A1+1');
    expect(commanded.getCellValue({ row: 2, col: 3 })).toBe(43);
    expect(commanded.getCell({ row: 3, col: 4 })?.style).toEqual(
      commandBefore.find(({ address }) => address.row === 4 && address.col === 4)?.style,
    );
    expect(direct.getCellValue({ row: 2, col: 3 })).toBe(33);
    expect(direct.getCell({ row: 2, col: 4 })?.style).toBeUndefined();
    expect(commanded.isWorkbookOwned()).toBe(false);
    expect(directEvents).toContain('cell-changed');
    expect(commandEvents.filter((type) => type === 'cell-changed').length).toBeGreaterThan(1);
  });

  test('column deletion separately captures formula cache, style, events, and redo state', () => {
    const direct = makeWorksheet();
    const commanded = makeWorksheet();
    const before = capture(commanded);
    const directEvents: string[] = [];
    const commandEvents: string[] = [];
    direct.on((event) => directEvents.push(event.type));
    commanded.on((event) => commandEvents.push(event.type));
    expect(direct.isWorkbookOwned()).toBe(false);
    expect(commanded.isWorkbookOwned()).toBe(false);

    applyDirectColumnDelete(direct);
    const manager = new CommandManager();
    manager.execute(new DeleteCellsCommand(
      commanded,
      { start: { row: 1, col: 2 }, end: { row: 5, col: 2 } },
      'column',
    ));
    expect(capture(commanded)).toEqual(capture(direct));
    expect(commanded.getCell({ row: 3, col: 2 })?.formula).toBe('=A1+1');
    expect(commanded.getCellValue({ row: 3, col: 2 })).toBe(33);
    expect(commandEvents).toContain('cell-changed');

    restoreDirectSnapshot(direct, before);
    manager.undo();
    expect(capture(direct)).toEqual(before);
    expect(capture(commanded).map(({ style }) => style)).toEqual(
      before.map(({ style }) => style),
    );
    expect(commanded.getCell({ row: 3, col: 3 })?.formula).toBe('=A1+1');
    expect(commanded.getCellValue({ row: 3, col: 3 })).toBe(34);
    expect(commanded.getCell({ row: 4, col: 3 })?.style).toBeUndefined();
    expect(before.find(({ address }) => address.row === 4 && address.col === 3)?.style).toBeUndefined();

    applyDirectColumnDelete(direct);
    manager.redo();
    expect(capture(commanded)).not.toEqual(capture(direct));
    expect(capture(commanded).map(({ style }) => style)).toEqual(
      capture(direct).map(({ style }) => style),
    );
    expect(commanded.isWorkbookOwned()).toBe(false);
    expect(directEvents).toContain('cell-changed');
    expect(commandEvents.filter((type) => type === 'cell-changed').length).toBeGreaterThan(1);
  });

  test('row and column execute/undo/redo expose ordered cell and style events', () => {
    for (const scenario of [
      { mode: 'row' as const, range: { start: { row: 2, col: 1 }, end: { row: 2, col: 5 } } },
      { mode: 'column' as const, range: { start: { row: 1, col: 2 }, end: { row: 5, col: 2 } } },
    ]) {
      const worksheet = makeWorksheet();
      const events: Array<{ type: string; address?: Address }> = [];
      const eventSnapshots: CapturedCell[][] = [];
      worksheet.on((event) => {
        events.push({ type: event.type, address: 'address' in event ? event.address : undefined });
        if (event.type === 'cell-changed' || event.type === 'style-changed') {
          eventSnapshots.push(capture(worksheet));
        }
      });
      const manager = new CommandManager();
      manager.execute(new DeleteCellsCommand(worksheet, scenario.range, scenario.mode));
      const executeEventCount = events.length;
      const finalDelete = capture(worksheet);
      manager.undo();
      const undoEventCount = events.length - executeEventCount;
      const finalUndo = capture(worksheet);
      manager.redo();

      expect(executeEventCount).toBe(52);
      expect(undoEventCount).toBe(40);
      expect(events.length - executeEventCount - undoEventCount).toBe(52);
      expect(events.slice(0, executeEventCount).some((event, index, list) =>
        index > 0 && event.type === list[index - 1].type,
      )).toBe(true);
      expect(eventSnapshots.some((snapshot) =>
        JSON.stringify(snapshot) !== JSON.stringify(finalDelete) &&
        JSON.stringify(snapshot) !== JSON.stringify(finalUndo),
      )).toBe(true);
      const afterRedo = capture(worksheet);
      expect(afterRedo.map(({ style }) => style)).toEqual(
        finalDelete.map(({ style }) => style),
      );
      expect(worksheet.isWorkbookOwned()).toBe(false);
    }
  });

  test('an out-of-sheet row request is rejected before changing cells or emitting events', () => {
    const worksheet = makeWorksheet();
    const before = capture(worksheet);
    const events: string[] = [];
    worksheet.on((event) => events.push(event.type));
    const manager = new CommandManager();
    expect(() => manager.execute(new DeleteCellsCommand(
      worksheet,
      { start: { row: 99, col: 1 }, end: { row: 99, col: 5 } },
      'row',
    ))).toThrow(RangeError);
    const after = capture(worksheet);
    expect(after).toEqual(before);
    expect(events).toEqual([]);
    expect(manager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 0 });
  });
});
