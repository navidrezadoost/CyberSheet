/**
 * Phase 33: Calculated Fields Test Suite  
 * Post-aggregation formula evaluation
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
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

  test('reference to non-existent field returns null (error isolated)', () => {
    const calcFields: CalculatedField[] = [
      { name: 'Invalid', formula: 'Unknown - Cost' }
    ];

    const config = makePivotConfig(calcFields);
    const pivot = engine.generate(config);

    // Should evaluate to null (error isolated)
    expect(pivot.data[0][0].values?.['Invalid']).toBeNull();
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

    // Invalid should be null (error isolated)
    expect(pivot.data[0][0].values?.['Invalid']).toBeNull();

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
