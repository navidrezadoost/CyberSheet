/**
 * Phase 33: Calculated Fields Test Suite  
 * Post-aggregation formula evaluation
 */

declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare const expect: any;
import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';
import { PivotEngine } from '../src/PivotEngine';
import type { PivotConfig } from '../src/PivotEngine';
import type { CalculatedField } from '../src/PivotCalculatedFields';
import { PivotCalculatedFieldEngine, PivotCalculatedFieldError } from '../src/PivotCalculatedFields';

function setupTestData(worksheet: Worksheet) {
  // Header row
  worksheet.setCellValue({ row: 1, col: 1 }, 'Category');
  worksheet.setCellValue({ row: 1, col: 2 }, 'Revenue');
  worksheet.setCellValue({ row: 1, col: 3 }, 'Cost');
  worksheet.setCellValue({ row: 1, col: 4 }, 'Units');

  // Data rows
  worksheet.setCellValue({ row: 2, col: 1 }, 'A');
  worksheet.setCellValue({ row: 2, col: 2 }, 1000);
  worksheet.setCellValue({ row: 2, col: 3 }, 600);
  worksheet.setCellValue({ row: 2, col: 4 }, 10);

  worksheet.setCellValue({ row: 3, col: 1 }, 'A');
  worksheet.setCellValue({ row: 3, col: 2 }, 1500);
  worksheet.setCellValue({ row: 3, col: 3 }, 900);
  worksheet.setCellValue({ row: 3, col: 4 }, 15);

  worksheet.setCellValue({ row: 4, col: 1 }, 'B');
  worksheet.setCellValue({ row: 4, col: 2 }, 800);
  worksheet.setCellValue({ row: 4, col: 3 }, 500);
  worksheet.setCellValue({ row: 4, col: 4 }, 8);
}

function makePivotConfig(calculatedFields?: CalculatedField[]): PivotConfig {
  return {
    rows: [{ column: 1, label: 'Category' }],
    columns: [],
    values: [
      { column: 2, aggregation: 'sum', label: 'Revenue' },
      { column: 3, aggregation: 'sum', label: 'Cost' },
      { column: 4, aggregation: 'sum', label: 'Units' }
    ],
    sourceRange: {
      start: { row: 1, col: 1 },
      end: { row: 4, col: 4 }
    },
    calculatedFields
  };
}

// ============================================================================
// §1: Basic Calculated Fields
// ============================================================================

describe('Calculated Fields - Basic Arithmetic', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('simple subtraction: Profit = Revenue - Cost', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A: Revenue=2500, Cost=1500 → Profit=1000
    expect(pivot.data[0][0].values?.['Profit']).toBe(1000);

    // Category B: Revenue=800, Cost=500 → Profit=300
    expect(pivot.data[1][0].values?.['Profit']).toBe(300);
  });

  test('simple division: Margin = (Revenue - Cost) / Revenue', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Margin', formula: '(Revenue - Cost) / Revenue' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A: (2500-1500)/2500 = 0.4
    expect(pivot.data[0][0].values?.['Margin']).toBeCloseTo(0.4, 5);

    // Category B: (800-500)/800 = 0.375
    expect(pivot.data[1][0].values?.['Margin']).toBeCloseTo(0.375, 5);
  });

  test('multiple independent calculated fields', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'AvgPrice', formula: 'Revenue / Units' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A
    expect(pivot.data[0][0].values?.['Profit']).toBe(1000);
    expect(pivot.data[0][0].values?.['AvgPrice']).toBe(100); // 2500 / 25

    // Category B
    expect(pivot.data[1][0].values?.['Profit']).toBe(300);
    expect(pivot.data[1][0].values?.['AvgPrice']).toBe(100); // 800 / 8
  });
});

// ============================================================================
// §2: Multi-Field Dependencies
// ============================================================================

describe('Calculated Fields - Chained Dependencies', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('calculated field depends on another calculated field', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'Margin', formula: 'Profit / Revenue' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A: Profit=1000, Revenue=2500 → Margin=0.4
    expect(pivot.data[0][0].values?.['Profit']).toBe(1000);
    expect(pivot.data[0][0].values?.['Margin']).toBeCloseTo(0.4, 5);
  });

  test('three-level dependency chain', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'Margin', formula: 'Profit / Revenue' },
      { name: 'MarginPercent', formula: 'Margin * 100' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A
    expect(pivot.data[0][0].values?.['Profit']).toBe(1000);
    expect(pivot.data[0][0].values?.['Margin']).toBeCloseTo(0.4, 5);
    expect(pivot.data[0][0].values?.['MarginPercent']).toBeCloseTo(40, 5);
  });
});

// ============================================================================
// §3: Circular Dependency Detection
// ============================================================================

describe('Calculated Fields - Circular Dependencies', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('direct circular dependency throws error', () => {
    const calcFields: CalculatedField[] = [
      { name: 'A', formula: 'B + 1' },
      { name: 'B', formula: 'A + 1' }
    ];

    const config = makePivotConfig(calcFields);

    expect(() => {
      engine.generate(config);
    }).toThrow(PivotCalculatedFieldError);
  });

  test('indirect circular dependency throws error', () => {
    const calcFields: CalculatedField[] = [
      { name: 'A', formula: 'B + 1' },
      { name: 'B', formula: 'C + 1' },
      { name: 'C', formula: 'A + 1' }
    ];

    const config = makePivotConfig(calcFields);

    expect(() => {
      engine.generate(config);
    }).toThrow(PivotCalculatedFieldError);
  });
});

// ============================================================================
// §4: Missing Field Errors
// ============================================================================

describe('Calculated Fields - Missing Fields', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('reference to non-existent field returns #REF! error', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Invalid', formula: 'Unknown - Cost' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Phase 33b: Should return Error('#REF!'), not null
    const result = pivot.data[0][0].values?.['Invalid'];
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });
});

// ============================================================================
// §5: Error Isolation
// ============================================================================

describe('Calculated Fields - Error Isolation', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('one failing field does not affect others', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'Invalid', formula: 'Revenue / 0' },  // Division by zero
      { name: 'AvgPrice', formula: 'Revenue / Units' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Profit should succeed
    expect(pivot.data[0][0].values?.['Profit']).toBe(1000);

    // Phase 33b: Invalid should be Error('#DIV/0!'), not null
    const invalid = pivot.data[0][0].values?.['Invalid'];
    expect(invalid).toBeInstanceOf(Error);
    expect((invalid as Error).message).toBe('#DIV/0!');

    // AvgPrice should succeed
    expect(pivot.data[0][0].values?.['AvgPrice']).toBe(100);
  });
});

// ============================================================================
// §6: Determinism
// ============================================================================

describe('Calculated Fields - Determinism', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('multiple builds produce identical results', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' },
      { name: 'Margin', formula: 'Profit / Revenue' }
    ];

    const config = makePivotConfig(calcFields);

    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
      const pivot = engine.generate(config);
      results.push(pivot.data[0][0].values?.['Margin'] as number);
    }

    // All results should be identical
    expect(results.every(r => r === results[0])).toBe(true);
  });
});

// ============================================================================
// §7: Topological Sort Engine Unit Tests
// ============================================================================

describe('PivotCalculatedFieldEngine - Unit Tests', () => {
  let formulaEngine: FormulaEngine;
  let calcEngine: PivotCalculatedFieldEngine;

  beforeEach(() => {
    formulaEngine = new FormulaEngine();
    calcEngine = new PivotCalculatedFieldEngine(formulaEngine);
  });

  test('compile extracts dependencies correctly', () => {
    const fields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' }
    ];

    const compiled = calcEngine.compile(fields);

    expect(compiled[0].dependsOn).toContain('Revenue');
    expect(compiled[0].dependsOn).toContain('Cost');
  });

  test('topological sort orders fields correctly', () => {
    const fields: CalculatedField[] = [
      { name: 'Margin', formula: 'Profit / Revenue' },
      { name: 'Profit', formula: 'Revenue - Cost' }
    ];

    const compiled = calcEngine.compile(fields);
    const sorted = calcEngine.topologicalSort(compiled);

    // Profit must come before Margin
    expect(sorted[0].name).toBe('Profit');
    expect(sorted[1].name).toBe('Margin');
  });

  test('evaluate with valid context returns number', () => {
    const field: CalculatedField = {
      name: 'Profit',
      formula: 'Revenue - Cost'
    };

    const compiled = calcEngine.compile([field])[0];
    const context = {
      Revenue: 1000,
      Cost: 600
    };

    const result = calcEngine.evaluate(compiled, context);

    expect(result).toBe(400);
  });

  test('evaluate with missing field returns #REF!', () => {
    const field: CalculatedField = {
      name: 'Profit',
      formula: 'Revenue - Cost'
    };

    const compiled = calcEngine.compile([field])[0];
    const context = {
      Revenue: 1000
      // Cost missing
    };

    const result = calcEngine.evaluate(compiled, context);

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });
});

// ============================================================================
// §8: Phase 33b - Error Propagation
// ============================================================================

describe('Phase 33b - Error Propagation', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('error propagates through dependent calculations', () => {
    const calcFields: CalculatedField[] = [
      { name: 'A', formula: '1 / 0' },       // #DIV/0!
      { name: 'B', formula: 'A + 1' },       // Should propagate #DIV/0!
      { name: 'C', formula: 'B * 2' }        // Should propagate #DIV/0!
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // All should be #DIV/0! due to propagation
    const a = pivot.data[0][0].values?.['A'];
    const b = pivot.data[0][0].values?.['B'];
    const c = pivot.data[0][0].values?.['C'];

    expect(a).toBeInstanceOf(Error);
    expect((a as Error).message).toBe('#DIV/0!');
    
    expect(b).toBeInstanceOf(Error);
    expect((b as Error).message).toBe('#DIV/0!');
    
    expect(c).toBeInstanceOf(Error);
    expect((c as Error).message).toBe('#DIV/0!');
  });

  test('error in one branch does not poison independent branch', () => {
    const calcFields: CalculatedField[] = [
      { name: 'ErrorBranch', formula: '1 / 0' },  // #DIV/0!
      { name: 'GoodBranch', formula: 'Revenue - Cost' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    const errorBranch = pivot.data[0][0].values?.['ErrorBranch'];
    const goodBranch = pivot.data[0][0].values?.['GoodBranch'];

    expect(errorBranch).toBeInstanceOf(Error);
    expect((errorBranch as Error).message).toBe('#DIV/0!');
    
    expect(goodBranch).toBe(1000); // Independent, should succeed
  });

  test('different error types preserved correctly', () => {
    const calcFields: CalculatedField[] = [
      { name: 'DivError', formula: 'Revenue / 0' },     // #DIV/0!
      { name: 'RefError', formula: 'UnknownField + 1' } // #REF!
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    const divError = pivot.data[0][0].values?.['DivError'];
    const refError = pivot.data[0][0].values?.['RefError'];

    expect(divError).toBeInstanceOf(Error);
    expect((divError as Error).message).toBe('#DIV/0!');
    
    expect(refError).toBeInstanceOf(Error);
    expect((refError as Error).message).toBe('#REF!');
  });
});

// ============================================================================
// §9: Phase 33b - Caching Tests
// ============================================================================

describe('Phase 33b - Caching', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;
  let formulaEngine: FormulaEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('cache hit reduces evaluation count', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' }
    ];

    const config = makePivotConfig(calcFields);
    
    // Spy on formula engine evaluate
    const originalEvaluate = formulaEngine.evaluate.bind(formulaEngine);
    let evaluateCount = 0;
    formulaEngine.evaluate = function(...args: any[]) {
      evaluateCount++;
      return originalEvaluate(...args);
    };

    const pivot = engine.generate(config);

    // With 2 categories (A, B), should evaluate Profit formula 2 times
    // But each evaluation should be cached and not re-evaluated for same context
    expect(pivot.data.length).toBe(2);
    
    // Each unique category should cause 1 evaluation
    // (cache prevents redundant evaluations within same build)
    expect(evaluateCount).toBeLessThanOrEqual(2);
  });

  test('cache cleared between builds', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' }
    ];

    const config = makePivotConfig(calcFields);
    
    // First build
    const pivot1 = engine.generate(config);
    const profit1 = pivot1.data[0][0].values?.['Profit'];

    // Modify data
    worksheet.setCellValue({ row: 2, col: 2 }, 3000); // Revenue A: 1000 → 3000
    
    // Second build should use fresh cache
    const pivot2 = engine.generate(config);
    const profit2 = pivot2.data[0][0].values?.['Profit'];

    // Results should differ (cache didn't persist incorrectly)
    expect(profit1).toBe(1000);
    expect(profit2).not.toBe(profit1); // Should be 3900 (3000+1500 - 600-900)
  });
});

// ============================================================================
// §10: Phase 33b - Edge Cases
// ============================================================================

describe('Phase 33b - Edge Cases', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let engine: PivotEngine;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    engine = new PivotEngine(worksheet);
    setupTestData(worksheet);
  });

  test('floating-point stability', () => {
    // Add data with 0.1 + 0.2 = 0.30000000000000004 precision issue
    worksheet.setCellValue({ row: 2, col: 2 }, 0.1);
    worksheet.setCellValue({ row: 3, col: 2 }, 0.2);

    const calcFields: CalculatedField[] = [
      { name: 'Scaled', formula: 'Revenue * 10' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A: (0.1 + 0.2) * 10 = 3.0000000000000004
    const scaled = pivot.data[0][0].values?.['Scaled'];
    
    expect(typeof scaled).toBe('number');
    expect(scaled).toBeCloseTo(3, 10); // Allow floating-point tolerance
  });

  test('null vs missing field distinction', () => {
    // Set Cost to null for category A
    worksheet.setCellValue({ row: 2, col: 3 }, null);
    worksheet.setCellValue({ row: 3, col: 3 }, null);

    const calcFields: CalculatedField[] = [
      { name: 'Profit', formula: 'Revenue - Cost' },      // null data
      { name: 'Invalid', formula: 'Revenue - Unknown' }   // missing field
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    const profit = pivot.data[0][0].values?.['Profit'];
    const invalid = pivot.data[0][0].values?.['Invalid'];

    // Profit: null data should result in null (not error)
    expect(profit).toBeNull();
    
    // Invalid: missing field should result in #REF! error
    expect(invalid).toBeInstanceOf(Error);
    expect((invalid as Error).message).toBe('#REF!');
  });

  test('deep dependency chain (5 levels)', () => {
    const calcFields: CalculatedField[] = [
      { name: 'A', formula: 'Revenue' },
      { name: 'B', formula: 'A + 1' },
      { name: 'C', formula: 'B + 1' },
      { name: 'D', formula: 'C + 1' },
      { name: 'E', formula: 'D + 1' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Category A: Revenue=2500, so E = 2500+1+1+1+1 = 2504
    expect(pivot.data[0][0].values?.['E']).toBe(2504);
  });
});
