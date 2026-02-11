/**
 * ChartDataAdapter.ts
 * 
 * Converts sheet data ranges into ChartData format
 * Part of Week 12 Day 2: Data Integration
 */

import type { Worksheet, CellValue, CellRange, SeriesDirection } from '@cyber-sheet/core';
import type { ChartData } from './ChartEngine';

/**
 * Options for data adaptation
 */
export interface DataAdapterOptions {
  /** Whether first row contains labels */
  hasHeaderRow: boolean;
  
  /** Whether first column contains labels */
  hasHeaderCol: boolean;
  
  /** Direction to interpret series (rows or columns) */
  seriesDirection: SeriesDirection;
  
  /** Default label format if no headers */
  defaultLabelFormat?: 'letters' | 'numbers';
}

/**
 * ChartDataAdapter - Convert sheet ranges to chart data
 */
export class ChartDataAdapter {
  /**
   * Convert a sheet range to ChartData
   */
  static rangeToChartData(
    worksheet: Worksheet,
    range: CellRange,
    options: DataAdapterOptions
  ): ChartData {
    const { hasHeaderRow, hasHeaderCol, seriesDirection, defaultLabelFormat = 'numbers' } = options;
    
    // Extract raw data from sheet
    const rawData = this.extractRangeData(worksheet, range);
    
    if (rawData.length === 0 || rawData[0].length === 0) {
      return { labels: [], datasets: [] };
    }
    
    // Parse based on series direction
    if (seriesDirection === 'columns') {
      return this.parseColumnsAsSeries(rawData, hasHeaderRow, hasHeaderCol, defaultLabelFormat);
    } else {
      return this.parseRowsAsSeries(rawData, hasHeaderRow, hasHeaderCol, defaultLabelFormat);
    }
  }
  
  /**
   * Extract data from worksheet range
   */
  private static extractRangeData(worksheet: Worksheet, range: CellRange): CellValue[][] {
    const { startRow, startCol, endRow, endCol } = range;
    const data: CellValue[][] = [];
    
    for (let row = startRow; row <= endRow; row++) {
      const rowData: CellValue[] = [];
      for (let col = startCol; col <= endCol; col++) {
        const value = worksheet.getCell({ row, col })?.value ?? null;
        rowData.push(value);
      }
      data.push(rowData);
    }
    
    return data;
  }
  
  /**
   * Parse data with columns as series
   * Each column is a dataset, rows are data points
   */
  private static parseColumnsAsSeries(
    rawData: CellValue[][],
    hasHeaderRow: boolean,
    hasHeaderCol: boolean,
    defaultLabelFormat: 'letters' | 'numbers'
  ): ChartData {
    const labels: string[] = [];
    const datasets: ChartData['datasets'] = [];
    
    // Determine starting indices
    const dataStartRow = hasHeaderRow ? 1 : 0;
    const dataStartCol = hasHeaderCol ? 1 : 0;
    
    // Extract labels (from first column or generate)
    if (hasHeaderCol) {
      for (let row = dataStartRow; row < rawData.length; row++) {
        labels.push(this.cellValueToString(rawData[row][0]));
      }
    } else {
      // Generate labels
      const numLabels = rawData.length - dataStartRow;
      for (let i = 0; i < numLabels; i++) {
        labels.push(this.generateLabel(i, defaultLabelFormat));
      }
    }
    
    // Extract series (each column is a series)
    for (let col = dataStartCol; col < rawData[0].length; col++) {
      const seriesLabel = hasHeaderRow 
        ? this.cellValueToString(rawData[0][col])
        : `Series ${col - dataStartCol + 1}`;
      
      const seriesData: number[] = [];
      
      for (let row = dataStartRow; row < rawData.length; row++) {
        const value = this.cellValueToNumber(rawData[row][col]);
        seriesData.push(value);
      }
      
      datasets.push({
        label: seriesLabel,
        data: seriesData
      });
    }
    
    return { labels, datasets };
  }
  
  /**
   * Parse data with rows as series
   * Each row is a dataset, columns are data points
   */
  private static parseRowsAsSeries(
    rawData: CellValue[][],
    hasHeaderRow: boolean,
    hasHeaderCol: boolean,
    defaultLabelFormat: 'letters' | 'numbers'
  ): ChartData {
    const labels: string[] = [];
    const datasets: ChartData['datasets'] = [];
    
    // Determine starting indices
    const dataStartRow = hasHeaderRow ? 1 : 0;
    const dataStartCol = hasHeaderCol ? 1 : 0;
    
    // Extract labels (from first row or generate)
    if (hasHeaderRow) {
      for (let col = dataStartCol; col < rawData[0].length; col++) {
        labels.push(this.cellValueToString(rawData[0][col]));
      }
    } else {
      // Generate labels
      const numLabels = rawData[0].length - dataStartCol;
      for (let i = 0; i < numLabels; i++) {
        labels.push(this.generateLabel(i, defaultLabelFormat));
      }
    }
    
    // Extract series (each row is a series)
    for (let row = dataStartRow; row < rawData.length; row++) {
      const seriesLabel = hasHeaderCol
        ? this.cellValueToString(rawData[row][0])
        : `Series ${row - dataStartRow + 1}`;
      
      const seriesData: number[] = [];
      
      for (let col = dataStartCol; col < rawData[0].length; col++) {
        const value = this.cellValueToNumber(rawData[row][col]);
        seriesData.push(value);
      }
      
      datasets.push({
        label: seriesLabel,
        data: seriesData
      });
    }
    
    return { labels, datasets };
  }
  
  /**
   * Convert cell value to string
   */
  private static cellValueToString(value: CellValue): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }
  
  /**
   * Convert cell value to number (0 if not numeric)
   */
  private static cellValueToNumber(value: CellValue): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return 0;
  }
  
  /**
   * Generate default label
   */
  private static generateLabel(index: number, format: 'letters' | 'numbers'): string {
    if (format === 'letters') {
      return this.numberToLetters(index);
    }
    return String(index + 1);
  }
  
  /**
   * Convert number to letter label (0 = A, 1 = B, ..., 26 = AA, etc.)
   */
  private static numberToLetters(num: number): string {
    let result = '';
    let n = num;
    
    while (n >= 0) {
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26) - 1;
      if (n < 0) break;
    }
    
    return result;
  }
  
  /**
   * Auto-detect whether data should be rows or columns
   * Returns suggested series direction based on data shape
   */
  static detectSeriesDirection(range: CellRange): SeriesDirection {
    const { startRow, startCol, endRow, endCol } = range;
    const rows = endRow - startRow + 1;
    const cols = endCol - startCol + 1;
    
    // If more columns than rows, likely columns are series
    // If more rows than columns, likely rows are series
    return cols > rows ? 'columns' : 'rows';
  }
  
  /**
   * Auto-detect if first row contains headers
   */
  static detectHeaderRow(worksheet: Worksheet, range: CellRange): boolean {
    const { startRow, startCol, endCol } = range;
    
    let textCount = 0;
    let numberCount = 0;
    
    for (let col = startCol; col <= endCol; col++) {
      const value = worksheet.getCell({ row: startRow, col })?.value;
      if (typeof value === 'string') {
        textCount++;
      } else if (typeof value === 'number') {
        numberCount++;
      }
    }
    
    // If mostly text in first row, likely headers
    return textCount > numberCount;
  }
  
  /**
   * Auto-detect if first column contains headers
   */
  static detectHeaderCol(worksheet: Worksheet, range: CellRange): boolean {
    const { startRow, endRow, startCol } = range;
    
    let textCount = 0;
    let numberCount = 0;
    
    for (let row = startRow; row <= endRow; row++) {
      const value = worksheet.getCell({ row, col: startCol })?.value;
      if (typeof value === 'string') {
        textCount++;
      } else if (typeof value === 'number') {
        numberCount++;
      }
    }
    
    // If mostly text in first column, likely headers
    return textCount > numberCount;
  }
  
  /**
   * Validate range has data suitable for charting
   */
  static validateRange(worksheet: Worksheet, range: CellRange): string[] {
    const errors: string[] = [];
    const { startRow, startCol, endRow, endCol } = range;
    
    if (startRow < 0 || startCol < 0 || endRow < 0 || endCol < 0) {
      errors.push('Range coordinates must be non-negative');
      return errors;
    }
    
    if (startRow > endRow || startCol > endCol) {
      errors.push('Range start must be before end');
      return errors;
    }
    
    const rows = endRow - startRow + 1;
    const cols = endCol - startCol + 1;
    
    if (rows < 1 || cols < 1) {
      errors.push('Range must contain at least one cell');
    }
    
    if (rows < 2 && cols < 2) {
      errors.push('Range must have at least 2 rows or 2 columns for charting');
    }
    
    // Check if range has any numeric data
    let hasNumeric = false;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const value = worksheet.getCell({ row, col })?.value;
        if (typeof value === 'number') {
          hasNumeric = true;
          break;
        }
      }
      if (hasNumeric) break;
    }
    
    if (!hasNumeric) {
      errors.push('Range must contain at least some numeric data');
    }
    
    return errors;
  }
}
