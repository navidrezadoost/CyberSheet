/**
 * PivotEngine.ts
 * 
 * Zero-dependency pivot table engine with aggregation and grouping
 */

import type { Address, CellValue, ExtendedCellValue } from './types';
import type { Worksheet } from './worksheet';

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'stdev';

export interface PivotField {
  column: number;
  label: string;
}

export interface PivotConfig {
  rows: PivotField[];
  columns: PivotField[];
  values: {
    column: number;
    aggregation: AggregationType;
    label: string;
  }[];
  sourceRange: { start: Address; end: Address };
}

export interface PivotCell {
  value: CellValue;
  rowKeys: string[];
  colKeys: string[];
  aggregation: AggregationType;
}

export interface PivotTable {
  rowHeaders: string[][];
  columnHeaders: string[][];
  data: PivotCell[][];
  grandTotal?: CellValue;
}

export class PivotEngine {
  private worksheet: Worksheet;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
  }

  /**
   * Generate pivot table from configuration
   */
  generate(config: PivotConfig): PivotTable {
    // Extract source data
    const sourceData = this.extractSourceData(config.sourceRange);
    
    // Build dimension maps
    const rowDimensions = this.buildDimensions(sourceData, config.rows);
    const colDimensions = this.buildDimensions(sourceData, config.columns);
    
    // Aggregate data
    const aggregatedData = this.aggregateData(
      sourceData,
      rowDimensions,
      colDimensions,
      config.values
    );
    
    // Build pivot table structure
    return {
      rowHeaders: this.buildHeaders(rowDimensions),
      columnHeaders: this.buildHeaders(colDimensions),
      data: aggregatedData,
      grandTotal: this.calculateGrandTotal(aggregatedData, config.values[0]?.aggregation)
    };
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
   * Aggregate data into pivot cells
   */
  private aggregateData(
    sourceData: ExtendedCellValue[][],
    rowDimensions: Map<string, ExtendedCellValue[][]>,
    colDimensions: Map<string, ExtendedCellValue[][]>,
    valueFields: PivotConfig['values']
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
        
        // Find intersection
        const intersection = this.findIntersection(rowData, colData);
        
        // Aggregate value fields
        const valueField = valueFields[0]; // Use first value field for now
        const values = intersection.map(row => row[valueField.column]).filter(v => typeof v === 'number') as number[];
        
        row.push({
          value: this.aggregate(values, valueField.aggregation),
          rowKeys: rowKey.split('|'),
          colKeys: colKey.split('|'),
          aggregation: valueField.aggregation
        });
      }
      
      result.push(row);
    }
    
    return result;
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
   * Calculate grand total
   */
  private calculateGrandTotal(data: PivotCell[][], aggregation: AggregationType): number {
    const allValues = data.flat().map(cell => cell.value).filter(v => typeof v === 'number') as number[];
    return this.aggregate(allValues, aggregation);
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
