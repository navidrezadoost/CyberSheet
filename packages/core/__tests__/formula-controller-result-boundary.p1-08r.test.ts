import { describe, expect, test } from '@jest/globals';
import { FormulaController } from '../src/FormulaController';
import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('P1-08R FormulaController result and validation boundaries', () => {
  test.each([
    ['scalar number', '=2+3', 5],
    ['numeric zero', '=0', 0],
    ['Boolean', '=TRUE', true],
    ['text', '="hello"', 'hello'],
  ])('stores valid %s results through Worksheet', (_label, formula, expected) => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const controller = new FormulaController(worksheet);
    const address = { row: 1, col: 1 };

    expect(controller.setFormula(address, formula as string)).toEqual({ isValid: true });
    expect(controller.getFormula(address)).toBe(formula);
    expect(worksheet.getCellValue(address)).toBe(expected);
  });

  test('rejects empty and error-producing formulas before Worksheet mutation', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const controller = new FormulaController(worksheet);
    const address = { row: 1, col: 1 };
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    try {
      for (const formula of ['=', '=1/0']) {
        const result = controller.setFormula(address, formula);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeTruthy();
        expect(worksheet.getCell(address)).toBeUndefined();
        expect(worksheet.getPrecedents(address)).toEqual([]);
        expect(events).toEqual([]);
      }
    } finally {
      subscription.dispose();
    }
  });

  test('recalculates a dependency formula explicitly and retains formula and precedent', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const controller = new FormulaController(worksheet);
    const precedent = { row: 1, col: 1 };
    const dependent = { row: 1, col: 2 };
    worksheet.setCellValue(precedent, 6);

    expect(controller.setFormula(dependent, '=A1*2')).toEqual({ isValid: true });
    expect(worksheet.getCellValue(dependent)).toBe(12);
    worksheet.setCellValue(precedent, 9);
    expect(worksheet.getCellValue(dependent)).toBe(12);

    expect(controller.recalculate(dependent)).toBe(true);
    expect(worksheet.getCellValue(dependent)).toBe(18);
    expect(controller.getFormula(dependent)).toBe('=A1*2');
    expect(worksheet.getPrecedents(dependent)).toEqual([precedent]);
  });

  test('characterizes object-valued FormulaEngine output and current string storage', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const address = { row: 1, col: 1 };
    const engine = new FormulaEngine();
    const raw = engine.evaluate('={1,2}', { worksheet, currentCell: address });

    expect(raw).toEqual([1, 2]);
    const controller = new FormulaController(worksheet);
    expect(controller.setFormula(address, '={1,2}')).toEqual({ isValid: true });
    expect(controller.getFormula(address)).toBe('={1,2}');
    expect(worksheet.getCellValue(address)).toBe('1,2');
  });
});
