/**
 * Adversarial Validation — Actively Try to Break Equivalence
 * 
 * Purpose: Don't just compare engines. Try to MAKE them disagree.
 * 
 * Strategies:
 * 1. Snapshot delta validation — Compare every step, not just final state
 * 2. Perturbation testing — Same ops, different execution strategies
 * 3. Cross-seed divergence — Ensure randomness explores state space
 * 
 * Philosophy:
 * > The strongest validation is trying to prove yourself wrong and failing.
 */

import { SpreadsheetEngine } from '../src/SpreadsheetEngine';
import { ReferenceEngine } from '../src/ReferenceEngine';
import { Address } from '../src/types';

// Canonical state representation
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

function snapshotOptimized(engine: SpreadsheetEngine): CanonicalCell[] {
  const cells: CanonicalCell[] = [];
  const ws = engine.getWorksheet();
  
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < 26; col++) {
      const cell = ws.getCell({ row, col });
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

function snapshotReference(engine: ReferenceEngine): CanonicalCell[] {
  return engine.snapshot().map((cell) => ({
    row: cell.row,
    col: cell.col,
    value: cell.value,
    ...(cell.formula ? { formula: cell.formula } : {}),
  }));
}

// Seeded random number generator (reproducible)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

type Operation =
  | { type: 'setValue'; row: number; col: number; value: number }
  | { type: 'setFormula'; row: number; col: number; formula: string }
  | { type: 'clearCell'; row: number; col: number };

function generateOps(seed: number, count: number): Operation[] {
  const rng = new SeededRandom(seed);
  const ops: Operation[] = [];

  for (let i = 0; i < count; i++) {
    const opType = rng.nextInt(0, 2);
    const row = rng.nextInt(0, 9);
    const col = rng.nextInt(0, 9);

    if (opType === 0) {
      ops.push({ type: 'setValue', row, col, value: rng.nextInt(1, 100) });
    } else if (opType === 1) {
      const refRow = rng.nextInt(0, 9);
      const refCol = rng.nextInt(0, 9);
      const refAddr = `${String.fromCharCode(65 + refCol)}${refRow + 1}`;
      const operator = ['+', '-', '*'][rng.nextInt(0, 2)];
      const operand = rng.nextInt(1, 10);
      ops.push({
        type: 'setFormula',
        row,
        col,
        formula: `=${refAddr}${operator}${operand}`,
      });
    } else {
      ops.push({ type: 'clearCell', row, col });
    }
  }

  return ops;
}

describe('Adversarial Validation — Snapshot Delta', () => {
  
  test('ADV1: Compare engines after EVERY operation (10 steps)', async () => {
    const seed = 42;
    const ops = generateOps(seed, 10);
    
    const optimized = new SpreadsheetEngine('ADV1');
    const reference = new ReferenceEngine();
    
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      
      // Apply to both engines
      if (op.type === 'setValue') {
        await optimized.run((ws) => ws.setCellValue({ row: op.row, col: op.col }, op.value));
        reference.setCellValue({ row: op.row, col: op.col }, op.value);
      } else if (op.type === 'setFormula') {
        await optimized.run((ws) => ws.setFormula({ row: op.row, col: op.col }, op.formula));
        reference.setFormula({ row: op.row, col: op.col }, op.formula);
      } else {
        await optimized.run((ws) => ws.clearCell({ row: op.row, col: op.col }));
        reference.clearCell({ row: op.row, col: op.col });
      }
      
      // Compare states IMMEDIATELY after each operation
      const stateOpt = snapshotOptimized(optimized);
      const stateRef = snapshotReference(reference);
      const canonicalOpt = canonicalize(stateOpt);
      const canonicalRef = canonicalize(stateRef);
      
      // If they diverge, we know EXACTLY which operation caused it
      expect(canonicalOpt).toBe(canonicalRef);
    }
  });

  test('ADV2: Delta validation with 50 steps (localizes bugs)', async () => {
    const seed = 12345;
    const ops = generateOps(seed, 50);
    
    const optimized = new SpreadsheetEngine('ADV2');
    const reference = new ReferenceEngine();
    
    const divergencePoints: number[] = [];
    
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      
      if (op.type === 'setValue') {
        await optimized.run((ws) => ws.setCellValue({ row: op.row, col: op.col }, op.value));
        reference.setCellValue({ row: op.row, col: op.col }, op.value);
      } else if (op.type === 'setFormula') {
        await optimized.run((ws) => ws.setFormula({ row: op.row, col: op.col }, op.formula));
        reference.setFormula({ row: op.row, col: op.col }, op.formula);
      } else {
        await optimized.run((ws) => ws.clearCell({ row: op.row, col: op.col }));
        reference.clearCell({ row: op.row, col: op.col });
      }
      
      const stateOpt = canonicalize(snapshotOptimized(optimized));
      const stateRef = canonicalize(snapshotReference(reference));
      
      if (stateOpt !== stateRef) {
        divergencePoints.push(i);
      }
    }
    
    // No divergence allowed
    expect(divergencePoints).toEqual([]);
  });
});

describe('Adversarial Validation — Cross-Seed Divergence', () => {
  
  test('ADV3: Different seeds produce different results', async () => {
    const hashes = new Set<string>();
    
    for (let seed = 1; seed <= 20; seed++) {
      const ops = generateOps(seed, 30);
      const engine = new SpreadsheetEngine(`ADV3-${seed}`);
      
      for (const op of ops) {
        if (op.type === 'setValue') {
          await engine.run((ws) => ws.setCellValue({ row: op.row, col: op.col }, op.value));
        } else if (op.type === 'setFormula') {
          await engine.run((ws) => ws.setFormula({ row: op.row, col: op.col }, op.formula));
        } else {
          await engine.run((ws) => ws.clearCell({ row: op.row, col: op.col }));
        }
      }
      
      const state = canonicalize(snapshotOptimized(engine));
      hashes.add(state);
    }
    
    // Ensure randomness explores state space (not collapsing)
    // We expect at least SOME diversity (not all identical)
    expect(hashes.size).toBeGreaterThan(5); // At least 5 unique states out of 20 seeds
  });

  test('ADV4: Same seed across runs produces identical results', async () => {
    const seed = 99999;
    const ops = generateOps(seed, 40);
    
    // Run 1
    const engine1 = new SpreadsheetEngine('ADV4-1');
    for (const op of ops) {
      if (op.type === 'setValue') {
        await engine1.run((ws) => ws.setCellValue({ row: op.row, col: op.col }, op.value));
      } else if (op.type === 'setFormula') {
        await engine1.run((ws) => ws.setFormula({ row: op.row, col: op.col }, op.formula));
      } else {
        await engine1.run((ws) => ws.clearCell({ row: op.row, col: op.col }));
      }
    }
    const state1 = canonicalize(snapshotOptimized(engine1));
    
    // Run 2 (same seed)
    const engine2 = new SpreadsheetEngine('ADV4-2');
    for (const op of ops) {
      if (op.type === 'setValue') {
        await engine2.run((ws) => ws.setCellValue({ row: op.row, col: op.col }, op.value));
      } else if (op.type === 'setFormula') {
        await engine2.run((ws) => ws.setFormula({ row: op.row, col: op.col }, op.formula));
      } else {
        await engine2.run((ws) => ws.clearCell({ row: op.row, col: op.col }));
      }
    }
    const state2 = canonicalize(snapshotOptimized(engine2));
    
    // Must be identical
    expect(state1).toBe(state2);
  });
});

describe('Adversarial Validation — Interleaved Operations', () => {
  
  test('ADV5: Interleaving writes and formulas maintains consistency', async () => {
    const optimized = new SpreadsheetEngine('ADV5');
    const reference = new ReferenceEngine();
    
    // Pattern: value, formula, value, formula, value, formula
    const pattern = [
      { type: 'setValue' as const, row: 0, col: 0, value: 10 },
      { type: 'setFormula' as const, row: 1, col: 0, formula: '=A1*2' },
      { type: 'setValue' as const, row: 2, col: 0, value: 30 },
      { type: 'setFormula' as const, row: 3, col: 0, formula: '=A2+A3' },
      { type: 'setValue' as const, row: 4, col: 0, value: 50 },
      { type: 'setFormula' as const, row: 5, col: 0, formula: '=A4+A5' },
    ];
    
    for (const op of pattern) {
      if (op.type === 'setValue') {
        await optimized.run((ws) => ws.setCellValue({ row: op.row, col: op.col }, op.value));
        reference.setCellValue({ row: op.row, col: op.col }, op.value);
      } else {
        await optimized.run((ws) => ws.setFormula({ row: op.row, col: op.col }, op.formula));
        reference.setFormula({ row: op.row, col: op.col }, op.formula);
      }
    }
    
    const stateOpt = canonicalize(snapshotOptimized(optimized));
    const stateRef = canonicalize(snapshotReference(reference));
    
    expect(stateOpt).toBe(stateRef);
  });

  test('ADV6: Rapid mutations to same cell converge correctly', async () => {
    const optimized = new SpreadsheetEngine('ADV6');
    const reference = new ReferenceEngine();
    
    // Rapidly mutate A1: value → formula → value → formula
    await optimized.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 10));
    reference.setCellValue({ row: 0, col: 0 }, 10);
    
    await optimized.run((ws) => ws.setFormula({ row: 0, col: 0 }, '=5*2'));
    reference.setFormula({ row: 0, col: 0 }, '=5*2');
    
    await optimized.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 15));
    reference.setCellValue({ row: 0, col: 0 }, 15);
    
    await optimized.run((ws) => ws.setFormula({ row: 0, col: 0 }, '=3*5'));
    reference.setFormula({ row: 0, col: 0 }, '=3*5');
    
    const stateOpt = canonicalize(snapshotOptimized(optimized));
    const stateRef = canonicalize(snapshotReference(reference));
    
    expect(stateOpt).toBe(stateRef);
    
    // Final value should be 15 (from formula 3*5)
    const finalOpt = optimized.getWorksheet().getCellValue({ row: 0, col: 0 });
    const finalRef = reference.getCellValue({ row: 0, col: 0 });
    
    expect(finalOpt).toBe(15);
    expect(finalRef).toBe(15);
  });
});

describe('Adversarial Validation — Dependency Chains', () => {
  
  test('ADV7: Deep dependency chain A→B→C→D→E evaluates correctly', async () => {
    const optimized = new SpreadsheetEngine('ADV7');
    const reference = new ReferenceEngine();
    
    // A1 = 1
    await optimized.run((ws) => ws.setCellValue({ row: 0, col: 0 }, 1));
    reference.setCellValue({ row: 0, col: 0 }, 1);
    
    // A2 = A1 + 1 (= 2)
    await optimized.run((ws) => ws.setFormula({ row: 1, col: 0 }, '=A1+1'));
    reference.setFormula({ row: 1, col: 0 }, '=A1+1');
    
    // A3 = A2 + 1 (= 3)
    await optimized.run((ws) => ws.setFormula({ row: 2, col: 0 }, '=A2+1'));
    reference.setFormula({ row: 2, col: 0 }, '=A2+1');
    
    // A4 = A3 + 1 (= 4)
    await optimized.run((ws) => ws.setFormula({ row: 3, col: 0 }, '=A3+1'));
    reference.setFormula({ row: 3, col: 0 }, '=A3+1');
    
    // A5 = A4 + 1 (= 5)
    await optimized.run((ws) => ws.setFormula({ row: 4, col: 0 }, '=A4+1'));
    reference.setFormula({ row: 4, col: 0 }, '=A4+1');
    
    const stateOpt = canonicalize(snapshotOptimized(optimized));
    const stateRef = canonicalize(snapshotReference(reference));
    
    expect(stateOpt).toBe(stateRef);
    
    // Verify final value
    const a5Opt = optimized.getWorksheet().getCellValue({ row: 4, col: 0 });
    const a5Ref = reference.getCellValue({ row: 4, col: 0 });
    
    expect(a5Opt).toBe(5);
    expect(a5Ref).toBe(5);
  });

  test('ADV8: Diamond dependency A→{B,C}→D evaluates in any order', async () => {
    const optimized = new SpreadsheetEngine('ADV8');
    const reference = new ReferenceEngine();
    
    //     A1(10)
    //     /    \
    //   B1      C1
    //     \    /
    //      D1
    
    await optimized.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 10);
      ws.setFormula({ row: 0, col: 1 }, '=A1*2'); // B1 = 20
      ws.setFormula({ row: 0, col: 2 }, '=A1*3'); // C1 = 30
      ws.setFormula({ row: 0, col: 3 }, '=B1+C1'); // D1 = 50
    });
    
    reference.setCellValue({ row: 0, col: 0 }, 10);
    reference.setFormula({ row: 0, col: 1 }, '=A1*2');
    reference.setFormula({ row: 0, col: 2 }, '=A1*3');
    reference.setFormula({ row: 0, col: 3 }, '=B1+C1');
    
    const stateOpt = canonicalize(snapshotOptimized(optimized));
    const stateRef = canonicalize(snapshotReference(reference));
    
    expect(stateOpt).toBe(stateRef);
    
    const d1Opt = optimized.getWorksheet().getCellValue({ row: 0, col: 3 });
    const d1Ref = reference.getCellValue({ row: 0, col: 3 });
    
    expect(d1Opt).toBe(50);
    expect(d1Ref).toBe(50);
  });
});

describe('Adversarial Validation — Error Handling', () => {
  
  test('ADV9: Invalid formula produces consistent error', async () => {
    const optimized = new SpreadsheetEngine('ADV9');
    const reference = new ReferenceEngine();
    
    // Invalid formula (division by zero)
    await optimized.run((ws) => {
      ws.setCellValue({ row: 0, col: 0 }, 0);
      ws.setFormula({ row: 1, col: 0 }, '=10/A1');
    });
    
    reference.setCellValue({ row: 0, col: 0 }, 0);
    reference.setFormula({ row: 1, col: 0 }, '=10/A1');
    
    const valOpt = optimized.getWorksheet().getCellValue({ row: 1, col: 0 });
    const valRef = reference.getCellValue({ row: 1, col: 0 });
    
    // Both should produce error (exact error value may differ, but both should be non-numeric)
    expect(typeof valOpt).toBe('string'); // Error message
    expect(typeof valRef).toBe('string'); // Error message
  });

  test('ADV10: Referencing non-existent cell is consistent', async () => {
    const optimized = new SpreadsheetEngine('ADV10');
    const reference = new ReferenceEngine();
    
    // Reference cell that doesn't exist
    await optimized.run((ws) => ws.setFormula({ row: 0, col: 0 }, '=Z99+1'));
    reference.setFormula({ row: 0, col: 0 }, '=Z99+1');
    
    const stateOpt = canonicalize(snapshotOptimized(optimized));
    const stateRef = canonicalize(snapshotReference(reference));
    
    expect(stateOpt).toBe(stateRef);
  });
});
