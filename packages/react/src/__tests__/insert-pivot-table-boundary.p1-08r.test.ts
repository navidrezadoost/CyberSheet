import { describe, expect, jest, test } from '@jest/globals';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import { insertPivotTable } from '../utils/insertPivotTable';

describe('P1-08R insert-pivot-table caller boundary', () => {
  test('builds a standalone pivot output and command undo restores its destination', () => {
    const worksheet = new Worksheet('Standalone', 12, 6);
    worksheet.setCellValue({ row: 1, col: 1 }, 'Region');
    worksheet.setCellValue({ row: 1, col: 2 }, 'Sales');
    worksheet.setCellValue({ row: 2, col: 1 }, 'East');
    worksheet.setCellValue({ row: 2, col: 2 }, 4);
    worksheet.setCellValue({ row: 3, col: 1 }, 'West');
    worksheet.setCellValue({ row: 3, col: 2 }, 7);
    const manager = new CommandManager();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    try {
      const result = insertPivotTable(
        worksheet,
        manager,
        { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
        { row: 6, col: 1 },
      );
      expect(result.ok).toBe(true);
      expect(worksheet.getCellValue({ row: 6, col: 1 })).toBe('Region');
      expect(worksheet.getCellValue({ row: 6, col: 2 })).toBe('sum(Sales)');
      expect(worksheet.getCellValue({ row: 7, col: 1 })).toBe('East');
      expect(worksheet.getCellValue({ row: 7, col: 2 })).toBe(4);
      expect(worksheet.getCellValue({ row: 8, col: 1 })).toBe('West');
      expect(worksheet.getCellValue({ row: 8, col: 2 })).toBe(7);
      expect(events.length).toBeGreaterThan(0);

      manager.undo();
      expect(worksheet.getCellValue({ row: 6, col: 1 })).toBeNull();
      expect(worksheet.getCellValue({ row: 7, col: 2 })).toBeNull();
    } finally {
      subscription.dispose();
    }
  });

  test('rejects a Workbook-issued view before command dispatch or Worksheet writes', () => {
    const worksheet = new Worksheet('Owned', 4, 4);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const sheet = workbook.activeSheet!;
    const manager = new CommandManager();
    const execute = jest.spyOn(manager, 'execute');
    const events: unknown[] = [];
    const subscription = sheet.on((event) => events.push(event));

    try {
      expect(() => insertPivotTable(
        sheet,
        manager,
        { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
        { row: 5, col: 1 },
      )).toThrow(/journal slice/);
      expect(execute).not.toHaveBeenCalled();
      expect(sheet.getCellValue({ row: 5, col: 1 })).toBeNull();
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
    }
  });
});
