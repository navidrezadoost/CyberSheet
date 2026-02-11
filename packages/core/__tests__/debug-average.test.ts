import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('Debug AVERAGE with ranges', () => {
  test('AVERAGE with range A1:A4', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Sheet1', 100, 26);
    const context = {
      worksheet,
      currentCell: { row: 5, col: 0 }, // Evaluate from A6
      namedLambdas: new Map()
    } as FormulaContext;

    // Set up cells
    worksheet.setCellValue({ row: 0, col: 0 }, 10);
    worksheet.setCellValue({ row: 1, col: 0 }, 20);
    worksheet.setCellValue({ row: 2, col: 0 }, 30);
    worksheet.setCellValue({ row: 3, col: 0 }, 40);

    // Debug: check cell values
    console.log('A1:', worksheet.getCellValue({ row: 0, col: 0 }));
    console.log('A2:', worksheet.getCellValue({ row: 1, col: 0 }));
    console.log('A3:', worksheet.getCellValue({ row: 2, col: 0 }));
    console.log('A4:', worksheet.getCellValue({ row: 3, col: 0 }));

    const result = engine.evaluate('=AVERAGE(A1:A4)', context);
    console.log('Result:', result);
    console.log('Result type:', typeof result);
    console.log('Is Array?:', Array.isArray(result));

    expect(result).toBe(25);
  });
});
