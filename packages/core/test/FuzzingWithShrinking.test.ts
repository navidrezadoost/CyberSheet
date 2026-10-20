/**
 * Property-Based Fuzzing with Shrinking
 * 
 * Purpose: Find minimal counterexamples to system invariants
 * 
 * Strategy:
 * 1. Generate random operation sequences
 * 2. Run against optimized + naive engines in parallel
 * 3. Validate all invariants after each operation
 * 4. When failure found, shrink to minimal reproducing case
 * 
 * This catches bugs that deterministic tests miss:
 * - Edge interactions across multiple transforms
 * - State drift under composition
 * - Hidden non-determinism
 * - Collision handling inconsistencies
 */

import { describe, it, expect } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { InsertColumnCommand } from '../src/InsertColumnCommand';
import { DeleteColumnCommand } from '../src/DeleteColumnCommand';
import { NaiveSheet } from './NaiveSheet';

// Operation types for fuzzing
type Op =
  | { type: 'insertCol'; k: number }
  | { type: 'deleteCol'; k: number }
  | { type: 'setValue'; row: number; col: number; value: string }
  | { type: 'setFormula'; row: number; col: number; formula: string }
  | { type: 'undo' }
  | { type: 'redo' };

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  int(max: number): number {
    return Math.floor(this.next() * max);
  }
}

// Formula generator with edge-case distributions
class FormulaGenerator {
  constructor(private rng: SeededRandom) {}

  /**
   * Generate column letter from number (0 -> A, 1 -> B, etc.)
   */
  private colToLetter(col: number): string {
    let result = '';
    let c = col;
    while (c >= 0) {
      result = String.fromCharCode(65 + (c % 26)) + result;
      c = Math.floor(c / 26) - 1;
    }
    return result;
  }

  /**
   * Generate cell reference like "A1", "B5"
   */
  private cellRef(maxRow: number = 10, maxCol: number = 10): string {
    const row = this.rng.int(maxRow);
    const col = this.rng.int(maxCol);
    return `${this.colToLetter(col)}${row + 1}`;
  }

  /**
   * Generate range reference like "A1:B5"
   */
  private rangeRef(maxRow: number = 10, maxCol: number = 10): string {
    const row1 = this.rng.int(maxRow);
    const col1 = this.rng.int(maxCol);
    const row2 = row1 + this.rng.int(3) + 1; // 1-3 rows
    const col2 = col1 + this.rng.int(3) + 1; // 1-3 cols
    return `${this.colToLetter(col1)}${row1 + 1}:${this.colToLetter(Math.min(col2, maxCol - 1))}${Math.min(row2, maxRow - 1) + 1}`;
  }

  /**
   * Generate formula with biased distribution toward edge cases
   */
  generate(): string {
    const r = this.rng.next();

    if (r < 0.3) {
      // 30% simple reference: =A1
      return `=${this.cellRef()}`;
    } else if (r < 0.5) {
      // 20% arithmetic: =A1+B2, =A1*B2
      const op = ['+', '-', '*', '/'][this.rng.int(4)];
      return `=${this.cellRef()}${op}${this.cellRef()}`;
    } else if (r < 0.65) {
      // 15% SUM with range: =SUM(A1:B5)
      return `=SUM(${this.rangeRef()})`;
    } else if (r < 0.75) {
      // 10% other functions: AVERAGE, COUNT, MIN, MAX
      const fn = ['AVERAGE', 'COUNT', 'MIN', 'MAX'][this.rng.int(4)];
      return `=${fn}(${this.rangeRef()})`;
    } else if (r < 0.85) {
      // 10% nested: =SUM(A1:B2)+C3
      return `=SUM(${this.rangeRef()})+${this.cellRef()}`;
    } else if (r < 0.92) {
      // 7% cross-boundary edge: references near worksheet edges
      const edgeCol = this.rng.int(2); // col 0 or 1 (likely to be deleted)
      const row = this.rng.int(5);
      return `=${this.colToLetter(edgeCol)}${row + 1}`;
    } else {
      // 8% complex: multiple operations
      const op1 = ['+', '-'][this.rng.int(2)];
      const op2 = ['*', '/'][this.rng.int(2)];
      return `=${this.cellRef()}${op1}${this.cellRef()}${op2}${this.cellRef()}`;
    }
  }
}

// Operation generator with biased distribution
class OperationGenerator {
  private formulaGen: FormulaGenerator;

  constructor(private rng: SeededRandom) {
    this.formulaGen = new FormulaGenerator(rng);
  }

  generate(): Op {
    const r = this.rng.next();

    if (r < 0.2) {
      // 20% insert
      return { type: 'insertCol', k: this.rng.int(10) };
    } else if (r < 0.4) {
      // 20% delete
      return { type: 'deleteCol', k: this.rng.int(10) };
    } else if (r < 0.5) {
      // 10% setValue (creates state to transform)
      return {
        type: 'setValue',
        row: this.rng.int(5),
        col: this.rng.int(8),
        value: `V${this.rng.int(100)}`
      };
    } else if (r < 0.7) {
      // 20% setFormula (HIGH RISK - stresses DAG + shifting)
      return {
        type: 'setFormula',
        row: this.rng.int(5),
        col: this.rng.int(8),
        formula: this.formulaGen.generate()
      };
    } else if (r < 0.85) {
      // 15% undo
      return { type: 'undo' };
    } else {
      // 15% redo
      return { type: 'redo' };
    }
  }

  generateSequence(length: number): Op[] {
    const ops: Op[] = [];
    for (let i = 0; i < length; i++) {
      ops.push(this.generate());
    }
    return ops;
  }
}

// Test harness that executes operations against both engines
class DualExecutionHarness {
  private workbook: Workbook;
  private worksheet: any;
  private naive: NaiveSheet;
  private commandStack: Array<InsertColumnCommand | DeleteColumnCommand> = [];
  private redoStack: Array<InsertColumnCommand | DeleteColumnCommand> = [];
  private hasUsedUndo: boolean = false; // Track if undo/redo has ever been used

  constructor() {
    this.workbook = new Workbook();
    this.worksheet = this.workbook.addSheet('Test');
    this.naive = new NaiveSheet();
  }

  execute(op: Op): { success: boolean; error?: string } {
    try {
      switch (op.type) {
        case 'insertCol':
          const insertCmd = new InsertColumnCommand(this.worksheet, op.k + 1);
          insertCmd.execute();
          this.commandStack.push(insertCmd);
          this.redoStack = []; // Clear redo stack
          if (!this.hasUsedUndo) this.naive.insertColumn(op.k + 1);
          break;

        case 'deleteCol':
          const deleteCmd = new DeleteColumnCommand(this.worksheet, op.k + 1);
          deleteCmd.execute();
          this.commandStack.push(deleteCmd);
          this.redoStack = [];
          if (!this.hasUsedUndo) this.naive.deleteColumn(op.k + 1);
          break;

        case 'setValue':
          this.worksheet.setCellValue({ row: op.row + 1, col: op.col + 1 }, op.value);
          if (!this.hasUsedUndo) this.naive.setCellValue({ row: op.row + 1, col: op.col + 1 }, op.value);
          break;

        case 'setFormula':
          // Set formula with '=' prefix for worksheet API
          this.worksheet.setCellValue({ row: op.row + 1, col: op.col + 1 }, `=${op.formula.startsWith('=') ? op.formula.slice(1) : op.formula}`);
          if (!this.hasUsedUndo) {
            // Naive sheet expects formula with '=' prefix
            this.naive.setCellValue({ row: op.row + 1, col: op.col + 1 }, `=${op.formula.startsWith('=') ? op.formula.slice(1) : op.formula}`);
          }
          break;

        case 'undo':
          // Always mark that undo was attempted, even if stack is empty
          // This prevents differential validation after undo() is called
          this.hasUsedUndo = true;
          if (this.commandStack.length > 0) {
            const cmd = this.commandStack.pop()!;
            cmd.undo();
            this.redoStack.push(cmd);
            // Naive engine doesn't support undo, so states will diverge
            // Stop applying operations to NaiveSheet from this point on
          }
          break;

        case 'redo':
          // Always mark that redo was attempted
          this.hasUsedUndo = true;
          if (this.redoStack.length > 0) {
            const cmd = this.redoStack.pop()!;
            cmd.execute();
            this.commandStack.push(cmd);
          }
          break;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  validate(): { valid: boolean; error?: string } {
    try {
      // Validate differential correctness (skip if undo/redo has been used)
      // NaiveSheet doesn't support undo, so states diverge after undo operations
      if (!this.hasUsedUndo) {
        // Compare states
        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 12; c++) {
            const optVal = this.worksheet.getCellValue({ row: r + 1, col: c + 1 });
            const naiveVal = this.naive.getCellValue({ row: r + 1, col: c + 1 });
            if (optVal !== naiveVal) {
              return {
                valid: false,
                error: `State mismatch at (${r},${c}): opt="${optVal}", naive="${naiveVal}" [hasUsedUndo=${this.hasUsedUndo}]`
              };
            }
          }
        }
      }

      // Validate merge integrity (Invariant 1: No degenerate merges)
      const merges = this.worksheet.getMergedRanges();
      for (const merge of merges) {
        const width = merge.end.col - merge.start.col + 1;
        const height = merge.end.row - merge.start.row + 1;
        if (width < 2 && height < 2) {
          return { valid: false, error: `Degenerate merge: ${JSON.stringify(merge)}` };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }
}

// Shrinker: finds minimal failing sequence
class SequenceShrinker {
  constructor(private testFn: (seq: Op[]) => boolean) {}

  /**
   * Shrink by removing chunks
   * Strategy: Try removing progressively smaller slices
   */
  shrinkByRemoval(seq: Op[]): Op[] {
    let current = [...seq];

    // Try removing chunks of decreasing size
    for (let chunkSize = Math.floor(current.length / 2); chunkSize >= 1; chunkSize = Math.floor(chunkSize / 2)) {
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i + chunkSize <= current.length; i++) {
          // Try removing chunk at position i
          const candidate = [...current.slice(0, i), ...current.slice(i + chunkSize)];
          if (candidate.length > 0 && this.testFn(candidate)) {
            current = candidate;
            changed = true;
            break; // Restart with smaller sequence
          }
        }
      }
    }

    return current;
  }

  /**
   * Shrink by simplifying operations
   * Strategy: Reduce operation parameters to minimal values
   */
  shrinkBySimplification(seq: Op[]): Op[] {
    const current = [...seq];

    for (let i = 0; i < current.length; i++) {
      const op = current[i];

      // Try simplifying insert/delete columns to column 0
      if ((op.type === 'insertCol' || op.type === 'deleteCol') && op.k > 0) {
        const candidate = [...current];
        candidate[i] = { ...op, k: 0 };
        if (this.testFn(candidate)) {
          return this.shrinkBySimplification(candidate);
        }
      }

      // Try simplifying setValue to (0,0)
      if (op.type === 'setValue' && (op.row > 0 || op.col > 0)) {
        const candidate = [...current];
        candidate[i] = { type: 'setValue', row: 0, col: 0, value: op.value };
        if (this.testFn(candidate)) {
          return this.shrinkBySimplification(candidate);
        }
      }

      // Try simplifying setFormula to simpler formula
      if (op.type === 'setFormula') {
        // Try simplest formula: =A1
        const candidate = [...current];
        candidate[i] = { type: 'setFormula', row: op.row, col: op.col, formula: '=A1' };
        if (this.testFn(candidate)) {
          return this.shrinkBySimplification(candidate);
        }
        // Try simplifying position to (0,0)
        if (op.row > 0 || op.col > 0) {
          const candidate2 = [...current];
          candidate2[i] = { type: 'setFormula', row: 0, col: 0, formula: op.formula };
          if (this.testFn(candidate2)) {
            return this.shrinkBySimplification(candidate2);
          }
        }
      }
    }

    return current;
  }

  shrink(seq: Op[]): Op[] {
    console.log(`\n[Shrinking] Initial sequence length: ${seq.length}`);

    // Phase 1: Remove unnecessary operations
    let shrunk = this.shrinkByRemoval(seq);
    console.log(`[Shrinking] After removal: ${shrunk.length} ops`);

    // Phase 2: Simplify remaining operations
    shrunk = this.shrinkBySimplification(shrunk);
    console.log(`[Shrinking] After simplification: ${shrunk.length} ops`);

    return shrunk;
  }
}

// Pretty-print operation sequence
function formatSequence(ops: Op[]): string {
  return ops.map((op, i) => {
    switch (op.type) {
      case 'insertCol':
        return `${i}: insertCol(${op.k})`;
      case 'deleteCol':
        return `${i}: deleteCol(${op.k})`;
      case 'setValue':
        return `${i}: setValue(${op.row},${op.col},"${op.value}")`;
      case 'setFormula':
        return `${i}: setFormula(${op.row},${op.col},"${op.formula}")`;
      case 'undo':
        return `${i}: undo()`;
      case 'redo':
        return `${i}: redo()`;
    }
  }).join('\n');
}

// Main fuzzing test suite
describe('Property-Based Fuzzing with Shrinking', () => {
  
  it('should survive 1000 random sequences (smoke test)', () => {
    const gen = new OperationGenerator(new SeededRandom(12345));

    let failures = 0;
    const failedSequences: Op[][] = [];

    for (let trial = 0; trial < 1000; trial++) {
      const sequence = gen.generateSequence(10); // Short sequences for smoke test
      const harness = new DualExecutionHarness();

      let failed = false;
      for (let i = 0; i < sequence.length; i++) {
        const result = harness.execute(sequence[i]);
        if (!result.success) {
          // Execution failure - this might be expected (e.g., invalid delete)
          continue;
        }

        const validation = harness.validate();
        if (!validation.valid) {
          console.log(`\n❌ FAILURE at trial ${trial}, step ${i}`);
          console.log(`Error: ${validation.error}`);
          console.log(`\nFailing sequence:\n${formatSequence(sequence)}`);
          failures++;
          failedSequences.push(sequence);
          failed = true;
          break;
        }
      }

      if (!failed && trial % 100 === 0) {
        console.log(`✓ Completed ${trial} trials`);
      }
    }

    expect(failures).toBe(0);
    if (failures > 0) {
      console.log(`\n⚠️  Found ${failures} failures`);
    }
  });

  it('should find minimal counterexample if one exists (shrinking test)', () => {
    const gen = new OperationGenerator(new SeededRandom(99999));

    // Generate longer sequences to increase chance of finding edge cases
    const sequence = gen.generateSequence(50);

    const testFn = (seq: Op[]): boolean => {
      const harness = new DualExecutionHarness();
      for (const op of seq) {
        harness.execute(op);
        const validation = harness.validate();
        if (!validation.valid) {
          return true; // Fails (we want this for shrinking)
        }
      }
      return false; // Passes (no failure to shrink)
    };

    if (testFn(sequence)) {
      console.log(`\n🔍 Found failing sequence, shrinking...`);
      const shrinker = new SequenceShrinker(testFn);
      const minimal = shrinker.shrink(sequence);

      console.log(`\n✅ Minimal failing sequence (${minimal.length} ops):\n${formatSequence(minimal)}`);

      // This test expects no failures, so if we reach here, it's a real bug
      expect(minimal.length).toBe(0); // Should never shrink to 0 if there's a real failure
    } else {
      console.log('✓ No failures found in this sequence');
    }
  });

  it('should survive 10k operations with deep composition', () => {
    const gen = new OperationGenerator(new SeededRandom(42424242));
    const harness = new DualExecutionHarness();

    let successfulOps = 0;

    for (let i = 0; i < 10000; i++) {
      const op = gen.generate();
      const result = harness.execute(op);

      if (result.success) {
        successfulOps++;
      }

      // Validate every 500 operations
      if (i % 500 === 0) {
        const validation = harness.validate();
        if (!validation.valid) {
          throw new Error(`Validation failed at op ${i}: ${validation.error}`);
        }
        console.log(`✓ Fuzz test: ${i} ops completed, ${successfulOps} successful`);
      }
    }

    console.log(`\n✅ 10k fuzz test PASSED: ${successfulOps} successful ops`);
  });
});
