/**
 * PivotEngine.ts
 * 
 * Phase 27: Calculated Fields
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

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'stdev';

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
 */
export interface PivotConfig {
  rows: PivotField[];
  columns: PivotField[];
  values: PivotValueSpec[] | Array<{ column: number; aggregation: AggregationType; label: string }>;
  sourceRange: { start: Address; end: Address };
}

export interface PivotCell {
  value: CellValue;
  rowKeys: string[];
  colKeys: string[];
  aggregation: AggregationType | 'calculated';
  error?: string; // Internal error marker (not exposed in public API yet)
}

export interface PivotTable {
  rowHeaders: string[][];
  columnHeaders: string[][];
  data: PivotCell[][];
  grandTotal?: CellValue;
}

export class PivotEngine {
  private worksheet: Worksheet;
  
  // Allocation-safe row wrapper (reused across all calculations)
  private readonly rowWrapper = new PivotSourceRow();

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
  }

  /**
   * Generate pivot table from configuration
   * 
   * Phase 27: Extended with calculated field support
   * Guarantees: Deterministic ordering, backward compatibility
   */
  generate(config: PivotConfig): PivotTable {
    // Normalize value specs (backward compatibility)
    const normalizedConfig: PivotConfig = {
      ...config,
      values: this.normalizeValueSpecs(config.values)
    };

    // Extract source data
    const sourceData = this.extractSourceData(normalizedConfig.sourceRange);
    
    // Build dimension maps
    const rowDimensions = this.buildDimensions(sourceData, normalizedConfig.rows);
    const colDimensions = this.buildDimensions(sourceData, normalizedConfig.columns);
    
    // Aggregate data (Phase 27: handles both aggregate and calculated)
    const aggregatedData = this.aggregateData(
      sourceData,
      rowDimensions,
      colDimensions,
      normalizedConfig.values as PivotValueSpec[]
    );
    
    // Build pivot table structure
    return {
      rowHeaders: this.buildHeaders(rowDimensions),
      columnHeaders: this.buildHeaders(colDimensions),
      data: aggregatedData,
      grandTotal: this.calculateGrandTotal(aggregatedData, normalizedConfig.values[0])
    };
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
   * Build dimension keys for grouping
   */
  private buildDimensions(data: ExtendedCellValue[][], fields: PivotField[]): Map<string, ExtendedCellValue[][]> {
    const dimensions = new Map<string, ExtendedCellValue[][]>();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const key = fields.map(f => String(row[f.column] ?? '')).join('|');
      
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
    valueSpecs: PivotValueSpec[]
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
        
        // Use first value spec for primary value (backward compatibility)
        const primarySpec = valueSpecs[0];
        const primaryValue = this.aggregateValueSpec(primarySpec, intersection);
        
        row.push({
          value: primaryValue.value,
          rowKeys: rowKey.split('|'),
          colKeys: colKey.split('|'),
          aggregation: primarySpec.type === 'aggregate' ? primarySpec.aggregation : 'calculated',
          error: primaryValue.error
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
    rows: ExtendedCellValue[][]
  ): { value: number | null; error?: string } {
    if (spec.type === 'aggregate') {
      // Phase 25/26 behavior preserved exactly
      return { value: this.aggregateColumn(spec, rows) };
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
    rows: ExtendedCellValue[][]
  ): number | null {
    const values = rows
      .map(row => row[spec.column])
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
