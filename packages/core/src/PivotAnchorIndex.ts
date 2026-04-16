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
 * Phase 32 patch: Sheet-aware keys prevent cross-sheet collisions.
 * Key format: "sheetId:row:col" (1-based, e.g., "Sheet1:5:3" for E3 on Sheet1)
 * 
 * Thread-safe: Synchronous operations only (no async lookups)
 * Memory-safe: Deletes remove entries (no leaks)
 * Cross-sheet safe: Sheet context prevents anchor collisions
 */
export interface PivotAnchorIndex {
  /**
   * Register a pivot at its anchor cell.
   * Replaces any existing pivot at the same anchor on the same sheet.
   * 
   * @param anchor - Top-left cell of pivot (1-based)
   * @param pivotId - Pivot identifier
   * @param sheetId - Worksheet identifier (prevents cross-sheet collisions)
   */
  set(anchor: Address, pivotId: PivotId, sheetId: string): void;

  /**
   * Resolve pivot ID from anchor cell on specific sheet.
   * Returns null if no pivot exists at the address.
   * 
   * @param address - Cell address to check (1-based)
   * @param sheetId - Worksheet identifier
   * @returns PivotId if pivot exists at address, null otherwise
   */
  get(address: Address, sheetId: string): PivotId | null;

  /**
   * Check if a pivot exists at the given address on specific sheet.
   * 
   * @param address - Cell address to check
   * @param sheetId - Worksheet identifier
   * @returns true if pivot exists at address
   */
  has(address: Address, sheetId: string): boolean;

  /**
   * Remove pivot anchor by pivot ID.
   * Called when pivot is deleted.
   * 
   * @param pivotId - Pivot to remove
   * @returns true if anchor was deleted
   */
  delete(pivotId: PivotId): boolean;

  /**
   * Remove pivot anchor by address on specific sheet.
   * Called when pivot is moved (remove old anchor before setting new one).
   * 
   * @param address - Anchor address to remove
   * @param sheetId - Worksheet identifier
   * @returns true if anchor was deleted
   */
  deleteByAddress(address: Address, sheetId: string): boolean;

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
 * Phase 32 patch: Sheet-aware keys for cross-sheet safety
 * 
 * Design decisions:
 * - String keys for O(1) map lookup ("sheetId:row:col" format)
 * - Bidirectional maps for both anchor→pivot and pivot→anchor queries
 * - Sheet ID in key prevents cross-sheet anchor collisions
 * 
 * Memory characteristics:
 * - 2 map entries per pivot (address→id + id→{address,sheet})
 * - ~72 bytes per pivot overhead (includes sheet string)
 * - O(1) all operations
 */
export class PivotAnchorIndexImpl implements PivotAnchorIndex {
  // Fast lookup: "sheetId:row:col" → pivotId
  private anchors = new Map<string, PivotId>();

  // Reverse lookup: pivotId → {address, sheetId} (for delete and getAnchor)
  private pivotAnchors = new Map<PivotId, { address: Address; sheetId: string }>();

  /**
   * Register pivot at anchor cell on specific sheet.
   * Replaces existing pivot at same anchor (if any).
   */
  set(anchor: Address, pivotId: PivotId, sheetId: string): void {
    const key = this.makeKey(anchor, sheetId);

    // Remove old anchor for this pivot (if moving)
    const oldContext = this.pivotAnchors.get(pivotId);
    if (oldContext) {
      const oldKey = this.makeKey(oldContext.address, oldContext.sheetId);
      this.anchors.delete(oldKey);
    }

    // Set new anchor
    this.anchors.set(key, pivotId);
    this.pivotAnchors.set(pivotId, { address: { ...anchor }, sheetId }); // clone to prevent mutation
  }

  /**
   * Resolve pivot from address on specific sheet.
   * O(1) lookup.
   */
  get(address: Address, sheetId: string): PivotId | null {
    const key = this.makeKey(address, sheetId);
    return this.anchors.get(key) ?? null;
  }

  /**
   * Check if pivot exists at address on specific sheet.
   * O(1) check.
   */
  has(address: Address, sheetId: string): boolean {
    const key = this.makeKey(address, sheetId);
    return this.anchors.has(key);
  }

  /**
   * Delete pivot anchor by pivot ID.
   * O(1) deletion (uses reverse map).
   */
  delete(pivotId: PivotId): boolean {
    const context = this.pivotAnchors.get(pivotId);
    if (!context) return false; // Pivot not anchored

    const key = this.makeKey(context.address, context.sheetId);
    this.anchors.delete(key);
    this.pivotAnchors.delete(pivotId);
    return true;
  }

  /**
   * Delete pivot anchor by address on specific sheet.
   * O(1) deletion.
   */
  deleteByAddress(address: Address, sheetId: string): boolean {
    const key = this.makeKey(address, sheetId);
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
    const context = this.pivotAnchors.get(pivotId);
    return context ? { ...context.address } : null; // clone to prevent mutation
  }

  /**
   * Make string key from address and sheet ID.
   * Phase 32 patch: Sheet-aware format prevents cross-sheet collisions.
   * Format: "sheetId:row:col" (1-based)
   */
  private makeKey(address: Address, sheetId: string): string {
    return `${sheetId}:${address.row}:${address.col}`;
  }
}
