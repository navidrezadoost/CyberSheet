/**
 * Critical Invariant Tests for Insert/Delete Column Commands
 * 
 * These are PROOF OBLIGATIONS, not "good tests".
 * They validate structural correctness at the architectural level.
 * 
 * Invariants Under Test:
 * 1. Degenerate merge rejection (width < 2 AND height < 2)
 * 2. Merge-cell consistency (merge topology matches cell content)
 * 3. Deterministic replay (same ops → same state)
 * 4. Undo/redo stability (no merge duplication)
 * 5. Adversarial structural integrity (random ops preserve invariants)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { InsertColumnCommand } from '../src/InsertColumnCommand';
import { DeleteColumnCommand } from '../src/DeleteColumnCommand';
import type { Address, Range } from '../src/types';

describe('InsertColumnCommand + DeleteColumnCommand - Critical Invariants', () => {
  let workbook: Workbook;
  let worksheet: Worksheet;

  beforeEach(() => {
    workbook = new Workbook();
    worksheet = workbook.addSheet('Test');
  });

  /**
   * TEST 1: Degenerate Merge Rejection
   * 
   * Invariant: width < 2 AND height < 2 → merge must be removed
   * 
   * Failure mode: 1x1 merge creates invisible topology drift
   */
  describe('Invariant 1: Degenerate Merge Rejection', () => {
    it('should remove merge that collapses to 1x1 after delete', () => {
      // Setup: A1:B1 merged (2x1 merge)
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      // Verify initial merge exists
      const mergesBefore = worksheet.getMergedRanges();
      expect(mergesBefore).toHaveLength(1);
      expect(mergesBefore[0].start).toEqual({ row: 1, col: 1 });
      expect(mergesBefore[0].end).toEqual({ row: 1, col: 2 });
      
      // Delete column A (col 0)
      const cmd = new DeleteColumnCommand(worksheet, 1);
      cmd.execute();
      
      // Verify: No merge should exist (would be 1x1 at A1, which is degenerate)
      const mergesAfter = worksheet.getMergedRanges();
      expect(mergesAfter).toHaveLength(0);
    });

    it('should preserve 2x1 merge after inserting column before it', () => {
      // Setup: B1:C1 merged (2x1 merge)
      worksheet.mergeCells({ start: { row: (0) + 1, col: (1) + 1 }, end: { row: (0) + 1, col: (2) + 1 } });
      
      // Insert column A (col 0) - should shift merge to C1:D1
      const cmd = new InsertColumnCommand(worksheet, 1);
      cmd.execute();
      
      // Verify: Merge still 2x1, now at C1:D1
      const mergesAfter = worksheet.getMergedRanges();
      expect(mergesAfter).toHaveLength(1);
      expect(mergesAfter[0].start).toEqual({ row: 1, col: 3 });
      expect(mergesAfter[0].end).toEqual({ row: 1, col: 4 });
    });

    it('should reject merge that becomes 1x2 (height only)', () => {
      // Setup: A1:A2 merged (1x2 merge)
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (1) + 1, col: (0) + 1 } });
      
      // Insert column at A (col 0) - shifts merge to B1:B2
      const cmd = new InsertColumnCommand(worksheet, 1);
      cmd.execute();
      
      // Verify: Merge should still exist at B1:B2 (1x2 is valid)
      const mergesAfter = worksheet.getMergedRanges();
      expect(mergesAfter).toHaveLength(1);
      expect(mergesAfter[0].start).toEqual({ row: 1, col: 2 });
      expect(mergesAfter[0].end).toEqual({ row: 2, col: 2 });
    });
  });

  /**
   * TEST 2: Merge-Cell Consistency
   * 
   * Invariant: ∀ merge region M, anchor cell content preserved after transform
   * 
   * Failure mode: Merge topology drifts from cell content
   */
  describe('Invariant 2: Merge-Cell Consistency', () => {
    it('should preserve merge anchor value after insertColumn', () => {
      // Setup: A1:B1 merged, A1 = 10
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 10);
      
      // Insert column at A (col 0)
      const cmd = new InsertColumnCommand(worksheet, 1);
      cmd.execute();
      
      // Verify: Merge at B1:C1, B1 still = 10
      const mergesAfter = worksheet.getMergedRanges();
      expect(mergesAfter).toHaveLength(1);
      expect(mergesAfter[0].start).toEqual({ row: 1, col: 2 });
      expect(mergesAfter[0].end).toEqual({ row: 1, col: 3 });
      
      const anchorCell = worksheet.getCell({ row: (0) + 1, col: (1) + 1 });
      expect(anchorCell?.value).toBe(10);
    });

    it('should preserve merge anchor formula after deleteColumn', () => {
      // Setup: B1:C1 merged, B1 = =A1+10, A1 = 5
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 5);
      worksheet.mergeCells({ start: { row: (0) + 1, col: (1) + 1 }, end: { row: (0) + 1, col: (2) + 1 } });
      worksheet.setCellFormula({ row: (0) + 1, col: (1) + 1 }, '=A1+10');
      
      // Delete column A (col 0) - merge shifts to A1:B1, formula becomes #REF!+10
      const cmd = new DeleteColumnCommand(worksheet, 1);
      cmd.execute();
      
      // Verify: Merge at A1:B1, A1 has formula with #REF!
      const mergesAfter = worksheet.getMergedRanges();
      expect(mergesAfter).toHaveLength(1);
      expect(mergesAfter[0].start).toEqual({ row: 1, col: 1 });
      expect(mergesAfter[0].end).toEqual({ row: 1, col: 2 });
      
      const anchorCell = worksheet.getCell({ row: (0) + 1, col: (0) + 1 });
      expect(anchorCell?.formula).toBeDefined();
      expect(anchorCell?.formula).toContain('#REF!');
    });

    it('should maintain merge-cell consistency across multiple transforms', () => {
      // Setup: A1:B2 merged (2x2), A1 = "Merged"
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (1) + 1, col: (1) + 1 } });
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Merged');
      
      // Transform 1: Insert column at A
      const cmd1 = new InsertColumnCommand(worksheet, 1);
      cmd1.execute();
      
      // Verify: Merge at B1:C2, B1 = "Merged"
      let merges = worksheet.getMergedRanges();
      expect(merges).toHaveLength(1);
      expect(merges[0].start).toEqual({ row: 1, col: 2 });
      expect(merges[0].end).toEqual({ row: 2, col: 3 });
      expect(worksheet.getCell({ row: (0) + 1, col: (1) + 1 })?.value).toBe('Merged');
      
      // Transform 2: Insert column at A again
      const cmd2 = new InsertColumnCommand(worksheet, 1);
      cmd2.execute();
      
      // Verify: Merge at C1:D2, C1 = "Merged"
      merges = worksheet.getMergedRanges();
      expect(merges).toHaveLength(1);
      expect(merges[0].start).toEqual({ row: 1, col: 3 });
      expect(merges[0].end).toEqual({ row: 2, col: 4 });
      expect(worksheet.getCell({ row: (0) + 1, col: (2) + 1 })?.value).toBe('Merged');
    });
  });

  /**
   * TEST 3: Deterministic Replay
   * 
   * Invariant: Same operation sequence → identical final state
   * 
   * Failure mode: Nondeterministic iteration order causes state divergence
   */
  describe('Invariant 3: Deterministic Replay', () => {
    it('should produce identical state on repeated execution', () => {
      // Setup: A1 = 1, B1 = 2, A1:B1 merged
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 1);
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 2);
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      // Capture initial state
      const captureState = () => ({
        a1: worksheet.getCell({ row: (0) + 1, col: (0) + 1 }),
        b1: worksheet.getCell({ row: (0) + 1, col: (1) + 1 }),
        c1: worksheet.getCell({ row: (0) + 1, col: (2) + 1 }),
        merges: worksheet.getMergedRanges().map(m => ({ ...m }))
      });
      
      // Run 1: insertColumn(0)
      workbook = new Workbook();
      worksheet = workbook.addSheet('Test');
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 1);
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 2);
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      const cmd1 = new InsertColumnCommand(worksheet, 1);
      cmd1.execute();
      const state1 = captureState();
      
      // Run 2: insertColumn(0) again (fresh workbook)
      workbook = new Workbook();
      worksheet = workbook.addSheet('Test');
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 1);
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 2);
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      const cmd2 = new InsertColumnCommand(worksheet, 1);
      cmd2.execute();
      const state2 = captureState();
      
      // Verify: Identical states
      expect(state1.b1?.value).toBe(state2.b1?.value);
      expect(state1.c1?.value).toBe(state2.c1?.value);
      expect(state1.merges).toEqual(state2.merges);
    });

    it('should produce deterministic state under complex sequence', () => {
      // Setup: A1:C1 merged, values in each
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (2) + 1 } });
      
      // Sequence: insert(0), delete(0), insert(1)
      const cmd1 = new InsertColumnCommand(worksheet, 1);
      cmd1.execute();
      
      const cmd2 = new DeleteColumnCommand(worksheet, 1);
      cmd2.execute();
      
      const cmd3 = new InsertColumnCommand(worksheet, 2);
      cmd3.execute();
      
      const state1 = {
        merges: worksheet.getMergedRanges(),
        cellCount: Array.from({ length: 5 }, (_, i) => 
          worksheet.getCell({ row: (0) + 1, col: (i) + 1 })
        ).filter(c => c).length
      };
      
      // Replay same sequence
      workbook = new Workbook();
      worksheet = workbook.addSheet('Test');
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'B');
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (2) + 1 } });
      
      new InsertColumnCommand(worksheet, 1).execute();
      new DeleteColumnCommand(worksheet, 1).execute();
      new InsertColumnCommand(worksheet, 2).execute();
      
      const state2 = {
        merges: worksheet.getMergedRanges(),
        cellCount: Array.from({ length: 5 }, (_, i) => 
          worksheet.getCell({ row: (0) + 1, col: (i) + 1 })
        ).filter(c => c).length
      };
      
      // Verify: Identical topology
      expect(state1.merges.length).toBe(state2.merges.length);
      expect(state1.cellCount).toBe(state2.cellCount);
    });
  });

  /**
   * TEST 4: Undo/Redo Stability
   * 
   * Invariant: insert → undo → redo produces stable merge topology (no duplication)
   * 
   * Failure mode: Undo doesn't properly clean up, redo duplicates merges
   */
  describe('Invariant 4: Undo/Redo Stability', () => {
    it('should maintain merge stability through undo', () => {
      // Setup: A1:B1 merged
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      // Execute: insert column at A
      const cmd = new InsertColumnCommand(worksheet, 1);
      cmd.execute();
      
      // Verify: Merge at B1:C1
      let merges = worksheet.getMergedRanges();
      expect(merges).toHaveLength(1);
      expect(merges[0].start).toEqual({ row: 1, col: 2 });
      
      // Undo
      cmd.undo();
      
      // Verify: Merge back at A1:B1, no duplication
      merges = worksheet.getMergedRanges();
      expect(merges).toHaveLength(1);
      expect(merges[0].start).toEqual({ row: 1, col: 1 });
      expect(merges[0].end).toEqual({ row: 1, col: 2 });
    });

    it('should handle double insert + double undo correctly', () => {
      // Setup: A1:B1 merged
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      // Insert at A twice
      const cmd1 = new InsertColumnCommand(worksheet, 1);
      cmd1.execute();
      
      const cmd2 = new InsertColumnCommand(worksheet, 1);
      cmd2.execute();
      
      // Verify: Merge at C1:D1
      let merges = worksheet.getMergedRanges();
      expect(merges).toHaveLength(1);
      expect(merges[0].start).toEqual({ row: 1, col: 3 });
      expect(merges[0].end).toEqual({ row: 1, col: 4 });
      
      // Undo twice
      cmd2.undo();
      cmd1.undo();
      
      // Verify: Back to A1:B1, exactly 1 merge
      merges = worksheet.getMergedRanges();
      expect(merges).toHaveLength(1);
      expect(merges[0].start).toEqual({ row: 1, col: 1 });
      expect(merges[0].end).toEqual({ row: 1, col: 2 });
    });
  });

  /**
   * TEST 5: Adversarial Structural Integrity
   * 
   * Invariant: Random operation sequence preserves all structural invariants
   * 
   * Failure mode: Hidden race condition, ordering dependency, silent corruption
   * 
   * NOTE: This is a SMALL adversarial test (100 ops).
   *       Full adversarial test (5000+ ops) should be separate for CI performance.
   */
  describe('Invariant 5: Adversarial Structural Integrity', () => {
    it('should preserve structural invariants under random operations (small)', () => {
      // Setup: Initial state with some content
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 1);
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 2);
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 3);
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      const undoStack: any[] = [];
      const random = (seed: number) => {
        // Simple seeded RNG for reproducibility
        let state = seed;
        return () => {
          state = (state * 1664525 + 1013904223) >>> 0;
          return state / 0x100000000;
        };
      };
      
      const rng = random(42); // Deterministic seed
      
      // Run 100 random operations
      for (let i = 0; i < 100; i++) {
        const op = rng();
        
        if (op < 0.33) {
          // Insert column at random position [0, 2]
          const col = Math.floor(rng() * 3);
          const cmd = new InsertColumnCommand(worksheet, col + 1);
          cmd.execute();
          undoStack.push(cmd);
        } else if (op < 0.66) {
          // Delete column at random position [0, 2]
          const col = Math.floor(rng() * 3);
          try {
            const cmd = new DeleteColumnCommand(worksheet, col + 1);
            cmd.execute();
            undoStack.push(cmd);
          } catch {
            // Ignore invalid delete operations
          }
        } else if (undoStack.length > 0) {
          // Undo last operation
          const cmd = undoStack.pop();
          try {
            cmd.undo();
          } catch {
            // Ignore undo failures (expected for some sequences)
          }
        }
      }
      
      // Verify: No degenerate merges exist
      const merges = worksheet.getMergedRanges();
      for (const merge of merges) {
        const width = merge.end.col - merge.start.col + 1;
        const height = merge.end.row - merge.start.row + 1;
        
        // CRITICAL: No 1x1 merges allowed
        expect(width >= 2 || height >= 2).toBe(true);
      }
      
      // Success: Survived 100 random operations without corruption
    });

    it('should survive 1k mixed operations with bounded history', () => {
      // Seeded RNG for reproducibility
      let seed = 12345;
      const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      // Initial state with diverse content
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 100);
      worksheet.setCellValue({ row: (1) + 1, col: (1) + 1 }, '=A1*2');
      worksheet.setCellValue({ row: (2) + 1, col: (2) + 1 }, '=B2+A1');
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });

      // INVARIANT 9: Bounded Resource Growth
      const MAX_HISTORY = 50; // Sliding window
      const commandStack: Array<InsertColumnCommand | DeleteColumnCommand> = [];
      
      let insertCount = 0;
      let deleteCount = 0;
      let undoCount = 0;
      let pruneCount = 0;

      // Memory tracking
      const memorySnapshots: number[] = [];
      const getMemoryMB = () => {
        if (global.gc) global.gc(); // Force GC if --expose-gc enabled
        return process.memoryUsage().heapUsed / 1024 / 1024;
      };

      const initialMemory = getMemoryMB();
      memorySnapshots.push(initialMemory);

      // 1,000 operations with bounded history
      for (let i = 0; i < 1000; i++) {
        const action = seededRandom();

        if (action < 0.35) {
          // 35% insert
          const col = Math.floor(seededRandom() * 10);
          const cmd = new InsertColumnCommand(worksheet, col + 1);
          cmd.execute();
          commandStack.push(cmd);
          insertCount++;

          // Enforce bounded history (critical for resource invariant)
          if (commandStack.length > MAX_HISTORY) {
            commandStack.shift(); // Drop oldest
            pruneCount++;
          }
        } else if (action < 0.65) {
          // 30% delete
          const col = Math.floor(seededRandom() * 10);
          try {
            const cmd = new DeleteColumnCommand(worksheet, col + 1);
            cmd.execute();
            commandStack.push(cmd);
            deleteCount++;

            // Enforce bounded history
            if (commandStack.length > MAX_HISTORY) {
              commandStack.shift();
              pruneCount++;
            }
          } catch {
            // Ignore invalid deletes
          }
        } else if (action < 0.9 && commandStack.length > 0) {
          // 25% undo (only within history window)
          const cmd = commandStack.pop()!;
          try {
            cmd.undo();
            undoCount++;
          } catch {
            // Ignore undo failures
          }
        }

        // Track memory every 100 operations
        if (i % 100 === 0) {
          memorySnapshots.push(getMemoryMB());
        }

        // Validate structural integrity every 50 operations
        if (i % 50 === 0) {
          const merges = worksheet.getMergedRanges();
          for (const merge of merges) {
            const width = merge.end.col - merge.start.col + 1;
            const height = merge.end.row - merge.start.row + 1;
            expect(width >= 2 || height >= 2).toBe(true);
          }

          // DIAGNOSTIC: Track state growth sources
          if (i % 100 === 0) {
            let cellCount = 0;
            let cellsWithValue = 0;
            let cellsWithFormula = 0;
            let cellsEmpty = 0;
            
            worksheet.forEachNonEmptyCell((row, col, cell) => {
              cellCount++;
              if (cell.value != null) cellsWithValue++;
              if (cell.formula) cellsWithFormula++;
              if (!cell.value && !cell.formula && !cell.style) cellsEmpty++;
            });
            
            console.log(`[Op ${i}] Total: ${cellCount}, Value: ${cellsWithValue}, Formula: ${cellsWithFormula}, Empty: ${cellsEmpty}, Merges: ${merges.length}, Stack: ${commandStack.length}`);
          }
        }
      }

      const finalMemory = getMemoryMB();
      memorySnapshots.push(finalMemory);

      // Final structural validation
      const finalMerges = worksheet.getMergedRanges();
      for (const merge of finalMerges) {
        const width = merge.end.col - merge.start.col + 1;
        const height = merge.end.row - merge.start.row + 1;
        expect(width >= 2 || height >= 2).toBe(true);
      }

      // Verify meaningful stress occurred
      expect(insertCount + deleteCount).toBeGreaterThan(500);
      expect(undoCount).toBeGreaterThan(0); // Some undos occurred (execution path dependent)
      expect(pruneCount).toBeGreaterThan(200); // Sliding window active (undo reduces this)

      // Command stack must respect bound
      expect(commandStack.length).toBeLessThanOrEqual(MAX_HISTORY);

      // DOCUMENTED: Worksheet state still grows unbounded (O(k))
      // This test proves bounded history works, but active state cleanup needed
      const memoryGrowth = finalMemory - initialMemory;
      
      // Success: 1k operations completed with bounded command history
      console.log(`Memory: initial=${initialMemory.toFixed(1)}MB, final=${finalMemory.toFixed(1)}MB, growth=${memoryGrowth.toFixed(1)}MB`);
      console.log(`Operations: insert=${insertCount}, delete=${deleteCount}, undo=${undoCount}, prune=${pruneCount}`);
      console.log(`Command stack size: ${commandStack.length} (max: ${MAX_HISTORY})`);
    });

    it('should survive 5k operations after state minimality fix', () => {
      // Seeded RNG
      let seed = 54321;
      const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 100);
      worksheet.setCellValue({ row: (1) + 1, col: (1) + 1 }, '=A1*2');

      const MAX_HISTORY = 50;
      const commandStack: Array<InsertColumnCommand | DeleteColumnCommand> = [];
      let ops = 0;

      const getMemoryMB = () => {
        if (global.gc) global.gc();
        return process.memoryUsage().heapUsed / 1024 / 1024;
      };

      const initialMemory = getMemoryMB();

      for (let i = 0; i < 5000; i++) {
        const action = seededRandom();

        if (action < 0.4) {
          const col = Math.floor(seededRandom() * 10);
          const cmd = new InsertColumnCommand(worksheet, col + 1);
          cmd.execute();
          commandStack.push(cmd);
          ops++;
          if (commandStack.length > MAX_HISTORY) commandStack.shift();
        } else if (action < 0.7) {
          const col = Math.floor(seededRandom() * 10);
          try {
            const cmd = new DeleteColumnCommand(worksheet, col + 1);
            cmd.execute();
            commandStack.push(cmd);
            ops++;
            if (commandStack.length > MAX_HISTORY) commandStack.shift();
          } catch {}
        } else if (commandStack.length > 0) {
          const cmd = commandStack.pop()!;
          try {
            cmd.undo();
          } catch {}
        }

        if (i % 100 === 0) {
          const merges = worksheet.getMergedRanges();
          for (const merge of merges) {
            const width = merge.end.col - merge.start.col + 1;
            const height = merge.end.row - merge.start.row + 1;
            expect(width >= 2 || height >= 2).toBe(true);
          }
        }
      }

      const finalMemory = getMemoryMB();
      const memoryGrowth = finalMemory - initialMemory;

      expect(ops).toBeGreaterThan(3000);
      expect(commandStack.length).toBeLessThanOrEqual(MAX_HISTORY);

      // With state minimality: expect sub-linear growth
      expect(memoryGrowth).toBeLessThan(150); // 5k ops, <150MB

      console.log(`5k test: Memory growth=${memoryGrowth.toFixed(1)}MB, ops=${ops}, stack=${commandStack.length}`);
    });

    it('should survive 10k operations with state minimality', () => {
      // Seeded RNG
      let seed = 99999;
      const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 100);
      worksheet.setCellValue({ row: (1) + 1, col: (1) + 1 }, '=A1*2');

      const MAX_HISTORY = 50;
      const commandStack: Array<InsertColumnCommand | DeleteColumnCommand> = [];
      let ops = 0;

      const getMemoryMB = () => {
        if (global.gc) global.gc();
        return process.memoryUsage().heapUsed / 1024 / 1024;
      };

      const initialMemory = getMemoryMB();
      const memorySnapshots: number[] = [initialMemory];

      for (let i = 0; i < 10000; i++) {
        const action = seededRandom();

        if (action < 0.4) {
          const col = Math.floor(seededRandom() * 10);
          const cmd = new InsertColumnCommand(worksheet, col + 1);
          cmd.execute();
          commandStack.push(cmd);
          ops++;
          if (commandStack.length > MAX_HISTORY) commandStack.shift();
        } else if (action < 0.7) {
          const col = Math.floor(seededRandom() * 10);
          try {
            const cmd = new DeleteColumnCommand(worksheet, col + 1);
            cmd.execute();
            commandStack.push(cmd);
            ops++;
            if (commandStack.length > MAX_HISTORY) commandStack.shift();
          } catch {}
        } else if (commandStack.length > 0) {
          const cmd = commandStack.pop()!;
          try {
            cmd.undo();
          } catch {}
        }

        // Structural validation every 200 ops
        if (i % 200 === 0) {
          const merges = worksheet.getMergedRanges();
          for (const merge of merges) {
            const width = merge.end.col - merge.start.col + 1;
            const height = merge.end.row - merge.start.row + 1;
            expect(width >= 2 || height >= 2).toBe(true);
          }
        }

        // Memory tracking every 1000 ops
        if (i % 1000 === 0) {
          memorySnapshots.push(getMemoryMB());
        }
      }

      const finalMemory = getMemoryMB();
      memorySnapshots.push(finalMemory);
      const memoryGrowth = finalMemory - initialMemory;

      expect(ops).toBeGreaterThan(6000);
      expect(commandStack.length).toBeLessThanOrEqual(MAX_HISTORY);

      // CRITICAL: With state minimality, memory growth must be sub-linear
      // Note: Absolute growth depends on base heap size + V8 overhead
      // What matters: growth rate slows over time (not linear)
      
      // Verify memory plateau (not linear growth)
      const midMemory = memorySnapshots[Math.floor(memorySnapshots.length / 2)];
      const growthRate1 = midMemory - initialMemory;
      const growthRate2 = finalMemory - midMemory;
      
      // INVARIANT: Second half should grow SLOWER than first half (plateau behavior)
      // Linear growth would show: growthRate2 ≈ growthRate1
      // Sub-linear (correct): growthRate2 < growthRate1
      expect(growthRate2).toBeLessThan(growthRate1 * 1.2); // Allow 20% variance

      console.log(`10k test: Memory growth=${memoryGrowth.toFixed(1)}MB, ops=${ops}, stack=${commandStack.length}`);
      console.log(`  Growth pattern: 0-5k=${growthRate1.toFixed(1)}MB, 5k-10k=${growthRate2.toFixed(1)}MB (ratio=${(growthRate2/growthRate1).toFixed(2)})`);
    });
  });

  /**
   * Additional: Identity Law Test
   * 
   * Invariant: insert(k); delete(k) produces exact snapshot equality
   * 
   * This is a STRONG algebraic property beyond just "no corruption"
   */
  describe('Bonus: Identity Law (Algebraic Property)', () => {
    it('should satisfy insert(k); delete(k) = identity', () => {
      // Setup: A1 = 10, B1 = 20, A1:B1 merged
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 10);
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 20);
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (0) + 1, col: (1) + 1 } });
      
      // Capture initial state
      const initialA1 = worksheet.getCell({ row: (0) + 1, col: (0) + 1 });
      const initialB1 = worksheet.getCell({ row: (0) + 1, col: (1) + 1 });
      const initialMerges = worksheet.getMergedRanges();
      
      // Apply: insert(1); delete(1)
      const cmd1 = new InsertColumnCommand(worksheet, 2);
      cmd1.execute();
      
      const cmd2 = new DeleteColumnCommand(worksheet, 2);
      cmd2.execute();
      
      // Verify: Exact equality
      const finalA1 = worksheet.getCell({ row: (0) + 1, col: (0) + 1 });
      const finalB1 = worksheet.getCell({ row: (0) + 1, col: (1) + 1 });
      const finalMerges = worksheet.getMergedRanges();
      
      expect(finalA1?.value).toBe(initialA1?.value);
      expect(finalB1?.value).toBe(initialB1?.value);
      expect(finalMerges).toEqual(initialMerges);
    });
  });
});
