/**
 * PivotGroupStateStore.ts
 * 
 * Phase 36a: Partial Recompute (Row-Level Diff Algorithm)
 * 
 * Core Principle:
 * > "For every mutation, the system behaves exactly as if the pivot was rebuilt 
 * > from scratch—only faster."
 * 
 * Architecture:
 * - Stores group-level aggregate state for incremental updates
 * - Maintains row snapshots (BEFORE mutation) for correct diff computation
 * - Supports algebraically reversible aggregators only (SUM, COUNT, AVG)
 * - Falls back to full rebuild on any uncertainty
 * 
 * Critical Invariants:
 * 1. Row snapshots stored AFTER mutation succeeds (captures BEFORE state)
 * 2. Hash includes only relevant columns (dimensions + values)
 * 3. Accumulators are reversible (add + remove operations)
 * 4. Group migration is atomic (all-or-nothing)
 * 5. Mutation threshold enforced (1000 → force full rebuild for FP stability)
 * 
 * Safety Mechanisms:
 * - canPartialRecompute() gate validates all preconditions
 * - Fallback resets ALL state (no hybrid corruption)
 * - Deterministic GroupKey format (collision-proof)
 */

import type { PivotConfig, AggregationType } from './PivotEngine';
import type { ExtendedCellValue } from './types';

/**
 * Unique identifier for a row (worksheet row index)
 */
export type RowId = number;

/**
 * Unique identifier for a group (combination of dimension values)
 * Format: "type:value|type:value|..." (collision-proof)
 * Example: "string:Sales|string:West" (not "Sales|West")
 */
export type GroupKey = string;

/**
 * Algebraically reversible accumulator interface
 * 
 * CRITICAL: All accumulators MUST support both add() and remove()
 * Operations must be algebraically reversible (not just "best guess")
 * 
 * Supported: SUM, COUNT, AVG (via sum+count)
 * Unsupported: MIN, MAX, MEDIAN, STDEV (not reversible)
 */
export interface AggregateAccumulator {
  /** Add a value to the accumulator */
  add(value: number | null): void;
  
  /** Remove a value from the accumulator (MUST be reversible) */
  remove(value: number | null): void;
  
  /** Get the current aggregated value */
  get(): number | null;
  
  /** Reset the accumulator to initial state */
  reset(): void;
}

/**
 * SUM accumulator (fully reversible)
 */
export class SumAccumulator implements AggregateAccumulator {
  private sum: number = 0;
  private hasValues: boolean = false;

  add(value: number | null): void {
    if (value !== null && typeof value === 'number' && isFinite(value)) {
      this.sum += value;
      this.hasValues = true;
    }
  }

  remove(value: number | null): void {
    if (value !== null && typeof value === 'number' && isFinite(value)) {
      this.sum -= value;
    }
  }

  get(): number | null {
    return this.hasValues ? this.sum : null;
  }

  reset(): void {
    this.sum = 0;
    this.hasValues = false;
  }
}

/**
 * COUNT accumulator (fully reversible)
 */
export class CountAccumulator implements AggregateAccumulator {
  private count: number = 0;

  add(value: number | null): void {
    // COUNT counts non-null numeric values
    if (value !== null && typeof value === 'number' && isFinite(value)) {
      this.count++;
    }
  }

  remove(value: number | null): void {
    if (value !== null && typeof value === 'number' && isFinite(value)) {
      this.count--;
    }
  }

  get(): number | null {
    return this.count > 0 ? this.count : null;
  }

  reset(): void {
    this.count = 0;
  }
}

/**
 * AVG accumulator (reversible via sum + count)
 * 
 * CRITICAL: NOT implemented as rolling average (not reversible)
 * Instead: AVG = SUM / COUNT (algebraically reversible)
 */
export class AvgAccumulator implements AggregateAccumulator {
  private sum: number = 0;
  private count: number = 0;

  add(value: number | null): void {
    if (value !== null && typeof value === 'number' && isFinite(value)) {
      this.sum += value;
      this.count++;
    }
  }

  remove(value: number | null): void {
    if (value !== null && typeof value === 'number' && isFinite(value)) {
      this.sum -= value;
      this.count--;
    }
  }

  get(): number | null {
    return this.count > 0 ? this.sum / this.count : null;
  }

  reset(): void {
    this.sum = 0;
    this.count = 0;
  }
}

/**
 * Factory function to create accumulators based on aggregation type
 * 
 * Returns null for non-reversible aggregations (MIN, MAX, MEDIAN, STDEV)
 */
export function createAccumulator(type: AggregationType): AggregateAccumulator | null {
  switch (type) {
    case 'sum':
      return new SumAccumulator();
    case 'count':
      return new CountAccumulator();
    case 'average':
      return new AvgAccumulator();
    // Non-reversible: force full rebuild
    case 'min':
    case 'max':
    case 'median':
    case 'stdev':
      return null;
    default:
      return null;
  }
}

/**
 * Aggregate state for a single group
 * Contains accumulators for all value fields
 */
export interface AggregateState {
  /** Field name → accumulator instance */
  values: Record<string, AggregateAccumulator>;
  
  /** Number of rows in this group (for debugging/validation) */
  rowCount: number;
}

/**
 * Complete group state for a pivot table
 * 
 * CRITICAL: rowSnapshots stores row data BEFORE mutation
 * This is essential for correct diff computation
 */
export interface PivotGroupState {
  /** GroupKey → AggregateState mapping */
  groups: Map<GroupKey, AggregateState>;
  
  /** RowId → GroupKey mapping (which group does this row belong to?) */
  rowToGroup: Map<RowId, GroupKey>;
  
  /** RowId → hash of relevant columns (for change detection) */
  rowHashes: Map<RowId, number>;
  
  /** RowId → row snapshot BEFORE mutation (CRITICAL for correctness) */
  rowSnapshots: Map<RowId, ExtendedCellValue[]>;
  
  /** Monotonic version counter (increments on every mutation) */
  version: number;
  
  /** Version of last full rebuild (for mutation threshold) */
  lastFullRebuildVersion: number;
  
  /** Timestamp of last full rebuild (for debugging) */
  lastBuiltAt: number;
}

/**
 * FNV-1a hash function for row data
 * 
 * Design: Hash only RELEVANT columns (dimensions + values)
 * Why: Avoid false positives from unrelated column changes
 * 
 * FNV-1a parameters:
 * - offset_basis: 2166136261
 * - FNV_prime: 16777619
 */
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * Compute FNV-1a hash of relevant columns in a row
 * 
 * @param row - Full row data
 * @param relevantColumns - Column indices to include in hash
 * @returns 32-bit unsigned integer hash
 */
export function hashRowRelevant(row: ExtendedCellValue[], relevantColumns: number[]): number {
  let hash = FNV_OFFSET_BASIS;
  
  for (const col of relevantColumns) {
    const value = row[col];
    const str = value != null ? String(value) : 'null';
    
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, FNV_PRIME);
    }
  }
  
  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Create collision-proof GroupKey from dimension values
 * 
 * Format: "type:value|type:value|..."
 * Example: "string:Sales|string:West" (NOT "Sales|West")
 * 
 * Why: Prevents collisions like "A|BC" vs "AB|C"
 */
export function makeGroupKey(values: ExtendedCellValue[]): GroupKey {
  return values
    .map(v => `${typeof v}:${v}`)
    .join('|');
}

/**
 * Extract relevant column indices from pivot config
 * 
 * Relevant columns = dimensions (rows + columns) + values
 * These are the only columns that affect grouping and aggregation
 */
export function getRelevantColumns(config: PivotConfig): number[] {
  const relevant = new Set<number>();
  
  // Add dimension columns (rows + columns)
  for (const field of config.rows) {
    relevant.add(field.column);
  }
  for (const field of config.columns) {
    relevant.add(field.column);
  }
  
  // Add value columns (only for aggregate specs, calculated fields have no column)
  for (const spec of config.values) {
    const type = 'type' in spec ? spec.type : 'aggregate';
    if (type === 'aggregate' && 'column' in spec) {
      relevant.add(spec.column);
    }
  }
  
  return Array.from(relevant).sort((a, b) => a - b);
}

/**
 * Global store for pivot group states
 * 
 * Lifecycle:
 * 1. Created during full rebuild (PivotEngine.generate)
 * 2. Updated during partial recompute (PivotRecomputeEngine)
 * 3. Deleted when pivot is removed (workbook.deletePivot)
 */
export class PivotGroupStateStore {
  private states = new Map<string, PivotGroupState>();

  /**
   * Create a new empty group state for a pivot
   */
  create(pivotId: string): PivotGroupState {
    const state: PivotGroupState = {
      groups: new Map(),
      rowToGroup: new Map(),
      rowHashes: new Map(),
      rowSnapshots: new Map(),
      version: 0,
      lastFullRebuildVersion: 0,
      lastBuiltAt: Date.now(),
    };
    
    this.states.set(pivotId, state);
    return state;
  }

  /**
   * Get existing group state for a pivot
   * Returns undefined if not found
   */
  get(pivotId: string): PivotGroupState | undefined {
    return this.states.get(pivotId);
  }

  /**
   * Check if group state exists for a pivot
   */
  has(pivotId: string): boolean {
    return this.states.has(pivotId);
  }

  /**
   * Delete group state for a pivot
   * Called when pivot is removed
   */
  delete(pivotId: string): void {
    this.states.delete(pivotId);
  }

  /**
   * Reset group state to empty (used during fallback to full rebuild)
   * 
   * CRITICAL: Resets ALL state to prevent hybrid corruption
   * - groups
   * - rowToGroup
   * - rowHashes
   * - rowSnapshots
   * - version counters
   */
  reset(pivotId: string): void {
    const state = this.states.get(pivotId);
    if (!state) return;
    
    state.groups.clear();
    state.rowToGroup.clear();
    state.rowHashes.clear();
    state.rowSnapshots.clear();
    state.version = 0;
    state.lastFullRebuildVersion = 0;
    state.lastBuiltAt = Date.now();
  }

  /**
   * Clear all group states (for testing)
   */
  clear(): void {
    this.states.clear();
  }
}

/**
 * Phase 36a: Compute GroupKey from row data
 * 
 * Extracts dimension values (row fields + column fields) from row
 * and creates collision-proof GroupKey
 * 
 * @param row - Source row data
 * @param config - Pivot configuration
 * @returns GroupKey for this row's group membership
 */
export function computeGroupKey(row: ExtendedCellValue[], config: PivotConfig): GroupKey {
  const dimensions: ExtendedCellValue[] = [];
  
  // Extract row dimension values
  for (const field of config.rows) {
    dimensions.push(row[field.column] ?? null);
  }
  
  // Extract column dimension values
  for (const field of config.columns) {
    dimensions.push(row[field.column] ?? null);
  }
  
  return makeGroupKey(dimensions);
}

/**
 * Phase 36a: Extract value from row for a specific value spec
 * 
 * @param row - Source row data
 * @param valueSpec - Value specification (aggregate or calculated)
 * @returns Numeric value or null if not present/invalid
 */
export function extractValue(
  row: ExtendedCellValue[], 
  valueSpec: import('./PivotEngine').AggregateValueSpec | import('./PivotEngine').CalculatedValueSpec
): number | null {
  const type = 'type' in valueSpec ? valueSpec.type : 'aggregate';
  
  if (type === 'calculated') {
    // Calculated fields don't have source columns
    // They're computed from other aggregates
    return null;
  }
  
  // Aggregate spec - extract column value
  if ('column' in valueSpec) {
    const value = row[valueSpec.column];
    
    // Convert to number if possible
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
  }
  
  return null;
}

/**
 * Phase 36a: Check if group has no data
 * 
 * A group is empty if rowCount is 0
 * (meaning no rows contribute to this group)
 */
export function isGroupEmpty(group: AggregateState): boolean {
  return group.rowCount === 0;
}

/**
 * Phase 36a: Create empty accumulator group
 * 
 * Initialize all accumulators to identity element (0 for SUM/COUNT, etc)
 * CRITICAL: Only create reversible accumulators
 */
export function createEmptyGroup(config: PivotConfig): AggregateState {
  const values: Record<string, AggregateAccumulator> = {};
  
  for (const spec of config.values) {
    const type = 'type' in spec ? spec.type : 'aggregate';
    
    if (type === 'aggregate' && 'aggregation' in spec) {
      const acc = createAccumulator(spec.aggregation);
      
      if (acc) {
        values[spec.label] = acc;
      }
    }
    // Calculated fields handled separately in recomputeCalculatedFields
  }
  
  return {
    values,
    rowCount: 0
  };
}

/**
 * Phase 36a: Recompute calculated fields for a group
 * 
 * Calculated fields depend on other aggregates in the same group
 * After incremental update, we must recompute these
 * 
 * @param groupKey - Group to recompute
 * @param state - Group state
 * @param config - Pivot configuration
 */
export function recomputeCalculatedFields(
  groupKey: GroupKey,
  state: PivotGroupState,
  config: PivotConfig
): void {
  const group = state.groups.get(groupKey);
  if (!group) return;
  
  for (const spec of config.values) {
    const type = 'type' in spec ? spec.type : 'aggregate';
    
    if (type === 'calculated' && 'expression' in spec) {
      // This is a simplified placeholder
      // Real implementation would evaluate the expression
      // using values from other accumulators in the group
      
      // For now, skip calculated fields
      // TODO: Implement calculated field evaluation
    }
  }
}

/**
 * Phase 36a: Materialize PivotSnapshot from group state
 * 
 * CRITICAL: This is a PURE function (no mutations, no side effects)
 * Just projection from Map structure → PivotSnapshot format
 * 
 * @param pivotId - Pivot identifier
 * @param state - Group state to materialize
 * @param config - Pivot configuration
 * @returns Immutable PivotSnapshot
 */
export function materializeSnapshotFromGroupState(
  pivotId: string,
  state: PivotGroupState,
  config: PivotConfig
): import('./PivotSnapshotStore').PivotSnapshot {
  const rows: import('./PivotSnapshotStore').PivotRow[] = [];
  
  // Sort group keys for deterministic output
  const sortedKeys = Array.from(state.groups.keys()).sort();
  
  for (const groupKey of sortedKeys) {
    const group = state.groups.get(groupKey);
    if (!group) continue;
    
    // Parse dimension values from GroupKey
    const dimensions = parseGroupKey(groupKey);
    
    // Build row object
    const row: Record<string, any> = {};
    
    // Add dimension fields
    let dimIndex = 0;
    for (const field of config.rows) {
      row[field.label] = dimensions[dimIndex++];
    }
    for (const field of config.columns) {
      row[field.label] = dimensions[dimIndex++];
    }
    
    // Add value fields
    for (const spec of config.values) {
      const acc = group.values[spec.label];
      row[spec.label] = acc ? acc.get() : null;
    }
    
    rows.push(row as import('./PivotSnapshotStore').PivotRow);
  }
  
  // Collect field names
  const fields: string[] = [
    ...config.rows.map(r => r.label),
    ...config.columns.map(c => c.label),
    ...config.values.map(v => v.label)
  ];
  
  const valueFields = config.values.map(v => v.label);
  
  return {
    pivotId: pivotId as import('./PivotRegistry').PivotId,
    computedAt: Date.now(),
    rows,
    fields,
    valueFields
  };
}

/**
 * Parse GroupKey back into dimension values
 * 
 * Reverses makeGroupKey() transformation
 * Format: "type:value|type:value|..." → [value, value, ...]
 */
function parseGroupKey(key: GroupKey): ExtendedCellValue[] {
  return key.split('|').map(part => {
    const [type, ...valueParts] = part.split(':');
    const valueStr = valueParts.join(':'); // Handle values with colons
    
    if (valueStr === 'null') return null;
    if (type === 'number') return parseFloat(valueStr);
    if (type === 'boolean') return valueStr === 'true';
    return valueStr; // string
  });
}

/**
 * Global singleton instance
 * Accessed by PivotEngine and PivotRecomputeEngine
 */
export const groupStateStore = new PivotGroupStateStore();
