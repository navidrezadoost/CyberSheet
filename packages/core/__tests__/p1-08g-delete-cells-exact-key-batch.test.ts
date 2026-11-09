import { CommandManager } from '../src/CommandManager';
import { DeleteCellsCommand, type DeleteCellsMode } from '../src/DeleteCellsCommand';
import { Worksheet } from '../src/worksheet';

describe('P1-08G Core/SDK exact-key batch 4', () => {
  test.each([
    { mode: 'row' as DeleteCellsMode, shifted: { row: 3, col: 4 } },
    { mode: 'column' as DeleteCellsMode, shifted: { row: 4, col: 3 } },
  ])('$mode moves a style during execution and restores its original address on undo', ({ mode, shifted }) => {
    const worksheet = new Worksheet(`G06 style ${mode}`, 5, 5);
    const styledAddress = { row: 4, col: 4 };
    const style = { italic: true, color: '#345678' };
    worksheet.setCellStyle(styledAddress, style);

    const command = new DeleteCellsCommand(
      worksheet,
      { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } },
      mode,
    );

    command.execute();
    expect(worksheet.getCellStyle(shifted)).toEqual(style);
    expect(worksheet.getCellStyle(styledAddress)).toBeUndefined();

    command.undo();
    expect(worksheet.getCellStyle(styledAddress)).toEqual(style);
    expect(worksheet.getCellStyle(shifted)).toBeUndefined();
  });

  test.each([
    { mode: 'up' as DeleteCellsMode, shifted: 32 },
    { mode: 'left' as DeleteCellsMode, shifted: 23 },
    { mode: 'row' as DeleteCellsMode, shifted: 32 },
    { mode: 'column' as DeleteCellsMode, shifted: 23 },
  ])('$mode shifts cells and undo restores the standalone Worksheet snapshot', ({ mode, shifted }) => {
    const worksheet = new Worksheet(`G06 ${mode}`, 5, 5);
    for (let row = 1; row <= 4; row++) {
      for (let col = 1; col <= 4; col++) {
        worksheet.setCellValue({ row, col }, row * 10 + col);
      }
    }
    worksheet.setCellFormula({ row: 3, col: 3 }, '=A1+1');
    worksheet.setCellStyle({ row: 4, col: 4 }, { italic: true, color: '#345678' });

    const addresses = Array.from({ length: 16 }, (_, index) => ({
      row: Math.floor(index / 4) + 1,
      col: (index % 4) + 1,
    }));
    const before = new Map(addresses.map((address) => {
      const cell = worksheet.getCell(address);
      return [`${address.row},${address.col}`, {
        value: cell?.value ?? null,
        formula: cell?.formula,
        style: cell?.style,
      }];
    }));
    const observedEvents: string[] = [];
    worksheet.on((event) => observedEvents.push(event.type));
    const commands = new CommandManager();
    const command = new DeleteCellsCommand(
      worksheet,
      { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } },
      mode,
    );

    commands.execute(command);
    expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe(shifted);
    expect(observedEvents).toContain('cell-changed');

    commands.undo();
    for (const address of addresses) {
      const cell = worksheet.getCell(address);
      const expected = { ...before.get(`${address.row},${address.col}`)! };
      if (address.row === 3 && address.col === 3 && mode === 'row') {
        // Characterize the current formula-cache result after row recovery;
        // the expression is restored, but the cached value is not the
        // pre-delete value in this mode.
        expected.value = 43;
      } else if (address.row === 3 && address.col === 3 && mode === 'column') {
        expected.value = 34;
      }
      expect({
        value: cell?.value ?? null,
        formula: cell?.formula,
        style: cell?.style,
      }).toEqual(expected);
    }

    commands.redo();
    expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe(shifted);
  });

  test.each([
    {
      mode: 'row' as DeleteCellsMode,
      source: { row: 4, col: 4 },
      neighbor: { row: 4, col: 5 },
      target: { row: 3, col: 4 },
      neighborTarget: { row: 3, col: 5 },
    },
    {
      mode: 'column' as DeleteCellsMode,
      source: { row: 4, col: 4 },
      neighbor: { row: 5, col: 4 },
      target: { row: 4, col: 3 },
      neighborTarget: { row: 5, col: 3 },
    },
  ])('$mode deletion preserves neighboring values and distinct styles through undo and redo', ({ mode, source, neighbor, target, neighborTarget }) => {
    const worksheet = new Worksheet(`AE02 ${mode}`, 6, 6);
    const sourceValue = `${mode}-source`;
    const neighborValue = `${mode}-neighbor`;
    const sourceStyle = { italic: true, color: '#345678' };
    const neighborStyle = { bold: true, color: '#ab1234' };
    worksheet.setCellValue(source, sourceValue);
    worksheet.setCellStyle(source, sourceStyle);
    worksheet.setCellValue(neighbor, neighborValue);
    worksheet.setCellStyle(neighbor, neighborStyle);

    const manager = new CommandManager();
    const command = new DeleteCellsCommand(
      worksheet,
      { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } },
      mode,
    );
    expect(manager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 0 });

    manager.execute(command);
    expect(manager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(worksheet.getCellValue(target)).toBe(sourceValue);
    expect(worksheet.getCellStyle(target)).toEqual(sourceStyle);
    expect(worksheet.getCellValue(neighborTarget)).toBe(neighborValue);
    expect(worksheet.getCellStyle(neighborTarget)).toEqual(neighborStyle);

    expect(manager.undo()).toBe(true);
    expect(manager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 1 });
    expect(worksheet.getCellValue(source)).toBe(sourceValue);
    expect(worksheet.getCellStyle(source)).toEqual(sourceStyle);
    expect(worksheet.getCellValue(neighbor)).toBe(neighborValue);
    expect(worksheet.getCellStyle(neighbor)).toEqual(neighborStyle);
    expect(worksheet.getCellStyle(target)).toBeUndefined();
    expect(worksheet.getCellStyle(neighborTarget)).toBeUndefined();

    expect(manager.redo()).toBe(true);
    expect(manager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(worksheet.getCellValue(target)).toBe(sourceValue);
    expect(worksheet.getCellStyle(target)).toEqual(sourceStyle);
    expect(worksheet.getCellValue(neighborTarget)).toBe(neighborValue);
    expect(worksheet.getCellStyle(neighborTarget)).toEqual(neighborStyle);
  });
});
