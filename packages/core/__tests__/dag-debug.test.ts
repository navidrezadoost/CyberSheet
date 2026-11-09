/**
 * Quick debug test to understand autoRecalculate behavior
 */

import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';

describe('DAG Debug Test', () => {
  it('basic formula evaluation', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('Test', 100, 26, engine as any);

    // Set value
    worksheet.setCellValue({ row: 1, col: 1 }, 10);
    console.log('A1 value after set:', worksheet.getCellValue({ row: 1, col: 1 }));

    // Set formula
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    console.log('B1 formula:', worksheet.getCell({ row: 1, col: 2 })?.formula);
    console.log('B1 value before recalc:', worksheet.getCellValue({ row: 1, col: 2 }));
    console.log('Dirty count:', worksheet.dirtyCount);

    // Recalculate
    const result = worksheet.autoRecalculate();
    console.log('Recalc result:', result);
    console.log('B1 value after recalc:', worksheet.getCellValue({ row: 1, col: 2 }));

    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(20);
  });
});
