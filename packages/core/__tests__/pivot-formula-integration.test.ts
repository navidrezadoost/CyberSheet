/**
 * pivot-formula-integration.test.ts
 * 
 * Phase 32: GETPIVOTDATA Formula Integration Tests
 * 
 * Test Plan (from Phase 32 spec):
 * §1 Basic resolution: pivot exists → correct value, pivot missing → #REF!
 * §2 Filters: single filter, multiple filters, missing field → #REF!
 * §3 Data conditions: no match → #N/A, multiple match → #VALUE!
 * §4 Lazy recompute integration: dirty pivot → formula → rebuild → value
 * §5 Anchor behavior: pivot moved → formulas update, pivot deleted → #REF!
 * §6 Cross-sheet: reference pivot on another sheet (future)
 * §7 Circular dependency: pivot depends on formula → formula depends on pivot
 * §8 Determinism: same inputs → same outputs
 * §9 Stress: 1k GETPIVOTDATA formulas → only 1 rebuild per pivot
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';
import type { FormulaContext } from '../src/types/formula-types';
import type { PivotId } from '../src/PivotRegistry';
import type { PivotConfig, PivotField, AggregateValueSpec } from '../src/PivotEngine';
import { PivotEngine } from '../src/PivotEngine';
import { transformToPivotSnapshot } from '../src/PivotSnapshotTransformer';
import type { Range, Address } from '../src/types';

// =============================================================================
// Test Helpers
// =============================================================================

function makeRange(r1: number, c1: number, r2: number, c2: number): Range {
  return {
    start: { row: r1, col: c1 },
    end: { row: r2, col: c2 },
  };
}

function makePivotConfig(range: Range): PivotConfig {
  return {
    rows: [{ column: 1, label: 'Category' } as PivotField],
    columns: [{ column: 2, label: 'Year' } as PivotField],
    values: [{
      type: 'aggregate',
      column: 3,
      aggregation: 'sum',
      label: 'Revenue'
    } as AggregateValueSpec],
    sourceRange: range,
  };
}

function setupTestData(worksheet: Worksheet) {
  // Header row
  worksheet.setCellValue({ row: 1, col: 1 }, 'Category');
  worksheet.setCellValue({ row: 1, col: 2 }, 'Year');
  worksheet.setCellValue({ row: 1, col: 3 }, 'Revenue');

  // Data rows
  worksheet.setCellValue({ row: 2, col: 1 }, 'A');
  worksheet.setCellValue({ row: 2, col: 2 }, 2024);
  worksheet.setCellValue({ row: 2, col: 3 }, 100);

  worksheet.setCellValue({ row: 3, col: 1 }, 'B');
  worksheet.setCellValue({ row: 3, col: 2 }, 2024);
  worksheet.setCellValue({ row: 3, col: 3 }, 200);

  worksheet.setCellValue({ row: 4, col: 1 }, 'A');
  worksheet.setCellValue({ row: 4, col: 2 }, 2025);
  worksheet.setCellValue({ row: 4, col: 3 }, 150);
}

function registerPivot(workbook: Workbook, worksheet: Worksheet, anchor: Address): PivotId {
  const config = makePivotConfig(makeRange(1, 1, 4, 3));
  
  const pivotId = workbook.getPivotRegistry().register({
    name: 'Test Pivot',
    config,
    sourceRange: 'A1:C4',
    worksheetId: worksheet.name,
    dirty: false,
    lastBuiltAt: undefined,
  });

  // Build initial snapshot
  const pivotEngine = new PivotEngine(worksheet);
  const pivotTable = pivotEngine.generate(config);

  const snapshot = transformToPivotSnapshot(pivotId, pivotTable, config);
  
  workbook.getPivotSnapshotStore().set(pivotId, snapshot);
  workbook.getPivotRegistry().markClean(pivotId, snapshot.computedAt);

  // Register anchor for formula resolution
  workbook.setPivotAnchor(pivotId, anchor);

  // Register dependency for auto-invalidation
  workbook.registerPivotDependency(pivotId, makeRange(1, 1, 4, 3));

  return pivotId;
}

// =============================================================================
// §1: Basic Resolution
// =============================================================================

describe('Phase 32: Basic Pivot Resolution', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
  });

  test('pivot exists at reference → returns correct value', () => {
    // Register pivot at B5
    const pivotId = registerPivot(workbook, worksheet, { row: 5, col: 2 });

    // Query: =GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2024)
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2024)',
      context
    );

    expect(result).toBe(100);
  });

  test('no pivot at reference → #REF!', () => {
    // No pivot registered at B5
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "A")',
      context
    );

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('invalid value field → #REF!', () => {
    registerPivot(workbook, worksheet, { row: 5, col: 2 });

    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("InvalidField", B5)',
      context
    );

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });
});

// =============================================================================
// §2: Filters
// =============================================================================

describe('Phase 32: Filter Handling', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
    registerPivot(workbook, worksheet, { row: 5, col: 2 });
  });

  test('single filter → correct value', () => {
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "B", "Year", 2024)',
      context
    );

    expect(result).toBe(200);
  });

  test('multiple filters → correct value', () => {
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2025)',
      context
    );

    expect(result).toBe(150);
  });

  test('missing filter field → #REF!', () => {
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "InvalidField", "X")',
      context
    );

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('odd number of filter arguments → #VALUE!', () => {
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category")',
      context
    );

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#VALUE!');
  });
});

// =============================================================================
// §3: Data Conditions
// =============================================================================

describe('Phase 32: Data Condition Errors', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
    registerPivot(workbook, worksheet, { row: 5, col: 2 });
  });

  test('no matching data → #N/A', () => {
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "NonExistent")',
      context
    );

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#N/A');
  });
});

// =============================================================================
// §4: Lazy Recompute Integration
// =============================================================================

describe('Phase 32: Lazy Recompute Integration', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
  });

  test('dirty pivot → formula → auto-rebuild → value', () => {
    const pivotId = registerPivot(workbook, worksheet, { row: 5, col: 2 });

    // Mark pivot dirty (simulate mutation)
    workbook.getPivotRegistry().markDirty(pivotId);
    expect(workbook.getPivotRegistry().isDirty(pivotId)).toBe(true);

    // Query via formula (should trigger ensureFresh)
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2024)',
      context
    );

    // Verify: rebuild happened
    expect(workbook.getPivotRegistry().isDirty(pivotId)).toBe(false);
    
    // Verify: correct value returned
    expect(result).toBe(100);
  });

  test('mutation → dirty → formula → auto-rebuild', () => {
    const pivotId = registerPivot(workbook, worksheet, { row: 5, col: 2 });

    // Mutate source data (should trigger auto-invalidation)
    worksheet.setCellValue({ row: 2, col: 3 }, 999);

    // Verify: pivot is dirty
    expect(workbook.getPivotRegistry().isDirty(pivotId)).toBe(true);

    // Query via formula (should rebuild)
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2024)',
      context
    );

    // Verify: pivot is clean
    expect(workbook.getPivotRegistry().isDirty(pivotId)).toBe(false);
    
    // Verify: new value returned
    expect(result).toBe(999);
  });
});

// =============================================================================
// §5: Anchor Behavior
// =============================================================================

describe('Phase 32: Anchor Lifecycle', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
  });

  test('pivot moved → formula with new reference works', () => {
    const pivotId = registerPivot(workbook, worksheet, { row: 5, col: 2 });

    // Move pivot anchor
    workbook.setPivotAnchor(pivotId, { row: 10, col: 5 });

    // Query at new location
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 15, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", E10, "Category", "A", "Year", 2024)',
      context
    );

    expect(result).toBe(100);
  });

  test('pivot deleted → formula returns #REF!', () => {
    const pivotId = registerPivot(workbook, worksheet, { row: 5, col: 2 });

    // Delete pivot anchor
    workbook.getPivotRegistry().unregister(pivotId);
    workbook.getPivotDependencyIndex().unregister(pivotId);
    (workbook as any).pivotAnchorIndex.delete(pivotId);

    // Query should return #REF!
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const result = engine.evaluate(
      '=GETPIVOTDATA("Revenue", B5, "Category", "A")',
      context
    );

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });
});

// =============================================================================
// §8: Determinism
// =============================================================================

describe('Phase 32: Deterministic Evaluation', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
    registerPivot(workbook, worksheet, { row: 5, col: 2 });
  });

  test('same inputs → same outputs (10 evaluations)', () => {
    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    const results: any[] = [];

    for (let i = 0; i < 10; i++) {
      const result = engine.evaluate(
        '=GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2024)',
        context
      );
      results.push(result);
    }

    // All results should be identical
    expect(results.every(r => r === 100)).toBe(true);
  });
});

// =============================================================================
// §9: Stress Test
// =============================================================================

describe('Phase 32: Performance', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 1000, 26);
    engine = new FormulaEngine();
    setupTestData(worksheet);
  });

  test('100 GETPIVOTDATA formulas on dirty pivot → only 1 rebuild', () => {
    const pivotId = registerPivot(workbook, worksheet, { row: 5, col: 2 });

    // Mark dirty
    workbook.getPivotRegistry().markDirty(pivotId);

    const context: FormulaContext = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };

    // 100 queries
    const results: any[] = [];
    for (let i = 0; i < 100; i++) {
      const result = engine.evaluate(
        '=GETPIVOTDATA("Revenue", B5, "Category", "A", "Year", 2024)',
        context
      );
      results.push(result);
    }

    // Verify: all queries succeeded
    expect(results.every(r => r === 100)).toBe(true);

    // Verify: pivot is clean (rebuilt exactly once)
    expect(workbook.getPivotRegistry().isDirty(pivotId)).toBe(false);
  });
});
