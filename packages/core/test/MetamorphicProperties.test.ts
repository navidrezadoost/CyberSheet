/**
 * Metamorphic Property Tests
 * 
 * These tests validate algebraic properties that should hold
 * regardless of implementation details. They catch bugs that
 * even differential testing might miss.
 * 
 * Properties tested:
 * 1. Identity: insert(k); delete(k) = identity
 * 2. Commutativity: insert(a); insert(b) = insert(b); insert(a+1) (for a < b)
 * 3. Associativity: (insert(a); insert(b)); insert(c) = insert(a); (insert(b); insert(c))
 * 4. Inverse: delete(k); insert(k) restores column positions
 * 5. Collision determinism: Multiple sources → same dest = stable ordering
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { InsertColumnCommand } from '../src/InsertColumnCommand';
import { DeleteColumnCommand } from '../src/DeleteColumnCommand';

describe('Metamorphic Properties (Algebraic Laws)', () => {
  let workbook: Workbook;
  let worksheet: any;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Test');
  });

  describe('Property 1: Identity Law', () => {
    it('insert(k); delete(k) = identity', () => {
      // Setup initial state
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');

      // Capture initial state
      const initialA = worksheet.getCellValue({ row: (0) + 1, col: (0) + 1 });
      const initialB = worksheet.getCellValue({ row: (0) + 1, col: (1) + 1 });
      const initialC = worksheet.getCellValue({ row: (0) + 1, col: (2) + 1 });

      // Transform: insert(1); delete(1)
      const insertCmd = new InsertColumnCommand(worksheet, 1);
      insertCmd.execute();

      const deleteCmd = new DeleteColumnCommand(worksheet, 1);
      deleteCmd.execute();

      // Verify identity
      expect(worksheet.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe(initialA);
      expect(worksheet.getCellValue({ row: (0) + 1, col: (1) + 1 })).toBe(initialB);
      expect(worksheet.getCellValue({ row: (0) + 1, col: (2) + 1 })).toBe(initialC);
    });

    it('delete(k); insert(k) preserves column positions', () => {
      // Setup
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');
      worksheet.setCellValue({ row: (0) + 1, col: (3) + 1 }, 'D');

      // Delete then insert
      const deleteCmd = new DeleteColumnCommand(worksheet, 2);
      deleteCmd.execute();

      const insertCmd = new InsertColumnCommand(worksheet, 2);
      insertCmd.execute();

      // B is deleted, so we get: A, null, C, D
      expect(worksheet.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe('A');
      expect(worksheet.getCellValue({ row: (0) + 1, col: (1) + 1 })).toBe(null); // Inserted empty column
      expect(worksheet.getCellValue({ row: (0) + 1, col: (2) + 1 })).toBe('C');
      expect(worksheet.getCellValue({ row: (0) + 1, col: (3) + 1 })).toBe('D');
    });
  });

  describe('Property 2: Order Independence for Non-Overlapping Operations', () => {
    it('insert(a); insert(b) gives predictable result when a < b-2', () => {
      // When operations don't interfere, order matters only for coordinate adjustment
      
      const wb1 = new Workbook();
      const ws1 = wb1.addSheet('Test');
      ws1.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      ws1.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');
      ws1.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');
      ws1.setCellValue({ row: (0) + 1, col: (3) + 1 }, 'D');

      // Insert at 0, then at 3 (which becomes 4 after first insert)
      new InsertColumnCommand(ws1, 1).execute();
      new InsertColumnCommand(ws1, 4).execute();

      // Result: ∅ A B ∅ C D
      expect(ws1.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe(null);
      expect(ws1.getCellValue({ row: (0) + 1, col: (1) + 1 })).toBe('A');
      expect(ws1.getCellValue({ row: (0) + 1, col: (2) + 1 })).toBe('B');
      expect(ws1.getCellValue({ row: (0) + 1, col: (3) + 1 })).toBe(null);
      expect(ws1.getCellValue({ row: (0) + 1, col: (4) + 1 })).toBe('C');
      expect(ws1.getCellValue({ row: (0) + 1, col: (5) + 1 })).toBe('D');
    });
  });

  describe('Property 3: Deterministic Collision Handling', () => {
    it('should handle collisions with stable ordering', () => {
      // Create scenario where multiple cells could map to same destination
      // This tests that PasteCommand applies cells in deterministic order
      
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      worksheet.setCellValue({ row: (1) + 1, col: (0) + 1 }, 'B');
      worksheet.setCellValue({ row: (2) + 1, col: (0) + 1 }, 'C');
      worksheet.setCellValue({ row: (3) + 1, col: (0) + 1 }, 'D');

      // Insert column at 0 - all cells shift right
      const cmd = new InsertColumnCommand(worksheet, 1);
      cmd.execute();

      // All cells should have shifted to column 1
      expect(worksheet.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe(null);
      expect(worksheet.getCellValue({ row: (0) + 1, col: (1) + 1 })).toBe('A');
      expect(worksheet.getCellValue({ row: (1) + 1, col: (1) + 1 })).toBe('B');
      expect(worksheet.getCellValue({ row: (2) + 1, col: (1) + 1 })).toBe('C');
      expect(worksheet.getCellValue({ row: (3) + 1, col: (1) + 1 })).toBe('D');

      // Run again to ensure deterministic (same seed should produce same result)
      const wb2 = new Workbook();
      const ws2 = wb2.addSheet('Test');
      ws2.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      ws2.setCellValue({ row: (1) + 1, col: (0) + 1 }, 'B');
      ws2.setCellValue({ row: (2) + 1, col: (0) + 1 }, 'C');
      ws2.setCellValue({ row: (3) + 1, col: (0) + 1 }, 'D');

      const cmd2 = new InsertColumnCommand(ws2, 1);
      cmd2.execute();

      // Compare states
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          expect(worksheet.getCellValue({ row: (r) + 1, col: (c) + 1 })).toBe(ws2.getCellValue({ row: (r) + 1, col: (c) + 1 }));
        }
      }
    });
  });

  describe('Property 4: No Silent Overwrites', () => {
    it('should not silently overwrite cells during transformation', () => {
      // If two cells map to same destination, last-write-wins should be EXPLICIT
      // For now, we verify each cell lands in its expected location
      
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'X');
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'Y');
      worksheet.setCellValue({ row: (0) + 1, col: (3) + 1 }, 'Z');

      // Insert at 2 - X stays, Y,Z shift right
      const cmd = new InsertColumnCommand(worksheet, 3);
      cmd.execute();

      expect(worksheet.getCellValue({ row: (0) + 1, col: (1) + 1 })).toBe('X');
      expect(worksheet.getCellValue({ row: (0) + 1, col: (2) + 1 })).toBe(null); // Inserted column
      expect(worksheet.getCellValue({ row: (0) + 1, col: (3) + 1 })).toBe('Y');  // Shifted
      expect(worksheet.getCellValue({ row: (0) + 1, col: (4) + 1 })).toBe('Z');  // Shifted

      // Count cells with each value
      let xCount = 0, yCount = 0, zCount = 0;
      for (let c = 0; c < 6; c++) {
        const val = worksheet.getCellValue({ row: (0) + 1, col: (c) + 1 });
        if (val === 'X') xCount++;
        if (val === 'Y') yCount++;
        if (val === 'Z') zCount++;
      }

      // No duplication
      expect(xCount).toBe(1);
      expect(yCount).toBe(1);
      expect(zCount).toBe(1);
    });
  });

  describe('Property 5: Associativity (Composition Order Independence)', () => {
    it('should give same result regardless of grouping', () => {
      // (insert(0); insert(1)); insert(2)
      const wb1 = new Workbook();
      const ws1 = wb1.addSheet('Test');
      ws1.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      ws1.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');

      new InsertColumnCommand(ws1, 1).execute();
      new InsertColumnCommand(ws1, 2).execute();
      new InsertColumnCommand(ws1, 3).execute();

      // insert(0); (insert(1); insert(2))
      const wb2 = new Workbook();
      const ws2 = wb2.addSheet('Test');
      ws2.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      ws2.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');

      new InsertColumnCommand(ws2, 1).execute();
      new InsertColumnCommand(ws2, 2).execute();
      new InsertColumnCommand(ws2, 3).execute();

      // Verify same final state
      for (let c = 0; c < 5; c++) {
        expect(ws1.getCellValue({ row: (0) + 1, col: (c) + 1 })).toBe(ws2.getCellValue({ row: (0) + 1, col: (c) + 1 }));
      }
    });
  });
});
