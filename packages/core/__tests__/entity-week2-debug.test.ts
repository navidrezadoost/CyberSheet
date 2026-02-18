/**
 * Debug test for multiple field accesses
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { createEntityValue } from '../src/types/entity-types';

describe('Debug multiple field accesses', () => {
  test('A2.Price should work', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Test', 100, 26);

    const stock1 = createEntityValue('stock', 100, {
      Price: 100,
      Ticker: 'AAPL',
    });

    const stock2 = createEntityValue('stock', 200, {
      Price: 200,
      Ticker: 'GOOGL',
    });

    worksheet.setCellValue({ row: 1, col: 1 }, stock1);
    worksheet.setCellValue({ row: 2, col: 1 }, stock2);

    // Test A1.Price
    const result1 = engine.evaluate('=A1.Price', { worksheet, currentCell: { row: 1, col: 2 } });
    console.log('A1.Price result:', result1);
    expect(result1).toBe(100);

    // Test A2.Price
    const result2 = engine.evaluate('=A2.Price', { worksheet, currentCell: { row: 1, col: 2 } });
    console.log('A2.Price result:', result2);
    expect(result2).toBe(200);

    // Test A1.Price + A2.Price
    const result3 = engine.evaluate('=A1.Price + A2.Price', { worksheet, currentCell: { row: 1, col: 2 } });
    console.log('A1.Price + A2.Price result:', result3);
    expect(result3).toBe(300);
  });
});
