/**
 * ICellStore.ts — Cell storage abstraction boundary
 *
 * STATUS: ✅ ACTIVE — Worksheet depends only on this interface.
 *
 * =============================================================================
 * DESIGN RATIONALE (PM Directive — Structural Hardening Sprint, Feb 2026)
 * =============================================================================
 *
 * Worksheet must have ZERO knowledge of storage internals.
 * This interface is the only contract Worksheet consumes.
 *
 * Current implementation:  CellStoreV1 (packed integer keys, mono-shape Cell)
 * Future implementation:   CellStoreV2 (struct-of-arrays, TypedArray hot path)
 *
 * Substituting V2 for V1 requires touching ONE line of Worksheet code.
 *
 * =============================================================================
 * PM DIRECTIVE COMPLIANCE
 * =============================================================================
 *
 * Required interface shape (verbatim from directive):
 *
 *   interface ICellStore {
 *     get(row, col)
 *     set(row, col, cell)
 *     has(row, col)
 *     delete(row, col)
 *     forEach(callback)
 *   }
 *
 * Extended with:
 *   getOrCreate() — replaces ensureCell() anti-pattern inside Worksheet
 *   size          — required for getUsedRange() early exit
 */

import type { Cell } from '../types';

export interface ICellStore {
  /**
   * Read a cell.
   * Returns `undefined` if the address has never been written.
   * O(1) — single hash lookup.
   */
  get(row: number, col: number): Cell | undefined;

  /**
   * Write or replace a cell at (row, col).
   * O(1) — single hash insert.
   */
  set(row: number, col: number, cell: Cell): void;

  /**
   * Get-or-create a cell with **mono-shape guarantee**.
   *
   * If the cell does not exist, creates one with ALL optional fields
   * initialised to `undefined` (not absent). This keeps V8 on a single
   * hidden class for every Cell object in the store, enabling monomorphic
   * inline-cache (PIC) optimisation in all property reads.
   *
   * Returns a **reference** to the stored object. Mutations on the returned
   * object persist automatically — no subsequent `set()` call required.
   *
   * All Worksheet mutation helpers must go through this method.
   */
  getOrCreate(row: number, col: number): Cell;

  /**
   * Test whether a cell exists at (row, col).
   * O(1).
   */
  has(row: number, col: number): boolean;

  /**
   * Remove a cell from the store (clear / delete semantics).
   * No-op if the cell does not exist.
   * O(1).
   */
  delete(row: number, col: number): void;

  /**
   * Number of populated (non-empty) cells currently in the store.
   */
  readonly size: number;

  /**
   * Iterate over all populated cells.
   *
   * The callback receives `(row, col, cell)` — no key parsing or address
   * unpacking required by the caller.
   *
   * Iteration order is **unspecified** (consistent within a single call but
   * implementation-defined). Callers that need a sorted order must collect
   * addresses and sort explicitly — same as before.
   *
   * @param callback  Called once per populated cell.
   */
  forEach(callback: (row: number, col: number, cell: Cell) => void): void;
}
