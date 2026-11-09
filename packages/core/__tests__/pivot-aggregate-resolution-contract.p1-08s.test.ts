import { describe, expect, test } from '@jest/globals';
import { FormulaEngine } from '../src/FormulaEngine';
import { PivotCalculatedFieldEngine } from '../src/PivotCalculatedFields';

describe('P1-08S pivot aggregate-name resolution contract', () => {
  test('compilation identifies dependencies and evaluates against explicit aggregate bindings', () => {
    const engine = new PivotCalculatedFieldEngine(new FormulaEngine());
    const [profit] = engine.compile([{ name: 'Profit', formula: 'Revenue - Cost' }]);

    expect(125 - 40).toBe(85);
    expect(profit.dependsOn).toEqual(['Revenue', 'Cost']);
    expect(engine.topologicalSort([profit])).toEqual([profit]);
    expect(engine.evaluate(profit, { Revenue: 125, Cost: 40 })).toBe(85);
  });

  test('missing aggregate dependency is rejected before expression evaluation', () => {
    const engine = new PivotCalculatedFieldEngine(new FormulaEngine());
    const [profit] = engine.compile([{ name: 'Profit', formula: 'Revenue - Cost' }]);
    const result = engine.evaluate(profit, { Revenue: 125 });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('FormulaEngine does not resolve a bare aggregate identifier from the public formula context', () => {
    const formula = new FormulaEngine();
    const result = formula.evaluate('Revenue - Cost', {
      worksheet: { getCellValue: (address: unknown) => address === 'Revenue' ? 125 : address === 'Cost' ? 40 : null } as never,
      currentCell: { row: 1, col: 1 },
    });

    expect(result).toBeInstanceOf(Error);
    expect(String(result)).toContain('#NAME?');
  });

  test('dependent calculated fields consume earlier named results in dependency order', () => {
    const engine = new PivotCalculatedFieldEngine(new FormulaEngine());
    const sorted = engine.topologicalSort(engine.compile([
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'Margin', formula: 'Profit / Revenue' },
    ]));
    const results = engine.evaluateAll(sorted, { Revenue: 125, Cost: 40 });

    expect(Object.keys(results)).toEqual(['Revenue', 'Cost', 'Profit', 'Margin']);
    expect(results.Profit).toBe(85);
    expect(results.Margin).toBe(85 / 125);
  });

  test('preserves supplied spreadsheet Error values through dependent bindings', () => {
    const engine = new PivotCalculatedFieldEngine(new FormulaEngine());
    const [dependent] = engine.compile([{ name: 'Dependent', formula: 'Base + 1' }]);
    const sourceError = new Error('#DIV/0!');
    const first = engine.evaluateAll([dependent], { Base: sourceError });

    expect(first.Dependent).toBe(sourceError);
    const second = engine.evaluateAll([dependent], { Base: sourceError });
    expect(second.Dependent).toBeInstanceOf(Error);
    expect(second.Dependent).toBe(sourceError);
  });
});
