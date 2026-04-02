/**
 * PivotAnchorIndex.ts
 * 
 * Phase 32: Pivot Anchor Resolution
 * Maps cell addresses to pivot IDs for GETPIVOTDATA formula resolution
 * 
 * Design:
 * - A pivot is identified by its top-left anchor cell (matches Excel behavior)
 * - Fast O(1) lookup from address → PivotId
 * - Workbook owns this index and keeps it synchronized with pivot lifecycle
 * - Formula engine resolves pivot references through workbook.resolvePivotAt()
 * 
 * Invariants:
 * - One pivot per anchor cell (1:1 mapping)
 * - Anchor updates must be atomic (create/move/delete)
 * - No dangling references (pivots deleted → anchors removed)
 * 
 * Integration:
 * - Workbook.registerPivot() → sets anchor
 * - Workbook.movePivot() → updates anchor
 * - Workbook.unregisterPivot() → deletes anchor
 * - FormulaContext.resolvePivotAt() → queries anchor
 */

import type { Address } from './types';
import type { PivotId } from './PivotRegistry';

/**
 * Pivot anchor index.
 * Maps cell addresses to pivot IDs.
 * 
 * Key format: "row:col" (1-based, e.g., "5:3" for E3)
 * 
 * Thread-safe: Synchronous operations only (no async lookups)
 * Memory-safe: Deletes remove entries (no leaks)
 */
export interface PivotAnchorIndex {
  /**
   * Register a pivot at its anchor cell.
   * Replaces any existing pivot at the same anchor.
   * 
   * @param anchor - Top-left cell of pivot (1-based)
   * @param pivotId - Pivot identifier
   */
  set(anchor: Address, pivotId: PivotId): void;

  /**
   * Resolve pivot ID from anchor cell.
   * Returns null if no pivot exists at the address.
   * 
   * @param address - Cell address to check (1-based)
   * @returns PivotId if pivot exists at address, null otherwise
   */
  get(address: Address): PivotId | null;

  /**
   * Check if a pivot exists at the given address.
   * 
   * @param address - Cell address to check
   * @returns true if pivot exists at address
   */
  has(address: Address): boolean;

  /**
   * Remove pivot anchor by pivot ID.
   * Called when pivot is deleted.
   * 
   * @param pivotId - Pivot to remove
   * @returns true if anchor was deleted
   */
  delete(pivotId: PivotId): boolean;

  /**
   * Remove pivot anchor by address.
   * Called when pivot is moved (remove old anchor before setting new one).
   * 
   * @param address - Anchor address to remove
   * @returns true if anchor was deleted
   */
  deleteByAddress(address: Address): boolean;

  /**
   * Clear all anchors.
   * Called during workbook disposal.
   */
  clear(): void;

  /**
   * Get anchor address for a pivot ID.
   * Returns null if pivot is not anchored.
   * 
   * @param pivotId - Pivot identifier
   * @returns Anchor address or null
   */
  getAnchor(pivotId: PivotId): Address | null;
}

/**
 * Phase 32: Pivot Anchor Index Implementation
 * 
 * Design decisions:
 * - String keys for O(1) map lookup ("row:col" format)
 * - Bidirectional maps for both anchor→pivot and pivot→anchor queries
 * - No sheet ID in key (pivot anchors are per-workbook, not per-sheet)
 *   (Future: multi-sheet support would require "sheetId:row:col" keys)
 * 
 * Memory characteristics:
 * - 2 map entries per pivot (address→id + id→address)
 * - ~64 bytes per pivot overhead
 * - O(1) all operations
 */
export class PivotAnchorIndexImpl implements PivotAnchorIndex {
  // Fast lookup: address → pivotId
  private anchors = new Map<string, PivotId>(); // key: "row:col"

  // Reverse lookup: pivotId → address (for delete and getAnchor)
  private pivotAnchors = new Map<PivotId, Address>();

  /**
   * Register pivot at anchor cell.
   * Replaces existing pivot at same anchor (if any).
   */
  set(anchor: Address, pivotId: PivotId): void {
    const key = this.makeKey(anchor);

    // Remove old anchor for this pivot (if moving)
    const oldAnchor = this.pivotAnchors.get(pivotId);
    if (oldAnchor) {
      const oldKey = this.makeKey(oldAnchor);
      this.anchors.delete(oldKey);
    }

    // Set new anchor
    this.anchors.set(key, pivotId);
    this.pivotAnchors.set(pivotId, { ...anchor }); // clone to prevent mutation
  }

  /**
   * Resolve pivot from address.
   * O(1) lookup.
   */
  get(address: Address): PivotId | null {
    const key = this.makeKey(address);
    return this.anchors.get(key) ?? null;
  }

  /**
   * Check if pivot exists at address.
   * O(1) check.
   */
  has(address: Address): boolean {
    const key = this.makeKey(address);
    return this.anchors.has(key);
  }

  /**
   * Delete pivot anchor by pivot ID.
   * O(1) deletion (uses reverse map).
   */
  delete(pivotId: PivotId): boolean {
    const anchor = this.pivotAnchors.get(pivotId);
    if (!anchor) return false; // Pivot not anchored

    const key = this.makeKey(anchor);
    this.anchors.delete(key);
    this.pivotAnchors.delete(pivotId);
    return true;
  }

  /**
   * Delete pivot anchor by address.
   * O(1) deletion.
   */
  deleteByAddress(address: Address): boolean {
    const key = this.makeKey(address);
    const pivotId = this.anchors.get(key);
    if (!pivotId) return false; // No pivot at address

    this.anchors.delete(key);
    this.pivotAnchors.delete(pivotId);
    return true;
  }

  /**
   * Clear all anchors.
   * O(1) clear (Map.clear is optimized).
   */
  clear(): void {
    this.anchors.clear();
    this.pivotAnchors.clear();
  }

  /**
   * Get anchor address for pivot.
   * O(1) reverse lookup.
   */
  getAnchor(pivotId: PivotId): Address | null {
    const anchor = this.pivotAnchors.get(pivotId);
    return anchor ? { ...anchor } : null; // clone to prevent mutation
  }

  /**
   * Make string key from address.
   * Format: "row:col" (1-based)
   */
  private makeKey(address: Address): string {
    return `${address.row}:${address.col}`;
  }
}
