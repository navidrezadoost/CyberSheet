/**
 * Quick verification test for Week 2 dot notation
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { createEntityValue } from '../src/types/entity-types';

describe('Week 2 Phase 2 - Dot Notation Quick Test', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet, currentCell: { row: 1, col: 2 } });
  };

  test('Basic dot notation - numeric field', () => {
    const entity = createEntityValue('stock', 150, { Price: 150, Ticker: 'AAPL' });
    worksheet.setCellValue({ row: 1, col: 1 }, entity);
    const result = evalFormula('=A1.Price');
    expect(result).toBe(150);
  });

  test('Dot notation - string field', () => {
    const entity = createEntityValue('stock', 150, { Price: 150, Ticker: 'AAPL' });
    worksheet.setCellValue({ row: 1, col: 1 }, entity);
    const result = evalFormula('=A1.Ticker');
    expect(result).toBe('AAPL');
  });

  test('Dot notation in arithmetic', () => {
    const entity = createEntityValue('stock', 100, { Price: 100 });
    worksheet.setCellValue({ row: 1, col: 1 }, entity);
    const result = evalFormula('=A1.Price + 50');
    expect(result).toBe(150);
  });

  test('#VALUE! when base is not entity', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, 42);
    const result = evalFormula('=A1.Price');
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#VALUE!');
  });

  test('#REF! when base is null', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, null);
    const result = evalFormula('=A1.Price');
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('#FIELD! when field missing', () => {
    const entity = createEntityValue('stock', 150, { Price: 150 });
    worksheet.setCellValue({ row: 1, col: 1 }, entity);
    const result = evalFormula('=A1.NonExistent');
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#FIELD!');
  });

  test('Unary minus precedence', () => {
    const entity = createEntityValue('stock', 100, { Price: 100 });
    worksheet.setCellValue({ row: 1, col: 1 }, entity);
    const result = evalFormula('=-A1.Price');
    expect(result).toBe(-100); // -(A1.Price)
  });

  test('Display vs field semantic separation', () => {
    const entity = createEntityValue('stock', 5, { Price: 10 }); // display=5, Price=10
    worksheet.setCellValue({ row: 1, col: 1 }, entity);
    const displayResult = evalFormula('=A1 + 1');
    const fieldResult = evalFormula('=A1.Price + 1');
    expect(displayResult).toBe(6); // Uses display
    expect(fieldResult).toBe(11); // Uses Price field
  });
});
