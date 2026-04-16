/**
 * PivotSnapshotStore.ts
 * 
 * Phase 29: Pivot Snapshot Storage
 * Stores computed pivot results for GETPIVOTDATA queries
 * 
 * Design Constraints:
 * - Separate from registry (preserves Phase 28 metadata-only invariant)
 * - Immutable snapshots (always replace, never mutate)
 * - Explicit lifecycle (no lazy creation, no implicit rebuild)
 * - Disposal-safe (no memory leaks)
 */

import type { PivotId } from './PivotRegistry';
import type { CellValue } from './types';

/**
 * Flattened pivot row for field-based queries.
 * Optimized for GETPIVOTDATA O(n) filtering.
 */
export type PivotRow = Record<string, CellValue>;

/**
 * Immutable pivot snapshot.
 * Created by PivotEngine, consumed by GETPIVOTDATA.
 * 
 * Architecture:
 * - Flattened rows (not grid-based) for field lookup
 * - Readonly to prevent mutation
 * - Query-first design (not UI-oriented)
 * 
 * NOT a PivotTable (that's UI-oriented with grid structure).
 * This is query-oriented with field-based access.
 */
export interface PivotSnapshot {
  /** Pivot identifier (links to registry) */
  readonly pivotId: PivotId;
  
  /** When snapshot was computed (timestamp) */
  readonly computedAt: number;
  
  /** Flattened rows for O(n) filtering */
  readonly rows: readonly PivotRow[];
  
  /** All field names (row fields + column fields + value fields) */
  readonly fields: readonly string[];
  
  /** Value field names (aggregated columns) */
  readonly valueFields: readonly string[];
}

/**
 * Pivot Snapshot Store
 * 
 * Stores computed pivot results separate from registry.
 * Registry = metadata only (Phase 28)
 * SnapshotStore = computed data (Phase 29)
 * 
 * Lifecycle:
 * - Created ONLY via PivotEngine.generate()
 * - Updated ONLY via explicit rebuild
 * - Deleted when pivot is unregistered or workbook disposed
 * 
 * Invariants:
 * - Snapshots are immutable (replace, don't mutate)
 * - No lazy creation (must be explicitly set)
 * - No implicit rebuild (GETPIVOTDATA returns #REF! if missing)
 */
export class PivotSnapshotStore {
  private snapshots = new Map<PivotId, PivotSnapshot>();

  /**
   * Store a pivot snapshot.
   * Replaces existing snapshot for same pivotId.
   * 
   * IMPORTANT: Snapshots are immutable - always replace, never mutate.
   */
  set(id: PivotId, snapshot: PivotSnapshot): void {
    // Validate snapshot belongs to this pivot
    if (snapshot.pivotId !== id) {
      throw new Error(`Snapshot pivotId mismatch: expected ${id}, got ${snapshot.pivotId}`);
    }
    
    this.snapshots.set(id, snapshot);
  }

  /**
   * Retrieve a pivot snapshot.
   * Returns undefined if not found (no lazy creation).
   * 
   * GETPIVOTDATA uses this - undefined means #REF! error.
   */
  get(id: PivotId): PivotSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Check if snapshot exists.
   */
  has(id: PivotId): boolean {
    return this.snapshots.has(id);
  }

  /**
   * Delete a pivot snapshot.
   * Called when pivot is unregistered.
   * Returns true if snapshot was deleted.
   */
  delete(id: PivotId): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * Clear all snapshots.
   * Called during workbook disposal.
   */
  clearAll(): void {
    this.snapshots.clear();
  }

  /**
   * Get count of stored snapshots (for debugging/testing).
   */
  get size(): number {
    return this.snapshots.size;
  }
}
