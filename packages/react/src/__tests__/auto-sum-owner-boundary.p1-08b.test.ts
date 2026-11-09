import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import { detectAutoSumPlans, executeAutoSum } from '../utils/autoSum';

describe('P1-08B.04 AutoSum read and mutation boundary', () => {
  test('standalone AutoSum detects the numeric run, builds a formula, and writes only through the command manager', () => {
    const worksheet = new Worksheet('AutoSum standalone wave', 6, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 4);
    worksheet.setCellValue({ row: 2, col: 1 }, 6);
    const range = { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } };
    const plans = detectAutoSumPlans(worksheet, range, { row: 3, col: 1 }, 'SUM');
    expect(plans).toEqual([{
      outputCell: { row: 3, col: 1 },
      operandRange: { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } },
      formula: '=SUM(A1:A2)',
    }]);

    const manager = new CommandManager();
    const execute = jest.spyOn(manager, 'execute');
    const changed = executeAutoSum(manager, worksheet, range, { row: 3, col: 1 }, 'SUM');
    expect(changed).toEqual([{ row: 3, col: 1 }]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect((execute.mock.calls[0]?.[0] as { description?: string }).description).toMatch(/AutoSum/i);
    expect(worksheet.getCell({ row: 3, col: 1 })?.formula).toBe('=SUM(A1:A2)');
  });

  test('owner-backed AutoSum rejects before selected-range reads, dispatch, writes, or events', () => {
    const worksheet = new Worksheet('AutoSum owner wave', 6, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 4);
    worksheet.setCellValue({ row: 2, col: 1 }, 6);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet!;
    const getCellValue = jest.spyOn(Worksheet.prototype, 'getCellValue');
    const manager = new CommandManager();
    const execute = jest.spyOn(manager, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    expect(() => executeAutoSum(
      manager,
      view,
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
      { row: 3, col: 1 },
      'SUM',
    )).toThrow('This workbook-owned operation is unavailable until its journal slice is authorized');

    expect(getCellValue).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(worksheet.getCell({ row: 3, col: 1 })).toBeUndefined();
    expect(events).toEqual([]);
    subscription.dispose();
  });
});
