import { FormulaEngine, Worksheet } from '../src';

describe('P1-08G dotted statistical function dispatch', () => {
  const cases: Array<{ name: string; formula: string; expected: number; digits: number }> = [
    { name: 'CHISQ.DIST.RT', formula: '=CHISQ.DIST.RT(5,2)', expected: Math.exp(-2.5), digits: 10 },
    { name: 'CHISQ.INV.RT', formula: '=CHISQ.INV.RT(0.05,10)', expected: 18.3070380533, digits: 7 },
    { name: 'F.DIST.RT', formula: '=F.DIST.RT(1,5,10)', expected: 0.4651194265, digits: 7 },
    { name: 'F.INV.RT', formula: '=F.INV.RT(0.05,5,10)', expected: 3.3258345304, digits: 7 },
    { name: 'T.DIST.RT', formula: '=T.DIST.RT(1.96,60)', expected: 0.0274, digits: 3 },
    { name: 'T.DIST.2T', formula: '=T.DIST.2T(1.96,60)', expected: 0.0548, digits: 3 },
    { name: 'T.INV.2T', formula: '=T.INV.2T(0.05,60)', expected: 2.000297759, digits: 6 },
    { name: 'NORM.S.DIST', formula: '=NORM.S.DIST(0,TRUE)', expected: 0.5000000005, digits: 9 },
    { name: 'NORM.S.INV', formula: '=NORM.S.INV(0.975)', expected: 1.9599639845, digits: 7 },
  ];

  test.each(cases)('$name reaches its registered handler and matches an independent reference', ({ name, formula, expected, digits }) => {
    const engine = new FormulaEngine();
    const handler = engine.functions.getMetadata(name)?.handler;
    expect(handler).toBeDefined();
    const invoked = jest.spyOn(engine.functions.getMetadata(name)!, 'handler');

    const result = engine.evaluate(formula, {
      worksheet: new Worksheet('Sheet1'),
      currentCell: { row: 1, col: 1 },
    });

    expect(invoked).toHaveBeenCalledTimes(1);
    expect(typeof result).toBe('number');
    expect(result as number).toBeCloseTo(expected, digits);
  });

  test('argument and domain errors remain distinguishable after dispatch', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Sheet1');
    const evaluate = (formula: string) => engine.evaluate(formula, { worksheet, currentCell: { row: 1, col: 1 } });

    expect((evaluate('=F.DIST.RT("bad",5,10)') as Error).message).toBe('#VALUE!');
    expect((evaluate('=F.DIST.RT(-1,5,10)') as Error).message).toBe('#NUM!');
  });

  test.each(cases)('$name rejects a representative invalid argument without returning NaN', ({ name }) => {
    const engine = new FormulaEngine();
    const result = engine.evaluate(`=${name}("invalid",2)`, {
      worksheet: new Worksheet('Sheet1'),
      currentCell: { row: 1, col: 1 },
    });
    expect(result).toBeInstanceOf(Error);
    expect(Number.isNaN(result as number)).toBe(false);
  });

  test('ordinary function names and comparisons retain their existing evaluation path', () => {
    const engine = new FormulaEngine();
    const context = { worksheet: new Worksheet('Sheet1'), currentCell: { row: 1, col: 1 } };
    expect(engine.evaluate('=SUM(1,2)', context)).toBe(3);
    expect(engine.evaluate('=F.DIST(0.5,5,10,TRUE)', context)).toEqual(expect.any(Number));
    expect(engine.evaluate('=A1.Stock.Price', context)).toBeInstanceOf(Error);
  });

  test('unsupported chained entity member expressions remain unsupported', () => {
    const engine = new FormulaEngine();
    const result = engine.evaluate('=A1.Stock.Price', {
      worksheet: new Worksheet('Sheet1'),
      currentCell: { row: 1, col: 1 },
    });
    expect(result).toBeInstanceOf(Error);
  });
});
