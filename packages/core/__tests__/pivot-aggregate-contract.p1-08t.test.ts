import { describe, expect, test } from '@jest/globals';
import { FormulaEngine } from '../src/FormulaEngine';
import { PivotCalculatedFieldEngine } from '../src/PivotCalculatedFields';

describe('P1-08T calculated-field aggregate binding characterization', () => {
  const make = () => new PivotCalculatedFieldEngine(new FormulaEngine());

  test('explicit bindings preserve zero and null operands', () => {
    const engine = make();
    const [field] = engine.compile([{ name: 'Profit', formula: 'Revenue - Cost' }]);
    expect(engine.evaluate(field, { Revenue: 0, Cost: 0 })).toBe(0);
    expect(engine.evaluate(field, { Revenue: null, Cost: 0 })).toBeNull();
  });

  test('repeated references are deduplicated case-insensitively; first spelling is retained', () => {
    const [field] = make().compile([{ name: 'Profit', formula: 'Revenue + Revenue + revenue' }]);
    expect(field.dependsOn).toEqual(['Revenue']);
  });

  test('a supplied Error aggregate propagates through its explicit binding', () => {
    const engine = make();
    const [field] = engine.compile([{ name: 'Profit', formula: 'Revenue + 1' }]);
    const source = new Error('#DIV/0!');
    const result = engine.evaluate(field, { Revenue: source });
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#DIV/0!');
    expect(result).toBe(source);
  });
});
