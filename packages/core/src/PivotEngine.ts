/**
 * PivotEngine.ts
 * 
 * Phase 27: Calculated Fields (row-level, deprecated)
 * Phase 33: Calculated Fields (post-aggregation, correct approach)
 * Phase 35: Slicers (declarative filtering layer)
 * Phase 36a: Partial Recompute (row-level diff algorithm)
 * Zero-dependency pivot table engine with aggregation and calculated fields
 * 
 * Design Constraints:
 * - Pure engine (no formula coupling)
 * - No pivot registry
 * - Deterministic evaluation order
 * - Allocation-safe row wrapper
 * - Error isolation (no exception leakage)
 */

import type { Address, CellValue, ExtendedCellValue } from './types';
import type { Worksheet } from './worksheet';
import { FormulaEngine } from './FormulaEngine';
import type { CalculatedField, CompiledCalculatedField, PivotEvalContext } from './PivotCalculatedFields';
import { PivotCalculatedFieldError } from './PivotCalculatedFields';
import { toDisplayValue } from './utils/cell-value-normalizer';
import { PivotCalculatedFieldEngine } from './PivotCalculatedFields';
import type { PivotId } from './PivotRegistry';
import type { PivotGroupState, RowId } from './PivotGroupStateStore';
import { 
  groupStateStore, 
  createAccumulator, 
  getRelevantColumns, 
  hashRowRelevant, 
  makeGroupKey 
} from './PivotGroupStateStore';

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'stdev';

/**
 * Phase 35: Slicer Types
 * Slicers are declarative filter state attached to a pivot, evaluated at build time.
 */

/** Unique identifier for a slicer */
export type SlicerId = string;

/** Valid slicer value types */
export type SlicerValue = string | number | boolean | null;

/**
 * Storable slicer state (JSON-serializable)
 * Stored in PivotConfig for persistence
 */
export interface SlicerStateStorable {
  readonly field: string;                    // Field label (e.g., "Region")
  readonly selectedValues: SlicerValue[];    // Empty = no filter (ALL)
  readonly mode: 'include' | 'exclude';      // Filter mode
}

/**
 * Runtime slicer state (optimized for O(1) lookup)
 * Hydrated from storable state during build
 */
export interface SlicerStateRuntime {
  readonly field: string;
  readonly selectedValues: Set<SlicerValue>;
  readonly mode: 'include' | 'exclude';
}

export interface PivotField {
  column: number;
  label: string;
}

/**
 * PivotSourceRow - Allocation-safe row wrapper for calculated fields
 * 
 * Design: Single reusable instance per aggregation loop (zero GC pressure)
 * Guarantees: Safe field access with null handling
 */
export class PivotSourceRow {
  private data: ExtendedCellValue[] = [];

  /** @internal - Rebind wrapper to new row data (reuse pattern) */
  _bind(row: ExtendedCellValue[]): void {
    this.data = row;
  }

  /** Get raw values array (read-only) */
  get values(): ReadonlyArray<ExtendedCellValue> {
    return this.data;
  }

  /** Get numeric value or null if not a number */
  getNumber(col: number): number | null {
    const val = this.data[col];
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
    return null;
  }

  /** Get string value or empty string */
  getString(col: number): string {
    const val = this.data[col];
    return val != null ? String(val) : '';
  }

  /** Get boolean value or null */
  getBoolean(col: number): boolean | null {
    const val = this.data[col];
    return typeof val === 'boolean' ? val : null;
  }

  /** Get raw value at column */
  getRaw(col: number): ExtendedCellValue {
    return this.data[col] ?? null;
  }
}

/**
 * Aggregate value specification (Phase 25/26 behavior preserved)
 */
export interface AggregateValueSpec {
  type: 'aggregate';
  column: number;
  aggregation: AggregationType;
  label: string;
}

/**
 * Calculated value specification (Phase 27)
 * 
 * IMPORTANT: Calculated fields are runtime-only and not included in snapshot
 * serialization. The compute function is opaque and non-serializable by design.
 * 
 * Null Semantics:
 * - All rows null → null
 * - Some null → ignore null (same as aggregate fields)
 * - No rows → null
 * 
 * Error Handling:
 * - Exceptions in compute() are caught and return null
 * - NaN/Infinity results are treated as null
 */
export interface CalculatedValueSpec {
  type: 'calculated';
  name: string;
  label: string;
  compute: (row: PivotSourceRow) => number | null;
}

/**
 * Discriminated union for value specifications (Phase 27)
 */
export type PivotValueSpec = AggregateValueSpec | CalculatedValueSpec;

/**
 * Pivot configuration with backward compatibility
 * 
 * Values can be:
 * - Legacy format: { column, aggregation, label } (auto-converted)
 * - New format: PivotValueSpec union
 * 
 * Phase 33: calculatedFields added (post-aggregation formulas)
 * Phase 35: slicers added (declarative filtering)
 */
export interface PivotConfig {
  rows: PivotField[];
  columns: PivotField[];
  values: PivotValueSpec[] | Array<{ column: number; aggregation: AggregationType; label: string }>;
  sourceRange: { start: Address; end: Address };
  
  // Phase 33: Post-aggregation calculated fields
  calculatedFields?: CalculatedField[];
  
  // Phase 35: Declarative slicers
  slicers?: Record<SlicerId, SlicerStateStorable>;
}

export interface PivotCell {
  value: CellValue;
  rowKeys: string[];
  colKeys: string[];
  aggregation: AggregationType | 'calculated';
  error?: string; // Internal error marker (not exposed in public API yet)
  
  // Phase 33: All aggregated + calculated values for this cell
  // Phase 33b: Values can include Error objects (not just CellValue)
  values?: Record<string, CellValue | Error>; // Field name → value (includes errors)
}

export interface PivotTable {
  rowHeaders: string[][];
  columnHeaders: string[][];
  data: PivotCell[][];
  grandTotal?: CellValue;
}

export class PivotEngine {
  private worksheet: Worksheet;
  private readonly formulaEngine: FormulaEngine;
  
  // Allocation-safe row wrapper (reused across all calculations)
  private readonly rowWrapper = new PivotSourceRow();
  
  // Phase 33: Calculated field engine (lazy-initialized)
  private calcFieldEngine?: PivotCalculatedFieldEngine;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
    // Calculated pivot formulas are evaluated over an explicit aggregate
    // namespace; they do not depend on or mutate the Worksheet's evaluator.
    this.formulaEngine = new FormulaEngine();
  }
  
  /**
   * Phase 33: Get or create calculated field engine
   */
  private getCalcFieldEngine(): PivotCalculatedFieldEngine {
    if (!this.calcFieldEngine) {
      this.calcFieldEngine = new PivotCalculatedFieldEngine(this.formulaEngine);
    }
    return this.calcFieldEngine;
  }

  /**
   * Generate pivot table from configuration
   * 
   * Phase 27: Extended with calculated field support (row-level)
   * Phase 33: Post-aggregation calculated fields
   * Guarantees: Deterministic ordering, backward compatibility
   */
  generate(config: PivotConfig): PivotTable {
    // Normalize value specs (backward compatibility)
    const normalizedConfig: PivotConfig = {
      ...config,
      values: this.normalizeValueSpecs(config.values)
    };
    const declaredValueNames = new Set<string>();
    for (const spec of normalizedConfig.values as PivotValueSpec[]) {
      const name = spec.type === 'aggregate' ? spec.label : spec.name;
      const normalizedName = name.toUpperCase();
      if (declaredValueNames.has(normalizedName)) {
        throw new PivotCalculatedFieldError(
          'INVALID_FORMULA',
          `Duplicate pivot value name: ${name}`,
        );
      }
      declaredValueNames.add(normalizedName);
    }

    // Extract source data
    let sourceData = this.extractSourceData(normalizedConfig.sourceRange);
    
    // Phase 35: Apply slicer filtering BEFORE aggregation
    if (normalizedConfig.slicers && Object.keys(normalizedConfig.slicers).length > 0) {
      sourceData = this.applySlicers(sourceData, normalizedConfig.slicers, normalizedConfig);
    }
    
    // Build dimension maps
    const sourceStartColumn = normalizedConfig.sourceRange.start.col;
    const rowDimensions = this.buildDimensions(
      sourceData,
      normalizedConfig.rows,
      sourceStartColumn,
    );
    const colDimensions = this.buildDimensions(
      sourceData,
      normalizedConfig.columns,
      sourceStartColumn,
    );
    
    // Aggregate data (Phase 27: handles both aggregate and calculated)
    const aggregatedData = this.aggregateData(
      sourceData,
      rowDimensions,
      colDimensions,
      normalizedConfig.values as PivotValueSpec[],
      sourceStartColumn,
      (normalizedConfig.values as PivotValueSpec[]).length > 1 ||
        (normalizedConfig.calculatedFields?.length ?? 0) > 0,
    );
    
    // Phase 33: Evaluate post-aggregation calculated fields
    if (normalizedConfig.calculatedFields && normalizedConfig.calculatedFields.length > 0) {
      this.evaluateCalculatedFields(
        aggregatedData,
        normalizedConfig.values as PivotValueSpec[],
        normalizedConfig.calculatedFields
      );
    }
    
    const normalizedValues = normalizedConfig.values as PivotValueSpec[];
    
    // Build pivot table structure
    return {
      rowHeaders: this.buildHeaders(rowDimensions),
      columnHeaders: this.buildHeaders(colDimensions),
      data: aggregatedData,
      grandTotal: this.calculateGrandTotal(aggregatedData, normalizedValues[0])
    };
  }

  /**
   * Phase 36a: Populate group state during full rebuild
   * 
   * Called after full pivot rebuild to enable partial recompute.
   * Builds incremental state: groups, row mappings, hashes, snapshots.
   * 
   * CRITICAL: Only called for pivots with reversible aggregators
   * MIN/MAX/MEDIAN/STDEV → skip state population (force full rebuild always)
   * 
   * @param pivotId - Pivot identifier
   * @param config - Pivot configuration
   * @param sourceData - Source data rows (after slicer filtering)
   */
  populateGroupState(pivotId: PivotId, config: PivotConfig, sourceData: ExtendedCellValue[][]): void {
    // Check if all aggregators are reversible
    const normalizedValues = this.normalizeValueSpecs(config.values) as PivotValueSpec[];
    const hasNonReversible = normalizedValues.some(spec => {
      if (spec.type === 'aggregate') {
        const acc = createAccumulator(spec.aggregation);
        return acc === null; // null = non-reversible
      }
      return false; // calculated fields are fine
    });
    
    if (hasNonReversible) {
      // Skip state population for non-reversible aggregators
      // Partial recompute will fallback to full rebuild
      return;
    }
    
    // Get or create group state
    let state = groupStateStore.get(pivotId);
    if (!state) {
      state = groupStateStore.create(pivotId);
    } else {
      // Reset for full rebuild
      groupStateStore.reset(pivotId);
      state = groupStateStore.get(pivotId)!;
    }
    
    // Get relevant columns for hashing
    const relevantColumns = getRelevantColumns(config).map(
      (column) => column - config.sourceRange.start.col,
    );
    
    // Get dimension columns (for grouping)
    const dimensionColumns = [
      ...config.rows.map((field) => field.column - config.sourceRange.start.col),
      ...config.columns.map((field) => field.column - config.sourceRange.start.col),
    ];
    
    // Skip header row (first row is headers)
    const dataRows = sourceData.slice(1);
    
    // Build group state
    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const row = dataRows[rowIdx];
      const rowId: RowId = rowIdx + 1; // 1-based (skipping header)
      
      // Extract dimension values for grouping
      const dimensionValues = dimensionColumns.map(col => row[col]);
      const groupKey = makeGroupKey(dimensionValues);
      
      // Get or create group
      let group = state.groups.get(groupKey);
      if (!group) {
        // Create accumulators for this group
        const accumulators: Record<string, any> = {};
        for (const spec of normalizedValues) {
          if (spec.type === 'aggregate') {
            const acc = createAccumulator(spec.aggregation);
            if (acc) {
              accumulators[spec.label] = acc;
            }
          }
        }
        
        group = {
          values: accumulators,
          rowCount: 0
        };
        state.groups.set(groupKey, group);
      }
      
      // Add values to accumulators
      for (const spec of normalizedValues) {
        if (spec.type === 'aggregate') {
          const acc = group.values[spec.label];
          if (acc) {
            const value = row[spec.column - config.sourceRange.start.col];
            const numValue = typeof value === 'number' && isFinite(value) ? value : null;
            acc.add(numValue);
          }
        }
      }
      
      group.rowCount++;
      
      // Store row mapping
      state.rowToGroup.set(rowId, groupKey);
      
      // Store row hash
      const hash = hashRowRelevant(row, relevantColumns);
      state.rowHashes.set(rowId, hash);
      
      // Store row snapshot (CRITICAL for partial recompute)
      state.rowSnapshots.set(rowId, [...row]); // Clone row
    }
    
    // Update state metadata
    state.version = 0;
    state.lastFullRebuildVersion = 0;
    state.lastBuiltAt = Date.now();
  }

  /**
   * Phase 27: Normalize value specs for backward compatibility
   * 
   * Legacy format: { column, aggregation, label }
   * New format: PivotValueSpec union
   * 
   * Guarantees: Phase 25/26 configs work unchanged
   */
  private normalizeValueSpecs(values: PivotConfig['values']): PivotValueSpec[] {
    return values.map(v => {
      // Already normalized (has type discriminator)
      if ('type' in v) {
        return v as PivotValueSpec;
      }
      
      // Legacy format → convert to AggregateValueSpec
      return {
        type: 'aggregate',
        column: v.column,
        aggregation: v.aggregation,
        label: v.label
      } as AggregateValueSpec;
    });
  }

  /**
   * Extract data from source range
   */
  private extractSourceData(range: { start: Address; end: Address }): ExtendedCellValue[][] {
    const data: ExtendedCellValue[][] = [];
    
    for (let row = range.start.row; row <= range.end.row; row++) {
      const rowData: ExtendedCellValue[] = [];
      for (let col = range.start.col; col <= range.end.col; col++) {
        const cell = this.worksheet.getCell({ row, col });
        rowData.push(cell?.value ?? null);
      }
      data.push(rowData);
    }
    
    return data;
  }
  
  /**
   * Phase 35: Hydrate slicers from storable to runtime format
   * Converts selectedValues from Array to Set for O(1) lookup
   */
  private hydrateSlicers(
    slicers: Record<SlicerId, SlicerStateStorable>
  ): Map<SlicerId, SlicerStateRuntime> {
    const runtimeSlicers = new Map<SlicerId, SlicerStateRuntime>();
    
    for (const [id, slicer] of Object.entries(slicers)) {
      runtimeSlicers.set(id, {
        field: slicer.field,
        selectedValues: new Set(slicer.selectedValues),
        mode: slicer.mode
      });
    }
    
    return runtimeSlicers;
  }
  
  /**
   * Phase 35: Apply slicer filtering to source data
   * 
   * Filters rows based on slicer state BEFORE aggregation.
   * All slicers are AND-composed.
   * 
   * @param rows - Source data rows (first row assumed to be headers)
   * @param slicers - Slicer state (storable format)
   * @param config - Pivot config (for field label → column mapping)
   * @returns Filtered rows (header + matching data rows)
   */
  private applySlicers(
    rows: ExtendedCellValue[][],
    slicers: Record<SlicerId, SlicerStateStorable>,
    config: PivotConfig
  ): ExtendedCellValue[][] {
    if (rows.length === 0) return rows;
    
    // Hydrate slicers (convert to runtime format)
    const runtimeSlicers = this.hydrateSlicers(slicers);
    
    // Build field label → column index map
    const fieldToColumn = new Map<string, number>();
    for (const field of [...config.rows, ...config.columns]) {
      fieldToColumn.set(field.label, field.column);
    }
    
    // Extract header row (row 0)
    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    
    // Filter data rows
    const filteredDataRows = dataRows.filter(row => {
      // Apply each slicer (AND logic)
      for (const slicer of runtimeSlicers.values()) {
        const sourceColumn = fieldToColumn.get(slicer.field);
        
        // If field not found, skip this slicer (defensive: should be validated at setSlicer)
        if (sourceColumn === undefined) continue;
        const columnIndex = sourceColumn - config.sourceRange.start.col;
        
        // Get cell value
        const cellValue = row[columnIndex];
        
        // Empty selection = no filter (permit all)
        if (slicer.selectedValues.size === 0) continue;
        
        // Check if value matches slicer (normalize to display value for comparison)
        const isInSelection = slicer.selectedValues.has(toDisplayValue(cellValue));
        
        // Apply mode
        if (slicer.mode === 'include' && !isInSelection) {
          return false; // Exclude row
        }
        if (slicer.mode === 'exclude' && isInSelection) {
          return false; // Exclude row
        }
      }
      
      return true; // Row passes all slicer filters
    });
    
    // Return header + filtered data
    return [headerRow, ...filteredDataRows];
  }

  /**
   * Build dimension keys for grouping
   */
  private buildDimensions(
    data: ExtendedCellValue[][],
    fields: PivotField[],
    sourceStartColumn: number,
  ): Map<string, ExtendedCellValue[][]> {
    const dimensions = new Map<string, ExtendedCellValue[][]>();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const key = fields
        .map((field) => String(row[field.column - sourceStartColumn] ?? ''))
        .join('|');
      
      if (!dimensions.has(key)) {
        dimensions.set(key, []);
      }
      dimensions.get(key)!.push(row);
    }
    
    return dimensions;
  }

  /**
   * Build headers from dimension keys
   */
  private buildHeaders(dimensions: Map<string, ExtendedCellValue[][]>): string[][] {
    const keys = Array.from(dimensions.keys());
    return keys.map(key => key.split('|'));
  }

  /**
   * Phase 27: Aggregate data into pivot cells
   * 
   * Handles both aggregate and calculated value specs.
   * Guarantees:
   * - Calculated fields run AFTER grouping (on aggregated rows)
   * - Deterministic evaluation order (matches valueSpecs order)
   * - Error isolation (exceptions → null)
   * - Null semantics match aggregate behavior
   */
  private aggregateData(
    sourceData: ExtendedCellValue[][],
    rowDimensions: Map<string, ExtendedCellValue[][]>,
    colDimensions: Map<string, ExtendedCellValue[][]>,
    valueSpecs: PivotValueSpec[],
    sourceStartColumn: number,
    includeNamedValues: boolean,
  ): PivotCell[][] {
    const result: PivotCell[][] = [];
    const rowKeys = Array.from(rowDimensions.keys());
    const colKeys = Array.from(colDimensions.keys());
    
    for (let r = 0; r < rowKeys.length; r++) {
      const row: PivotCell[] = [];
      const rowKey = rowKeys[r];
      const rowData = rowDimensions.get(rowKey)!;
      
      for (let c = 0; c < colKeys.length; c++) {
        const colKey = colKeys[c];
        const colData = colDimensions.get(colKey)!;
        
        // Find intersection (grouped rows for this cell)
        const intersection = this.findIntersection(rowData, colData);
        
        // Preserve every configured aggregate independently. `value` remains
        // the first configured spec for existing grid consumers; `values` is
        // the named multi-value surface used by calculated fields and the
        // snapshot adapter.
        const primarySpec = valueSpecs[0];
        const values: Record<string, CellValue | Error> = {};
        let primaryValue: { value: number | null; error?: string } = { value: null };
        for (let valueIndex = 0; valueIndex < valueSpecs.length; valueIndex++) {
          const spec = valueSpecs[valueIndex];
          const result = this.aggregateValueSpec(spec, intersection, sourceStartColumn);
          const label = spec.type === 'aggregate' ? spec.label : spec.name;
          if (includeNamedValues) values[label] = result.value;
          if (valueIndex === 0) primaryValue = result;
        }
        
        row.push({
          value: primaryValue.value,
          rowKeys: rowKey.split('|'),
          colKeys: colKey.split('|'),
          aggregation: primarySpec.type === 'aggregate' ? primarySpec.aggregation : 'calculated',
          error: primaryValue.error,
          ...(includeNamedValues ? { values } : {}),
        });
      }
      
      result.push(row);
    }
    
    return result;
  }

  /**
   * Phase 27: Aggregate a single value spec
   * 
   * Dispatches to aggregate or calculated field handler.
   * Guarantees: Deterministic, error-isolated
   */
  private aggregateValueSpec(
    spec: PivotValueSpec,
    rows: ExtendedCellValue[][],
    sourceStartColumn: number,
  ): { value: number | null; error?: string } {
    if (spec.type === 'aggregate') {
      // Phase 25/26 behavior preserved exactly
      return { value: this.aggregateColumn(spec, rows, sourceStartColumn) };
    } else {
      // Phase 27: Calculated field
      return this.aggregateCalculated(spec, rows);
    }
  }

  /**
   * Aggregate a single column (Phase 25/26 behavior preserved)
   */
  private aggregateColumn(
    spec: AggregateValueSpec,
    rows: ExtendedCellValue[][],
    sourceStartColumn: number,
  ): number | null {
    const values = rows
      .map(row => row[spec.column - sourceStartColumn])
      .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v)) as number[];
    
    // Null semantics: no valid values → null (not 0)
    if (values.length === 0) {
      return null;
    }
    
    return this.aggregate(values, spec.aggregation);
  }

  /**
   * Phase 27: Aggregate a calculated field
   * 
   * Guarantees:
   * - Runs AFTER grouping (on grouped rows)
   * - Error isolation (exceptions → null + error marker)
   * - NaN/Infinity → null
   * - Null semantics match aggregates
   */
  private aggregateCalculated(
    spec: CalculatedValueSpec,
    rows: ExtendedCellValue[][]
  ): { value: number | null; error?: string } {
    const computed: number[] = [];
    
    // Compute per-row values (allocation-safe wrapper reuse)
    for (const rawRow of rows) {
      try {
        this.rowWrapper._bind(rawRow);
        const value = spec.compute(this.rowWrapper);
        
        // Validate result
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
          computed.push(value);
        } else if (value !== null) {
          // Non-null but invalid → treat as null (no error)
          continue;
        }
      } catch (err) {
        // Error isolation: log but continue (return null for this row)
        // In production, could log to observability system
        continue;
      }
    }
    
    // Null semantics: no valid computed values → null
    if (computed.length === 0) {
      return { value: null };
    }
    
    // Aggregate computed values (default: sum)
    // Future enhancement: allow aggregation type for calculated fields
    const sum = computed.reduce((acc, v) => acc + v, 0);
    return { value: sum };
  }

  /**
   * Find intersection of two data sets
   */
  private findIntersection(data1: ExtendedCellValue[][], data2: ExtendedCellValue[][]): ExtendedCellValue[][] {
    return data1.filter(row1 => 
      data2.some(row2 => this.rowsEqual(row1, row2))
    );
  }

  /**
   * Check if two rows are equal
   */
  private rowsEqual(row1: ExtendedCellValue[], row2: ExtendedCellValue[]): boolean {
    if (row1.length !== row2.length) return false;
    return row1.every((val, idx) => val === row2[idx]);
  }

  /**
   * Perform aggregation
   * 
   * Phase 27: Updated null semantics
   * - Empty array → 0 (for sum/average/etc, null handled at higher level)
   * - All operations handle numeric arrays only
   */
  private aggregate(values: number[], type: AggregationType): number {
    if (values.length === 0) return 0;
    
    switch (type) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
        
      case 'average':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
        
      case 'count':
        return values.length;
        
      case 'min':
        return Math.min(...values);
        
      case 'max':
        return Math.max(...values);
        
      case 'median': {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      }
        
      case 'stdev': {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        return Math.sqrt(variance);
      }
        
      default:
        return 0;
    }
  }

  /**
   * Phase 27: Calculate grand total
   * Updated to work with PivotValueSpec
   */
  private calculateGrandTotal(data: PivotCell[][], primarySpec: PivotValueSpec): number | null {
    const allValues = data.flat()
      .map(cell => cell.value)
      .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v)) as number[];
    
    if (allValues.length === 0) {
      return null;
    }
    
    if (primarySpec.type === 'aggregate') {
      return this.aggregate(allValues, primarySpec.aggregation);
    } else {
      // Calculated fields: sum by default
      return allValues.reduce((sum, v) => sum + v, 0);
    }
  }

  /**
   * Phase 33: Evaluate post-aggregation calculated fields for all cells.
   * 
   * Pipeline:
   * 1. Compile calculated fields (parse formulas, extract dependencies)
   * 2. Topologically sort (detect circular dependencies)
   * 3. For each cell:
   *    - Build evaluation context from aggregated values
   *    - Evaluate calculated fields in order
   *    - Attach results to cell.values
   * 
   * Guarantees:
   * - Deterministic evaluation order
   * - Error isolation (one field fails → others continue)
   * - No external state dependencies
   */
  private evaluateCalculatedFields(
    data: PivotCell[][],
    valueSpecs: PivotValueSpec[],
    calculatedFields: CalculatedField[]
  ): void {
    const engine = this.getCalcFieldEngine();

    // Formula bindings are bare identifiers. Reject ambiguous declarations
    // before aggregating them into the per-cell namespace.
    const declaredNames = new Set<string>();
    const formulaEngine = this.formulaEngine;
    const names = [
      ...valueSpecs.map(spec => spec.type === 'aggregate' ? spec.label : spec.name),
      ...calculatedFields.map(field => field.name),
    ];
    for (const name of names) {
      const normalized = name.toUpperCase();
      const isA1Reference = /^[A-Z]+[1-9][0-9]*$/i.test(name);
      const isBooleanLiteral = /^(TRUE|FALSE)$/i.test(name);
      const isFunctionName = formulaEngine?.functions?.has?.(name) === true;
      if (
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ||
        isA1Reference ||
        isBooleanLiteral ||
        isFunctionName
      ) {
        throw new PivotCalculatedFieldError(
          'INVALID_FORMULA',
          `Invalid or reserved pivot value name: ${name}`,
        );
      }
      if (declaredNames.has(normalized)) {
        throw new PivotCalculatedFieldError(
          'INVALID_FORMULA',
          `Duplicate pivot value name: ${name}`,
        );
      }
      declaredNames.add(normalized);
    }
    
    // Phase 33b: Clear cache at start of build (fresh caching per pivot)
    engine.clearCache();
    
    // Compile and sort calculated fields
    const compiled = engine.compile(calculatedFields);
    const sorted = engine.topologicalSort(compiled);
    
    // Get base field labels from value specs
    const baseFieldLabels = valueSpecs.map(spec => 
      spec.type === 'aggregate' ? spec.label : spec.name
    );
    
    // Evaluate calculated fields for each cell
    for (const row of data) {
      for (const cell of row) {
        // Build named bindings from all aggregate results. Missing declared
        // operands use #REF!, while present empty aggregate results remain null.
        const baseContext: PivotEvalContext = {};
        for (let i = 0; i < valueSpecs.length; i++) {
          const spec = valueSpecs[i];
          const fieldLabel = baseFieldLabels[i];
          const value = cell.values?.[fieldLabel];
          baseContext[fieldLabel] = value === undefined
            ? new Error('#REF!')
            : value instanceof Error
              ? value
              : typeof value === 'number' || value === null
                ? value
                : new Error('#VALUE!');
        }
        
        // Evaluate all calculated fields
        const fullContext = engine.evaluateAll(sorted, baseContext);
        
        // Attach all values (base + calculated) to cell
        cell.values = { ...cell.values, ...fullContext };
      }
    }
  }

  /**
   * Write pivot table to worksheet
   */
  writeTo(worksheet: Worksheet, pivot: PivotTable, startAddr: Address): void {
    let currentRow = startAddr.row;
    
    // Write column headers
    const colHeaderDepth = pivot.columnHeaders[0]?.length ?? 0;
    for (let depth = 0; depth < colHeaderDepth; depth++) {
      let currentCol = startAddr.col + (pivot.rowHeaders[0]?.length ?? 0);
      
      for (const colHeader of pivot.columnHeaders) {
        worksheet.setCellValue({ row: currentRow, col: currentCol }, colHeader[depth]);
        currentCol++;
      }
      currentRow++;
    }
    
    // Write data with row headers
    for (let r = 0; r < pivot.data.length; r++) {
      let currentCol = startAddr.col;
      
      // Write row headers
      const rowHeader = pivot.rowHeaders[r];
      for (const header of rowHeader) {
        worksheet.setCellValue({ row: currentRow, col: currentCol }, header);
        currentCol++;
      }
      
      // Write data values
      for (const cell of pivot.data[r]) {
        worksheet.setCellValue({ row: currentRow, col: currentCol }, cell.value);
        currentCol++;
      }
      
      currentRow++;
    }
    
    // Write grand total
    if (pivot.grandTotal !== undefined) {
      worksheet.setCellValue(
        { row: currentRow, col: startAddr.col },
        'Grand Total'
      );
      worksheet.setCellValue(
        { row: currentRow, col: startAddr.col + 1 },
        pivot.grandTotal
      );
    }
  }
}
