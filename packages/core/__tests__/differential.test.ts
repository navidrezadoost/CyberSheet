/// <reference types="jest" />

/**
 * differential.test.ts — Differential Testing (Oracle-Based Validation)
 *
 * Compares SpreadsheetEngine (optimized) against ReferenceEngine (slow but correct).
 *
 * Purpose:
 *   Chaos tests prove internal consistency.
 *   Differential tests prove semantic correctness.
 *
 * A system can be perfectly deterministic and internally consistent while
 * still computing the WRONG answer. Differential testing catches this.
 *
 * Strategy:
 *   1. Generate random operation sequence
 *   2. Apply to both engines in lockstep
 *   3. Compare final states (must be identical)
 *
 * What this catches (that chaos tests don't):
 *   - Incorrect formula evaluation
 *   - Subtle DAG inconsistencies that look deterministic
 *   - Off-by-one errors in addressing
 *   - Incorrect recompute ordering
 *   - Formula dependency resolution bugs
 *   - Edge cases in scheduler vs full sync
 *
 * This is how databases, compilers, and query engines validate correctness.
 */

import { SpreadsheetEngine } from '../src/SpreadsheetEngine';
import { ReferenceEngine } from '../src/ReferenceEngine';
import type { Address, CellValue, ExtendedCellValue } from '../src/types';

// ---------------------------------------------------------------------------
// Seeded Random (for reproducibility)
// ---------------------------------------------------------------------------

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[this.int(0, arr.length)];
  }
}

// ---------------------------------------------------------------------------
// Canonical State Snapshot (stable hashing)
// ---------------------------------------------------------------------------

type CanonicalCell = {
  row: number;
  col: number;
  value: ExtendedCellValue;
  formula?: string;
};

function canonicalize(cells: CanonicalCell[]): string {
  // Sort cells for deterministic ordering
  const sorted = [...cells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Build canonical representation with sorted keys
  const canonical = sorted.map(cell => {
    const obj: any = {
      col: cell.col,
      row: cell.row,
      value: cell.value,
    };
    
    if (cell.formula) {
      obj.formula = cell.formula;
    }

    return obj;
  });

  return JSON.stringify(canonical);
}

function stableHash(canonicalStr: string): string {
  // Simple hash function (good enough for testing)
  let hash = 0;
  for (let i = 0; i < canonicalStr.length; i++) {
    const char = canonicalStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ---------------------------------------------------------------------------
// Operation Types
// ---------------------------------------------------------------------------

type Op =
  | { type: 'setValue'; row: number; col: number; value: CellValue }
  | { type: 'setFormula'; row: number; col: number; formula: string }
  | { type: 'clearCell'; row: number; col: number };

// ---------------------------------------------------------------------------
// Random Operation Generator
// ---------------------------------------------------------------------------

function generateOps(seed: number, count: number): Op[] {
  const rng = new SeededRandom(seed);
  const ops: Op[] = [];

  for (let i = 0; i < count; i++) {
    const r = rng.next();

    if (r < 0.40) {
      // Set value (40%)
      ops.push({
        type: 'setValue',
        row: rng.int(0, 20) + 1,
        col: rng.int(0, 5) + 1,
        value: rng.int(1, 50),
      });
    } else if (r < 0.70) {
      // Set formula (30%)
      const targetRow = rng.int(0, 20);
      const targetCol = rng.int(0, 5);
      const refRow = rng.int(0, 20);
      const refCol = rng.int(0, 5);
      const refAddr = `${String.fromCharCode(65 + refCol)}${refRow + 1}`;

      const formulas = [
        `=${refAddr}+1`,
        `=${refAddr}*2`,
        `=${refAddr}-3`,
        `=SUM(${refAddr}:${String.fromCharCode(65 + refCol)}${refRow + 2})`,
      ];

      ops.push({
        type: 'setFormula',
        row: targetRow + 1,
        col: targetCol + 1,
        formula: rng.choice(formulas),
      });
    } else {
      // Clear cell (30%)
      ops.push({
        type: 'clearCell',
        row: rng.int(0, 20) + 1,
        col: rng.int(0, 5) + 1,
      });
    }
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Operation Application
// ---------------------------------------------------------------------------

async function applyToOptimized(engine: SpreadsheetEngine, op: Op): Promise<void> {
  await engine.run((ws) => {
    const addr: Address = { row: op.row, col: op.col };

    switch (op.type) {
      case 'setValue':
        ws.setCellValue(addr, op.value);
        break;

      case 'setFormula': {
        ws.setCellFormula(addr, op.formula);
        break;
      }

      case 'clearCell':
        ws.setCellValue(addr, null);
        break;
    }
  });
}

function applyToReference(engine: ReferenceEngine, op: Op): void {
  const addr: Address = { row: op.row, col: op.col };

  switch (op.type) {
    case 'setValue':
      engine.setCellValue(addr, op.value);
      break;

    case 'setFormula':
      engine.setFormula(addr, op.formula);
      break;

    case 'clearCell':
      engine.clearCell(addr);
      break;
  }
}

// ---------------------------------------------------------------------------
// State Extraction
// ---------------------------------------------------------------------------

function snapshotOptimized(engine: SpreadsheetEngine): CanonicalCell[] {
  const ws = (engine as any)._ws; // Access internal worksheet
  const cells: CanonicalCell[] = [];

  for (let row = 1; row <= 100; row++) {
    for (let col = 1; col <= 26; col++) {
      const addr: Address = { row, col };
      const value = engine.getCellValue(addr);

      const cell = ws.getCell(addr);
      // Formula-only cells with a null cached value are part of worksheet
      // state and must remain visible to the differential oracle.
      if (value !== null || cell?.formula) {
        const entry: CanonicalCell = { row, col, value };
        if (cell?.formula) {
          entry.formula = cell.formula;
        }
        cells.push(entry);
      }
    }
  }

  return cells;
}

function snapshotReference(engine: ReferenceEngine): CanonicalCell[] {
  return engine.snapshot();
}

async function applyAndCompareEachOperation(
  optimized: SpreadsheetEngine,
  reference: ReferenceEngine,
  ops: Op[],
): Promise<void> {
  for (let index = 0; index < ops.length; index++) {
    const op = ops[index];
    await applyToOptimized(optimized, op);
    applyToReference(reference, op);

    const actual = snapshotOptimized(optimized);
    const expected = snapshotReference(reference);
    const actualCanonical = canonicalize(actual);
    const expectedCanonical = canonicalize(expected);
    if (actualCanonical !== expectedCanonical) {
      const ws = (optimized as any)._ws;
      const actualByAddress = new Map(actual.map((cell) => [`${cell.row}:${cell.col}`, cell]));
      const expectedByAddress = new Map(expected.map((cell) => [`${cell.row}:${cell.col}`, cell]));
      const divergentAddresses = [...new Set([...actualByAddress.keys(), ...expectedByAddress.keys()])]
        .filter((key) => JSON.stringify(actualByAddress.get(key)) !== JSON.stringify(expectedByAddress.get(key)))
        .sort((a, b) => {
          const [ar, ac] = a.split(':').map(Number);
          const [br, bc] = b.split(':').map(Number);
          return ar - br || ac - bc;
        });
      const graph = ws.getFormulaAddresses().map((address: Address) => ({
        address,
        precedents: ws.getPrecedents(address),
      }));
      throw new Error([
        `First differential divergence at operation ${index + 1}/${ops.length}.`,
        `operation=${JSON.stringify(op)}`,
        `expectedState=${JSON.stringify(divergentAddresses.map((key) => expectedByAddress.get(key) ?? null))}`,
        `actualState=${JSON.stringify(divergentAddresses.map((key) => actualByAddress.get(key) ?? null))}`,
        `graph=${JSON.stringify({ stats: ws.dagStats, formulas: graph })}`,
      ].join('\n'));
    }
  }
}

// ---------------------------------------------------------------------------
// Differential Tests
// ---------------------------------------------------------------------------

describe('Differential Testing — Optimized vs Reference', () => {

  test('differential: 50 random operations → identical state', async () => {
    const seed = 12345;
    const ops = generateOps(seed, 50);

    const optimized = new SpreadsheetEngine('OptimizedSheet');
    const reference = new ReferenceEngine();

    await applyAndCompareEachOperation(optimized, reference, ops);

    const stateOpt = snapshotOptimized(optimized);
    const stateRef = snapshotReference(reference);

    const canonicalOpt = canonicalize(stateOpt);
    const canonicalRef = canonicalize(stateRef);

    expect(canonicalOpt).toBe(canonicalRef);
  }, 30000);

  test('differential: 100 operations with formulas → identical state', async () => {
    const seed = 99999;
    const ops = generateOps(seed, 100);

    const optimized = new SpreadsheetEngine('FormulaTest');
    const reference = new ReferenceEngine();

    await applyAndCompareEachOperation(optimized, reference, ops);

    const stateOpt = snapshotOptimized(optimized);
    const stateRef = snapshotReference(reference);

    const canonicalOpt = canonicalize(stateOpt);
    const canonicalRef = canonicalize(stateRef);

    expect(canonicalOpt).toBe(canonicalRef);
  }, 60000);

  test('differential: 200 operations → hash match', async () => {
    const seed = 77777;
    const ops = generateOps(seed, 200);

    const optimized = new SpreadsheetEngine('LargeTest');
    const reference = new ReferenceEngine();

    await applyAndCompareEachOperation(optimized, reference, ops);

    const stateOpt = snapshotOptimized(optimized);
    const stateRef = snapshotReference(reference);

    const hashOpt = stableHash(canonicalize(stateOpt));
    const hashRef = stableHash(canonicalize(stateRef));

    expect(hashOpt).toBe(hashRef);
  }, 90000);

  test('differential: formula chain A1→A2→A3 evaluates correctly', async () => {
    const optimized = new SpreadsheetEngine('ChainTest');
    const reference = new ReferenceEngine();

    // Set up chain: A1=10, A2=A1+1, A3=A2+1
    await applyToOptimized(optimized, { type: 'setValue', row: 1, col: 1, value: 10 });
    applyToReference(reference, { type: 'setValue', row: 1, col: 1, value: 10 });

    await applyToOptimized(optimized, { type: 'setFormula', row: 2, col: 1, formula: '=A1+1' });
    applyToReference(reference, { type: 'setFormula', row: 2, col: 1, formula: '=A1+1' });

    await applyToOptimized(optimized, { type: 'setFormula', row: 3, col: 1, formula: '=A2+1' });
    applyToReference(reference, { type: 'setFormula', row: 3, col: 1, formula: '=A2+1' });

    // Both should have A3=12
    const valOpt = optimized.getCellValue({ row: 3, col: 1 });
    const valRef = reference.getCellValue({ row: 3, col: 1 });

    expect(valOpt).toBe(12);
    expect(valRef).toBe(12);
    expect(valOpt).toBe(valRef);
  }, 10000);

  test('differential: clearing cells propagates correctly', async () => {
    const optimized = new SpreadsheetEngine('ClearTest');
    const reference = new ReferenceEngine();

    // Set A1=5, A2=A1+1
    await applyToOptimized(optimized, { type: 'setValue', row: 1, col: 1, value: 5 });
    applyToReference(reference, { type: 'setValue', row: 1, col: 1, value: 5 });

    await applyToOptimized(optimized, { type: 'setFormula', row: 2, col: 1, formula: '=A1+1' });
    applyToReference(reference, { type: 'setFormula', row: 2, col: 1, formula: '=A1+1' });

    // Clear A1
    await applyToOptimized(optimized, { type: 'clearCell', row: 1, col: 1 });
    applyToReference(reference, { type: 'clearCell', row: 1, col: 1 });

    const stateOpt = snapshotOptimized(optimized);
    const stateRef = snapshotReference(reference);

    expect(canonicalize(stateOpt)).toBe(canonicalize(stateRef));
  }, 10000);

  test('differential: rapid mutations to same cell', async () => {
    const optimized = new SpreadsheetEngine('RapidTest');
    const reference = new ReferenceEngine();

    const addr: Address = { row: 6, col: 3 };

    // Mutate same cell 20 times
    for (let i = 0; i < 20; i++) {
      await applyToOptimized(optimized, { type: 'setValue', row: addr.row, col: addr.col, value: i });
      applyToReference(reference, { type: 'setValue', row: addr.row, col: addr.col, value: i });
    }

    const valOpt = optimized.getCellValue(addr);
    const valRef = reference.getCellValue(addr);

    expect(valOpt).toBe(19);
    expect(valRef).toBe(19);
    expect(valOpt).toBe(valRef);
  }, 15000);

  test('differential: overwriting formula with value', async () => {
    const optimized = new SpreadsheetEngine('OverwriteTest');
    const reference = new ReferenceEngine();

    // Set A1=10, A2=A1+1
    await applyToOptimized(optimized, { type: 'setValue', row: 1, col: 1, value: 10 });
    applyToReference(reference, { type: 'setValue', row: 1, col: 1, value: 10 });

    await applyToOptimized(optimized, { type: 'setFormula', row: 2, col: 1, formula: '=A1+1' });
    applyToReference(reference, { type: 'setFormula', row: 2, col: 1, formula: '=A1+1' });

    // Overwrite A2 formula with value
    await applyToOptimized(optimized, { type: 'setValue', row: 2, col: 1, value: 99 });
    applyToReference(reference, { type: 'setValue', row: 2, col: 1, value: 99 });

    const stateOpt = snapshotOptimized(optimized);
    const stateRef = snapshotReference(reference);

    expect(canonicalize(stateOpt)).toBe(canonicalize(stateRef));

    // A2 should be 99 (not 11)
    expect(optimized.getCellValue({ row: 2, col: 1 })).toBe(99);
    expect(reference.getCellValue({ row: 2, col: 1 })).toBe(99);
  }, 10000);
});

// ---------------------------------------------------------------------------
// Stress Test: Large-Scale Differential
// ---------------------------------------------------------------------------

describe('Differential Stress Testing', () => {

  test('stress: 500 operations maintain equivalence', async () => {
    const seed = 55555;
    const ops = generateOps(seed, 500);

    const optimized = new SpreadsheetEngine('StressTest');
    const reference = new ReferenceEngine();

    await applyAndCompareEachOperation(optimized, reference, ops);

    const stateOpt = snapshotOptimized(optimized);
    const stateRef = snapshotReference(reference);

    const hashOpt = stableHash(canonicalize(stateOpt));
    const hashRef = stableHash(canonicalize(stateRef));

    expect(hashOpt).toBe(hashRef);
  }, 120000);
});
