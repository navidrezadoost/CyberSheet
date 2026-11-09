import { describe, expect, test } from '@jest/globals';
import { FormulaEngine, type FormulaContext, type FormulaValue } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('P1-08AH named-binding isolation and precedence audit', () => {
  const worksheet = new Worksheet('Named binding audit', 4, 4);
  worksheet.setCellValue({ row: 1, col: 1 }, 7);
  worksheet.setCellValue({ row: 2, col: 1 }, 8);
  const context: FormulaContext = {
    worksheet,
    currentCell: { row: 4, col: 4 },
  };
  const evaluate = (formula: string, entries: Array<[string, FormulaValue]>) =>
    new FormulaEngine().evaluateWithBindings(formula, context, new Map(entries));
  const errorCode = (value: FormulaValue) =>
    value instanceof Error ? value.message : undefined;

  test('keeps bindings scoped to one evaluation and reaches nested expressions', () => {
    const engine = new FormulaEngine();
    const first = new Map<string, FormulaValue>([['Revenue', 4], ['Cost', 1]]);
    const second = new Map<string, FormulaValue>([['Revenue', 9]]);

    expect(engine.evaluateWithBindings('((Revenue - Cost) * 2)', context, first)).toBe(6);
    expect(errorCode(engine.evaluate('Revenue + 1', context))).toBe('#NAME?');
    expect(engine.evaluateWithBindings('Revenue + 1', context, second)).toBe(10);
    expect(errorCode(engine.evaluate('Revenue + 1', context))).toBe('#NAME?');
  });

  test('does not resolve names inside string literals and preserves LET/LAMBDA local precedence', () => {
    const bindings = [['Revenue', 125], ['Cost', 40]] as Array<[string, FormulaValue]>;

    expect(evaluate('"Revenue Cost"', bindings)).toBe('Revenue Cost');
    expect(evaluate('CONCAT("Revenue", " Cost")', bindings)).toBe('Revenue Cost');
    expect(evaluate('LET(Revenue, 3, Revenue + Cost)', bindings)).toBe(43);
    expect(evaluate('LAMBDA(Revenue, Revenue + Cost)(3)', bindings)).toBe(43);
  });

  test('characterizes that case-varied LET locals do not currently shadow external bindings', () => {
    // Existing LET lookup is case-sensitive even though external bindings are
    // normalized. The fallback therefore resolves Revenue=125 after the local
    // `revenue` lookup misses, yielding 165 instead of the case-insensitive 43.
    expect(evaluate('LET(revenue, 3, REVENUE + Cost)', [['Revenue', 125], ['Cost', 40]])).toBe(165);
    expect(evaluate('LAMBDA(revenue, REVENUE + Cost)(3)', [['Revenue', 125], ['Cost', 40]])).toBe(165);
  });

  test('compares ordinary local lookup with the explicit case-insensitive external binding fallback', () => {
    const engine = new FormulaEngine();
    expect(errorCode(engine.evaluate('LET(revenue, 3, REVENUE)', context))).toBe('#NAME?');
    expect(errorCode(engine.evaluate('LAMBDA(revenue, REVENUE)(3)', context))).toBe('#NAME?');

    const bindings = new Map<string, FormulaValue>([['Revenue', 125]]);
    expect(engine.evaluateWithBindings('LET(revenue, 3, REVENUE)', context, bindings)).toBe(125);
    expect(engine.evaluateWithBindings('LAMBDA(revenue, REVENUE)(3)', context, bindings)).toBe(125);
  });

  test('keeps reference, literal, and function-call tokens ahead of colliding names', () => {
    const bindings: Array<[string, FormulaValue]> = [
      ['A1', 900], ['TRUE', false], ['FALSE', true], ['SUM', 999], ['Revenue', 5],
    ];

    expect(evaluate('A1', bindings)).toBe(7);
    expect(evaluate('SUM(A1:A2)', bindings)).toBe(15);
    expect(evaluate('SUM', bindings)).toBe(999);
    expect(evaluate('TRUE', bindings)).toBe(true);
    expect(evaluate('FALSE', bindings)).toBe(false);
  });

  test('accepts supported identifier grammar and rejects unsupported binding names', () => {
    expect(evaluate('_Revenue2 + Revenue', [['_Revenue2', 2], ['Revenue', 3]])).toBe(5);

    const engine = new FormulaEngine();
    for (const unsupported of ['A1:B2', 'Revenue.Total', 'Bad Name']) {
      expect(() => engine.evaluateWithBindings(
        'Revenue', context, new Map<string, FormulaValue>([[unsupported, 1]]),
      )).toThrow(TypeError);
    }
  });

  test('propagates explicit zero and null through operators, nested functions, LET, and LAMBDA', () => {
    expect(evaluate('Revenue + 1', [['Revenue', 0]])).toBe(1);
    expect(evaluate('SUM(Revenue)', [['Revenue', 0]])).toBe(0);

    for (const formula of [
      '((Revenue + 1))',
      'ABS(Revenue)',
      'SUM(Revenue)',
      'LET(x, Revenue, x + 1)',
      'LAMBDA(x, x + 1)(Revenue)',
    ]) {
      expect(evaluate(formula, [['Revenue', null]])).toBeNull();
    }
  });

  test('preserves declared-reference, unknown-name, and divide-by-zero errors through nested evaluation', () => {
    expect(errorCode(evaluate('Revenue', [['Revenue', new Error('#REF!')]]))).toBe('#REF!');
    expect(errorCode(evaluate('ABS(Revenue + 1)', [['Revenue', new Error('#REF!')]]))).toBe('#REF!');
    expect(errorCode(evaluate('ABS(Missing + 1)', []))).toBe('#NAME?');
    expect(errorCode(evaluate('SUM(1 / 0)', []))).toBe('#DIV/0!');
    expect(errorCode(evaluate('LET(x, 1 / 0, x + 1)', []))).toBe('#DIV/0!');
  });
});
