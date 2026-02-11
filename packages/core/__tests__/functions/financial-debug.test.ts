/**
 * Debug test for financial functions
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Financial Functions Debug', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 10, col: 0 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  test('Check if NPV function exists', () => {
    const result = evaluate('=NPV(0.1, 300, 300, 300, 300)');
    console.log('Result type:', typeof result);
    console.log('Result value:', result);
    console.log('Is Error:', result instanceof Error);
    if (result instanceof Error) {
      console.log('Error message:', result.message);
    }
    expect(result).not.toBeInstanceOf(Error);
  });

  test('Check simple SUM (baseline)', () => {
    const result = evaluate('=SUM(1, 2, 3)');
    console.log('SUM result:', result);
    expect(result).toBe(6);
  });
});
