import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('Debug timezone issue', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  test('TODAY timezone investigation', () => {
    const today = evaluate('=TODAY()');
    console.log('TODAY() serial:', today);
    
    const year = evaluate('=YEAR(TODAY())');
    const month = evaluate('=MONTH(TODAY())');
    const day = evaluate('=DAY(TODAY())');
    
    console.log('YEAR(TODAY()):', year);
    console.log('MONTH(TODAY()):', month);
    console.log('DAY(TODAY()):', day);
    
    const jsDate = new Date();
    console.log('JS Date:', jsDate.toString());
    console.log('JS getDate() (local):', jsDate.getDate());
    console.log('JS getUTCDate() (UTC):', jsDate.getUTCDate());
    console.log('JS getFullYear():', jsDate.getFullYear());
    console.log('JS getMonth()+1:', jsDate.getMonth() + 1);
    console.log('TimezoneOffset (minutes):', jsDate.getTimezoneOffset());
    
    expect(day).toBe(jsDate.getDate());
  });
});
