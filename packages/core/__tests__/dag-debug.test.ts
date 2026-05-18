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
    worksheet.setCellValue({ row: 0, col: 0 }, 10);
    console.log('A1 value after set:', worksheet.getCellValue({ row: 0, col: 0 }));

    // Set formula
    worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*2');
    console.log('B1 formula:', worksheet.getCell({ row: 0, col: 1 })?.formula);
    console.log('B1 value before recalc:', worksheet.getCellValue({ row: 0, col: 1 }));
    console.log('Dirty count:', worksheet.dirtyCount);

    // Recalculate
    const result = worksheet.autoRecalculate();
    console.log('Recalc result:', result);
    console.log('B1 value after recalc:', worksheet.getCellValue({ row: 0, col: 1 }));

    expect(worksheet.getCellValue({ row: 0, col: 1 })).toBe(20);
  });
});
