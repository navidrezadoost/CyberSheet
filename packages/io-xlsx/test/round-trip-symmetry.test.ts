/**
 * XLSX Round-Trip Symmetry Validation
 * 
 * Tests: Import → Intern → Export → Re-import
 * 
 * Validates:
 * 1. Canonical styles survive round-trip
 * 2. Phase 1 UI properties preserved (strikethrough, super/subscript, indent)
 * 3. Identity stability (pointer equality after re-import)
 */

import { describe, it, expect } from '@jest/globals';
import { Workbook } from '@cyber-sheet/core';
import { exportXLSX } from '../src/export';
import { loadXlsxFromArrayBuffer } from '../src/index';

describe('XLSX Round-Trip Symmetry', () => {
  describe('Phase 1 UI Properties', () => {
    it('should preserve strikethrough through round-trip', async () => {
      // Create workbook with strikethrough
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'Strikethrough Text');
      sheet1.setCellStyle({ row: 1, col: 1 }, { strikethrough: true, fontSize: 12 } as any);
      
      // Export → Import
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      // Validate
      expect(sheet2).toBeDefined();
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect((style as any)?.strikethrough).toBe(true);
      expect(style?.fontSize).toBe(12);
    });
    
    it('should preserve superscript through round-trip', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'x²');
      sheet1.setCellStyle({ row: 1, col: 1 }, { superscript: true } as any);
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect((style as any)?.superscript).toBe(true);
      expect((style as any)?.subscript).toBeUndefined(); // Mutual exclusivity
    });
    
    it('should preserve subscript through round-trip', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'H₂O');
      sheet1.setCellStyle({ row: 1, col: 1 }, { subscript: true } as any);
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect((style as any)?.subscript).toBe(true);
      expect((style as any)?.superscript).toBeUndefined(); // Mutual exclusivity
    });
    
    it('should preserve indent through round-trip', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'Indented');
      sheet1.setCellStyle({ row: 1, col: 1 }, { indent: 3, align: 'left' } as any);
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect((style as any)?.indent).toBe(3); // Semantic value, not pixels
      expect(style?.align).toBe('left');
    });
    
    it('should preserve mutual exclusivity (superscript wins)', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'Both');
      // Set both (cache should enforce superscript wins)
      sheet1.setCellStyle({ row: 1, col: 1 }, { superscript: true, subscript: true } as any);
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect((style as any)?.superscript).toBe(true);
      expect((style as any)?.subscript).toBeUndefined();
    });
  });
  
  describe('Identity Stability', () => {
    it('should produce interned styles on re-import', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'A');
      sheet1.setCellValue({ row: 2, col: 1 }, 'B');
      sheet1.setCellStyle({ row: 1, col: 1 }, { bold: true, fontSize: 14 });
      sheet1.setCellStyle({ row: 2, col: 1 }, { bold: true, fontSize: 14 }); // Same style
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style1 = sheet2!.getCellStyle({ row: 1, col: 1 });
      const style2 = sheet2!.getCellStyle({ row: 2, col: 1 });
      
      // Identity: Same canonical reference
      expect(style1).toBe(style2); // Pointer equality
      expect(Object.isFrozen(style1)).toBe(true); // Immutable
    });
    
    it('should deduplicate styles during export', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      
      // 100 cells with same style
      for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
          sheet1.setCellValue({ row, col }, `${row},${col}`);
          sheet1.setCellStyle({ row, col }, { bold: true, strikethrough: true } as any);
        }
      }
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      // All cells should reference same canonical style
      const styles = new Set();
      for (let row = 1; row <= 10; row++) {
        for (let col = 1; col <= 10; col++) {
          const style = sheet2!.getCellStyle({ row, col });
          styles.add(style);
        }
      }
      
      expect(styles.size).toBe(1); // Only 1 canonical reference
    });
  });
  
  describe('Existing Properties', () => {
    it('should preserve bold, italic, underline', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'Formatted');
      sheet1.setCellStyle({ row: 1, col: 1 }, { bold: true, italic: true, underline: true });
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect(style?.bold).toBe(true);
      expect(style?.italic).toBe(true);
      expect(style?.underline).toBe(true);
    });
    
    it('should preserve alignment and wrap', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'Aligned');
      sheet1.setCellStyle({ row: 1, col: 1 }, { align: 'center', wrap: true });
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect(style?.align).toBe('center');
      expect(style?.wrap).toBe(true);
    });
    
    it('should preserve rotation', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'Rotated');
      sheet1.setCellStyle({ row: 1, col: 1 }, { rotation: 45 });
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect(style?.rotation).toBe(45);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty cells with styles', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellStyle({ row: 1, col: 1 }, { bold: true }); // No value
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect(style?.bold).toBe(true);
      expect(sheet2!.getCellValue({ row: 1, col: 1 })).toBeNull();
    });
    
    it('should handle indent = 0 (normalized to undefined)', async () => {
      const wb1 = new Workbook();
      const sheet1 = wb1.addSheet('Test');
      sheet1.setCellValue({ row: 1, col: 1 }, 'No indent');
      sheet1.setCellStyle({ row: 1, col: 1 }, { indent: 0 } as any);
      
      const buffer = await exportXLSX(wb1);
      const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));
      const sheet2 = wb2.getSheet('Test');
      
      const style = sheet2!.getCellStyle({ row: 1, col: 1 });
      expect((style as any)?.indent).toBeUndefined(); // Normalized
    });
  });
});
