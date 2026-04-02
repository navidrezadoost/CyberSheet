/**
 * GetPivotData.ts
 * 
 * Phase 29b: GETPIVOTDATA Query Implementation
 * Phase 30a: Added staleness gate (#CALC! on dirty pivots)
 * 
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
 * 
 * Phase 30a: Added #CALC! for stale/dirty pivots.
 */
export type PivotDataError = '#REF!' | '#VALUE!' | '#N/A' | '#CALC!';

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
 * Follows 6-step deterministic algorithm (Phase 29b).
 * Phase 30a: Added staleness gate at Step 2.
 * 
 * Algorithm:
 * 1. Resolve pivot from registry (#REF! if not found)
 * 2. Check dirty flag (#CALC! if stale) ← Phase 30a
 * 3. Resolve snapshot from store (#REF! if not found)
 * 4. Validate value field (#REF! if not in valueFields)
 * 5. Build predicate (strict equality)
 * 6. Filter rows (AND logic)
 * 7. Evaluate result (0=#N/A, >1=#VALUE!, 1=value)
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
   * Phase 30a: Added staleness gate - returns #CALC! for dirty pivots.
   * 
   * @param pivotId - Pivot identifier
   * @param valueField - Value field name to retrieve
   * @param filters - Field-value filter pairs (AND logic)
   * @returns Cell value or error
   * 
   * Errors:
   * - #REF!: Pivot not found, snapshot missing, or invalid field
   * - #CALC!: Pivot is dirty/stale (needs rebuild) ← Phase 30a
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

    // Step 2: Check dirty flag (Phase 30a staleness gate)
    if (pivotMetadata.dirty) {
      return '#CALC!'; // Pivot is stale, needs rebuild
    }

    // Step 3: Resolve snapshot from store
    const snapshot = this.snapshotStore.get(pivotId);
    if (!snapshot) {
      return '#REF!'; // Snapshot not found (pivot not built yet)
    }

    // Step 4: Validate value field
    if (!snapshot.valueFields.includes(valueField)) {
      return '#REF!'; // Value field not in pivot
    }

    // Step 5: Build predicate
    // Validate all filter fields exist in snapshot
    for (const filter of filters) {
      if (!snapshot.fields.includes(filter.field)) {
        return '#REF!'; // Filter field not in pivot
      }
    }

    // Step 6: Filter rows (strict equality, AND logic)
    const matchingRows = snapshot.rows.filter(row => 
      this.rowMatches(row, filters)
    );

    // Step 7: Evaluate result
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
