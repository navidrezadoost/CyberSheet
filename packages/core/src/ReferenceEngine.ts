/**
 * ReferenceEngine.ts — Simple, Obviously-Correct Reference Implementation
 *
 * Purpose:
 *   Provide a "dumb" but provably correct engine for differential testing.
 *
 * Design Principles:
 *   - NO optimizations (brute force everything)
 *   - NO scheduler (recompute all formulas every time)
 *   - NO incremental logic (full sync evaluation)
 *   - NO DAG (just iterate all cells with formulas)
 *   - Obviously correct by simplicity
 *
 * This engine is SLOW on purpose.
 * Speed doesn't matter. Correctness does.
 *
 * Used to validate that SpreadsheetEngine (optimized) produces the same
 * results as this reference (slow but correct).
 */

import { FormulaEngine } from './FormulaEngine';
import type { Address, CellValue, ExtendedCellValue } from './types';

// ---------------------------------------------------------------------------
// Reference Cell (minimal structure)
// ---------------------------------------------------------------------------

type RefCell = {
  value: ExtendedCellValue;
  formula?: string;
};

// ---------------------------------------------------------------------------
// ReferenceEngine — Brute Force, Correct by Simplicity
// ---------------------------------------------------------------------------

export class ReferenceEngine {
  private cells: Map<string, RefCell> = new Map();
  private formulaEngine: FormulaEngine;

  constructor() {
    this.formulaEngine = new FormulaEngine();
  }

  // -------------------------------------------------------------------------
  // Core Operations (No Transaction, No Scheduler)
  // -------------------------------------------------------------------------

  setCellValue(addr: Address, value: CellValue): void {
    const key = this.addrKey(addr);

    if (value === null) {
      this.cells.delete(key);
    } else {
      const cell = this.cells.get(key);
      if (cell) {
        cell.value = value;
        delete cell.formula; // Setting value clears formula
      } else {
        this.cells.set(key, { value });
      }
    }

    // Brute force: recompute ALL formulas after every write
    this.recomputeAll();
  }

  setFormula(addr: Address, formula: string): void {
    const key = this.addrKey(addr);
    const cell = this.cells.get(key) ?? { value: null };
    
    cell.formula = formula;
    this.cells.set(key, cell);

    // Brute force: recompute ALL formulas
    this.recomputeAll();
  }

  getCellValue(addr: Address): ExtendedCellValue {
    const key = this.addrKey(addr);
    const cell = this.cells.get(key);
    return cell?.value ?? null;
  }

  clearCell(addr: Address): void {
    const key = this.addrKey(addr);
    this.cells.delete(key);
    this.recomputeAll();
  }

  // -------------------------------------------------------------------------
  // Brute Force Recomputation (No DAG, No Scheduler)
  // -------------------------------------------------------------------------

  private recomputeAll(): void {
    // Simple fixed-point iteration (up to 100 passes for deep chains)
    const MAX_ITERATIONS = 100;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let changed = false;

      // Iterate all cells with formulas
      for (const [key, cell] of this.cells.entries()) {
        if (!cell.formula) continue;

        const addr = this.keyAddr(key);
        const oldValue = cell.value;

        try {
          // Evaluate formula in context
          const result = this.formulaEngine.evaluate(cell.formula, {
            worksheet: this.asWorksheetProxy(),
            currentCell: addr,
          });

          // Convert FormulaValue to ExtendedCellValue
          let newValue: ExtendedCellValue;
          if (result instanceof Error) {
            newValue = result.message; // Error → string
          } else if (typeof result === 'object' && result !== null) {
            newValue = String(result); // Arrays, etc. → string
          } else {
            newValue = result as ExtendedCellValue; // string | number | boolean | null
          }

          if (newValue !== oldValue) {
            cell.value = newValue;
            changed = true;
          }
        } catch (err) {
          // Formula error → #ERROR!
          const errorValue = `#ERROR!`;
          if (cell.value !== errorValue) {
            cell.value = errorValue;
            changed = true;
          }
        }
      }

      // Converged?
      if (!changed) break;
    }
  }

  // -------------------------------------------------------------------------
  // Worksheet Proxy (for FormulaEngine)
  // -------------------------------------------------------------------------

  private asWorksheetProxy(): any {
    return {
      getCellValue: (addr: Address) => this.getCellValue(addr),
      getCell: (addr: Address) => {
        const key = this.addrKey(addr);
        const cell = this.cells.get(key);
        return cell ? { ...cell } : null;
      },
    };
  }

  // -------------------------------------------------------------------------
  // State Snapshot (Canonical Representation)
  // -------------------------------------------------------------------------

  snapshot(): Array<{ row: number; col: number; value: ExtendedCellValue; formula?: string }> {
    const result: Array<{ row: number; col: number; value: ExtendedCellValue; formula?: string }> = [];

    for (const [key, cell] of this.cells.entries()) {
      const addr = this.keyAddr(key);
      const entry: { row: number; col: number; value: ExtendedCellValue; formula?: string } = {
        row: addr.row,
        col: addr.col,
        value: cell.value,
      };
      
      if (cell.formula) {
        entry.formula = cell.formula;
      }

      result.push(entry);
    }

    // Sort for canonical order
    result.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private addrKey(addr: Address): string {
    return `${addr.row}:${addr.col}`;
  }

  private keyAddr(key: string): Address {
    const [rowStr, colStr] = key.split(':');
    return { row: parseInt(rowStr, 10), col: parseInt(colStr, 10) };
  }
}
