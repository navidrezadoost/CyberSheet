import { describe, expect, test } from '@jest/globals';
import { FormulaEngine, type FormulaContext, type FormulaValue } from '../src/FormulaEngine';
import { PivotCalculatedFieldEngine, PivotCalculatedFieldError } from '../src/PivotCalculatedFields';
import { Worksheet } from '../src/worksheet';

describe('P1-08AG explicit FormulaEngine named bindings', () => {
  const context = (worksheet = new Worksheet('Bindings', 4, 4)): FormulaContext => ({
    worksheet,
    currentCell: { row: 4, col: 4 },
  });

  const evaluateWithBindings = (
    engine: FormulaEngine,
    formula: string,
    ctx: ReturnType<typeof context>,
    values: ReadonlyMap<string, FormulaValue>,
  ) => engine.evaluateWithBindings(formula, ctx, values);

  test('bare names are explicit-only and normalized case-insensitively', () => {
    const engine = new FormulaEngine();
    const ctx = context();
    const values = new Map<string, FormulaValue>([['Revenue', 125], ['Cost', 40]]);

    expect(engine.evaluate('Revenue - Cost', ctx)).toEqual(expect.objectContaining({ message: '#NAME?' }));
    expect(evaluateWithBindings(engine, 'revenue - COST', ctx, values)).toBe(85);
  });

  test('cell/range references, Boolean literals, functions, and local bindings retain precedence', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Bindings', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 7);
    worksheet.setCellValue({ row: 2, col: 1 }, 8);
    const ctx = context(worksheet);
    const values = new Map<string, FormulaValue>([
      ['A1', 900], ['TRUE', false], ['SUM', 999], ['Revenue', 125], ['Cost', 40],
    ]);

    expect(evaluateWithBindings(engine, 'A1', ctx, values)).toBe(7);
    expect(evaluateWithBindings(engine, 'SUM(A1:A2)', ctx, values)).toBe(15);
    expect(evaluateWithBindings(engine, 'TRUE', ctx, values)).toBe(true);
    expect(evaluateWithBindings(engine, 'SUM(Revenue)', ctx, values)).toBe(125);
    expect(evaluateWithBindings(engine, 'LET(Revenue, 3, Revenue + Cost)', ctx, values)).toBe(43);
    expect(evaluateWithBindings(engine, 'Revenue', {
      ...ctx,
      lambdaContext: new Map<string, FormulaValue>([['Revenue', 3]]),
    }, values)).toBe(3);
  });

  test('declared unavailable, undeclared, zero, explicit null, and Error values stay distinct', () => {
    const engine = new FormulaEngine();
    const ctx = context();

    expect(evaluateWithBindings(engine, 'Cost + 1', ctx, new Map<string, FormulaValue>([['Cost', new Error('#REF!')]])))
      .toEqual(expect.objectContaining({ message: '#REF!' }));
    expect(evaluateWithBindings(engine, 'Unknown + 1', ctx, new Map<string, FormulaValue>()))
      .toEqual(expect.objectContaining({ message: '#NAME?' }));
    expect(evaluateWithBindings(engine, 'Revenue', ctx, new Map<string, FormulaValue>([['Revenue', 0]]))).toBe(0);
    expect(evaluateWithBindings(engine, 'Revenue + 1', ctx, new Map<string, FormulaValue>([['Revenue', null]]))).toBeNull();
    expect(evaluateWithBindings(engine, 'SUM(Revenue)', ctx, new Map<string, FormulaValue>([['Revenue', null]]))).toBeNull();
    expect(evaluateWithBindings(engine, 'IF(Revenue, 1, 2)', ctx, new Map<string, FormulaValue>([['Revenue', null]]))).toBeNull();
    expect(evaluateWithBindings(engine, 'Revenue + 1', ctx, new Map<string, FormulaValue>([['Revenue', new Error('#DIV/0!')]])))
      .toEqual(expect.objectContaining({ message: '#DIV/0!' }));
    expect(evaluateWithBindings(engine, 'SUM(Revenue)', ctx, new Map<string, FormulaValue>([['Revenue', new Error('#DIV/0!')]])))
      .toEqual(expect.objectContaining({ message: '#DIV/0!' }));
  });

  test('explicit null is scoped to named bindings and ordinary Worksheet SUM behavior is unchanged', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Bindings', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, null);
    const ctx = context(worksheet);

    expect(evaluateWithBindings(engine, 'A1 + 1', ctx, new Map<string, FormulaValue>())).toBe(1);
    expect(engine.evaluate('SUM(A1:A2)', ctx)).toBe(0);
    expect(evaluateWithBindings(engine, 'Revenue + 1', ctx, new Map<string, FormulaValue>([['Revenue', null]]))).toBeNull();
  });

  test('rejects invalid and case-duplicate binding declarations deterministically', () => {
    const engine = new FormulaEngine();
    const ctx = context();
    expect(() => evaluateWithBindings(engine, 'Revenue', ctx, new Map<string, FormulaValue>([['Bad Name', 1]]))).toThrow(TypeError);
    expect(() => evaluateWithBindings(engine, 'Revenue', ctx, new Map<string, FormulaValue>([['Revenue', 1], ['revenue', 2]]))).toThrow(TypeError);
  });
});

describe('P1-08AG calculated-field dependency integration characterization', () => {
  test('dependency extraction deduplicates identifier casing and detects a differently cased self-cycle', () => {
    const engine = new PivotCalculatedFieldEngine(new FormulaEngine());
    const fields = engine.compile([
      { name: 'Profit', formula: 'Revenue + revenue' },
    ]);
    expect(fields[0].dependsOn).toEqual(['Revenue']);

    const differentlyCasedCycle = engine.compile([
      { name: 'Profit', formula: 'profit + 1' },
    ]);
    expect(() => engine.topologicalSort(differentlyCasedCycle)).toThrow(PivotCalculatedFieldError);
    expect(() => engine.topologicalSort(differentlyCasedCycle)).toThrow('Circular dependency detected');
  });
});
