/**
 * Phase 36a: Ultra-Simple Verification (ES Modules, No TS)
 * 
 * Run with: node verify-phase36a-simple.mjs
 */

import { Workbook } from './packages/core/src/workbook.js';

console.log('\n🚀 Phase 36a Verification Starting...\n');

try {
  // Setup
  const workbook = new Workbook();
  const sheet = workbook.addSheet('Data');
  
  // Header row
  sheet.setCellValue({ row: 1, col: 1 }, 'Region');
  sheet.setCellValue({ row: 1, col: 2 }, 'Revenue');

  // Data rows
  sheet.setCellValue({ row: 2, col: 1 }, 'West');
  sheet.setCellValue({ row: 2, col: 2 }, 1000);
  sheet.setCellValue({ row: 3, col: 1 }, 'East');
  sheet.setCellValue({ row: 3, col: 2 }, 800);
  sheet.setCellValue({ row: 4, col: 1 }, 'North');
  sheet.setCellValue({ row: 4, col: 2 }, 900);

  const config = {
    rows: [{ column: 1, label: 'Region' }],
    values: [
      { type: 'aggregate', column: 2, label: 'Revenue', aggregation: 'sum' }
    ],
    columns: [],
    sourceRange: { start: { row: 1, col: 1 }, end: { row: 4, col: 2 } }
  };

  // Create pivot
  console.log('Creating initial pivot...');
  const pivotId = workbook.createPivot('TestPivot', sheet.getWorksheetId(), config);

  // Get initial snapshot
  const before = workbook.getPivotSnapshot(pivotId);
  
  console.log('\n=== BEFORE SNAPSHOT ===');
  console.log(JSON.stringify(before, null, 2));
  
  // Mutation
  console.log('\n🔧 Mutating: West revenue 1000 → 999\n');
  sheet.setCellValue({ row: 2, col: 2 }, 999);

  // Trigger recompute
  const afterPartial = workbook.getPivotSnapshot(pivotId);
  
  console.log('\n=== AFTER PARTIAL RECOMPUTE ===');
  console.log(JSON.stringify(afterPartial, null, 2));

  // Create fresh pivot for determinism test
  const sheet2 = workbook.addSheet('Data2');
  sheet2.setCellValue({ row: 1, col: 1 }, 'Region');
  sheet2.setCellValue({ row: 1, col: 2 }, 'Revenue');
  sheet2.setCellValue({ row: 2, col: 1 }, 'West');
  sheet2.setCellValue({ row: 2, col: 2 }, 999);
  sheet2.setCellValue({ row: 3, col: 1 }, 'East');
  sheet2.setCellValue({ row: 3, col: 2 }, 800);
  sheet2.setCellValue({ row: 4, col: 1 }, 'North');
  sheet2.setCellValue({ row: 4, col: 2 }, 900);

  const pivotId2 = workbook.createPivot('TestPivot2', sheet2.getWorksheetId(), config);
  const fullRebuild = workbook.getPivotSnapshot(pivotId2);

  console.log('\n=== FULL REBUILD (for comparison) ===');
  console.log(JSON.stringify(fullRebuild, null, 2));

  // Simple comparison
  console.log('\n=== DETERMINISM CHECK ===');
  const partialStr = JSON.stringify(afterPartial?.rows);
  const fullStr = JSON.stringify(fullRebuild?.rows);
  
  if (partialStr === fullStr) {
    console.log('✅ ✅ ✅ DETERMINISM HOLDS: partial === full rebuild');
    console.log('\nPhase 36a Implementation: CORRECT\n');
  } else {
    console.log('❌ DETERMINISM FAILED');
    console.log('\nPartial:', partialStr);
    console.log('\nFull:', fullStr);
  }

} catch (error) {
  console.error('\n💥 ERROR:', error);
  console.error(error.stack);
}
