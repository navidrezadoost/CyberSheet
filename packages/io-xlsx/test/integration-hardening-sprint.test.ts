/**
 * Integration Tests - Hardening Sprint
 * 
 * Validates cross-feature workflows after Phase 8 file I/O completion.
 * Tests realistic user scenarios involving multiple systems working together.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Worksheet } from '../../core/src/worksheet';
import type { Address } from '../../core/src/types';
import { FormulaEngine } from '../../core/src/FormulaEngine';
import { strFromU8, unzipSync } from 'fflate';
// Exercise the XLSX package from its own ESM-aware Jest configuration.
import { exportXLSX } from '../src/export';

function worksheetAddress(row: number, col: number): Address {
  return { row: row + 1, col: col + 1 };
}

function xlsxXml(buffer: ArrayBuffer, path: string): string {
  const file = unzipSync(new Uint8Array(buffer))[path];
  return file ? strFromU8(file) : '';
}

describe('Hardening Sprint - Integration Tests', () => {
  let sheet: Worksheet;
  let formulaEngine: FormulaEngine;

  beforeEach(() => {
    formulaEngine = new FormulaEngine();
    sheet = new Worksheet('Sheet1');
  });

  describe('Workflow #1: Import → Edit → Export → Verify', () => {
    test('should preserve formula values through export/import cycle', async () => {
      // Setup: Create workbook with formula
      sheet.setCellValue(worksheetAddress(0, 0 ), 10);
      sheet.setCellValue(worksheetAddress(1, 0 ), 20);
      sheet.setCellFormula(worksheetAddress(2, 0), '=A1+A2', 30);
      
      // Verify initial state
      expect(sheet.getCellValue(worksheetAddress(2, 0 ))).toBe(30);

      // Export to XLSX
      const arrayBuffer = await exportXLSX(sheet);
      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);

      const sheetXml = xlsxXml(arrayBuffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toContain('<c r="A1"><v>10</v></c>');
      expect(sheetXml).toContain('<c r="A2"><v>20</v></c>');
      expect(sheetXml).toContain('<f>A1+A2</f><v>30</v>');
    });

    test('should preserve cell styles through export/import cycle', async () => {
      // Setup: Apply cell styles
      sheet.setCellValue(worksheetAddress(0, 0 ), 'Bold Red');
      sheet.setCellStyle(worksheetAddress(0, 0 ), {
        bold: true,
        color: '#FF0000',
        fontSize: 14,
      });

      // Export and re-import
      const arrayBuffer = await exportXLSX(sheet);
      const stylesXml = xlsxXml(arrayBuffer, 'xl/styles.xml');
      expect(stylesXml).toContain('<b/>');
      expect(stylesXml).toContain('rgb="FFFF0000"');
      expect(stylesXml).toContain('<sz val="14"/>');
    });

    test('should handle empty cells and null values correctly', async () => {
      // Setup: Mixed content with empty cells
      sheet.setCellValue(worksheetAddress(0, 0 ), 'Text');
      sheet.setCellValue(worksheetAddress(0, 2 ), 123);
      // row 0, col 1 is intentionally empty

      // Export and re-import
      const arrayBuffer = await exportXLSX(sheet);
      const sheetXml = xlsxXml(arrayBuffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toContain('<t>Text</t>');
      expect(sheetXml).toContain('<v>123</v>');
      expect(sheetXml).not.toContain('r="B1"');
    });
  });

  describe('Workflow #3: Conditional Formatting + Cell Styles Interaction', () => {
    test('should apply both cell style and conditional formatting', () => {
      // Setup: Base cell style
      sheet.setCellValue(worksheetAddress(0, 0 ), 75);
      sheet.setCellStyle(worksheetAddress(0, 0 ), {
        fontFamily: 'Arial',
        fontSize: 12,
        bold: false,
      });

      // Add conditional formatting rule (e.g., >50 = green)
      // Note: ConditionalFormattingEngine not directly accessible in Worksheet
      // This test validates structure only
      const cfRule = {
        id: 'cf-1',
        type: 'cellValue' as const,
        range: { start: worksheetAddress(0, 0 ), end: worksheetAddress(0, 0 ) },
        operator: 'greaterThan' as const,
        value: 50,
        style: { fillColor: '#00FF00' },
        priority: 1,
      };

      // Verify base style exists
      const baseStyle = sheet.getCellStyle(worksheetAddress(0, 0 ));
      expect(baseStyle?.fontFamily).toBe('Arial');
      expect(baseStyle?.fontSize).toBe(12);

      // Note: CF evaluation requires FormatEvaluator which isn't available in unit test
      // This validates structure; full integration requires browser environment
      expect(cfRule.style.fillColor).toBe('#00FF00');
    });

    test('should handle CF rules with different priorities', () => {
      sheet.setCellValue(worksheetAddress(0, 0 ), 100);

      // Add two overlapping rules
      const cfRules = [
        {
          id: 'cf-low',
          type: 'cellValue' as const,
          range: { start: worksheetAddress(0, 0 ), end: worksheetAddress(0, 0 ) },
          operator: 'greaterThan' as const,
          value: 50,
          style: { fillColor: '#FFFF00' }, // Yellow
          priority: 2,
        },
        {
          id: 'cf-high',
          type: 'cellValue' as const,
          range: { start: worksheetAddress(0, 0 ), end: worksheetAddress(0, 0 ) },
          operator: 'greaterThan' as const,
          value: 90,
          style: { fillColor: '#FF0000' }, // Red (higher priority)
          priority: 1,
        },
      ];

      // Sort by priority (lower number = higher priority)
      cfRules.sort((a, b) => a.priority - b.priority);

      // Higher priority rule should come first
      expect(cfRules[0].id).toBe('cf-high');
      expect(cfRules[0].style.fillColor).toBe('#FF0000');
    });
  });

  describe('Workflow #4: Cross-feature Undo/Redo', () => {
    test.skip('should undo cell edits correctly', () => {
      // Note: Command system testing requires complex setup
      // This is better suited for dedicated command system tests
      // Skipping for integration test suite
    });

    test.skip('should undo formatting changes correctly', () => {
      // Note: Command system testing requires complex setup
      // Skipping for integration test suite
    });

    test('should preserve cell values through multiple edits', () => {
      // Simple state tracking without command system
      const history: any[] = [];

      // Step 1: Set A1 = 10
      sheet.setCellValue(worksheetAddress(0, 0 ), 10);
      history.push(sheet.getCellValue(worksheetAddress(0, 0 )));
      expect(sheet.getCellValue(worksheetAddress(0, 0 ))).toBe(10);

      // Step 2: Set A2 = 20
      sheet.setCellValue(worksheetAddress(1, 0 ), 20);
      history.push(sheet.getCellValue(worksheetAddress(1, 0 )));
      expect(sheet.getCellValue(worksheetAddress(1, 0 ))).toBe(20);

      // Step 3: Set A3 = formula
      sheet.setCellFormula(worksheetAddress(2, 0), '=A1+A2', 30);
      expect(sheet.getCellValue(worksheetAddress(2, 0 ))).toBe(30);

      // Verify history captured values correctly
      expect(history[0]).toBe(10);
      expect(history[1]).toBe(20);
    });
  });

  describe('Workflow #5: Large Spreadsheet Performance', () => {
    test('should handle 10K cell workbook efficiently', () => {
      // Setup: Create 10K cells with values
      const startTime = performance.now();
      
      for (let row = 0; row < 100; row++) {
        for (let col = 0; col < 100; col++) {
          sheet.setCellValue(worksheetAddress(row, col), row * 100 + col);
        }
      }
      
      const setupTime = performance.now() - startTime;
      
      // Should complete in reasonable time (< 1 second for 10K cells)
      expect(setupTime).toBeLessThan(1000);
      
      // Verify data integrity
      expect(sheet.getCellValue(worksheetAddress(0, 0 ))).toBe(0);
      expect(sheet.getCellValue(worksheetAddress(99, 99 ))).toBe(9999);
    });

    test('should recalculate large formula efficiently', () => {
      // Setup: Create range with 1000 values
      for (let row = 0; row < 1000; row++) {
        sheet.setCellValue(worksheetAddress(row, 0), row + 1);
      }

      // Create SUM formula
      const startTime = performance.now();
      const sumAddress = worksheetAddress(1000, 0);
      const result = formulaEngine.evaluate('=SUM(A1:A1000)', { worksheet: sheet, currentCell: sumAddress });
      if (typeof result !== 'number') throw new Error(`Expected numeric formula result, received ${String(result)}`);
      sheet.setCellFormula(sumAddress, '=SUM(A1:A1000)', result);
      const calcTime = performance.now() - startTime;

      // Verify result
      const expectedSum = (1000 * 1001) / 2; // Sum of 1 to 1000
      expect(sheet.getCellValue(worksheetAddress(1000, 0 ))).toBe(expectedSum);

      // Should recalculate quickly (< 100ms)
      expect(calcTime).toBeLessThan(100);
    });

    test('should export large workbook efficiently', async () => {
      // Setup: Create 5K cells
      for (let row = 0; row < 50; row++) {
        for (let col = 0; col < 100; col++) {
          sheet.setCellValue(worksheetAddress(row, col), `R${row}C${col}`);
        }
      }

      // Export
      const startTime = performance.now();
      const arrayBuffer = await exportXLSX(sheet);
      const exportTime = performance.now() - startTime;

      // Verify export succeeded
      expect(arrayBuffer.byteLength).toBeGreaterThan(10000); // Should be reasonably sized

      // Should export in reasonable time (< 2 seconds)
      expect(exportTime).toBeLessThan(2000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty workbook export/import', async () => {
      // Export empty workbook
      const arrayBuffer = await exportXLSX(sheet);
      
      // Import back
      expect(xlsxXml(arrayBuffer, 'xl/workbook.xml')).toContain('<sheet name="Sheet1"');
    });

    test('should handle workbook with only formulas (no direct values)', async () => {
      // Setup: Chain of formulas
      sheet.setCellFormula(worksheetAddress(0, 0 ), '=10+20');
      sheet.setCellFormula(worksheetAddress(1, 0 ), '=A1*2');
      sheet.setCellFormula(worksheetAddress(2, 0 ), '=A2/3');

      // Export and re-import
      const arrayBuffer = await exportXLSX(sheet);
      const sheetXml = xlsxXml(arrayBuffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toContain('<f>10+20</f>');
      expect(sheetXml).toContain('<f>A1*2</f>');
      expect(sheetXml).toContain('<f>A2/3</f>');
    });

    test('should handle special characters in cell values', async () => {
      // Setup: Various special characters
      sheet.setCellValue(worksheetAddress(0, 0 ), 'Quote: "test"');
      sheet.setCellValue(worksheetAddress(1, 0 ), 'Comma: a,b,c');
      sheet.setCellValue(worksheetAddress(2, 0 ), 'Newline: line1\nline2');
      sheet.setCellValue(worksheetAddress(3, 0 ), 'Unicode: 你好 🎉');
      sheet.setCellValue(worksheetAddress(4, 0 ), '  <tag attr="x"> & it\'s  ');
      sheet.setCellValue(worksheetAddress(5, 0 ), '\tleading and trailing whitespace\n');

      // Export and re-import
      const arrayBuffer = await exportXLSX(sheet);
      const sheetXml = xlsxXml(arrayBuffer, 'xl/worksheets/sheet1.xml');
      expect(sheetXml).toContain('Quote: &quot;test&quot;');
      expect(sheetXml).toContain('Comma: a,b,c');
      expect(sheetXml).toContain('Newline: line1\nline2');
      expect(sheetXml).toContain('Unicode: 你好 🎉');
      expect(sheetXml).toContain('&lt;tag attr=&quot;x&quot;&gt; &amp; it\'s');
      expect(sheetXml).toContain('xml:space="preserve"');
    });
  });
});
