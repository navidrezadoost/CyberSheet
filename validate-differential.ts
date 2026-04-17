/**
 * Standalone differential validation script
 * Validates that ReferenceEngine and SpreadsheetEngine produce identical results
 */

import { ReferenceEngine } from './packages/core/src/ReferenceEngine';
import { SpreadsheetEngine } from './packages/core/src/SpreadsheetEngine';
import { Address } from './packages/core/src/types';

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

// Canonical state comparison
interface CanonicalCell {
  row: number;
  col: number;
  value: string | number | boolean | null;
  formula?: string;
}

function canonicalize(cells: CanonicalCell[]): string {
  const sorted = [...cells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  return JSON.stringify(sorted);
}

function snapshotReference(ref: ReferenceEngine): CanonicalCell[] {
  return ref.snapshot().map((cell) => ({
    row: cell.row,
    col: cell.col,
    value: cell.value,
    ...(cell.formula ? { formula: cell.formula } : {}),
  }));
}

function snapshotOptimized(eng: SpreadsheetEngine): CanonicalCell[] {
  const cells: CanonicalCell[] = [];
  const worksheet = eng.getWorksheet();

  // Collect all cells
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < 26; col++) {
      const addr: Address = { row, col };
      const cell = worksheet.getCell(addr);
      if (cell && cell.value !== null) {
        cells.push({
          row,
          col,
          value: cell.value,
          ...(cell.formula ? { formula: cell.formula } : {}),
        });
      }
    }
  }

  return cells;
}

// Test 1: Simple formula chain
async function test1_SimpleChain() {
  console.log('\n🔬 Test 1: Simple formula chain A1→A2→A3');

  const optimized = new SpreadsheetEngine('test1');
  const reference = new ReferenceEngine();

  // A1 = 10
  await optimized.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 10));
  reference.setCellValue({ row: 0, col: 0 }, 10);

  // A2 = =A1+1
  await optimized.run((ws) => ws.setFormula({ row: 1, col: 0 }, '=A1+1'));
  reference.setFormula({ row: 1, col: 0 }, '=A1+1');

  // A3 = =A2+1
  await optimized.run((ws) => ws.setFormula({ row: 2, col: 0 }, '=A2+1'));
  reference.setFormula({ row: 2, col: 0 }, '=A2+1');

  // Compare states
  const stateOpt = snapshotOptimized(optimized);
  const stateRef = snapshotReference(reference);
  const canonicalOpt = canonicalize(stateOpt);
  const canonicalRef = canonicalize(stateRef);

  assert(
    canonicalOpt === canonicalRef,
    `States differ:\nOptimized: ${canonicalOpt}\nReference: ${canonicalRef}`
  );

  // Verify values
  const valOpt = optimized.getWorksheet().getCellValue({ row: 2, col: 0 });
  const valRef = reference.getCellValue({ row: 2, col: 0 });

  assert(valOpt === 12, `Optimized A3 should be 12, got ${valOpt}`);
  assert(valRef === 12, `Reference A3 should be 12, got ${valRef}`);

  console.log('✅ Test 1 passed');
}

// Test 2: Clearing cells
async function test2_ClearPropagation() {
  console.log('\n🔬 Test 2: Clearing cells should propagate');

  const optimized = new SpreadsheetEngine('test2');
  const reference = new ReferenceEngine();

  // A1 = 5
  await optimized.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 5));
  reference.setCellValue({ row: 0, col: 0 }, 5);

  // A2 = =A1*2
  await optimized.run((ws) => ws.setFormula({ row: 1, col: 0 }, '=A1*2'));
  reference.setFormula({ row: 1, col: 0 }, '=A1*2');

  // Clear A1
  await optimized.run((ws) => ws.clearCell({ row: 0, col: 0 }));
  reference.clearCell({ row: 0, col: 0 });

  // Compare states
  const stateOpt = snapshotOptimized(optimized);
  const stateRef = snapshotReference(reference);

  assert(
    canonicalize(stateOpt) === canonicalize(stateRef),
    'States differ after clearing cell'
  );

  console.log('✅ Test 2 passed');
}

// Test 3: Overwriting formula with value
async function test3_OverwriteFormula() {
  console.log('\n🔬 Test 3: Overwriting formula with value');

  const optimized = new SpreadsheetEngine('test3');
  const reference = new ReferenceEngine();

  // A1 = 100
  await optimized.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 100));
  reference.setCellValue({ row: 0, col: 0 }, 100);

  // A2 = =A1+1
  await optimized.run((ws) => ws.setFormula({ row: 1, col: 0 }, '=A1+1'));
  reference.setFormula({ row: 1, col: 0 }, '=A1+1');

  // Overwrite A2 with value
  await optimized.run((ws) => ws.setCellValue({ row: 1, col: 0 }, 999));
  reference.setCellValue({ row: 1, col: 0 }, 999);

  // Compare states
  const stateOpt = snapshotOptimized(optimized);
  const stateRef = snapshotReference(reference);

  assert(
    canonicalize(stateOpt) === canonicalize(stateRef),
    'States differ after overwriting formula'
  );

  const valOpt = optimized.getWorksheet().getCellValue({ row: 1, col: 0 });
  const valRef = reference.getCellValue({ row: 1, col: 0 });

  assert(valOpt === 999, `Optimized A2 should be 999, got ${valOpt}`);
  assert(valRef === 999, `Reference A2 should be 999, got ${valRef}`);

  console.log('✅ Test 3 passed');
}

// Run all tests
async function main() {
  console.log('🚀 Starting differential validation');
  console.log('━'.repeat(60));

  try {
    await test1_SimpleChain();
    await test2_ClearPropagation();
    await test3_OverwriteFormula();

    console.log('\n' + '━'.repeat(60));
    console.log('✅ All differential tests passed!');
    console.log('\nDifferential testing validates that:');
    console.log('  • Optimized engine == Reference engine');
    console.log('  • Formula evaluation is semantically correct');
    console.log('  • Not just internally consistent, but actually CORRECT');
    console.log('\nThis is how databases, compilers, and query engines');
    console.log('validate correctness. Chaos proves robustness.');
    console.log('Differential proves truth.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Differential validation failed:', err);
    process.exit(1);
  }
}

main();
