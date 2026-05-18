/**
 * formula-dag-integration.test.ts
 * 
 * End-to-end tests for Phase 3: Formula DAG Integration
 * 
 * Tests automatic dependency extraction, registration, and recalculation
 * when formulas are set via setCellFormula().
 */

import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';
import { extractReferences } from '../src/utils/formula-reference-extractor';
import { unpackKey } from '../src/dag/DependencyGraph';

describe('Phase 3: Formula DAG Integration', () => {
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26, engine as any);
  });

  // =========================================================================
  // 1. Dependency Extraction Tests
  // =========================================================================

  describe('Formula Reference Extraction', () => {
    it('extracts single cell reference', () => {
      const refs = extractReferences('=A1', { row: 0, col: 0 });
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ row: 0, col: 0 });
    });

    it('extracts multiple cell references', () => {
      const refs = extractReferences('=A1+B2+C3', { row: 0, col: 0 });
      expect(refs).toHaveLength(3);
      expect(refs).toContainEqual({ row: 0, col: 0 }); // A1
      expect(refs).toContainEqual({ row: 1, col: 1 }); // B2
      expect(refs).toContainEqual({ row: 2, col: 2 }); // C3
    });

    it('expands range references', () => {
      const refs = extractReferences('=SUM(A1:A3)', { row: 0, col: 0 });
      expect(refs).toHaveLength(3);
      expect(refs).toContainEqual({ row: 0, col: 0 }); // A1
      expect(refs).toContainEqual({ row: 1, col: 0 }); // A2
      expect(refs).toContainEqual({ row: 2, col: 0 }); // A3
    });

    it('handles absolute references ($A$1)', () => {
      const refs = extractReferences('=$A$1+B2', { row: 5, col: 5 });
      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({ row: 0, col: 0 }); // $A$1 → A1
      expect(refs).toContainEqual({ row: 1, col: 1 }); // B2
    });

    it('ignores string literals', () => {
      const refs = extractReferences('=CONCATENATE("A1", B2)', { row: 0, col: 0 });
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ row: 1, col: 1 }); // B2 only, not the "A1" in the string
    });

    it('handles complex formulas with functions', () => {
      const refs = extractReferences('=IF(A1>10, B1*2, C1+D1)', { row: 0, col: 0 });
      expect(refs).toHaveLength(4);
      expect(refs).toContainEqual({ row: 0, col: 0 }); // A1
      expect(refs).toContainEqual({ row: 0, col: 1 }); // B1
      expect(refs).toContainEqual({ row: 0, col: 2 }); // C1
      expect(refs).toContainEqual({ row: 0, col: 3 }); // D1
    });

    it('deduplicates repeated references', () => {
      const refs = extractReferences('=A1+A1+A1', { row: 0, col: 0 });
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({ row: 0, col: 0 });
    });

    it('handles 2D ranges (A1:C3)', () => {
      const refs = extractReferences('=SUM(A1:C3)', { row: 0, col: 0 });
      // A1:C3 = 3 rows × 3 cols = 9 cells
      expect(refs).toHaveLength(9);
      expect(refs).toContainEqual({ row: 0, col: 0 }); // A1
      expect(refs).toContainEqual({ row: 2, col: 2 }); // C3
    });
  });

  // =========================================================================
  // 2. Automatic Dependency Registration
  // =========================================================================

  describe('Automatic Dependency Registration', () => {
    it('setCellFormula automatically registers dependencies', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 10); // A1 = 10
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*2'); // B1 = A1*2

      // Check that B1's dependencies were registered
      const stats = worksheet.dagStats;
      expect(stats.nodes).toBe(1); // B1 has deps
      expect(stats.edges).toBe(1); // B1 → A1

      // Verify B1 is marked dirty (needs calculation)
      expect(stats.dirty).toBeGreaterThan(0);
    });

    it('updates dependencies when formula changes', () => {
      worksheet.setCellFormula({ row: 0, col: 2 }, '=A1+B1'); // C1 = A1+B1
      expect(worksheet.dagStats.edges).toBe(2); // C1 → A1, C1 → B1

      // Change formula
      worksheet.setCellFormula({ row: 0, col: 2 }, '=D1*E1'); // C1 = D1*E1
      expect(worksheet.dagStats.edges).toBe(2); // C1 → D1, C1 → E1

      // Old dependencies (A1, B1) should be cleared
      const deps = worksheet.dagStats;
      expect(deps.edges).toBe(2); // New deps only
    });

    it('clears dependencies when cell is deleted', () => {
      worksheet.setCellFormula({ row: 0, col: 0 }, '=B1+C1');
      expect(worksheet.dagStats.nodes).toBe(1);

      worksheet.deleteCell({ row: 0, col: 0 });
      expect(worksheet.dagStats.nodes).toBe(0);
      expect(worksheet.dagStats.edges).toBe(0);
    });

    it('registers complex formula with range', () => {
      worksheet.setCellFormula({ row: 5, col: 5 }, '=SUM(A1:A10)');
      
      const stats = worksheet.dagStats;
      expect(stats.nodes).toBe(1); // F6 has formula
      expect(stats.edges).toBe(10); // F6 depends on A1:A10 (10 cells)
    });
  });

  // =========================================================================
  // 3. Automatic Recalculation
  // =========================================================================

  describe('Automatic Recalculation', () => {
    it('autoRecalculate evaluates dirty formulas', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 10); // A1 = 10
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*2'); // B1 = A1*2

      // Recalculate (no need to drain - fresh setup means dirty cells)
      const result = worksheet.autoRecalculate();
      expect(result.evaluated).toBeGreaterThanOrEqual(1); // At least B1 evaluated

      // Check B1's value
      const b1 = worksheet.getCell({ row: 0, col: 1 });
      expect(b1?.value).toBe(20);
    });

    it('recalculates in topological order', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 5); // A1 = 5
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*2'); // B1 = A1*2 = 10
      worksheet.setCellFormula({ row: 0, col: 2 }, '=B1+5'); // C1 = B1+5 = 15

      worksheet.autoRecalculate();

      expect(worksheet.getCellValue({ row: 0, col: 1 })).toBe(10); // B1
      expect(worksheet.getCellValue({ row: 0, col: 2 })).toBe(15); // C1
    });

    it('propagates changes through dependency chain', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 2); // A1 = 2
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*3'); // B1 = 6
      worksheet.setCellFormula({ row: 0, col: 2 }, '=B1*2'); // C1 = 12
      worksheet.autoRecalculate();

      // Change A1
      worksheet.setCellValue({ row: 0, col: 0 }, 10); // A1 = 10
      worksheet.autoRecalculate();

      // B1 and C1 should update
      expect(worksheet.getCellValue({ row: 0, col: 1 })).toBe(30); // B1 = 10*3
      expect(worksheet.getCellValue({ row: 0, col: 2 })).toBe(60); // C1 = 30*2
    });

    it('handles SUM with ranges', () => {
      // Set up range data
      for (let i = 0; i < 5; i++) {
        worksheet.setCellValue({ row: i, col: 0 }, i + 1); // A1=1, A2=2, ..., A5=5
      }
      worksheet.setCellFormula({ row: 5, col: 0 }, '=SUM(A1:A5)'); // A6 = SUM(A1:A5)

      worksheet.autoRecalculate();
      expect(worksheet.getCellValue({ row: 5, col: 0 })).toBe(15); // 1+2+3+4+5
    });

    it('detects circular references', () => {
      worksheet.setCellFormula({ row: 0, col: 0 }, '=B1+1'); // A1 = B1+1
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1+1'); // B1 = A1+1 (circular!)

      const cycleEvents: any[] = [];
      worksheet.on((e) => {
        if (e.type === 'cycle-detected') cycleEvents.push(e);
      });

      const result = worksheet.autoRecalculate();
      expect(result.cycles.length).toBeGreaterThan(0);
      expect(cycleEvents.length).toBeGreaterThan(0);
    });

    it('marks dependents dirty when value cell changes', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 10);
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*2');
      worksheet.autoRecalculate(); // B1 = 20
      
      // Drain dirty set
      worksheet.recalc(() => {});

      // Change A1
      worksheet.setCellValue({ row: 0, col: 0 }, 100);
      expect(worksheet.dirtyCount).toBeGreaterThan(0); // B1 should be dirty

      worksheet.autoRecalculate();
      expect(worksheet.getCellValue({ row: 0, col: 1 })).toBe(200); // B1 updated
    });

    it('clears dirty set after recalculation', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 5);
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*10');
      
      expect(worksheet.dirtyCount).toBeGreaterThan(0);
      
      worksheet.autoRecalculate();
      expect(worksheet.dirtyCount).toBe(0); // Dirty set cleared
    });
  });

  // =========================================================================
  // 4. Edge Cases & Error Handling
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles formula evaluation errors gracefully', () => {
      worksheet.setCellFormula({ row: 0, col: 0 }, '=1/0'); // Division by zero

      expect(() => worksheet.autoRecalculate()).not.toThrow();
      
      // Should store error value
      const cell = worksheet.getCell({ row: 0, col: 0 });
      expect(cell?.value).toMatch(/#DIV\/0!|#ERROR!/); // #DIV/0! or #ERROR!
    });

    it('handles malformed formulas', () => {
      // Malformed syntax
      worksheet.setCellFormula({ row: 0, col: 0 }, '=((A1+B1');

      expect(() => worksheet.autoRecalculate()).not.toThrow();
      
      const cell = worksheet.getCell({ row: 0, col: 0 });
      // Malformed formulas may result in null or error string
      if (cell?.value !== null && cell?.value !== undefined) {
        expect(String(cell.value)).toMatch(/#ERROR!|#NAME\?|#VALUE!|ERROR/);
      }
    });

    it('handles formula with no dependencies', () => {
      worksheet.setCellFormula({ row: 0, col: 0 }, '=5+10'); // Constant formula

      worksheet.autoRecalculate();
      expect(worksheet.getCellValue({ row: 0, col: 0 })).toBe(15);
    });

    it('handles invalid cell references', () => {
      // Reference to non-existent cell
      worksheet.setCellFormula({ row: 0, col: 0 }, '=Z999');

      worksheet.autoRecalculate();
      // Should return null or 0 (depending on engine behavior)
      const val = worksheet.getCellValue({ row: 0, col: 0 });
      expect(val === null || val === 0).toBe(true);
    });

    it('handles very large ranges efficiently', () => {
      // Large range (100 cells)
      for (let i = 0; i < 100; i++) {
        worksheet.setCellValue({ row: i, col: 0 }, 1);
      }
      worksheet.setCellFormula({ row: 100, col: 0 }, '=SUM(A1:A100)');

      const start = Date.now();
      worksheet.autoRecalculate();
      const elapsed = Date.now() - start;

      expect(worksheet.getCellValue({ row: 100, col: 0 })).toBe(100);
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('handles formulas referencing merged cells', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 42);
      worksheet.mergeCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 1 } });
      worksheet.setCellFormula({ row: 2, col: 0 }, '=A1+10'); // Reference merged anchor

      worksheet.autoRecalculate();
      expect(worksheet.getCellValue({ row: 2, col: 0 })).toBe(52);
    });
  });

  // =========================================================================
  // 5. Performance & Stress Tests
  // =========================================================================

  describe('Performance', () => {
    it('handles large dependency graphs', () => {
      // Create chain: A1 → B1 → C1 → ... → Z1
      worksheet.setCellValue({ row: 0, col: 0 }, 1);
      for (let col = 1; col < 26; col++) {
        const prevCol = String.fromCharCode(64 + col); // A, B, C, ...
        worksheet.setCellFormula({ row: 0, col }, `=${prevCol}1+1`);
      }

      const start = Date.now();
      worksheet.autoRecalculate();
      const elapsed = Date.now() - start;

      expect(worksheet.getCellValue({ row: 0, col: 25 })).toBe(26); // Z1 = 26
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });

    it('handles diamond dependency pattern', () => {
      // A1 → B1, C1
      // B1, C1 → D1
      worksheet.setCellValue({ row: 0, col: 0 }, 10);
      worksheet.setCellFormula({ row: 0, col: 1 }, '=A1*2'); // B1 = 20
      worksheet.setCellFormula({ row: 0, col: 2 }, '=A1*3'); // C1 = 30
      worksheet.setCellFormula({ row: 0, col: 3 }, '=B1+C1'); // D1 = 50

      worksheet.autoRecalculate();
      expect(worksheet.getCellValue({ row: 0, col: 3 })).toBe(50);
    });
  });
});
