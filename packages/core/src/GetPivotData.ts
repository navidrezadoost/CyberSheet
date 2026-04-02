/**
 * GetPivotData.ts
 * 
 * Phase 29b: GETPIVOTDATA Query Implementation
 * Pure read-only query over pivot snapshots
 * 
 * Design Constraints:
 * - No mutation
 * - No side effects
 * - No implicit rebuild
 * - No dependency on source cells (Phase 30)
 * - Strict equality matching
 * - Deterministic error handling
 */

import type { PivotId } from './PivotRegistry';
import type { PivotSnapshot } from './PivotSnapshotStore';
import type { CellValue } from './types';
import type { PivotRegistry } from './PivotRegistry';
import type { PivotSnapshotStore } from './PivotSnapshotStore';

/**
 * Error types for GETPIVOTDATA.
 * Follows Excel conventions.
 */
export type PivotDataError = '#REF!' | '#VALUE!' | '#N/A';

/**
 * Filter specification for GETPIVOTDATA.
 * Field-value pairs for strict matching.
 */
export interface PivotDataFilter {
  field: string;
  value: CellValue;
}

/**
 * Result of GETPIVOTDATA query.
 * Returns value, null (valid empty), or error.
 */
export type PivotDataResult = CellValue | PivotDataError;

/**
 * GETPIVOTDATA Query Engine
 * 
 * Pure read-only query over pivot snapshots.
 * Follows 6-step deterministic algorithm.
 * 
 * Algorithm:
 * 1. Resolve pivot from registry (#REF! if not found)
 * 2. Resolve snapshot from store (#REF! if not found)
 * 3. Validate value field (#REF! if not in valueFields)
 * 4. Build predicate (strict equality)
 * 5. Filter rows (AND logic)
 * 6. Evaluate result (0=#N/A, >1=#VALUE!, 1=value)
 * 
 * Edge Cases:
 * - Missing filter field in row: non-match
 * - Null === null: match
 * - Null === undefined: no match
 * - No type coercion: "1" !== 1
 * - Empty filters: depends on row count
 * - Missing field in snapshot: #REF!
 */
export class GetPivotData {
  constructor(
    private registry: PivotRegistry,
    private snapshotStore: PivotSnapshotStore
  ) {}

  /**
   * Execute GETPIVOTDATA query.
   * 
   * @param pivotId - Pivot identifier
   * @param valueField - Value field name to retrieve
   * @param filters - Field-value filter pairs (AND logic)
   * @returns Cell value or error
   * 
   * Errors:
   * - #REF!: Pivot not found, snapshot missing, or invalid field
   * - #VALUE!: Multiple matching rows (ambiguous)
   * - #N/A: No matching rows
   */
  query(
    pivotId: PivotId,
    valueField: string,
    filters: PivotDataFilter[] = []
  ): PivotDataResult {
    // Step 1: Resolve pivot from registry
    const pivotMetadata = this.registry.get(pivotId);
    if (!pivotMetadata) {
      return '#REF!'; // Pivot not found
    }

    // Step 2: Resolve snapshot from store
    const snapshot = this.snapshotStore.get(pivotId);
    if (!snapshot) {
      return '#REF!'; // Snapshot not found (pivot not built yet)
    }

    // Step 3: Validate value field
    if (!snapshot.valueFields.includes(valueField)) {
      return '#REF!'; // Value field not in pivot
    }

    // Step 4: Build predicate
    // Validate all filter fields exist in snapshot
    for (const filter of filters) {
      if (!snapshot.fields.includes(filter.field)) {
        return '#REF!'; // Filter field not in pivot
      }
    }

    // Step 5: Filter rows (strict equality, AND logic)
    const matchingRows = snapshot.rows.filter(row => 
      this.rowMatches(row, filters)
    );

    // Step 6: Evaluate result
    if (matchingRows.length === 0) {
      return '#N/A'; // No matching rows
    }

    if (matchingRows.length > 1) {
      return '#VALUE!'; // Multiple matches (ambiguous)
    }

    // Single match - return value
    return matchingRows[0][valueField];
  }

  /**
   * Check if row matches all filters.
   * Uses strict equality (no type coercion).
   * 
   * @param row - Pivot row to test
   * @param filters - Filter predicates (AND logic)
   * @returns true if all filters match
   * 
   * Matching rules:
   * - ALL filters must match (AND logic)
   * - Strict equality: "1" !== 1
   * - Null === null: match
   * - Null === undefined: no match
   * - Missing field in row: no match
   */
  private rowMatches(
    row: Record<string, CellValue>,
    filters: PivotDataFilter[]
  ): boolean {
    return filters.every(filter => {
      const rowValue = row[filter.field];
      
      // Missing field in row: no match
      if (rowValue === undefined && filter.value !== undefined) {
        return false;
      }

      // Strict equality (no type coercion)
      return rowValue === filter.value;
    });
  }
}
