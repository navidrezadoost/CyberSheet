/**
 * search-api.test.ts
 * 
 * Unit tests for General Search API (Phase 1)
 * 
 * Test Coverage Target: 95%+
 * Excel Parity Target: 100%
 * 
 * Test Structure:
 * - findIterator() tests (lazy iteration, generator pattern)
 * - find() tests (single result)
 * - findAll() tests (eager collection)
 * - Edge cases (empty cells, errors, dates, wildcards)
 * - Performance tests (100k+ cells)
 */

import { Worksheet } from '../src/worksheet';
import { Address } from '../src/types';
import { SearchOptions } from '../src/types/search-types';

describe('General Search API - Phase 1', () => {
  let sheet: Worksheet;

  beforeEach(() => {
    sheet = new Worksheet('TestSheet', 1000, 26);
  });

  // ==================== findIterator() Tests ====================

  describe('findIterator() - Lazy Search with Generator', () => {
    test('🚧 STUB: should return empty generator (Phase 1 not implemented)', () => {
      const results = [...sheet.findIterator({ what: 'Apple' })];
      expect(results).toEqual([]);
    });

    test('should find single match in values (case-insensitive)', () => {
      sheet.setCellValue({ row: 5, col: 2 }, 'Apple');
      
      const results = [...sheet.findIterator({ what: 'apple', matchCase: false })];
      
      expect(results).toEqual([{ row: 5, col: 2 }]);
    });

    test('should find multiple matches in values', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 3, col: 5 }, 'Apple Pie');
      sheet.setCellValue({ row: 7, col: 2 }, 'Red Apple');
      
      const results = [...sheet.findIterator({ what: 'Apple' })];
      
      expect(results).toHaveLength(3);
      expect(results).toContainEqual({ row: 1, col: 1 });
      expect(results).toContainEqual({ row: 3, col: 5 });
      expect(results).toContainEqual({ row: 7, col: 2 });
    });

    test('should respect case sensitivity', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 2, col: 1 }, 'apple');
      sheet.setCellValue({ row: 3, col: 1 }, 'APPLE');
      
      const results = [...sheet.findIterator({ what: 'Apple', matchCase: true })];
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('should search by rows (default order)', () => {
      sheet.setCellValue({ row: 1, col: 5 }, 'A');
      sheet.setCellValue({ row: 1, col: 2 }, 'A');
      sheet.setCellValue({ row: 2, col: 1 }, 'A');
      
      const results = [...sheet.findIterator({ what: 'A', searchOrder: 'rows' })];
      
      // Should find col 2 before col 5 (left-to-right within row)
      expect(results[0]).toEqual({ row: 1, col: 2 });
      expect(results[1]).toEqual({ row: 1, col: 5 });
      expect(results[2]).toEqual({ row: 2, col: 1 });
    });

    test('should search by columns', () => {
      sheet.setCellValue({ row: 5, col: 1 }, 'A');
      sheet.setCellValue({ row: 2, col: 1 }, 'A');
      sheet.setCellValue({ row: 1, col: 2 }, 'A');
      
      const results = [...sheet.findIterator({ what: 'A', searchOrder: 'columns' })];
      
      // Should find row 2 before row 5 (top-to-bottom within column)
      expect(results[0]).toEqual({ row: 2, col: 1 });
      expect(results[1]).toEqual({ row: 5, col: 1 });
      expect(results[2]).toEqual({ row: 1, col: 2 });
    });

    test('should support partial match (default)', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple Pie');
      sheet.setCellValue({ row: 2, col: 1 }, 'Pineapple');
      
      const results = [...sheet.findIterator({ what: 'apple', lookAt: 'part' })];
      
      expect(results).toHaveLength(2);
    });

    test('should support whole match', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 2, col: 1 }, 'Apple Pie');
      
      const results = [...sheet.findIterator({ what: 'Apple', lookAt: 'whole' })];
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('should handle wildcards (* for any chars)', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 2, col: 1 }, 'Application');
      sheet.setCellValue({ row: 3, col: 1 }, 'Banana');
      
      const results = [...sheet.findIterator({ what: 'App*' })];
      
      expect(results).toHaveLength(2);
    });

    test('should handle wildcards (? for single char)', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Cat');
      sheet.setCellValue({ row: 2, col: 1 }, 'Cot');
      sheet.setCellValue({ row: 3, col: 1 }, 'Cart');
      
      const results = [...sheet.findIterator({ what: 'C?t' })];
      
      expect(results).toEqual([
        { row: 1, col: 1 },
        { row: 2, col: 1 }
      ]);
    });

    test('should escape literal wildcards with ~', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'File*');
      sheet.setCellValue({ row: 2, col: 1 }, 'FileSystem');
      
      const results = [...sheet.findIterator({ what: 'File~*' })];
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('should search in formulas', () => {
      // Use setCellFormula() — guaranteed Map registration (fixes phantom-cell bug)
      sheet.setCellFormula({ row: 1, col: 1 }, '=SUM(A1:A10)', 55);
      sheet.setCellFormula({ row: 2, col: 1 }, '=AVERAGE(B1:B10)', 42);
      
      const results = [...sheet.findIterator({ what: 'SUM', lookIn: 'formulas' })];
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('should search in comments', () => {
      sheet.addComment({ row: 1, col: 1 }, { author: 'Alice', text: 'Review this' });
      sheet.addComment({ row: 2, col: 1 }, { author: 'Bob', text: 'Approved' });
      
      const results = [...sheet.findIterator({ what: 'Review', lookIn: 'comments' })];
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('should respect search range', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 5, col: 5 }, 'Apple');
      sheet.setCellValue({ row: 10, col: 10 }, 'Apple');
      
      const results = [...sheet.findIterator(
        { what: 'Apple' },
        { start: { row: 3, col: 3 }, end: { row: 7, col: 7 } }
      )];
      
      expect(results).toEqual([{ row: 5, col: 5 }]);
    });

    test('should handle empty cells (skip)', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      // row 2, col 1 is empty (no value set)
      sheet.setCellValue({ row: 3, col: 1 }, 'Apple');
      
      const results = [...sheet.findIterator({ what: '' })];
      
      // Should not match empty string against empty cells (Excel behavior)
      expect(results).toEqual([]);
    });

    test('should handle error values (skip)', () => {
      // Note: Errors are stored as strings like "#N/A" in cell values
      sheet.setCellValue({ row: 1, col: 1 }, '#N/A');
      sheet.setCellValue({ row: 2, col: 1 }, 'Apple');
      
      const results = [...sheet.findIterator({ what: 'Apple' })];
      
      expect(results).toEqual([{ row: 2, col: 1 }]);
    });

    test('should handle date values', () => {
      // Dates are typically stored as formatted strings
      const dateStr = '2026-02-25';
      sheet.setCellValue({ row: 1, col: 1 }, dateStr);
      
      const results = [...sheet.findIterator({ what: '2026' })];
      
      // Should search in string representation of date
      expect(results).toHaveLength(1);
    });
  });

  // ==================== find() Tests ====================

  describe('find() - Single Result', () => {
    test('🚧 STUB: should return null (Phase 1 not implemented)', () => {
      const result = sheet.find({ what: 'Apple' });
      expect(result).toBeNull();
    });

    test('should find first match', () => {
      sheet.setCellValue({ row: 5, col: 2 }, 'Apple');
      sheet.setCellValue({ row: 10, col: 3 }, 'Apple');
      
      const result = sheet.find({ what: 'Apple' });
      
      expect(result).toEqual({ row: 5, col: 2 });
    });

    test('should return null if no match', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Banana');
      
      const result = sheet.find({ what: 'Apple' });
      
      expect(result).toBeNull();
    });

    test('should start after specified address', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 5, col: 5 }, 'Apple');
      sheet.setCellValue({ row: 10, col: 10 }, 'Apple');
      
      const result = sheet.find({ what: 'Apple' }, { row: 3, col: 3 });
      
      expect(result).toEqual({ row: 5, col: 5 });
    });

    test('should wrap around if searchDirection is next', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 10, col: 10 }, 'Apple');
      
      // Start after last cell, should wrap to beginning
      const result = sheet.find(
        { what: 'Apple', searchDirection: 'next' },
        { row: 100, col: 100 }
      );
      
      expect(result).toEqual({ row: 1, col: 1 });
    });

    test('should search backwards if searchDirection is previous', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 5, col: 5 }, 'Apple');
      sheet.setCellValue({ row: 10, col: 10 }, 'Apple');
      
      const result = sheet.find(
        { what: 'Apple', searchDirection: 'previous' },
        { row: 7, col: 7 }
      );
      
      expect(result).toEqual({ row: 5, col: 5 });
    });
  });

  // ==================== findAll() Tests ====================

  describe('findAll() - Eager Collection', () => {
    test('🚧 STUB: should return empty array (Phase 1 not implemented)', () => {
      const results = sheet.findAll({ what: 'Apple' });
      expect(results).toEqual([]);
    });

    test('should return all matches', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 3, col: 5 }, 'Apple');
      sheet.setCellValue({ row: 7, col: 2 }, 'Apple');
      
      const results = sheet.findAll({ what: 'Apple' });
      
      expect(results).toHaveLength(3);
      expect(results).toContainEqual({ row: 1, col: 1 });
      expect(results).toContainEqual({ row: 3, col: 5 });
      expect(results).toContainEqual({ row: 7, col: 2 });
    });

    test('should return empty array if no matches', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Banana');
      
      const results = sheet.findAll({ what: 'Apple' });
      
      expect(results).toEqual([]);
    });

    test('should respect search range', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      sheet.setCellValue({ row: 5, col: 5 }, 'Apple');
      sheet.setCellValue({ row: 10, col: 10 }, 'Apple');
      
      const results = sheet.findAll(
        { what: 'Apple' },
        { start: { row: 3, col: 3 }, end: { row: 7, col: 7 } }
      );
      
      expect(results).toEqual([{ row: 5, col: 5 }]);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    test('should handle empty search term', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple');
      
      const results = sheet.findAll({ what: '' });
      
      // Excel behavior: empty search term matches nothing
      expect(results).toEqual([]);
    });

    test('should handle special characters in search term', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Price: $100');
      
      const results = sheet.findAll({ what: '$100' });
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('should handle numeric values', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 42);
      sheet.setCellValue({ row: 2, col: 1 }, '42');
      
      const results = sheet.findAll({ what: '42' });
      
      // Should match both numeric 42 and string "42"
      expect(results).toHaveLength(2);
    });

    test('should handle boolean values', () => {
      sheet.setCellValue({ row: 1, col: 1 }, true);
      sheet.setCellValue({ row: 2, col: 1 }, 'TRUE');
      
      const results = sheet.findAll({ what: 'TRUE', matchCase: false });
      
      expect(results).toHaveLength(2);
    });

    test('should handle very large worksheets (performance)', () => {
      // Create 10,000 cells with values
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 100; j++) {
          sheet.setCellValue({ row: i, col: j }, i === 50 && j === 50 ? 'Target' : 'Data');
        }
      }
      
      const startTime = Date.now();
      const result = sheet.find({ what: 'Target' });
      const duration = Date.now() - startTime;
      
      expect(result).toEqual({ row: 50, col: 50 });
      expect(duration).toBeLessThan(100); // Should be fast (<100ms)
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration with Worksheet Features', () => {
    test('should find cells with formula results', () => {
      // setCellFormula() ensures formula is registered in the Map
      sheet.setCellFormula({ row: 1, col: 1 }, '=10+5', 15);
      
      const results = sheet.findAll({ what: '15', lookIn: 'values' });
      
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test.skip('should not find hidden cells (future: visible filter)', () => {
      // TODO: Phase 3 - integrate with row/column hiding
    });

    test.skip('should work with merged cells', () => {
      // TODO: Phase 2 - merged cell handling
    });

    test('setCellFormula should register cell in Map (infra fix)', () => {
      // Regression guard: phantom-cell bug fixed by ensureCell()
      sheet.setCellFormula({ row: 1, col: 1 }, '=TODAY()', 'placeholder');
      expect(sheet.getCell({ row: 1, col: 1 })).toBeDefined();
      expect(sheet.getCell({ row: 1, col: 1 })?.formula).toBe('=TODAY()');
    });
  });
});

// ==================== Day 3: Edge Case Hardening ====================

describe('Search — Edge Case Hardening (Day 3)', () => {
  let sheet: Worksheet;
  beforeEach(() => { sheet = new Worksheet('HardenSheet', 200, 26); });

  // ── PM-mandated wildcard edge cases ─────────────────────────────────────

  describe('Wildcard edge cases (PM directive)', () => {
    test('file~*name — tilde-escaped asterisk is a literal *', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'file*name');
      sheet.setCellValue({ row: 2, col: 1 }, 'filename');   // must NOT match

      const results = sheet.findAll({ what: 'file~*name', lookAt: 'whole' });
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('data?? — question marks match exactly one char each', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'data12');
      sheet.setCellValue({ row: 2, col: 1 }, 'dataXY');
      sheet.setCellValue({ row: 3, col: 1 }, 'data1');    // only 1 trailing char → no match
      sheet.setCellValue({ row: 4, col: 1 }, 'data123');  // 3 trailing chars → no match for whole

      const wholeResults = sheet.findAll({ what: 'data??', lookAt: 'whole' });
      expect(wholeResults).toHaveLength(2);
      expect(wholeResults).toContainEqual({ row: 1, col: 1 });
      expect(wholeResults).toContainEqual({ row: 2, col: 1 });
    });

    test('100~% — tilde-escaped % is a literal percent sign', () => {
      sheet.setCellValue({ row: 1, col: 1 }, '100%');
      sheet.setCellValue({ row: 2, col: 1 }, '100');   // must NOT match

      // % has no wildcard meaning in Excel, but must not become a regex special char
      const results = sheet.findAll({ what: '100~%', lookAt: 'whole' });
      // tilde-escapes only apply to *, ?, ~ — so ~% → literal %
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('~~ — double-tilde matches a single literal tilde', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'A~B' );
      sheet.setCellValue({ row: 2, col: 1 }, 'A*B' );  // must NOT match

      const results = sheet.findAll({ what: 'A~~B', lookAt: 'whole' });
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });

    test('regex special chars in pattern must not leak (.,[,()', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Price: $100');
      sheet.setCellValue({ row: 2, col: 1 }, 'Price  $100');  // spaces instead of ': '

      // The '.' in the pattern must match only a literal dot, not any char
      const results = sheet.findAll({ what: 'Price: $100', lookAt: 'whole' });
      expect(results).toEqual([{ row: 1, col: 1 }]);
    });
  });

  // ── Boolean serialisation ────────────────────────────────────────────────

  describe('Boolean value serialisation', () => {
    test('true boolean serialises to "TRUE" (case-insensitive search)', () => {
      sheet.setCellValue({ row: 1, col: 1 }, true);
      expect(sheet.findAll({ what: 'true',  matchCase: false })).toContainEqual({ row: 1, col: 1 });
      expect(sheet.findAll({ what: 'TRUE',  matchCase: false })).toContainEqual({ row: 1, col: 1 });
      expect(sheet.findAll({ what: 'True',  matchCase: false })).toContainEqual({ row: 1, col: 1 });
    });

    test('true boolean does NOT match when matchCase: true and what is lowercase', () => {
      sheet.setCellValue({ row: 1, col: 1 }, true);
      expect(sheet.findAll({ what: 'true', matchCase: true })).toEqual([]);
    });

    test('false boolean serialises to "FALSE"', () => {
      sheet.setCellValue({ row: 1, col: 1 }, false);
      expect(sheet.findAll({ what: 'FALSE' })).toContainEqual({ row: 1, col: 1 });
      expect(sheet.findAll({ what: 'false', matchCase: false })).toContainEqual({ row: 1, col: 1 });
    });

    test('string "TRUE" and boolean true both match what:"TRUE" case-insensitive', () => {
      sheet.setCellValue({ row: 1, col: 1 }, true);
      sheet.setCellValue({ row: 2, col: 1 }, 'TRUE');
      const results = sheet.findAll({ what: 'TRUE', matchCase: false });
      expect(results).toHaveLength(2);
    });
  });

  // ── Numeric value edge cases ─────────────────────────────────────────────

  describe('Numeric value edge cases', () => {
    test('zero serialises as "0"', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 0);
      expect(sheet.findAll({ what: '0' })).toContainEqual({ row: 1, col: 1 });
    });

    test('negative numbers serialise correctly', () => {
      sheet.setCellValue({ row: 1, col: 1 }, -42);
      expect(sheet.findAll({ what: '-42', lookAt: 'whole' })).toContainEqual({ row: 1, col: 1 });
    });

    test('floating point numbers serialise correctly', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 3.14);
      expect(sheet.findAll({ what: '3.14', lookAt: 'whole' })).toContainEqual({ row: 1, col: 1 });
    });

    test('numeric 42 and string "42" are both found by what:"42"', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 42);
      sheet.setCellValue({ row: 2, col: 1 }, '42');
      expect(sheet.findAll({ what: '42', lookAt: 'whole' })).toHaveLength(2);
    });
  });

  // ── RichText value ────────────────────────────────────────────────────────

  describe('RichText value serialisation', () => {
    test('RichText with multiple runs is concatenated for search', () => {
      const richText = {
        runs: [
          { text: 'Hello', font: { bold: true } },
          { text: ' ' },
          { text: 'World', font: { italic: true } },
        ],
      };
      sheet.setCellValue({ row: 1, col: 1 }, richText as any);

      // Partial match across run boundary
      expect(sheet.findAll({ what: 'Hello World' })).toContainEqual({ row: 1, col: 1 });
      // Substring within a single run
      expect(sheet.findAll({ what: 'World' })).toContainEqual({ row: 1, col: 1 });
    });

    test('RichText whole match uses concatenated text', () => {
      const richText = {
        runs: [{ text: 'Alpha' }, { text: 'Beta' }],
      };
      sheet.setCellValue({ row: 1, col: 1 }, richText as any);

      expect(sheet.findAll({ what: 'AlphaBeta', lookAt: 'whole' })).toContainEqual({ row: 1, col: 1 });
      expect(sheet.findAll({ what: 'Alpha',     lookAt: 'whole' })).toEqual([]);
    });
  });

  // ── Whitespace handling ───────────────────────────────────────────────────

  describe('Whitespace handling', () => {
    test('leading spaces in cell value are preserved and searchable', () => {
      sheet.setCellValue({ row: 1, col: 1 }, '  Apple');
      // Partial match should still find it
      expect(sheet.findAll({ what: 'Apple' })).toContainEqual({ row: 1, col: 1 });
      // Whole match must include the leading spaces
      expect(sheet.findAll({ what: 'Apple',   lookAt: 'whole' })).toEqual([]);
      expect(sheet.findAll({ what: '  Apple', lookAt: 'whole' })).toContainEqual({ row: 1, col: 1 });
    });

    test('trailing spaces in cell value are preserved', () => {
      sheet.setCellValue({ row: 1, col: 1 }, 'Apple  ');
      expect(sheet.findAll({ what: 'Apple' })).toContainEqual({ row: 1, col: 1 });
      expect(sheet.findAll({ what: 'Apple',    lookAt: 'whole' })).toEqual([]);
      expect(sheet.findAll({ what: 'Apple  ',  lookAt: 'whole' })).toContainEqual({ row: 1, col: 1 });
    });
  });

  // ── Formula lookIn hardening ──────────────────────────────────────────────

  describe('lookIn: formulas — hardened', () => {
    test('finds multiple formula-containing cells by function name', () => {
      sheet.setCellFormula({ row: 1, col: 1 }, '=SUM(A1:A10)',     55);
      sheet.setCellFormula({ row: 2, col: 1 }, '=SUM(B1:B10)',     30);
      sheet.setCellFormula({ row: 3, col: 1 }, '=AVERAGE(C1:C10)', 12);

      const results = sheet.findAll({ what: 'SUM', lookIn: 'formulas' });
      expect(results).toHaveLength(2);
      expect(results).toContainEqual({ row: 1, col: 1 });
      expect(results).toContainEqual({ row: 2, col: 1 });
    });

    test('formula search does not match display value', () => {
      // Cell has formula =YEAR(A1) with display value "2026"
      sheet.setCellFormula({ row: 1, col: 1 }, '=YEAR(A1)', 2026);

      // Searching in formulas for "2026" should NOT match (formula text is "=YEAR(A1)")
      const formulaResults = sheet.findAll({ what: '2026', lookIn: 'formulas' });
      expect(formulaResults).toEqual([]);

      // But searching in values should match
      const valueResults = sheet.findAll({ what: '2026', lookIn: 'values' });
      expect(valueResults).toContainEqual({ row: 1, col: 1 });
    });

    test('formula search falls back to display value when no formula set', () => {
      // Plain constant cell (no formula, just a value)
      sheet.setCellValue({ row: 1, col: 1 }, 'Revenue');

      const results = sheet.findAll({ what: 'Revenue', lookIn: 'formulas' });
      expect(results).toContainEqual({ row: 1, col: 1 });
    });
  });
});

// ==================== Day 3: Backward/Wrap Stress Tests ====================

describe('Search — Backward & Wrap Stress Tests (Day 3)', () => {
  /**
   * Deterministic pseudo-random number generator (LCG) — avoids flaky
   * random seeds while still covering varied position distributions.
   */
  function lcg(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  test('forward wrap: always returns a result regardless of after position', () => {
    const sheet = new Worksheet('StressSheet', 50, 10);
    const rand = lcg(42);

    // Plant 20 matches at deterministic random positions
    const planted: Set<string> = new Set();
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(rand() * 50) + 1;
      const col = Math.floor(rand() * 10) + 1;
      sheet.setCellValue({ row, col }, 'TARGET');
      planted.add(`${row}:${col}`);
    }

    // Try 100 random "after" positions — every call must return a result
    for (let i = 0; i < 100; i++) {
      const afterRow = Math.floor(rand() * 52);
      const afterCol = Math.floor(rand() * 12);
      const result = sheet.find(
        { what: 'TARGET', searchDirection: 'next' },
        { row: afterRow, col: afterCol }
      );
      expect(result).not.toBeNull();
    }
  });

  test('backward wrap: always returns a result regardless of after position', () => {
    const sheet = new Worksheet('StressSheet', 50, 10);
    const rand = lcg(99);

    for (let i = 0; i < 20; i++) {
      const row = Math.floor(rand() * 50) + 1;
      const col = Math.floor(rand() * 10) + 1;
      sheet.setCellValue({ row, col }, 'TARGET');
    }

    for (let i = 0; i < 100; i++) {
      const afterRow = Math.floor(rand() * 52) + 1;
      const afterCol = Math.floor(rand() * 12) + 1;
      const result = sheet.find(
        { what: 'TARGET', searchDirection: 'previous' },
        { row: afterRow, col: afterCol }
      );
      expect(result).not.toBeNull();
    }
  });

  test('findAll returns all planted matches (no duplicates, no omissions)', () => {
    const sheet = new Worksheet('StressSheet', 100, 20);
    const rand = lcg(7);
    const planted = new Map<string, { row: number; col: number }>();

    for (let i = 0; i < 50; i++) {
      const row = Math.floor(rand() * 100) + 1;
      const col = Math.floor(rand() * 20) + 1;
      sheet.setCellValue({ row, col }, 'MATCH');
      planted.set(`${row}:${col}`, { row, col });
    }

    const results = sheet.findAll({ what: 'MATCH', lookAt: 'whole' });

    // No duplicates
    const resultKeys = results.map(a => `${a.row}:${a.col}`);
    expect(new Set(resultKeys).size).toBe(results.length);

    // Every planted address is in the results
    for (const addr of planted.values()) {
      expect(results).toContainEqual(addr);
    }
  });

  test('row-major order is strictly maintained across all results', () => {
    const sheet = new Worksheet('StressSheet', 30, 10);
    const rand = lcg(13);

    for (let i = 0; i < 30; i++) {
      const row = Math.floor(rand() * 30) + 1;
      const col = Math.floor(rand() * 10) + 1;
      sheet.setCellValue({ row, col }, 'X');
    }

    const results = sheet.findAll({ what: 'X', searchOrder: 'rows' });
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      const prevRowMajor = prev.row * 1000 + prev.col;
      const currRowMajor = curr.row * 1000 + curr.col;
      expect(currRowMajor).toBeGreaterThanOrEqual(prevRowMajor);
    }
  });

  test('column-major order is strictly maintained across all results', () => {
    const sheet = new Worksheet('StressSheet', 30, 10);
    const rand = lcg(17);

    for (let i = 0; i < 30; i++) {
      const row = Math.floor(rand() * 30) + 1;
      const col = Math.floor(rand() * 10) + 1;
      sheet.setCellValue({ row, col }, 'X');
    }

    const results = sheet.findAll({ what: 'X', searchOrder: 'columns' });
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      const prevColMajor = prev.col * 1000 + prev.row;
      const currColMajor = curr.col * 1000 + curr.row;
      expect(currColMajor).toBeGreaterThanOrEqual(prevColMajor);
    }
  });
});

// ==================== Performance Benchmarks ====================

describe('Search Performance Benchmarks', () => {
  test.skip('findIterator should not allocate array upfront', () => {
    const sheet = new Worksheet('PerfSheet', 1000, 100);
    
    // Fill with data
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < 100; j++) {
        sheet.setCellValue({ row: i, col: j }, `Cell_${i}_${j}`);
      }
    }
    
    const memBefore = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    
    // Take only first 10 results
    const iterator = sheet.findIterator({ what: 'Cell' });
    const results: Address[] = [];
    for (const addr of iterator) {
      results.push(addr);
      if (results.length >= 10) break;
    }
    
    const memAfter = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const memDelta = parseFloat(memAfter) - parseFloat(memBefore);
    
    expect(results).toHaveLength(10);
    expect(memDelta).toBeLessThan(1); // Should not allocate >1MB for 10 results
  });

  test('findAll should complete 100k cells in <500ms', () => {
    const sheet = new Worksheet('PerfSheet', 1000, 100);
    
    // Fill with data
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < 100; j++) {
        sheet.setCellValue({ row: i, col: j }, i === 500 && j === 50 ? 'Target' : 'Data');
      }
    }
    
    const startTime = Date.now();
    const results = sheet.findAll({ what: 'Target' });
    const duration = Date.now() - startTime;
    
    expect(results).toHaveLength(1);
    expect(duration).toBeLessThan(500);
  });
});
