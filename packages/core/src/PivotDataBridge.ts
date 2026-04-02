/**
 * PivotDataBridge.ts
 * 
 * Phase 29: GETPIVOTDATA Contract (Design Only)
 * Bridge interface between formula engine and pivot system
 * 
 * Design Constraints:
 * - Read-only (no mutation side effects)
 * - Deterministic (same worksheet state → same result)
 * - Explicit invalidation (no implicit rebuild)
 * - Error isolation (returns FormulaError on failure)
 */

import type { PivotId } from './PivotRegistry';
import type { CellValue } from './types';

/**
 * Formula error types.
 * TODO: Import from formula engine when available.
 */
export type FormulaError = '#REF!' | '#VALUE!' | '#N/A' | '#NAME?' | '#DIV/0!';

/**
 * Query specification for GETPIVOTDATA.
 * Encodes Excel's positional filter syntax.
 * 
 * Example:
 *   =GETPIVOTDATA("Revenue", A3, "Product", "Widget", "Region", "East")
 * 
 * Maps to:
 *   {
 *     pivotId: "pivot-1",
 *     valueField: "Revenue",
 *     filters: [
 *       { field: "Product", value: "Widget" },
 *       { field: "Region", value: "East" }
 *     ]
 *   }
 */
export interface PivotDataQuery {
  readonly pivotId: PivotId; // Which pivot to query
  readonly valueField: string; // Which aggregated column
  readonly filters: ReadonlyArray<{ field: string; value: CellValue }>; // Row/column filters
}

/**
 * Result of GETPIVOTDATA evaluation.
 * 
 * Returns:
 * - number: Numeric aggregated value
 * - null: Valid result but no data (e.g., filtered to empty set)
 * - FormulaError: Error condition
 *   - #REF!: Pivot not found or stale
 *   - #VALUE!: Invalid filter specification
 *   - #N/A: No matching row/column found
 */
export type PivotDataResult = number | null | FormulaError;

/**
 * Bridge interface between formula engine and pivot system.
 * Phase 29 implementation target.
 * 
 * CRITICAL CONSTRAINT:
 * - GETPIVOTDATA MUST NOT trigger implicit pivot rebuild.
 * - If pivot is stale → returns #REF! error.
 * - Explicit rebuild required via rebuild() method.
 * 
 * This preserves determinism and prevents hidden dependencies.
 */
export interface PivotDataBridge {
  /**
   * Resolve GETPIVOTDATA query.
   * 
   * Must be deterministic for same worksheet state.
   * Does NOT rebuild pivot if stale.
   * 
   * @param query The GETPIVOTDATA query specification
   * @returns Numeric value, null, or formula error
   * 
   * Error cases:
   * - #REF!: Pivot not found in registry
   * - #REF!: Pivot is stale (needs rebuild)
   * - #VALUE!: Invalid filter specification
   * - #N/A: No matching row/column found
   */
  query(query: PivotDataQuery): PivotDataResult;

  /**
   * Explicitly rebuild pivot by ID.
   * 
   * This is the ONLY way to update a registered pivot's computed data.
   * Must be called after source data changes.
   * 
   * @param id Pivot identifier
   * @returns true if rebuilt successfully, false if pivot not found
   */
  rebuild(id: PivotId): boolean;

  /**
   * Check if pivot needs rebuild.
   * 
   * Phase 30 concern (not implemented in Phase 28/29).
   * Placeholder for future staleness tracking.
   * 
   * @param id Pivot identifier
   * @returns true if rebuild needed, false if fresh, undefined if not found
   */
  isStale?(id: PivotId): boolean | undefined;
}

/**
 * Phase 30 Preview: Staleness Tracking
 * 
 * When to mark pivot as stale:
 * 1. Source range cells are modified
 * 2. Rows/columns are inserted/deleted within source range
 * 3. Formula dependencies change (if pivot uses calculated fields)
 * 
 * Implementation approach:
 * - Subscribe to worksheet change events
 * - Track source range → pivot ID mapping
 * - Mark affected pivots as stale
 * - GETPIVOTDATA returns #REF! for stale pivots
 * - Explicit rebuild() clears stale flag
 * 
 * IMPORTANT: Do NOT auto-rebuild on cell change.
 * Staleness is explicit invalidation, not automatic recalculation.
 */
