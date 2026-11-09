import { describe, expect, test } from '@jest/globals';
import { FormulaController } from '../src/FormulaController';
import { InsertCellsCommand } from '../src/InsertCellsCommand';
import { SetConditionalFormattingRulesCommand } from '../src/commands/ConditionalFormattingCommands';
import { Worksheet } from '../src/worksheet';

describe('P1-08P Core standalone command and controller paths', () => {
  test('FormulaController uses Worksheet formula APIs for evaluation, dependencies, events, and clear/reinsert', () => {
    const worksheet = new Worksheet('Standalone', 3, 3);
    const controller = new FormulaController(worksheet);
    const formulaAddress = { row: 1, col: 2 };
    const sourceAddress = { row: 1, col: 1 };
    const unrelatedAddress = { row: 3, col: 3 };
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    worksheet.setCellValue(sourceAddress, 4);
    worksheet.setCellValue(unrelatedAddress, 'untouched');
    worksheet.setCellStyle(formulaAddress, { bold: true });
    events.length = 0;
    try {
      expect(controller.setFormula(formulaAddress, '=A1*2')).toMatchObject({ isValid: true });
      expect(controller.getFormula(formulaAddress)).toBe('=A1*2');
      expect(worksheet.getCellValue(formulaAddress)).toBe(8);
      expect(worksheet.getPrecedents(formulaAddress)).toEqual([sourceAddress]);
      expect(events).toContainEqual(expect.objectContaining({
        type: 'cell-changed', address: formulaAddress,
        cell: expect.objectContaining({ formula: '=A1*2', value: 8 }),
      }));

      events.length = 0;
      worksheet.setCellValue(sourceAddress, 5);
      expect(worksheet.getCellValue(formulaAddress)).toBe(8);
      expect(events).toContainEqual(expect.objectContaining({ type: 'cell-changed', address: sourceAddress }));

      events.length = 0;
      expect(controller.recalculate(formulaAddress)).toBe(true);
      expect(worksheet.getCellValue(formulaAddress)).toBe(10);
      expect(controller.getFormula(formulaAddress)).toBe('=A1*2');
      expect(worksheet.getPrecedents(formulaAddress)).toEqual([sourceAddress]);
      expect(events).toContainEqual(expect.objectContaining({
        type: 'cell-changed', address: formulaAddress,
        cell: expect.objectContaining({ formula: '=A1*2', value: 10 }),
      }));

      events.length = 0;
      controller.clearFormula(formulaAddress);
      expect(controller.getFormula(formulaAddress)).toBeUndefined();
      expect(worksheet.getCellValue(formulaAddress)).toBe(10);
      expect(worksheet.getPrecedents(formulaAddress)).toEqual([]);
      expect(events).toContainEqual(expect.objectContaining({
        type: 'cell-changed', address: formulaAddress,
        previousFormula: '=A1*2', cell: expect.not.objectContaining({ formula: expect.anything() }),
      }));

      events.length = 0;
      expect(controller.setFormula(formulaAddress, '=A1+3')).toMatchObject({ isValid: true });
      expect(worksheet.getCellValue(formulaAddress)).toBe(8);
      expect(worksheet.getPrecedents(formulaAddress)).toEqual([sourceAddress]);
      expect(controller.getAllFormulas()).toContainEqual({ address: formulaAddress, formula: '=A1+3', value: 8 });
      expect(events).toContainEqual(expect.objectContaining({ type: 'cell-changed', address: formulaAddress }));

      expect(worksheet.getCellValue(unrelatedAddress)).toBe('untouched');
      expect(worksheet.getCellStyle(formulaAddress)).toMatchObject({ bold: true });
    } finally {
      subscription.dispose();
    }
  });

  test('InsertCellsCommand shifts standalone values and undo restores the captured range', () => {
    const worksheet = new Worksheet('Standalone', 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'top');
    worksheet.setCellValue({ row: 2, col: 1 }, 'middle');
    worksheet.setCellValue({ row: 3, col: 1 }, 'bottom');
    const command = new InsertCellsCommand(
      worksheet,
      { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } },
      'down',
    );

    command.execute();
    expect([
      worksheet.getCellValue({ row: 1, col: 1 }),
      worksheet.getCellValue({ row: 2, col: 1 }),
      worksheet.getCellValue({ row: 3, col: 1 }),
      worksheet.getCellValue({ row: 4, col: 1 }),
    ]).toEqual(['top', null, 'middle', 'bottom']);

    command.undo();
    expect([
      worksheet.getCellValue({ row: 1, col: 1 }),
      worksheet.getCellValue({ row: 2, col: 1 }),
      worksheet.getCellValue({ row: 3, col: 1 }),
      worksheet.getCellValue({ row: 4, col: 1 }),
    ]).toEqual(['top', 'middle', 'bottom', null]);
  });

  test('conditional-formatting command replaces and restores standalone rules with Worksheet events', () => {
    const worksheet = new Worksheet('Standalone', 3, 3);
    const original = [{ type: 'cellIs', range: 'A1:A1', operator: 'greaterThan', formula: '2' }] as any;
    const next = [{ type: 'cellIs', range: 'B2:B2', operator: 'lessThan', formula: '9' }] as any;
    worksheet.setConditionalFormattingRules(original);
    worksheet.setCellValue({ row: 3, col: 3 }, 'untouched');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new SetConditionalFormattingRulesCommand(worksheet, next);

    try {
      events.length = 0;
      command.execute();
      expect(worksheet.getConditionalFormattingRules()).toEqual(next);
      expect(events).toContainEqual(expect.objectContaining({ type: 'sheet-mutated' }));

      events.length = 0;
      command.undo();
      expect(worksheet.getConditionalFormattingRules()).toEqual(original);
      expect(events).toContainEqual(expect.objectContaining({ type: 'sheet-mutated' }));
      expect(worksheet.getCellValue({ row: 3, col: 3 })).toBe('untouched');
    } finally {
      subscription.dispose();
    }
  });
});
