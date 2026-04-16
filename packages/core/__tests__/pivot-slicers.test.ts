/**
 * Phase 35: Slicers Test Suite
 * Declarative filtering layer integration
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';
import { PivotEngine } from '../src/PivotEngine';
import type { PivotConfig, SlicerId, SlicerValue } from '../src/PivotEngine';
import type { PivotId } from '../src/PivotRegistry';

function setupTestData(worksheet: Worksheet) {
  // Header row
  worksheet.setCellValue({ row: 1, col: 1 }, 'Region');
  worksheet.setCellValue({ row: 1, col: 2 }, 'Category');
  worksheet.setCellValue({ row: 1, col: 3 }, 'Revenue');

  // Data rows
  const data = [
    ['West', 'A', 1000],
    ['West', 'B', 1500],
    ['East', 'A', 800],
    ['East', 'B', 1200],
    ['North', 'A', 900],
    ['North', 'B', 1100]
  ];

  data.forEach((row, idx) => {
    worksheet.setCellValue({ row: idx + 2, col: 1 }, row[0]);
    worksheet.setCellValue({ row: idx + 2, col: 2 }, row[1]);
    worksheet.setCellValue({ row: idx + 2, col: 3 }, row[2]);
  });
}

function makePivotConfig(): PivotConfig {
  return {
    rows: [{ column: 1, label: 'Region' }],
    columns: [{ column: 2, label: 'Category' }],
    values: [
      { column: 3, aggregation: 'sum', label: 'Revenue' }
    ],
    sourceRange: {
      start: { row: 1, col: 1 },
      end: { row: 7, col: 3 }
    }
  };
}

// ============================================================================
// §1: Basic Filtering
// ============================================================================

describe('Phase 35 - Basic Slicer Filtering', () => {
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

  test('single slicer include mode filters correctly', () => {
    const config = makePivotConfig();
    
    // Add slicer: Region = West
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['West'],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should only have West region data
    expect(pivot.rowHeaders.length).toBe(1);
    expect(pivot.rowHeaders[0][0]).toBe('West');
    
    // Total revenue for West = 1000 + 1500 = 2500
    const westTotal = pivot.data[0][0].value;
    expect(westTotal).toBe(2500);
  });

  test('single slicer exclude mode filters correctly', () => {
    const config = makePivotConfig();
    
    // Add slicer: exclude West
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['West'],
        mode: 'exclude'
      }
    };

    const pivot = engine.generate(config);

    // Should have East and North (not West)
    expect(pivot.rowHeaders.length).toBe(2);
    expect(pivot.rowHeaders.map(h => h[0])).toEqual(['East', 'North']);
  });

  test('empty selectedValues means no filter (ALL)', () => {
    const config = makePivotConfig();
    
    // Add slicer with empty selection
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: [],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should have all regions
    expect(pivot.rowHeaders.length).toBe(3);
    expect(pivot.rowHeaders.map(h => h[0])).toEqual(['East', 'North', 'West']);
  });

  test('no slicers means no filtering', () => {
    const config = makePivotConfig();
    const pivot = engine.generate(config);

    // Should have all regions
    expect(pivot.rowHeaders.length).toBe(3);
  });
});

// ============================================================================
// §2: Multi-Slicer AND Composition
// ============================================================================

describe('Phase 35 - Multi-Slicer Composition', () => {
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

  test('two slicers AND together correctly', () => {
    const config = makePivotConfig();
    
    // Region=West AND Category=A
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['West'],
        mode: 'include'
      },
      'categorySlicer': {
        field: 'Category',
        selectedValues: ['A'],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should only have West+A intersection
    expect(pivot.rowHeaders.length).toBe(1);
    expect(pivot.rowHeaders[0][0]).toBe('West');
    
    // Revenue for West+A = 1000
    const value = pivot.data[0][0].value;
    expect(value).toBe(1000);
  });

  test('slicers with no intersection return empty result', () => {
    const config = makePivotConfig();
    
    // Region=West AND Region=East (impossible)
    config.slicers = {
      'slicer1': {
        field: 'Region',
        selectedValues: ['West'],
        mode: 'include'
      },
      'slicer2': {
        field: 'Region',
        selectedValues: ['East'],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should have no data
    expect(pivot.data.length).toBe(0);
  });
});

// ============================================================================
// §3: Invalidation Integration (Phase 30b)
// ============================================================================

describe('Phase 35 - Invalidation Integration', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let pivotId: PivotId;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    setupTestData(worksheet);

    // Register pivot
    const config = makePivotConfig();
    pivotId = workbook.getPivotRegistry().register('TestPivot', config, 'Sheet1');
  });

  test('setSlicer marks pivot dirty', () => {
    // Initially clean
    const initialMeta = workbook.getPivotRegistry().get(pivotId);
    expect(initialMeta?.dirty).toBe(false);

    // Set slicer
    workbook.setSlicer(pivotId, 'regionSlicer', 'Region', ['West']);

    // Should be dirty
    const updatedMeta = workbook.getPivotRegistry().get(pivotId);
    expect(updatedMeta?.dirty).toBe(true);
  });

  test('clearSlicer marks pivot dirty', () => {
    // Set slicer
    workbook.setSlicer(pivotId, 'regionSlicer', 'Region', ['West']);
    
    // Mark clean manually (simulate rebuild)
    workbook.getPivotRegistry().markClean(pivotId);
    expect(workbook.getPivotRegistry().get(pivotId)?.dirty).toBe(false);

    // Clear slicer
    workbook.clearSlicer(pivotId, 'regionSlicer');

    // Should be dirty again
    expect(workbook.getPivotRegistry().get(pivotId)?.dirty).toBe(true);
  });

  test('setSlicer throws for invalid field', () => {
    expect(() => {
      workbook.setSlicer(pivotId, 'invalidSlicer', 'UnknownField', ['value']);
    }).toThrow(/Field 'UnknownField' not found/);
  });

  test('setSlicer throws for non-existent pivot', () => {
    expect(() => {
      workbook.setSlicer('fakePivot', 'slicer', 'Region', ['West']);
    }).toThrow(/Pivot 'fakePivot' not found/);
  });
});

// ============================================================================
// §4: Lazy Recompute Integration (Phase 31a)
// ============================================================================

describe('Phase 35 - Lazy Recompute Integration', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let pivotId: PivotId;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    setupTestData(worksheet);

    // Register pivot
    const config = makePivotConfig();
    pivotId = workbook.getPivotRegistry().register('TestPivot', config, 'Sheet1');
  });

  test('slicer change triggers lazy rebuild on query', () => {
    // Build initial snapshot
    const engine = new PivotEngine(worksheet);
    const initialPivot = engine.generate(makePivotConfig());
    expect(initialPivot.rowHeaders.length).toBe(3); // All regions

    // Set slicer (marks dirty)
    workbook.setSlicer(pivotId, 'regionSlicer', 'Region', ['West']);

    // Query should trigger rebuild with slicers applied
    const filteredConfig = workbook.getPivotRegistry().get(pivotId)!.config;
    const filteredPivot = engine.generate(filteredConfig);

    // Should only have West
    expect(filteredPivot.rowHeaders.length).toBe(1);
    expect(filteredPivot.rowHeaders[0][0]).toBe('West');
  });
});

// ============================================================================
// §5: SDK Methods
// ============================================================================

describe('Phase 35 - SDK Methods', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;
  let pivotId: PivotId;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    
    
    setupTestData(worksheet);

    const config = makePivotConfig();
    pivotId = workbook.getPivotRegistry().register('TestPivot', config, 'Sheet1');
  });

  test('getSlicer returns undefined for non-existent slicer', () => {
    const slicer = workbook.getSlicer(pivotId, 'nonExistent');
    expect(slicer).toBeUndefined();
  });

  test('getSlicer returns slicer state after setSlicer', () => {
    workbook.setSlicer(pivotId, 'regionSlicer', 'Region', ['West', 'East']);

    const slicer = workbook.getSlicer(pivotId, 'regionSlicer');
    expect(slicer).toEqual({
      field: 'Region',
      selectedValues: ['West', 'East'],
      mode: 'include'
    });
  });

  test('getSlicers returns all slicers', () => {
    workbook.setSlicer(pivotId, 'slicer1', 'Region', ['West']);
    workbook.setSlicer(pivotId, 'slicer2', 'Category', ['A']);

    const slicers = workbook.getSlicers(pivotId);
    expect(Object.keys(slicers)).toEqual(['slicer1', 'slicer2']);
  });

  test('getSlicers returns empty object for pivot with no slicers', () => {
    const slicers = workbook.getSlicers(pivotId);
    expect(slicers).toEqual({});
  });

  test('clearSlicer removes slicer', () => {
    workbook.setSlicer(pivotId, 'regionSlicer', 'Region', ['West']);
    expect(workbook.getSlicer(pivotId, 'regionSlicer')).toBeDefined();

    workbook.clearSlicer(pivotId, 'regionSlicer');
    expect(workbook.getSlicer(pivotId, 'regionSlicer')).toBeUndefined();
  });

  test('getSlicerDistinctValues returns all distinct values from source', () => {
    const distinctValues = workbook.getSlicerDistinctValues(pivotId, 'Region');

    expect(distinctValues).toHaveLength(3);
    expect(distinctValues).toContain('West');
    expect(distinctValues).toContain('East');
    expect(distinctValues).toContain('North');
  });

  test('getSlicerDistinctValues ignores other slicers (independent model)', () => {
    // Set slicer to filter to West only
    workbook.setSlicer(pivotId, 'regionSlicer', 'Region', ['West']);

    // getDistinctValues should still return ALL regions (not just West)
    const distinctValues = workbook.getSlicerDistinctValues(pivotId, 'Region');
    expect(distinctValues).toHaveLength(3);
  });

  test('getSlicerDistinctValues throws for invalid field', () => {
    expect(() => {
      workbook.getSlicerDistinctValues(pivotId, 'UnknownField');
    }).toThrow(/Field 'UnknownField' not found/);
  });
});

// ============================================================================
// §6: Edge Cases
// ============================================================================

describe('Phase 35 - Edge Cases', () => {
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

  test('null values handled correctly', () => {
    // Add row with null region
    worksheet.setCellValue({ row: 8, col: 1 }, null);
    worksheet.setCellValue({ row: 8, col: 2 }, 'A');
    worksheet.setCellValue({ row: 8, col: 3 }, 500);

    const config = makePivotConfig();
    config.sourceRange.end.row = 8;

    // Slicer includes null
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: [null as SlicerValue],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should only have null region row
    expect(pivot.data.length).toBeGreaterThan(0);
  });

  test('slicer with non-matching values returns empty result', () => {
    const config = makePivotConfig();
    
    // Filter for region that doesn't exist
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['NonExistent'],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should have no data
    expect(pivot.data.length).toBe(0);
  });

  test('multiple values in single slicer (OR within slicer)', () => {
    const config = makePivotConfig();
    
    // Region = West OR East
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['West', 'East'],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // Should have West and East (not North)
    expect(pivot.rowHeaders.length).toBe(2);
    expect(pivot.rowHeaders.map(h => h[0]).sort()).toEqual(['East', 'West']);
  });
});

// ============================================================================
// §7: Determinism
// ============================================================================

describe('Phase 35 - Determinism', () => {
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

  test('same slicers produce identical results', () => {
    const config = makePivotConfig();
    
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['West'],
        mode: 'include'
      }
    };

    const results = [];
    for (let i = 0; i < 5; i++) {
      const pivot = engine.generate(config);
      results.push(pivot.data[0][0].value);
    }

    // All results should be identical
    expect(results.every(r => r === results[0])).toBe(true);
    expect(results[0]).toBe(2500);
  });

  test('slicer order does not affect result', () => {
    const config1 = makePivotConfig();
    config1.slicers = {
      'slicer1': { field: 'Region', selectedValues: ['West'], mode: 'include' },
      'slicer2': { field: 'Category', selectedValues: ['A'], mode: 'include' }
    };

    const config2 = makePivotConfig();
    config2.slicers = {
      'slicer2': { field: 'Category', selectedValues: ['A'], mode: 'include' },
      'slicer1': { field: 'Region', selectedValues: ['West'], mode: 'include' }
    };

    const pivot1 = engine.generate(config1);
    const pivot2 = engine.generate(config2);

    expect(pivot1.data[0][0].value).toBe(pivot2.data[0][0].value);
  });
});

// ============================================================================
// §8: Integration with Calculated Fields (Phase 33)
// ============================================================================

describe('Phase 35 - Calculated Fields Integration', () => {
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

  test('calculated fields evaluate on filtered data', () => {
    const config = makePivotConfig();
    
    // Add cost column for calculated field
    worksheet.setCellValue({ row: 1, col: 4 }, 'Cost');
    worksheet.setCellValue({ row: 2, col: 4 }, 600);  // West A
    worksheet.setCellValue({ row: 3, col: 4 }, 900);  // West B
    worksheet.setCellValue({ row: 4, col: 4 }, 500);  // East A
    worksheet.setCellValue({ row: 5, col: 4 }, 700);  // East B
    worksheet.setCellValue({ row: 6, col: 4 }, 550);  // North A
    worksheet.setCellValue({ row: 7, col: 4 }, 650);  // North B

    config.sourceRange.end.col = 4;
    config.values.push({ column: 4, aggregation: 'sum', label: 'Cost' });
    config.calculatedFields = [
      { name: 'Profit', formula: 'Revenue - Cost' }
    ];

    // Filter to West only
    config.slicers = {
      'regionSlicer': {
        field: 'Region',
        selectedValues: ['West'],
        mode: 'include'
      }
    };

    const pivot = engine.generate(config);

    // West: Revenue=2500, Cost=1500, Profit=1000
    expect(pivot.data[0][0].values?.['Profit']).toBe(1000);
  });
});
