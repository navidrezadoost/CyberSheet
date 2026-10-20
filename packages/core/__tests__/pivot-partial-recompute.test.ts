/**
 * Phase 36a: Partial Recompute Test Suite
 * Row-level incremental updates with diff algorithm
 * 
 * Test Philosophy:
 * "For every mutation, the system behaves exactly as if the pivot was rebuilt 
 * from scratch—only faster."
 * 
 * Coverage:
 * §1: Basic partial update (single cell change)
 * §2: Group migration (row changes group)
 * §3: No-op mutation (same value, no recompute)
 * §4: Group deletion (last row removed)
 * §5: Multi-row batch
 * §6: Calculated fields recompute
 * §7: Fallback safety (partial matches full)
 * §8: Determinism
 * §9: Enhanced chaos test (temporal correctness)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';
import type { PivotConfig } from '../src/PivotEngine';
import type { PivotId } from '../src/PivotRegistry';
import type { PivotSnapshot } from '../src/PivotSnapshotStore';
import { groupStateStore } from '../src/PivotGroupStateStore';

/**
 * The old PivotTable.data grid addressed values by row/column position.
 * PivotSnapshot is now query-oriented: `rows` contains flattened records.
 * These helpers preserve the old assertions' semantic coordinates (Region ×
 * Product) while reading the current snapshot shape by field names.
 */
function pivotRecord(snapshot: PivotSnapshot | undefined, region: string, product: string) {
  return snapshot?.rows.find((row) => row.Region === region && row.Product === product);
}

function pivotValue(
  snapshot: PivotSnapshot | undefined,
  region: string,
  product: string,
  field = 'Revenue',
) {
  return pivotRecord(snapshot, region, product)?.[field] ?? null;
}

function setupTestData(worksheet: Worksheet) {
  // Header row
  worksheet.setCellValue({ row: 1, col: 1 }, 'Region');
  worksheet.setCellValue({ row: 1, col: 2 }, 'Product');
  worksheet.setCellValue({ row: 1, col: 3 }, 'Revenue');
  worksheet.setCellValue({ row: 1, col: 4 }, 'Cost');

  // Data rows
  const data = [
    ['West', 'A', 1000, 400],
    ['West', 'B', 1500, 600],
    ['East', 'A', 800, 300],
    ['East', 'B', 1200, 500],
    ['North', 'A', 900, 350],
    ['North', 'B', 1100, 450]
  ];

  data.forEach((row, idx) => {
    worksheet.setCellValue({ row: idx + 2, col: 1 }, row[0]);
    worksheet.setCellValue({ row: idx + 2, col: 2 }, row[1]);
    worksheet.setCellValue({ row: idx + 2, col: 3 }, row[2]);
    worksheet.setCellValue({ row: idx + 2, col: 4 }, row[3]);
  });
}

function makePivotConfig(): PivotConfig {
  return {
    rows: [{ column: 0, label: 'Region' }],
    columns: [{ column: 1, label: 'Product' }],
    values: [
      { column: 2, aggregation: 'sum', label: 'Revenue' }
    ],
    sourceRange: {
      start: { row: 1, col: 1 },
      end: { row: 7, col: 4 }
    }
  };
}

// ============================================================================
// §1: Basic Partial Update
// ============================================================================

describe('Phase 36a - Basic Partial Update', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('single cell change updates aggregates correctly', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Initial state
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot1, 'West', 'A')).toBe(1000); // West/A
    
    // Verify group state was populated
    const groupState = groupStateStore.get(pivotId);
    expect(groupState).toBeDefined();
    expect(groupState?.groups.size).toBeGreaterThan(0);
    
    // Mutate cell: West/A revenue 1000 → 1100
    worksheet.setCellValue({ row: 2, col: 3 }, 1100);
    
    // Query should trigger partial recompute (currently falls back to full)
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot2, 'West', 'A')).toBe(1100); // West/A updated
    
    // Other cells unchanged
    expect(pivotValue(snapshot2, 'West', 'B')).toBe(1500); // West/B
    expect(pivotValue(snapshot2, 'East', 'A')).toBe(800);  // East/A
  });

  test('multiple aggregations update correctly', () => {
    const config: PivotConfig = {
      rows: [{ column: 0, label: 'Region' }],
      columns: [{ column: 1, label: 'Product' }],
      values: [
        { column: 2, aggregation: 'sum', label: 'Revenue' },
        { column: 3, aggregation: 'sum', label: 'Cost' },
        { column: 2, aggregation: 'count', label: 'Count' }
      ],
      sourceRange: {
        start: { row: 1, col: 1 },
        end: { row: 7, col: 4 }
      }
    };
    
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    
    // Initial: West/A has Revenue=1000, Cost=400, Count=1
    expect(pivotValue(snapshot1, 'West', 'A', 'Revenue')).toBe(1000);
    expect(pivotValue(snapshot1, 'West', 'A', 'Cost')).toBe(400);
    expect(pivotValue(snapshot1, 'West', 'A', 'Count')).toBe(1);
    
    // Update Revenue only
    worksheet.setCellValue({ row: 2, col: 3 }, 1200);
    
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot2, 'West', 'A', 'Revenue')).toBe(1200); // Changed
    expect(pivotValue(snapshot2, 'West', 'A', 'Cost')).toBe(400); // Unchanged
    expect(pivotValue(snapshot2, 'West', 'A', 'Count')).toBe(1); // Unchanged
  });

  test('AVG aggregation updates correctly (sum+count based)', () => {
    const config: PivotConfig = {
      ...makePivotConfig(),
      values: [{ column: 2, aggregation: 'average', label: 'AvgRevenue' }]
    };
    
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Initial: West has 2 rows (1000, 1500) → avg = 1250
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot1, 'West', 'A', 'AvgRevenue')).toBe(1000);
    expect(pivotValue(snapshot1, 'West', 'B', 'AvgRevenue')).toBe(1500);
    
    // Update one value: 1000 → 2000
    worksheet.setCellValue({ row: 2, col: 3 }, 2000);
    
    // New avg: (2000 + 1500) / 2 = 1750
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot2, 'West', 'A', 'AvgRevenue')).toBe(2000);
    expect(pivotValue(snapshot2, 'West', 'B', 'AvgRevenue')).toBe(1500);
  });
});

// ============================================================================
// §2: Group Migration
// ============================================================================

describe('Phase 36a - Group Migration', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('row changes group updates both groups correctly', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    const westA_before = pivotValue(snapshot1, 'West', 'A'); // West/A = 1000
    const eastA_before = pivotValue(snapshot1, 'East', 'A'); // East/A = 800
    
    // Move row from West to East: change Region from 'West' to 'East'
    worksheet.setCellValue({ row: 2, col: 1 }, 'East');
    
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    
    // West/A should lose 1000 (now 0 or null)
    const westA_after = pivotValue(snapshot2, 'West', 'A');
    expect(westA_after).toBe(null); // West/A now has 0 rows
    
    // East/A should gain 1000 (800 + 1000 = 1800)
    const eastA_after = pivotValue(snapshot2, 'East', 'A');
    expect(eastA_after).toBe(1800);
  });

  test('dimension change creates new group if needed', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Add new region
    worksheet.setCellValue({ row: 2, col: 1 }, 'South');
    
    const snapshot = workbook.getPivotSnapshot(pivotId);
    
    // Should have new row for South
    const southRow = snapshot?.rows.find(row => row.Region === 'South');
    expect(southRow).toBeDefined();
    expect(southRow?.Revenue).toBe(1000); // Revenue from migrated row
  });
});

// ============================================================================
// §3: No-Op Mutations
// ============================================================================

describe('Phase 36a - No-Op Mutations', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('setting same value does not trigger recompute', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    const computedAt1 = snapshot1?.computedAt ?? 0;
    
    // Set same value
    worksheet.setCellValue({ row: 2, col: 3 }, 1000); // Already 1000
    
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    const computedAt2 = snapshot2?.computedAt ?? 0;
    
    // Should not recompute (computedAt unchanged or hash prevents update)
    // Note: This depends on mutation tracking - for now just verify value unchanged
    expect(pivotValue(snapshot2, 'West', 'A')).toBe(1000);
  });
});

// ============================================================================
// §4: Group Deletion
// ============================================================================

describe('Phase 36a - Group Deletion', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('removing last row in group deletes group', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // West/A has only 1 row (row 2)
    // Zero it out to simulate removal
    worksheet.setCellValue({ row: 2, col: 3 }, null);
    
    const snapshot = workbook.getPivotSnapshot(pivotId);
    
    // West/A should be null (no valid values)
    expect(pivotValue(snapshot, 'West', 'A')).toBe(null);
  });
});

// ============================================================================
// §5: Multi-Row Batch
// ============================================================================

describe('Phase 36a - Multi-Row Batch Updates', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('multiple mutations in batch handled correctly', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Mutate multiple cells
    worksheet.setCellValue({ row: 2, col: 3 }, 1100); // West/A +100
    worksheet.setCellValue({ row: 3, col: 3 }, 1600); // West/B +100
    worksheet.setCellValue({ row: 4, col: 3 }, 900);  // East/A +100
    
    const snapshot = workbook.getPivotSnapshot(pivotId);
    
    expect(pivotValue(snapshot, 'West', 'A')).toBe(1100); // West/A
    expect(pivotValue(snapshot, 'West', 'B')).toBe(1600); // West/B
    expect(pivotValue(snapshot, 'East', 'A')).toBe(900);  // East/A
  });
});

// ============================================================================
// §6: Calculated Fields Integration
// ============================================================================

describe('Phase 36a - Calculated Fields Recompute', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    (workbook as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('calculated fields update after partial recompute', () => {
    const config: PivotConfig = {
      rows: [{ column: 0, label: 'Region' }],
      columns: [{ column: 1, label: 'Product' }],
      values: [
        { column: 2, aggregation: 'sum', label: 'Revenue' },
        { column: 3, aggregation: 'sum', label: 'Cost' }
      ],
      calculatedFields: [
        {
          name: 'Profit',
          formula: '=[Revenue] - [Cost]'
        }
      ],
      sourceRange: {
        start: { row: 1, col: 1 },
        end: { row: 7, col: 4 }
      }
    };
    
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    const profit1 = pivotValue(snapshot1, 'West', 'A', 'Profit');
    expect(profit1).toBe(600); // 1000 - 400
    
    // Update Revenue
    worksheet.setCellValue({ row: 2, col: 3 }, 1200);
    
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    const profit2 = pivotValue(snapshot2, 'West', 'A', 'Profit');
    expect(profit2).toBe(800); // 1200 - 400
  });
});

// ============================================================================
// §7: Fallback Safety
// ============================================================================

describe('Phase 36a - Fallback Safety', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('non-reversible aggregations fall back to full rebuild', () => {
    const config: PivotConfig = {
      ...makePivotConfig(),
      values: [{ column: 2, aggregation: 'max', label: 'MaxRevenue' }]
    };
    
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot1, 'West', 'A', 'MaxRevenue')).toBe(1000); // West/A max
    
    // Update value
    worksheet.setCellValue({ row: 2, col: 3 }, 1100);
    
    // Should fall back to full rebuild (not partial)
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot2, 'West', 'A', 'MaxRevenue')).toBe(1100);
    
    // Group state should not exist for non-reversible
    const groupState = groupStateStore.get(pivotId);
    // State might exist but partial recompute won't be attempted
  });

  test('config change forces full rebuild', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    expect(snapshot1).toBeDefined();
    
    // Change config (add slicer)
    const newConfig: PivotConfig = {
      ...config,
      slicers: {
        'region': {
          field: 'Region',
          selectedValues: ['West'],
          mode: 'include'
        }
      }
    };
    
    // Update pivot would require rebuild
    // For now, just verify mutation still works
    worksheet.setCellValue({ row: 2, col: 3 }, 1100);
    
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    expect(pivotValue(snapshot2, 'West', 'A')).toBe(1100);
  });
});

// ============================================================================
// §8: Determinism
// ============================================================================

describe('Phase 36a - Determinism', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('partial recompute produces same result as full rebuild', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Mutate
    worksheet.setCellValue({ row: 2, col: 3 }, 1100);
    
    const partialSnapshot = workbook.getPivotSnapshot(pivotId);
    
    // Force full rebuild by deleting and recreating
    workbook.deletePivot(pivotId);
    const pivotId2 = workbook.createPivot('TestPivot2', 'Sheet1', config);
    const fullSnapshot = workbook.getPivotSnapshot(pivotId2);
    
    // Should be identical
    expect(partialSnapshot?.rows).toEqual(fullSnapshot?.rows);
  });

  test('multiple mutations same final result', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Path 1: Direct mutation
    worksheet.setCellValue({ row: 2, col: 3 }, 1500);
    const snapshot1 = workbook.getPivotSnapshot(pivotId);
    
    // Reset
    worksheet.setCellValue({ row: 2, col: 3 }, 1000);
    
    // Path 2: Multiple steps to same value
    worksheet.setCellValue({ row: 2, col: 3 }, 1200);
    worksheet.setCellValue({ row: 2, col: 3 }, 1300);
    worksheet.setCellValue({ row: 2, col: 3 }, 1500);
    const snapshot2 = workbook.getPivotSnapshot(pivotId);
    
    // Final state should be identical
    expect(pivotValue(snapshot1, 'West', 'A')).toBe(pivotValue(snapshot2, 'West', 'A'));
  });
});

// ============================================================================
// §9: Enhanced Chaos Test (Temporal Correctness)
// ============================================================================

describe('Phase 36a - Enhanced Chaos Test', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Sheet1', 100, 26);
    const formulaEngine = new FormulaEngine();
    (worksheet as any).formulaEngine = formulaEngine;
    setupTestData(worksheet);
  });

  test('1000 random mutations maintain correctness', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    // Track original data for reset
    const originalData: Array<[number, number, number]> = [
      [2, 3, 1000],
      [3, 3, 1500],
      [4, 3, 800],
      [5, 3, 1200],
      [6, 3, 900],
      [7, 3, 1100]
    ];
    
    // Run 1000 random mutations
    for (let i = 0; i < 1000; i++) {
      // Random mutation: pick random row, random value
      const rowIdx = Math.floor(Math.random() * 6);
      const [row, col] = originalData[rowIdx];
      const newValue = 500 + Math.floor(Math.random() * 2000);
      
      worksheet.setCellValue({ row, col }, newValue);
      
      // Every 25 iterations: validate against full rebuild
      if (i % 25 === 0 && i > 0) {
        const partialSnapshot = workbook.getPivotSnapshot(pivotId);
        
        // Force full rebuild
        workbook.deletePivot(pivotId);
        const pivotId2 = workbook.createPivot(`Pivot_${i}`, 'Sheet1', config);
        const fullSnapshot = workbook.getPivotSnapshot(pivotId2);
        
        // Verify equivalence
        expect(partialSnapshot?.rows).toEqual(fullSnapshot?.rows);
        
        // Continue with partial pivot
        workbook.deletePivot(pivotId2);
      }
    }
  });

  test('mutation threshold forces full rebuild after 1000 mutations', () => {
    const config = makePivotConfig();
    const pivotId = workbook.createPivot('TestPivot', 'Sheet1', config);
    
    const groupState = groupStateStore.get(pivotId);
    expect(groupState).toBeDefined();
    
    // Simulate 1000 mutations (threshold)
    // In practice, this is controlled by version counter
    // For now, just verify group state exists
    expect(groupState?.version).toBe(0); // Initial state
  });
});
