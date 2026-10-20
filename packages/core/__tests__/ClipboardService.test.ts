/**
 * ClipboardService.test.ts
 * 
 * Validation suite for clipboard copy/cut operations.
 * 
 * Test Categories:
 * 1. Snapshot Integrity
 * 2. Offset Correctness
 * 3. Style Serialization
 * 4. Merge Handling
 * 5. Cut Semantics
 * 6. Immutability
 * 7. Empty Cells
 * 8. Edge Cases
 */

import { ClipboardService, type ClipboardPayload, type CellSnapshot } from '../src/ClipboardService';
import { Worksheet } from '../src/worksheet';
import type { Address, Range, CellStyle } from '../src/types';

describe('ClipboardService', () => {
  let service: ClipboardService;
  let worksheet: Worksheet;
  
  beforeEach(() => {
    service = new ClipboardService();
    worksheet = new Worksheet('Test', 100, 26);
  });
  
  // ==================== SNAPSHOT INTEGRITY ====================
  
  describe('Snapshot Integrity', () => {
    test('Copy creates immutable payload - modifying sheet does NOT affect payload', () => {
      // Set initial value
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Original');
      
      // Copy
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      // Modify original cell
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Modified');
      
      // Payload should be unchanged
      expect(payload.cells[0].value).toBe('Original');
    });
    
    test('Copy twice produces identical payloads', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 42);
      
      const payload1 = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (1) + 1 }
      });
      
      const payload2 = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (1) + 1 }
      });
      
      // Should have same structure
      expect(payload1.width).toBe(payload2.width);
      expect(payload1.height).toBe(payload2.height);
      expect(payload1.cells.length).toBe(payload2.cells.length);
      expect(payload1.cells[0].value).toBe(payload2.cells[0].value);
      expect(payload1.cells[1].value).toBe(payload2.cells[1].value);
    });
    
    test('Payload is fully detached from worksheet', () => {
      worksheet.setCellValue({ row: (5) + 1, col: (5) + 1 }, 'Data');
      
      const payload = service.copy(worksheet, {
        start: { row: (5) + 1, col: (5) + 1 },
        end: { row: (5) + 1, col: (5) + 1 }
      });
      
      // Delete entire worksheet content
      worksheet.setCellValue({ row: (5) + 1, col: (5) + 1 }, null);
      
      // Payload should still have data
      expect(payload.cells[0].value).toBe('Data');
    });
  });
  
  // ==================== OFFSET CORRECTNESS ====================
  
  describe('Offset Correctness', () => {
    test('Top-left cell always maps to (0,0)', () => {
      worksheet.setCellValue({ row: (10) + 1, col: (10) + 1 }, 'TopLeft');
      
      const payload = service.copy(worksheet, {
        start: { row: (10) + 1, col: (10) + 1 },
        end: { row: (12) + 1, col: (12) + 1 }
      });
      
      const topLeftCell = payload.cells.find((c: CellSnapshot) => c.rowOffset === 0 && c.colOffset === 0);
      expect(topLeftCell).toBeDefined();
      expect(topLeftCell?.value).toBe('TopLeft');
    });
    
    test('Offsets are correct for multi-cell range', () => {
      // Set up 2×2 grid
      worksheet.setCellValue({ row: (5) + 1, col: (5) + 1 }, 'A1');
      worksheet.setCellValue({ row: (5) + 1, col: (6) + 1 }, 'B1');
      worksheet.setCellValue({ row: (6) + 1, col: (5) + 1 }, 'A2');
      worksheet.setCellValue({ row: (6) + 1, col: (6) + 1 }, 'B2');
      
      const payload = service.copy(worksheet, {
        start: { row: (5) + 1, col: (5) + 1 },
        end: { row: (6) + 1, col: (6) + 1 }
      });
      
      // Verify offsets
      expect(payload.cells.find((c: CellSnapshot) => c.rowOffset === 0 && c.colOffset === 0)?.value).toBe('A1');
      expect(payload.cells.find((c: CellSnapshot) => c.rowOffset === 0 && c.colOffset === 1)?.value).toBe('B1');
      expect(payload.cells.find((c: CellSnapshot) => c.rowOffset === 1 && c.colOffset === 0)?.value).toBe('A2');
      expect(payload.cells.find((c: CellSnapshot) => c.rowOffset === 1 && c.colOffset === 1)?.value).toBe('B2');
    });
    
    test('Negative offsets never exist', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (5) + 1, col: (5) + 1 }
      });
      
      // All offsets must be >= 0
      payload.cells.forEach((cell: CellSnapshot) => {
        expect(cell.rowOffset).toBeGreaterThanOrEqual(0);
        expect(cell.colOffset).toBeGreaterThanOrEqual(0);
      });
    });
    
    test('Width and height calculated correctly', () => {
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (2) + 1, col: (4) + 1 }
      });
      
      expect(payload.width).toBe(5);  // cols 0-4 = 5 columns
      expect(payload.height).toBe(3); // rows 0-2 = 3 rows
    });
  });
  
  // ==================== STYLE SERIALIZATION ====================
  
  describe('Style Serialization', () => {
    test('Styles are serialized, not referenced', () => {
      const style: CellStyle = {
        bold: true,
        color: '#FF0000',
        fontSize: 14,
      };
      
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Bold');
      worksheet.setCellStyle({ row: (0) + 1, col: (0) + 1 }, style);
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      const cellSnapshot = payload.cells[0];
      expect(cellSnapshot.style).toBeDefined();
      expect(cellSnapshot.style?.bold).toBe(true);
      expect(cellSnapshot.style?.color).toBe('#FF0000');
      expect(cellSnapshot.style?.fontSize).toBe(14);
      
      // Style should be a different object (not reference)
      expect(cellSnapshot.style).not.toBe(style);
    });
    
    test('Mutating original style does not affect payload', () => {
      const style: CellStyle = { bold: true };
      
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      worksheet.setCellStyle({ row: (0) + 1, col: (0) + 1 }, style);
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      // Modify original style object
      style.bold = false;
      style.italic = true;
      
      // Payload should be unchanged
      expect(payload.cells[0].style?.bold).toBe(true);
      expect(payload.cells[0].style?.italic).toBeUndefined();
    });
    
    test('Complex style serialization', () => {
      const style: CellStyle = {
        fontFamily: 'Arial',
        fontSize: 12,
        bold: true,
        italic: true,
        underline: 'double',
        color: '#FF0000',
        align: 'center',
        valign: 'middle',
        wrap: true,
        fill: '#FFFF00',
        numberFormat: '#,##0.00',
      };
      
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Styled');
      worksheet.setCellStyle({ row: (0) + 1, col: (0) + 1 }, style);
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      const serialized = payload.cells[0].style!;
      expect(serialized.fontFamily).toBe('Arial');
      expect(serialized.fontSize).toBe(12);
      expect(serialized.bold).toBe(true);
      expect(serialized.italic).toBe(true);
      expect(serialized.underline).toBe('double');
      expect(serialized.color).toBe('#FF0000');
      expect(serialized.align).toBe('center');
      expect(serialized.valign).toBe('middle');
      expect(serialized.wrap).toBe(true);
      expect(serialized.fill).toBe('#FFFF00');
      expect(serialized.numberFormat).toBe('#,##0.00');
    });
  });
  
  // ==================== MERGE HANDLING ====================
  
  describe('Merge Handling', () => {
    test('Only merge anchor is stored', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Merged');
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (1) + 1, col: (1) + 1 } });
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (1) + 1, col: (1) + 1 }
      });
      
      // Should have exactly 1 cell (the anchor)
      expect(payload.cells.length).toBe(1);
      
      const anchor = payload.cells[0];
      expect(anchor.isMergeAnchor).toBe(true);
      expect(anchor.value).toBe('Merged');
    });
    
    test('Merge dimensions are correct', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'BigMerge');
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (2) + 1, col: (3) + 1 } });
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (2) + 1, col: (3) + 1 }
      });
      
      const anchor = payload.cells[0];
      expect(anchor.isMergeAnchor).toBe(true);
      expect(anchor.mergeHeight).toBe(3); // rows 0-2 = 3 rows
      expect(anchor.mergeWidth).toBe(4);  // cols 0-3 = 4 cols
    });
    
    test('Non-anchor merged cells are not stored', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Anchor');
      // Try to set values in non-anchor cells (should be redirected to anchor)
      worksheet.mergeCells({ start: { row: (0) + 1, col: (0) + 1 }, end: { row: (1) + 1, col: (1) + 1 } });
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (1) + 1, col: (1) + 1 }
      });
      
      // Only the anchor should be in payload
      const nonAnchors = payload.cells.filter((c: CellSnapshot) => !c.isMergeAnchor);
      expect(nonAnchors.length).toBe(0);
    });
  });
  
  // ==================== CUT SEMANTICS ====================
  
  describe('Cut Semantics', () => {
    test('cut() sets isCut flag to true', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Cut me');
      
      const payload = service.cut(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(payload.isCut).toBe(true);
    });
    
    test('copy() sets isCut flag to false', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Copy me');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(payload.isCut).toBe(false);
    });
    
    test('cut() does NOT mutate source cells', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Original');
      
      service.cut(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      // Source cell should still have value
      expect(worksheet.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe('Original');
    });
    
    test('cut() creates identical snapshot to copy() except for flag', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 42);
      
      const range: Range = {
        start: { row: 1, col: 1 },
        end: { row: 1, col: 2 }
      };
      
      const copyPayload = service.copy(worksheet, range);
      const cutPayload = service.cut(worksheet, range);
      
      // Everything identical except isCut flag
      expect(cutPayload.width).toBe(copyPayload.width);
      expect(cutPayload.height).toBe(copyPayload.height);
      expect(cutPayload.cells.length).toBe(copyPayload.cells.length);
      expect(cutPayload.cells[0].value).toBe(copyPayload.cells[0].value);
      expect(cutPayload.isCut).toBe(true);
      expect(copyPayload.isCut).toBe(false);
    });
  });
  
  // ==================== IMMUTABILITY ====================
  
  describe('Immutability', () => {
    test('Payload is frozen', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(Object.isFrozen(payload)).toBe(true);
    });
    
    test('Payload cells array is frozen', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(Object.isFrozen(payload.cells)).toBe(true);
    });
    
    test('Individual cell snapshots are frozen', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(Object.isFrozen(payload.cells[0])).toBe(true);
    });
    
    test('Cannot mutate payload after creation', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      }) as any;
      
      // Attempt to mutate should fail (or be ignored in strict mode)
      expect(() => {
        payload.width = 999;
      }).toThrow();
    });
  });
  
  // ==================== EMPTY CELLS ====================
  
  describe('Empty Cells', () => {
    test('Empty cells are not included in snapshot', () => {
      // Copy range with no data
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (5) + 1, col: (5) + 1 }
      });
      
      expect(payload.cells.length).toBe(0);
    });
    
    test('Range with some empty cells includes only non-empty', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
      // Skip (0,1)
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, 'C');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (2) + 1 }
      });
      
      expect(payload.cells.length).toBe(2);
      expect(payload.cells[0].value).toBe('A');
      expect(payload.cells[1].value).toBe('C');
    });
  });
  
  // ==================== FORMULAS ====================
  
  describe('Formulas', () => {
    test('Formula is captured without leading =', () => {
      worksheet.setCellFormula({ row: (0) + 1, col: (0) + 1 }, '=SUM(A1:A10)');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(payload.cells[0].formula).toBe('SUM(A1:A10)');
    });
    
    test('Formula without leading = is preserved as-is', () => {
      // Directly set formula without =
      (worksheet as any).cells.getOrCreate(1, 1).formula = 'A1+B1';
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(payload.cells[0].formula).toBe('A1+B1');
    });
  });
  
  // ==================== CLIPBOARD STATE ====================
  
  describe('Clipboard State Management', () => {
    test('getPayload returns null initially', () => {
      expect(service.getPayload()).toBeNull();
    });
    
    test('getPayload returns current payload after copy', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      expect(service.getPayload()).toBe(payload);
    });
    
    test('clear() removes current payload', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'Test');
      service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      service.clear();
      
      expect(service.getPayload()).toBeNull();
    });
    
    test('New copy replaces old payload', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'First');
      const payload1 = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (0) + 1 }
      });
      
      worksheet.setCellValue({ row: (1) + 1, col: (1) + 1 }, 'Second');
      const payload2 = service.copy(worksheet, {
        start: { row: (1) + 1, col: (1) + 1 },
        end: { row: (1) + 1, col: (1) + 1 }
      });
      
      expect(service.getPayload()).toBe(payload2);
      expect(service.getPayload()).not.toBe(payload1);
    });
  });
  
  // ==================== EDGE CASES ====================
  
  describe('Edge Cases', () => {
    test('Single cell copy', () => {
      worksheet.setCellValue({ row: (5) + 1, col: (5) + 1 }, 'Single');
      
      const payload = service.copy(worksheet, {
        start: { row: (5) + 1, col: (5) + 1 },
        end: { row: (5) + 1, col: (5) + 1 }
      });
      
      expect(payload.width).toBe(1);
      expect(payload.height).toBe(1);
      expect(payload.cells.length).toBe(1);
      expect(payload.cells[0].rowOffset).toBe(0);
      expect(payload.cells[0].colOffset).toBe(0);
    });
    
    test('Large range copy', () => {
      // Set some cells in large range
      for (let i = 0; i < 10; i++) {
        worksheet.setCellValue({ row: (i) + 1, col: (i) + 1 }, i * i);
      }
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (9) + 1, col: (9) + 1 }
      });
      
      expect(payload.width).toBe(10);
      expect(payload.height).toBe(10);
      expect(payload.cells.length).toBe(10); // Only diagonal cells have values
    });
    
    test('Copy range with mixed data types', () => {
      worksheet.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'String');
      worksheet.setCellValue({ row: (0) + 1, col: (1) + 1 }, 42);
      worksheet.setCellValue({ row: (0) + 1, col: (2) + 1 }, true);
      worksheet.setCellValue({ row: (0) + 1, col: (3) + 1 }, null);
      
      const payload = service.copy(worksheet, {
        start: { row: (0) + 1, col: (0) + 1 },
        end: { row: (0) + 1, col: (3) + 1 }
      });
      
      expect(payload.cells[0].value).toBe('String');
      expect(payload.cells[1].value).toBe(42);
      expect(payload.cells[2].value).toBe(true);
      // Null should not create a snapshot
      expect(payload.cells.length).toBe(3);
    });
  });
});
