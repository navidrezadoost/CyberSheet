/**
 * PivotDependencyIndex.ts
 *
 * Phase 30b: Range dependency tracking for pivot invalidation.
 *
 * Design Constraints:
 * - Row-bucket index (NOT cell-level) for memory efficiency
 *   · O(1) row lookup, O(k) pivot column checks
 * - Normalize CellRange → NormalizedRange once at registration
 * - No dependency on mutation pipeline (pure data structure)
 * - Disposal-safe (clear() removes all state)
 * - No computed data (index only, no values stored)
 *
 * Public API mirrors the locked design contract exactly.
 */

import type { Address, Range } from './types';
import type { PivotId } from './PivotRegistry';

// ============================================================================
// Types
// ============================================================================

/**
 * Normalized range for fast arithmetic comparisons.
 * Guaranteed: r1 <= r2, c1 <= c2 (normalized on creation).
 * Uses 1-based row/col indices (matching Address).
 */
export interface NormalizedRange {
  readonly r1: number;
  readonly c1: number;
  readonly r2: number;
  readonly c2: number;
}

/**
 * Pivot dependency index.
 * Pure data structure, no mutation side effects.
 */
export interface PivotDependencyIndex {
  /**
   * Register a pivot with its source range.
   * Safe to call multiple times — replaces existing registration.
   */
  register(pivotId: PivotId, range: Range): void;

  /**
   * Remove a pivot from the index.
   * No-op if pivot not registered.
   */
  unregister(pivotId: PivotId): void;

  /**
   * Get all pivots whose source range includes the given row.
   * Returns empty set if no pivots cover this row.
   * O(1) lookup.
   */
  getPivotsForRow(row: number): ReadonlySet<PivotId>;

  /**
   * Get the normalized range for a pivot.
   * Returns undefined if not registered.
   */
  getRange(pivotId: PivotId): NormalizedRange | undefined;

  /**
   * Number of registered pivots.
   */
  readonly size: number;

  /**
   * Clear all registrations.
   * Called during dispose().
   */
  clear(): void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize a CellRange to NormalizedRange.
 * Ensures r1 <= r2 and c1 <= c2 regardless of input order.
 * Converting once at registration is critical for fast comparisons downstream.
 */
export function normalizeRange(range: Range): NormalizedRange {
  return {
    r1: Math.min(range.start.row, range.end.row),
    c1: Math.min(range.start.col, range.end.col),
    r2: Math.max(range.start.row, range.end.row),
    c2: Math.max(range.start.col, range.end.col),
  };
}

/**
 * Check if a column falls within a NormalizedRange.
 * Used as the column-check step after the O(1) row lookup.
 */
export function colInRange(col: number, range: NormalizedRange): boolean {
  return col >= range.c1 && col <= range.c2;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Phase 30b: Row-bucket dependency index.
 *
 * Architecture:
 *   rowIndex: Map<row, Set<PivotId>>   — O(1) row lookup
 *   ranges:   Map<PivotId, NormalizedRange>  — range storage for column check
 *
 * Invariants:
 * - rowIndex and ranges are always in sync (register/unregister/clear)
 * - Row entries with empty sets are pruned on unregister
 * - All rows in [r1, r2] are indexed (dense, not sparse)
 */
export class PivotDependencyIndexImpl implements PivotDependencyIndex {
  private rowIndex = new Map<number, Set<PivotId>>();
  private ranges = new Map<PivotId, NormalizedRange>();

  get size(): number {
    return this.ranges.size;
  }

  /**
   * Register pivot → normalize range → index all rows in range.
   * Replaces existing registration (safe to call repeatedly).
   */
  register(pivotId: PivotId, range: Range): void {
    // If already registered, remove old row index entries first
    if (this.ranges.has(pivotId)) {
      this.removeFromRowIndex(pivotId);
    }

    const normalized = normalizeRange(range);
    this.ranges.set(pivotId, normalized);

    // Index all rows in range (dense indexing for O(1) lookup)
    for (let row = normalized.r1; row <= normalized.r2; row++) {
      let bucket = this.rowIndex.get(row);
      if (!bucket) {
        bucket = new Set<PivotId>();
        this.rowIndex.set(row, bucket);
      }
      bucket.add(pivotId);
    }
  }

  /**
   * Remove pivot from all row buckets + range map.
   * No-op if pivot not registered.
   */
  unregister(pivotId: PivotId): void {
    if (!this.ranges.has(pivotId)) return;
    this.removeFromRowIndex(pivotId);
    this.ranges.delete(pivotId);
  }

  /**
   * O(1) row lookup.
   * Returns empty set if no pivots cover this row.
   */
  getPivotsForRow(row: number): ReadonlySet<PivotId> {
    return this.rowIndex.get(row) ?? EMPTY_SET;
  }

  /**
   * Get normalized range for a pivot.
   */
  getRange(pivotId: PivotId): NormalizedRange | undefined {
    return this.ranges.get(pivotId);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.rowIndex.clear();
    this.ranges.clear();
  }

  /**
   * Remove a pivot from all row buckets.
   * Prunes empty buckets to prevent memory leaks.
   */
  private removeFromRowIndex(pivotId: PivotId): void {
    const existing = this.ranges.get(pivotId);
    if (!existing) return;

    for (let row = existing.r1; row <= existing.r2; row++) {
      const bucket = this.rowIndex.get(row);
      if (bucket) {
        bucket.delete(pivotId);
        // Prune empty buckets
        if (bucket.size === 0) {
          this.rowIndex.delete(row);
        }
      }
    }
  }
}

/** Singleton empty set — avoids repeated allocation for unmatched rows */
const EMPTY_SET: ReadonlySet<PivotId> = new Set<PivotId>();
