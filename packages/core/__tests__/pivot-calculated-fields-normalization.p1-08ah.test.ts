import { describe, expect, test } from '@jest/globals';
import { FormulaEngine } from '../src/FormulaEngine';
import {
  PivotCalculatedFieldEngine,
  PivotCalculatedFieldError,
  type CompiledCalculatedField,
} from '../src/PivotCalculatedFields';

const makeEngine = () => new PivotCalculatedFieldEngine(new FormulaEngine());

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected action to throw');
}

describe('P1-08AH calculated-field dependency normalization', () => {
  test('deduplicates dependencies case-insensitively and ignores function, literal, and A1 reference tokens', () => {
    const [field] = makeEngine().compile([
      { name: 'Total', formula: 'SUM(Revenue) + revenue + TRUE + $A$1 + B2:C3' },
    ]);

    expect(field.dependsOn).toEqual(['Revenue']);
  });

  test('resolves aggregate dependencies and formulas without regard to identifier casing', () => {
    const engine = makeEngine();
    const [profit] = engine.compile([
      { name: 'Profit', formula: 'revenue - cOsT' },
    ]);

    expect(engine.evaluate(profit, { Revenue: 125, COST: 40 })).toBe(85);
  });

  test('rejects duplicate calculated field names even when their casing differs', () => {
    const engine = makeEngine();

    const error = captureError(() => engine.compile([
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'profit', formula: 'Revenue / Cost' },
    ]));

    expect(error).toBeInstanceOf(PivotCalculatedFieldError);
    expect(error).toMatchObject({
      code: 'INVALID_FORMULA',
    });
  });

  test('rejects cell-reference, Boolean, function, and non-identifier field names', () => {
    const engine = makeEngine();
    for (const name of ['A1', 'TRUE', 'false', 'SUM', 'if', 'Gross Margin']) {
      const error = captureError(() => engine.compile([{ name, formula: '1' }]));
      expect(error).toBeInstanceOf(PivotCalculatedFieldError);
      expect(error).toMatchObject({ code: 'INVALID_FORMULA' });
    }
  });

  test('detects a self-cycle when the formula uses another casing of its field name', () => {
    const engine = makeEngine();
    const compiled = engine.compile([{ name: 'Margin', formula: 'margin + 1' }]);

    const error = captureError(() => engine.topologicalSort(compiled));
    expect(error).toBeInstanceOf(PivotCalculatedFieldError);
    expect(error).toMatchObject({ code: 'CIRCULAR_DEP' });
  });

  test('detects a multi-node cycle whose dependency names use different casing', () => {
    const engine = makeEngine();
    const compiled = engine.compile([
      { name: 'Alpha', formula: 'bRAVO + 1' },
      { name: 'Bravo', formula: 'ALPHA + 1' },
    ]);

    const error = captureError(() => engine.topologicalSort(compiled));
    expect(error).toBeInstanceOf(PivotCalculatedFieldError);
    expect(error).toMatchObject({ code: 'CIRCULAR_DEP' });
  });

  test('uses deterministic topological ordering across input permutations', () => {
    const engine = makeEngine();
    const fields: CompiledCalculatedField[] = engine.compile([
      { name: 'Zeta', formula: 'Beta + 1' },
      { name: 'Gamma', formula: 'Alpha + 1' },
      { name: 'Beta', formula: 'Base + 1' },
      { name: 'Alpha', formula: 'Base + 1' },
    ]);

    const first = engine.topologicalSort(fields).map(({ name }) => name);
    const second = engine.topologicalSort(fields.slice().reverse()).map(({ name }) => name);

    expect(first).toEqual(['Alpha', 'Beta', 'Gamma', 'Zeta']);
    expect(second).toEqual(first);
  });
});
