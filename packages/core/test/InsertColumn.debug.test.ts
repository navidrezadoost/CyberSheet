/**
 * Debug test to isolate InsertColumn bug found by differential testing
 */

import { describe, it, expect } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { InsertColumnCommand } from '../src/InsertColumnCommand';

describe('InsertColumn Debug', () => {
  it('should not duplicate cells after insert', () => {
    const workbook = new Workbook();
    const worksheet = workbook.addSheet('Test');

    // Initial state: A at col 0, B at col 1, C at col 2
    worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
    worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');
    worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');

    console.log('BEFORE insert:');
    for (let c = 0; c < 3; c++) {
      console.log(`  col ${c}: "${worksheet.getCellValue({ row: (0) + 1, col: (c) + 1 })}"`);
    }

    // Insert column at position 1
    const cmd = new InsertColumnCommand(worksheet, 2);
    cmd.execute();

    console.log('\nAFTER insert at col 1:');
    for (let c = 0; c < 4; c++) {
      console.log(`  col ${c}: "${worksheet.getCellValue({ row: (0) + 1, col: (c) + 1 })}"`);
    }

    // Expected: A, null, B, C
    // Bug: A, B, B, C (B duplicated!)
    expect(worksheet.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe('A');
    expect(worksheet.getCellValue({ row: (0) + 1, col: (1) + 1 })).toBe(null); // ⚠️ FAILS - shows "B"
    expect(worksheet.getCellValue({ row: (0) + 1, col: (2) + 1 })).toBe('B');
    expect(worksheet.getCellValue({ row: (0) + 1, col: (3) + 1 })).toBe('C');
  });
});
