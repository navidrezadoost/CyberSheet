/**
 * CellStoreV1.ts — Phase 2 cell storage implementation
 *
 * STATUS: ✅ ACTIVE — Replaces Map<string, Cell> in Worksheet.
 *
 * =============================================================================
 * WHAT CHANGED VS Map<string, Cell>  (storage-benchmark.test.ts — Feb 2026)
 * =============================================================================
 *
 * BEFORE (Map<string, Cell>):
 *   - Key: string "row:col"               → V8 HeapString per op, GC pressure
 *   - Cell: optional fields (formula?)    → multiple V8 hidden classes (3+)
 *   - IC type: polymorphic (POLY/MEGA)    → ~2–5× slower property reads
 *   - Memory @ 50k cells (string values): ~499 bytes/cell
 *   - Lookup: string hash ≈ 1.31–1.34× slower than integer hash
 *
 * AFTER (CellStoreV1):
 *   - Key: packed integer row×20000+col   → no heap allocation
 *   - Cell: all fields initialised        → single V8 hidden class (MONO)
 *   - IC type: monomorphic                → maximum inline cache hit rate
 *   - Memory @ 50k cells (string values): ~455 bytes/cell (est. –44 bytes/cell)
 *   - At 1M cells: saves ~44 MB vs string-key approach
 *
 * =============================================================================
 * PACKED KEY ENCODING
 * =============================================================================
 *
 * key = row × COL_MULT + col    (COL_MULT = 20_000)
 *
 * Safety proof:
 *   Excel max address: 1,048,576 rows × 16,384 cols
 *   max key = 1,048,576 × 20,000 + 16,384 = 20,971,536,384
 *   Number.isSafeInteger(20_971_536_384) === true  ✓  (limit = 2^53 − 1)
 *
 *   No collision possible because:
 *     col < COL_MULT (16,384 < 20,000)  ✓
 *
 * =============================================================================
 * MONO-SHAPE INVARIANT
 * =============================================================================
 *
 * Every Cell created by createMonoCell() has IDENTICAL property structure:
 *   { value, formula, style, comments, icon, spillSource, spilledFrom }
 *
 * V8 assigns all objects the same hidden class (HiddenClass ≡ "shape").
 * Monomorphic inline caches (PIC) then cache the exact slot offset for each
 * property, eliminating dictionary-mode fallbacks and POLY/MEGA IC transitions.
 *
 * Critical rule: NEVER delete a property from a stored Cell.
 * Instead, assign `undefined` to clear it:
 *   WRONG:   delete cell.comments     ← destroys mono-shape, new hidden class
 *   CORRECT: cell.comments = undefined ← keeps shape, V8 stays monomorphic
 *
 * =============================================================================
 * ROLLBACK PLAN
 * =============================================================================
 *
 * If a regression is found, revert Worksheet.ts line:
 *   private cells: ICellStore = new CellStoreV1();
 * to:
 *   private cells: ICellStore = new CellStoreLegacy();
 *
 * CellStoreLegacy (below) wraps the original Map<string, Cell>.
 * Zero other changes required — ICellStore boundary absorbs all differences.
 */

import type { Cell } from '../types';
import type { ICellStore } from './ICellStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Column multiplier for packed key encoding.
 * Must exceed Excel's maximum column index (16,384).
 * Chosen as 20,000 for headroom and safe-integer proof.
 */
export const COL_MULT = 20_000;

/** Maximum safe column index (must be < COL_MULT to guarantee no collision). */
export const MAX_COL_INDEX = COL_MULT - 1; // 19,999

// ---------------------------------------------------------------------------
// Mono-shape factory
// ---------------------------------------------------------------------------

/**
 * Create a new empty Cell with ALL optional fields explicitly initialised
 * to `undefined` (not absent).
 *
 * This is the **sole** allocation point for Cell objects in CellStoreV1.
 * All created cells share the same V8 hidden class.
 *
 * Exported for use in tests and debugging.
 */
export function createMonoCell(): Cell {
  return {
    value: null,
    formula: undefined,
    style: undefined,
    comments: undefined,
    icon: undefined,
    spillSource: undefined,
    spilledFrom: undefined,
  };
}

// ---------------------------------------------------------------------------
// CellStoreV1 — packed integer keys, mono-shape cells
// ---------------------------------------------------------------------------

/**
 * Phase 2 cell store: packed integer keys + mono-shape Cell objects.
 *
 * Implements ICellStore. Substitutes directly for CellStoreLegacy
 * (previously Map<string, Cell>) with no changes to Worksheet logic.
 */
export class CellStoreV1 implements ICellStore {
  private readonly _map = new Map<number, Cell>();

  /** O(1) — integer hash lookup, no string allocation. */
  get(row: number, col: number): Cell | undefined {
    return this._map.get(row * COL_MULT + col);
  }

  /** O(1) — integer hash insert. */
  set(row: number, col: number, cell: Cell): void {
    this._map.set(row * COL_MULT + col, cell);
  }

  /**
   * Get-or-create with mono-shape guarantee.
   *
   * Returns the **stored** Cell reference. Mutations on the returned object
   * persist without a subsequent set() call.
   *
   * Callers MUST NOT delete properties from the returned object.
   * Use `cell.prop = undefined` to clear, never `delete cell.prop`.
   */
  getOrCreate(row: number, col: number): Cell {
    const k = row * COL_MULT + col;
    let c = this._map.get(k);
    if (!c) {
      c = createMonoCell();
      this._map.set(k, c);
    }
    return c;
  }

  /** O(1). */
  has(row: number, col: number): boolean {
    return this._map.has(row * COL_MULT + col);
  }

  /** O(1). No-op if cell absent. */
  delete(row: number, col: number): void {
    this._map.delete(row * COL_MULT + col);
  }

  get size(): number {
    return this._map.size;
  }

  /** Iterates all populated cells. Order matches Map insertion order. */
  forEach(callback: (row: number, col: number, cell: Cell) => void): void {
    for (const [k, cell] of this._map) {
      const col = k % COL_MULT;
      const row = (k - col) / COL_MULT;
      callback(row, col, cell);
    }
  }
}

// ---------------------------------------------------------------------------
// CellStoreLegacy — wraps original Map<string, Cell> for rollback
// ---------------------------------------------------------------------------

/**
 * Rollback shim: wraps the original Map<string, Cell> behind ICellStore.
 *
 * USAGE: Swap `new CellStoreV1()` for `new CellStoreLegacy()` in Worksheet
 * to revert to pre-migration behaviour if a regression is found.
 *
 * NOT intended for production use — no mono-shape guarantee, string-key
 * overhead remains.
 */
export class CellStoreLegacy implements ICellStore {
  private readonly _map = new Map<string, Cell>();

  private _k(row: number, col: number): string {
    return `${row}:${col}`;
  }

  get(row: number, col: number): Cell | undefined {
    return this._map.get(this._k(row, col));
  }

  set(row: number, col: number, cell: Cell): void {
    this._map.set(this._k(row, col), cell);
  }

  getOrCreate(row: number, col: number): Cell {
    const k = this._k(row, col);
    let c = this._map.get(k);
    if (!c) {
      c = { value: null };
      this._map.set(k, c);
    }
    return c;
  }

  has(row: number, col: number): boolean {
    return this._map.has(this._k(row, col));
  }

  delete(row: number, col: number): void {
    this._map.delete(this._k(row, col));
  }

  get size(): number {
    return this._map.size;
  }

  forEach(callback: (row: number, col: number, cell: Cell) => void): void {
    for (const [k, cell] of this._map) {
      const split = k.indexOf(':');
      const row = parseInt(k.slice(0, split), 10);
      const col = parseInt(k.slice(split + 1), 10);
      callback(row, col, cell);
    }
  }
}

// ---------------------------------------------------------------------------
// Key utilities (exported for tests / tooling)
// ---------------------------------------------------------------------------

/**
 * Pack a (row, col) address into a single safe integer.
 * Hard-asserts col < COL_MULT in development / test environments.
 */
export function packKey(row: number, col: number): number {
  if (process.env['NODE_ENV'] !== 'production') {
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || col >= COL_MULT) {
      throw new RangeError(
        `packKey: invalid address row=${row} col=${col}. col must be 0–${MAX_COL_INDEX}.`
      );
    }
  }
  return row * COL_MULT + col;
}

/**
 * Unpack a packed key back to { row, col }.
 * Used for debugging and test assertions.
 */
export function unpackKey(key: number): { row: number; col: number } {
  const col = key % COL_MULT;
  const row = (key - col) / COL_MULT;
  return { row, col };
}
