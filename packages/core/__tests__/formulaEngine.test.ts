import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';

describe('FormulaEngine basics', () => {
  test('literals and arithmetic', () => {
    const ws = new Worksheet('S1', 10, 10);
    const engine = new FormulaEngine();
    // A1=2, B1=3
    ws.setCellValue({ row: 1, col: 1 }, 2);
    ws.setCellValue({ row: 1, col: 2 }, 3);
    const result = engine.evaluate('=A1+B1', { worksheet: ws as any, currentCell: { row: 2, col: 1 } });
    expect(result).toBe(5);
  });

  test('built-in functions: SUM, AVERAGE, MIN, MAX', () => {
    const ws = new Worksheet('S1', 10, 10);
    const engine = new FormulaEngine();
    ws.setCellValue({ row: 1, col: 1 }, 1); // A1
    ws.setCellValue({ row: 1, col: 2 }, 2); // B1
    ws.setCellValue({ row: 1, col: 3 }, 3); // C1

    expect(engine.evaluate('=SUM(A1:C1)', { worksheet: ws as any, currentCell: { row: 2, col: 1 } })).toBe(6);
    expect(engine.evaluate('=AVERAGE(A1:C1)', { worksheet: ws as any, currentCell: { row: 2, col: 2 } })).toBe(2);
    expect(engine.evaluate('=MIN(A1:C1)', { worksheet: ws as any, currentCell: { row: 2, col: 3 } })).toBe(1);
    expect(engine.evaluate('=MAX(A1:C1)', { worksheet: ws as any, currentCell: { row: 2, col: 4 } })).toBe(3);
  });
});
