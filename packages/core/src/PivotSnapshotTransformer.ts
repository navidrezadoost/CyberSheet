/**
 * PivotSnapshotTransformer.ts
 * 
 * Phase 29: Transform PivotTable → PivotSnapshot
 * Converts grid-based UI format to row-based query format
 */

import type { PivotTable, PivotConfig, PivotValueSpec } from './PivotEngine';
import type { PivotSnapshot, PivotRow } from './PivotSnapshotStore';
import type { PivotId } from './PivotRegistry';
import type { CellValue } from './types';

/**
 * Transform PivotTable (grid-based) to PivotSnapshot (row-based).
 * 
 * Strategy:
 * - Flatten hierarchical grid into flat rows
 * - Each row has field-based access (not positional)
 * - Optimized for GETPIVOTDATA O(n) filtering
 * 
 * Example transformation:
 * 
 * PivotTable (grid):
 *   rowHeaders: [["EU"], ["US"]]
 *   columnHeaders: [["2024"]]
 *   data: [[{value: 1000, ...}], [{value: 2000, ...}]]
 * 
 * → PivotSnapshot (rows):
 *   [
 *     { Region: "EU", Year: 2024, Revenue: 1000 },
 *     { Region: "US", Year: 2024, Revenue: 2000 }
 *   ]
 */
export function transformToPivotSnapshot(
  pivotId: PivotId,
  table: PivotTable,
  config: PivotConfig
): PivotSnapshot {
  const rows: PivotRow[] = [];
  const allFields = new Set<string>();
  const valueFieldLabels = extractValueFieldLabels(config);

  // Extract row field labels
  const rowFieldLabels = config.rows.map(r => r.label);
  
  // Extract column field labels  
  const colFieldLabels = config.columns.map(c => c.label);

  // Flatten grid into rows
  for (let rowIdx = 0; rowIdx < table.rowHeaders.length; rowIdx++) {
    for (let colIdx = 0; colIdx < (table.columnHeaders.length || 1); colIdx++) {
      const row: PivotRow = {};

      // Add row dimension values
      const rowHeader = table.rowHeaders[rowIdx];
      for (let i = 0; i < rowFieldLabels.length && i < rowHeader.length; i++) {
        const fieldLabel = rowFieldLabels[i];
        row[fieldLabel] = rowHeader[i];
        allFields.add(fieldLabel);
      }

      // Add column dimension values (if any)
      if (table.columnHeaders.length > 0) {
        const colHeader = table.columnHeaders[colIdx];
        for (let i = 0; i < colFieldLabels.length && i < colHeader.length; i++) {
          const fieldLabel = colFieldLabels[i];
          row[fieldLabel] = colHeader[i];
          allFields.add(fieldLabel);
        }
      }

      // Add value (aggregated data)
      const cell = table.data[rowIdx]?.[colIdx];
      if (cell) {
        // Use first value field label as the value field name
        // For multi-value pivots, this needs refinement in future phases
        const valueFieldLabel = valueFieldLabels[0] || 'Value';
        row[valueFieldLabel] = cell.value;
        allFields.add(valueFieldLabel);
      }

      rows.push(row);
    }
  }

  return {
    pivotId,
    computedAt: Date.now(),
    rows,
    fields: Array.from(allFields),
    valueFields: valueFieldLabels,
  };
}

/**
 * Extract value field labels from config.
 */
function extractValueFieldLabels(config: PivotConfig): string[] {
  const values = Array.isArray(config.values) ? config.values : [];
  
  return values.map(v => {
    // Handle both new and legacy formats
    if ('type' in v) {
      const spec = v as PivotValueSpec;
      return spec.type === 'aggregate' ? spec.label : spec.label;
    } else {
      // Legacy format
      return (v as any).label || 'Value';
    }
  });
}
