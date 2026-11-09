/**
 * Minimal Reproduction: Undo Coordinate Drift Bug
 * 
 * Bug discovered by property-based fuzzing with shrinking.
 * 
 * Root cause: setValue operations are NOT tracked in undo system,
 * but column transforms ARE. This causes coordinate drift:
 * 
 * 1. setValue(1,7,"V48")    → cell at (1,7) in current space
 * 2. deleteCol(0)            → cell shifts to (1,6)
 * 3. undo()                  → cell shifts back to (1,7)
 * 4. insertCol(0)            → cell shifts to (1,8)
 * 
 * Expected: Cell ends at (1,8) ✓
 * Actual: Cell location is inconsistent (coordinate drift)
 * 
 * Shrunk from 50 operations to 4 operations by fuzzer.
 */

import { describe, it, expect } from '@jest/globals';
import { Worksheet } from '../src/worksheet';
import { InsertColumnCommand } from '../src/InsertColumnCommand';
import { DeleteColumnCommand } from '../src/DeleteColumnCommand';

describe('Undo Coordinate Drift Bug (Fuzzer Discovery)', () => {
  
  it('minimal reproduction: setValue + deleteCol + undo + insertCol', () => {
    const worksheet = new Worksheet('Test');

    // Step 0: Set value at (1,7)
    worksheet.setCellValue({ row: 1, col: 7 }, 'V48');
    expect(worksheet.getCellValue({ row: 1, col: 7 })).toBe('V48');

    // Step 1: Delete column 0 (shifts everything left)
    const deleteCmd = new DeleteColumnCommand(worksheet, 0);
    deleteCmd.execute();
    // Cell should now be at (1,6)
    expect(worksheet.getCellValue({ row: 1, col: 6 })).toBe('V48');
    expect(worksheet.getCellValue({ row: 1, col: 7 })).toBe(null);

    // Step 2: Undo delete (shifts everything back right)
    deleteCmd.undo();
    // Cell should be back at (1,7)
    expect(worksheet.getCellValue({ row: 1, col: 7 })).toBe('V48');

    // Step 3: Insert column at 0 (shifts everything right)
    const insertCmd = new InsertColumnCommand(worksheet, 0);
    insertCmd.execute();
    // Cell should now be at (1,8)
    
    console.log('\nActual state after insertCol(0):');
    for (let c = 6; c <= 9; c++) {
      const val = worksheet.getCellValue({ row: 1, col: c });
      console.log(`  col ${c}: ${val}`);
    }

    // THIS SHOULD PASS but currently fails
    expect(worksheet.getCellValue({ row: 1, col: 8 })).toBe('V48');
    expect(worksheet.getCellValue({ row: 1, col: 7 })).toBe(null);
  });

  it('validates the expected transform sequence', () => {
    // What SHOULD happen:
    // Initial:       (1,7) = "V48"
    // deleteCol(0):  (1,6) = "V48"  [shift left by 1]
    // undo:          (1,7) = "V48"  [shift right by 1]
    // insertCol(0):  (1,8) = "V48"  [shift right by 1]
    
    const worksheet = new Worksheet('Test');

    worksheet.setCellValue({ row: 1, col: 7 }, 'V48');
    const deleteCmd = new DeleteColumnCommand(worksheet, 0);
    deleteCmd.execute();
    deleteCmd.undo();
    const insertCmd = new InsertColumnCommand(worksheet, 0);
    insertCmd.execute();

    // Final position should be (1,8)
    expect(worksheet.getCellValue({ row: 1, col: 8 })).toBe('V48');
  });
});
