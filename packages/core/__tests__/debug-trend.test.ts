import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('Debug TREND', () => {
  test('TREND with y=2x', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Sheet1', 100, 26);
    const context = {
      worksheet,
      currentCell: { row: 5, col: 0 },
      namedLambdas: new Map()
    } as FormulaContext;

    // Setup data: X in column A, Y in column B
    // X = [1, 2, 3, 4]
    // Y = [2, 4, 6, 8] (y=2x line)
    worksheet.setCellValue({ row: 0, col: 0 }, 1);
    worksheet.setCellValue({ row: 1, col: 0 }, 2);
    worksheet.setCellValue({ row: 2, col: 0 }, 3);
    worksheet.setCellValue({ row: 3, col: 0 }, 4);
    
    worksheet.setCellValue({ row: 0, col: 1 }, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 4);
    worksheet.setCellValue({ row: 2, col: 1 }, 6);
    worksheet.setCellValue({ row: 3, col: 1 }, 8);

    const result = engine.evaluate('=TREND(B1:B4, A1:A4)', context);
    console.log('TREND result:', result);
    console.log('Result type:', typeof result);
    console.log('Is Array?:', Array.isArray(result));
    if (Array.isArray(result)) {
      console.log('Array length:', result.length);
      console.log('result[0]:', result[0]);
      console.log('result[1]:', result[1]);
      console.log('result[2]:', result[2]);
      console.log('result[3]:', result[3]);
    }

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result[0]).toBeCloseTo(2, 10);
      expect(result[1]).toBeCloseTo(4, 10);
      expect(result[2]).toBeCloseTo(6, 10);
      expect(result[3]).toBeCloseTo(8, 10);
    }
  });
});
