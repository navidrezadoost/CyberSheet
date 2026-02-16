import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('Debug FILTER', () => {
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

  test('Range comparison A1:A4>15', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, 10);
    worksheet.setCellValue({ row: 2, col: 1 }, 20);
    worksheet.setCellValue({ row: 3, col: 1 }, 30);
    worksheet.setCellValue({ row: 4, col: 1 }, 40);
    
    const result = evaluate('=A1:A4>15');
    console.log('A1:A4>15 result:', result);
    expect(Array.isArray(result)).toBe(true);
  });

  test('Simple FILTER', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, 10);
    worksheet.setCellValue({ row: 2, col: 1 }, 20);
    worksheet.setCellValue({ row: 3, col: 1 }, 30);
    worksheet.setCellValue({ row: 4, col: 1 }, 40);
    
    const result = evaluate('=FILTER(A1:A4, A1:A4>15)');
    console.log('FILTER result:', result);
    console.log('FILTER result type:', typeof result, Array.isArray(result));
  });
});
