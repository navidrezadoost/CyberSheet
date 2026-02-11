/**
 * chart-data-adapter.test.ts
 * 
 * Tests for ChartDataAdapter
 * Week 12 Day 2: Data Integration
 */

import { Worksheet } from '@cyber-sheet/core';
import type { CellRange } from '@cyber-sheet/core';
import { ChartDataAdapter } from '../src/ChartDataAdapter';

describe('ChartDataAdapter', () => {
  let worksheet: Worksheet;

  beforeEach(() => {
    worksheet = new Worksheet('TestSheet');
  });

  // ============================================================================
  // Basic Data Extraction (3 tests)
  // ============================================================================

  describe('Basic Data Extraction', () => {
    test('should extract data from simple range', () => {
      // Setup data
      worksheet.setCellValue({ row: 1, col: 1 }, 'A');
      worksheet.setCellValue({ row: 1, col: 2 }, 10);
      worksheet.setCellValue({ row: 2, col: 1 }, 'B');
      worksheet.setCellValue({ row: 2, col: 2 }, 20);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 2 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: true,
        seriesDirection: 'columns'
      });

      expect(chartData.labels).toEqual(['A', 'B']);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].data).toEqual([10, 20]);
    });

    test('should handle empty cells as zeros', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10);
      worksheet.setCellValue({ row: 1, col: 2 }, 20);
      // Row 2 is empty

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 2 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: false,
        seriesDirection: 'rows'
      });

      expect(chartData.datasets[1].data).toEqual([0, 0]);
    });

    test('should convert non-numeric values to zeros', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'text');
      worksheet.setCellValue({ row: 1, col: 2 }, true);
      worksheet.setCellValue({ row: 1, col: 3 }, false);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 1, endCol: 3 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: false,
        seriesDirection: 'rows'
      });

      expect(chartData.datasets[0].data).toEqual([0, 1, 0]);
    });
  });

  // ============================================================================
  // Columns as Series (3 tests)
  // ============================================================================

  describe('Columns as Series', () => {
    test('should parse columns as series with headers', () => {
      // Headers
      worksheet.setCellValue({ row: 1, col: 1 }, 'Month');
      worksheet.setCellValue({ row: 1, col: 2 }, '2023');
      worksheet.setCellValue({ row: 1, col: 3 }, '2024');
      
      // Data
      worksheet.setCellValue({ row: 2, col: 1 }, 'Jan');
      worksheet.setCellValue({ row: 2, col: 2 }, 100);
      worksheet.setCellValue({ row: 2, col: 3 }, 120);
      
      worksheet.setCellValue({ row: 3, col: 1 }, 'Feb');
      worksheet.setCellValue({ row: 3, col: 2 }, 110);
      worksheet.setCellValue({ row: 3, col: 3 }, 130);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 3, endCol: 3 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: true,
        hasHeaderCol: true,
        seriesDirection: 'columns'
      });

      expect(chartData.labels).toEqual(['Jan', 'Feb']);
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[0].label).toBe('2023');
      expect(chartData.datasets[0].data).toEqual([100, 110]);
      expect(chartData.datasets[1].label).toBe('2024');
      expect(chartData.datasets[1].data).toEqual([120, 130]);
    });

    test('should generate labels when no header column', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 2, col: 1 }, 110);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 1 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: false,
        seriesDirection: 'columns',
        defaultLabelFormat: 'numbers'
      });

      expect(chartData.labels).toEqual(['1', '2']);
    });

    test('should generate series labels when no header row', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 1, col: 2 }, 200);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 1, endCol: 2 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: false,
        seriesDirection: 'columns'
      });

      expect(chartData.datasets[0].label).toBe('Series 1');
      expect(chartData.datasets[1].label).toBe('Series 2');
    });
  });

  // ============================================================================
  // Rows as Series (3 tests)
  // ============================================================================

  describe('Rows as Series', () => {
    test('should parse rows as series with headers', () => {
      // Headers
      worksheet.setCellValue({ row: 1, col: 1 }, 'Product');
      worksheet.setCellValue({ row: 1, col: 2 }, 'Q1');
      worksheet.setCellValue({ row: 1, col: 3 }, 'Q2');
      
      // Data
      worksheet.setCellValue({ row: 2, col: 1 }, 'Laptop');
      worksheet.setCellValue({ row: 2, col: 2 }, 100);
      worksheet.setCellValue({ row: 2, col: 3 }, 120);
      
      worksheet.setCellValue({ row: 3, col: 1 }, 'Mouse');
      worksheet.setCellValue({ row: 3, col: 2 }, 50);
      worksheet.setCellValue({ row: 3, col: 3 }, 55);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 3, endCol: 3 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: true,
        hasHeaderCol: true,
        seriesDirection: 'rows'
      });

      expect(chartData.labels).toEqual(['Q1', 'Q2']);
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[0].label).toBe('Laptop');
      expect(chartData.datasets[0].data).toEqual([100, 120]);
      expect(chartData.datasets[1].label).toBe('Mouse');
      expect(chartData.datasets[1].data).toEqual([50, 55]);
    });

    test('should generate labels with letters format', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 1, col: 2 }, 200);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 1, endCol: 2 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: false,
        seriesDirection: 'rows',
        defaultLabelFormat: 'letters'
      });

      expect(chartData.labels).toEqual(['A', 'B']);
    });

    test('should handle single row data', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10);
      worksheet.setCellValue({ row: 1, col: 2 }, 20);
      worksheet.setCellValue({ row: 1, col: 3 }, 30);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 1, endCol: 3 };
      const chartData = ChartDataAdapter.rangeToChartData(worksheet, range, {
        hasHeaderRow: false,
        hasHeaderCol: false,
        seriesDirection: 'rows'
      });

      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].data).toEqual([10, 20, 30]);
    });
  });

  // ============================================================================
  // Auto-Detection (3 tests)
  // ============================================================================

  describe('Auto-Detection', () => {
    test('should detect series direction based on shape', () => {
      // More columns than rows → columns are series
      let range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 5 };
      expect(ChartDataAdapter.detectSeriesDirection(range)).toBe('columns');

      // More rows than columns → rows are series
      range = { startRow: 1, startCol: 1, endRow: 5, endCol: 2 };
      expect(ChartDataAdapter.detectSeriesDirection(range)).toBe('rows');
    });

    test('should detect header row when first row is text', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'Name');
      worksheet.setCellValue({ row: 1, col: 2 }, 'Value');
      worksheet.setCellValue({ row: 2, col: 1 }, 10);
      worksheet.setCellValue({ row: 2, col: 2 }, 20);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 2 };
      expect(ChartDataAdapter.detectHeaderRow(worksheet, range)).toBe(true);
    });

    test('should not detect header row when first row is numbers', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10);
      worksheet.setCellValue({ row: 1, col: 2 }, 20);
      worksheet.setCellValue({ row: 2, col: 1 }, 30);
      worksheet.setCellValue({ row: 2, col: 2 }, 40);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 2 };
      expect(ChartDataAdapter.detectHeaderRow(worksheet, range)).toBe(false);
    });
  });

  // ============================================================================
  // Validation (3 tests)
  // ============================================================================

  describe('Validation', () => {
    test('should validate valid range', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10);
      worksheet.setCellValue({ row: 2, col: 1 }, 20);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 1 };
      const errors = ChartDataAdapter.validateRange(worksheet, range);

      expect(errors).toEqual([]);
    });

    test('should reject range with no numeric data', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'text');
      worksheet.setCellValue({ row: 2, col: 1 }, 'more text');

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 2, endCol: 1 };
      const errors = ChartDataAdapter.validateRange(worksheet, range);

      expect(errors).toContain('Range must contain at least some numeric data');
    });

    test('should reject range that is too small', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10);

      const range: CellRange = { startRow: 1, startCol: 1, endRow: 1, endCol: 1 };
      const errors = ChartDataAdapter.validateRange(worksheet, range);

      expect(errors).toContain('Range must have at least 2 rows or 2 columns for charting');
    });
  });
});
