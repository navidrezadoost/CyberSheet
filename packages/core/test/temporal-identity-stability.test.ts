/**
 * Temporal Identity Stability Tests
 * 
 * Validates that undo/redo maintains pointer stability:
 * 
 *   styleA → edit → styleB → undo → styleA'
 *   
 *   Requirement: styleA === styleA' (strict pointer equality)
 * 
 * This is the final identity stress test.
 */

import { describe, it, expect } from '@jest/globals';
import { Workbook } from '../src/workbook';
import { CommandManager, Commands } from '../src/CommandManager';

describe('Temporal Identity Stability', () => {
  describe('Strict Pointer Equality After Undo', () => {
    it('should preserve pointer identity for single cell undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Apply style A
      const styleA = { bold: true, fontSize: 12 };
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleA));
      
      // Capture canonical pointer
      const canonicalA = sheet.getCellStyle(addr);
      expect(canonicalA).toBeDefined();
      expect(Object.isFrozen(canonicalA)).toBe(true);
      
      // Apply style B
      const styleB = { italic: true, fontSize: 14 };
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleB));
      
      const canonicalB = sheet.getCellStyle(addr);
      expect(canonicalB).not.toBe(canonicalA); // Different style
      
      // UNDO: Should restore exact pointer
      cmdMgr.undo();
      
      const restoredA = sheet.getCellStyle(addr);
      
      // CRITICAL: Strict pointer equality
      expect(restoredA).toBe(canonicalA); // Same pointer, not just equal
      expect(Object.is(restoredA, canonicalA)).toBe(true);
    });
    
    it('should preserve pointer identity for Phase 1 UI properties', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Apply style with strikethrough + indent
      const styleA = { strikethrough: true, indent: 3, align: 'left' } as any;
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleA));
      
      const canonicalA = sheet.getCellStyle(addr);
      expect((canonicalA as any)?.strikethrough).toBe(true);
      expect((canonicalA as any)?.indent).toBe(3);
      
      // Change to superscript
      const styleB = { superscript: true } as any;
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleB));
      
      const canonicalB = sheet.getCellStyle(addr);
      expect((canonicalB as any)?.superscript).toBe(true);
      expect((canonicalB as any)?.strikethrough).toBeUndefined();
      
      // UNDO
      cmdMgr.undo();
      
      const restoredA = sheet.getCellStyle(addr);
      
      // Pointer stability
      expect(restoredA).toBe(canonicalA);
      expect((restoredA as any)?.strikethrough).toBe(true);
      expect((restoredA as any)?.indent).toBe(3);
    });
    
    it('should preserve pointer identity through multiple undo/redo cycles', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Apply styles A, B, C
      const styleA = { bold: true };
      const styleB = { italic: true };
      const styleC = { underline: true };
      
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleA));
      const canonicalA = sheet.getCellStyle(addr);
      
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleB));
      const canonicalB = sheet.getCellStyle(addr);
      
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleC));
      const canonicalC = sheet.getCellStyle(addr);
      
      // Undo → C to B
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalB);
      
      // Undo → B to A
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalA);
      
      // Redo → A to B
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalB);
      
      // Redo → B to C
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalC);
      
      // Undo twice → back to A
      cmdMgr.undo();
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalA);
    });
  });
  
  describe('Range Operations', () => {
    it('should preserve pointer identity for range style undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      
      const range = {
        start: { row: 1, col: 1 },
        end: { row: 3, col: 3 }
      };
      
      // Apply style to range
      const styleA = { bold: true, fontSize: 14 };
      cmdMgr.execute(Commands.setRangeStyle(sheet, range, styleA));
      
      // All cells should share same canonical pointer
      const canonicalA = sheet.getCellStyle({ row: 1, col: 1 });
      for (let row = 1; row <= 3; row++) {
        for (let col = 1; col <= 3; col++) {
          expect(sheet.getCellStyle({ row, col })).toBe(canonicalA);
        }
      }
      
      // Apply different style
      const styleB = { italic: true };
      cmdMgr.execute(Commands.setRangeStyle(sheet, range, styleB));
      
      const canonicalB = sheet.getCellStyle({ row: 1, col: 1 });
      expect(canonicalB).not.toBe(canonicalA);
      
      // UNDO
      cmdMgr.undo();
      
      // All cells should restore to canonicalA
      for (let row = 1; row <= 3; row++) {
        for (let col = 1; col <= 3; col++) {
          expect(sheet.getCellStyle({ row, col })).toBe(canonicalA);
        }
      }
    });
    
    it('should preserve mixed styles in range undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      
      // Set different styles to different cells
      sheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
      sheet.setCellStyle({ row: 2, col: 1 }, { italic: true });
      sheet.setCellStyle({ row: 3, col: 1 }, { underline: true });
      
      const style1 = sheet.getCellStyle({ row: 1, col: 1 });
      const style2 = sheet.getCellStyle({ row: 2, col: 1 });
      const style3 = sheet.getCellStyle({ row: 3, col: 1 });
      
      // Apply uniform style to range
      const uniformStyle = { strikethrough: true } as any;
      cmdMgr.execute(Commands.setRangeStyle(
        sheet,
        { start: { row: 1, col: 1 }, end: { row: 3, col: 1 } },
        uniformStyle
      ));
      
      // All should have same style now
      const uniform = sheet.getCellStyle({ row: 1, col: 1 });
      expect(sheet.getCellStyle({ row: 2, col: 1 })).toBe(uniform);
      expect(sheet.getCellStyle({ row: 3, col: 1 })).toBe(uniform);
      
      // UNDO
      cmdMgr.undo();
      
      // Each cell should restore to its original canonical pointer
      expect(sheet.getCellStyle({ row: 1, col: 1 })).toBe(style1);
      expect(sheet.getCellStyle({ row: 2, col: 1 })).toBe(style2);
      expect(sheet.getCellStyle({ row: 3, col: 1 })).toBe(style3);
    });
  });
  
  describe('Imported Styles', () => {
    it('should preserve pointer identity for imported styles after undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Simulate imported style (will be interned by setCellStyle)
      const importedStyle = { bold: true, fontSize: 12, color: '#FF0000' };
      sheet.setCellStyle(addr, importedStyle);
      
      const canonicalImported = sheet.getCellStyle(addr);
      expect(Object.isFrozen(canonicalImported)).toBe(true);
      
      // Edit with command
      const newStyle = { italic: true };
      cmdMgr.execute(Commands.setStyle(sheet, addr, newStyle));
      
      expect(sheet.getCellStyle(addr)).not.toBe(canonicalImported);
      
      // UNDO
      cmdMgr.undo();
      
      // Should restore original imported canonical pointer
      expect(sheet.getCellStyle(addr)).toBe(canonicalImported);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle undo to undefined style', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Initially no style
      expect(sheet.getCellStyle(addr)).toBeUndefined();
      
      // Apply style
      cmdMgr.execute(Commands.setStyle(sheet, addr, { bold: true }));
      expect(sheet.getCellStyle(addr)).toBeDefined();
      
      // UNDO
      cmdMgr.undo();
      
      // Should restore to undefined
      expect(sheet.getCellStyle(addr)).toBeUndefined();
    });
    
    it('should handle style with normalized values (indent = 0)', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Apply style with indent = 0 (normalized to undefined by cache)
      const styleA = { indent: 0, align: 'left' } as any;
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleA));
      
      const canonicalA = sheet.getCellStyle(addr);
      expect((canonicalA as any)?.indent).toBeUndefined(); // Normalized
      
      // Change style
      cmdMgr.execute(Commands.setStyle(sheet, addr, { indent: 3 } as any));
      expect((sheet.getCellStyle(addr) as any)?.indent).toBe(3);
      
      // UNDO
      cmdMgr.undo();
      
      // Should restore canonical A (with normalized indent)
      expect(sheet.getCellStyle(addr)).toBe(canonicalA);
    });
    
    it('should handle superscript/subscript mutual exclusivity through undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Apply superscript
      cmdMgr.execute(Commands.setStyle(sheet, addr, { superscript: true } as any));
      const superStyle = sheet.getCellStyle(addr);
      expect((superStyle as any)?.superscript).toBe(true);
      
      // Apply subscript (should replace)
      cmdMgr.execute(Commands.setStyle(sheet, addr, { subscript: true } as any));
      const subStyle = sheet.getCellStyle(addr);
      expect((subStyle as any)?.subscript).toBe(true);
      expect((subStyle as any)?.superscript).toBeUndefined();
      
      // UNDO
      cmdMgr.undo();
      
      // Should restore superscript
      expect(sheet.getCellStyle(addr)).toBe(superStyle);
      expect((sheet.getCellStyle(addr) as any)?.superscript).toBe(true);
    });
  });
  
  describe('Stress Test', () => {
    it('should maintain pointer stability across 1000 undo/redo cycles', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      const styles = [
        { bold: true },
        { italic: true },
        { underline: true },
        { strikethrough: true } as any,
        { superscript: true } as any
      ];
      
      // Apply styles and capture canonical pointers
      const canonicals: Array<any> = [];
      for (const style of styles) {
        cmdMgr.execute(Commands.setStyle(sheet, addr, style));
        canonicals.push(sheet.getCellStyle(addr));
      }
      
      // 1000 cycles of undo/redo
      for (let cycle = 0; cycle < 1000; cycle++) {
        // Undo all
        for (let i = 0; i < styles.length - 1; i++) {
          cmdMgr.undo();
        }
        
        // Verify first style
        expect(sheet.getCellStyle(addr)).toBe(canonicals[0]);
        
        // Redo all
        for (let i = 0; i < styles.length - 1; i++) {
          cmdMgr.redo();
        }
        
        // Verify last style
        expect(sheet.getCellStyle(addr)).toBe(canonicals[styles.length - 1]);
      }
      
      // Final verification: Each canonical pointer still valid
      cmdMgr.undo(); cmdMgr.undo(); cmdMgr.undo(); cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicals[0]);
      
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicals[1]);
      
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicals[2]);
    });
  });
  
  describe('Vertical Alignment Temporal Stability', () => {
    it('should maintain pointer stability when toggling valign', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };
      
      // Style A: top-aligned
      cmdMgr.execute(Commands.setStyle(sheet, addr, { valign: 'top' }));
      const canonicalTop = sheet.getCellStyle(addr);
      expect(canonicalTop?.valign).toBe('top');
      
      // Style B: middle-aligned
      cmdMgr.execute(Commands.setStyle(sheet, addr, { valign: 'middle' }));
      const canonicalMiddle = sheet.getCellStyle(addr);
      expect(canonicalMiddle?.valign).toBe('middle');
      expect(canonicalMiddle).not.toBe(canonicalTop);
      
      // Style C: bottom-aligned
      cmdMgr.execute(Commands.setStyle(sheet, addr, { valign: 'bottom' }));
      const canonicalBottom = sheet.getCellStyle(addr);
      expect(canonicalBottom?.valign).toBe('bottom');
      expect(canonicalBottom).not.toBe(canonicalMiddle);
      
      // Undo → middle (strict pointer)
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalMiddle);
      
      // Undo → top (strict pointer)
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalTop);
      
      // Redo → middle (strict pointer)
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalMiddle);
      
      // Redo → bottom (strict pointer)
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalBottom);
    });
    
    it('should handle valign with complex styles through undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 2, col: 3 };
      
      // Complex style with valign
      const styleA = { 
        bold: true, 
        fontSize: 14, 
        color: '#FF0000',
        valign: 'top' as const
      };
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleA));
      const canonicalA = sheet.getCellStyle(addr);
      
      // Change only valign
      const styleB = { 
        bold: true, 
        fontSize: 14, 
        color: '#FF0000',
        valign: 'bottom' as const
      };
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleB));
      const canonicalB = sheet.getCellStyle(addr);
      
      // Different pointers (valign changed)
      expect(canonicalB).not.toBe(canonicalA);
      expect(canonicalB?.valign).toBe('bottom');
      
      // Undo restores exact pointer
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalA);
      expect(sheet.getCellStyle(addr)?.valign).toBe('top');
    });
    
    it('should maintain valign pointer stability across range operations', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      
      const range = {
        start: { row: 1, col: 1 },
        end: { row: 2, col: 2 }
      };
      
      const cells = [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 }
      ];
      
      // Apply valign to range
      const style = { valign: 'middle' as const };
      cmdMgr.execute(Commands.setRangeStyle(sheet, range, style));
      
      // Capture canonical pointers
      const canonicals = cells.map(addr => sheet.getCellStyle(addr));
      
      // All should be same canonical pointer (same style)
      expect(canonicals[0]).toBe(canonicals[1]);
      expect(canonicals[1]).toBe(canonicals[2]);
      expect(canonicals[2]).toBe(canonicals[3]);
      
      const canonicalMiddle = canonicals[0];
      expect(canonicalMiddle?.valign).toBe('middle');
      
      // Apply different valign
      cmdMgr.execute(Commands.setRangeStyle(sheet, range, { valign: 'top' }));
      const canonicalTop = sheet.getCellStyle(cells[0]);
      expect(canonicalTop?.valign).toBe('top');
      expect(canonicalTop).not.toBe(canonicalMiddle);
      
      // Undo: All cells restore to same pointer
      cmdMgr.undo();
      cells.forEach(addr => {
        expect(sheet.getCellStyle(addr)).toBe(canonicalMiddle);
      });
    });
    
    it('should handle partial valign changes in batches', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      
      const addr1 = { row: 1, col: 1 };
      const addr2 = { row: 1, col: 2 };
      
      // Initial state
      cmdMgr.execute(Commands.setStyle(sheet, addr1, { valign: 'top' }));
      cmdMgr.execute(Commands.setStyle(sheet, addr2, { valign: 'bottom' }));
      
      const canonicalTop = sheet.getCellStyle(addr1);
      const canonicalBottom = sheet.getCellStyle(addr2);
      
      // Batch change both to middle
      cmdMgr.execute(Commands.batch([
        Commands.setStyle(sheet, addr1, { valign: 'middle' }),
        Commands.setStyle(sheet, addr2, { valign: 'middle' })
      ]));
      
      const canonicalMiddle = sheet.getCellStyle(addr1);
      expect(canonicalMiddle?.valign).toBe('middle');
      expect(sheet.getCellStyle(addr2)).toBe(canonicalMiddle);
      
      // Undo batch: Both restore original pointers
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr1)).toBe(canonicalTop);
      expect(sheet.getCellStyle(addr2)).toBe(canonicalBottom);
    });
    
    it('should cycle valign through 100 undo/redo operations', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 5, col: 5 };
      
      const valigns = ['top', 'middle', 'bottom'] as const;
      const canonicals: any[] = [];
      
      // Apply 3 different valigns
      for (const valign of valigns) {
        cmdMgr.execute(Commands.setStyle(sheet, addr, { valign }));
        canonicals.push(sheet.getCellStyle(addr));
      }
      
      // Verify all different
      expect(canonicals[0]).not.toBe(canonicals[1]);
      expect(canonicals[1]).not.toBe(canonicals[2]);
      
      // 100 cycles of undo/redo
      for (let i = 0; i < 100; i++) {
        cmdMgr.undo(); // bottom → middle
        expect(sheet.getCellStyle(addr)).toBe(canonicals[1]);
        
        cmdMgr.undo(); // middle → top
        expect(sheet.getCellStyle(addr)).toBe(canonicals[0]);
        
        cmdMgr.redo(); // top → middle
        expect(sheet.getCellStyle(addr)).toBe(canonicals[1]);
        
        cmdMgr.redo(); // middle → bottom
        expect(sheet.getCellStyle(addr)).toBe(canonicals[2]);
      }
      
      // Final state: bottom (strict pointer)
      expect(sheet.getCellStyle(addr)).toBe(canonicals[2]);
      expect(sheet.getCellStyle(addr)?.valign).toBe('bottom');
    });
  });

  describe('Diagonal Borders Temporal Stability', () => {
    it('should maintain pointer stability when toggling diagonal borders', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 1, col: 1 };

      // Style A: diagonal up
      cmdMgr.execute(Commands.setStyle(sheet, addr, { border: { diagonalUp: '#FF0000' } }));
      const canonicalUp = sheet.getCellStyle(addr);
      expect(canonicalUp?.border?.diagonalUp).toBe('#FF0000');

      // Style B: diagonal down
      cmdMgr.execute(Commands.setStyle(sheet, addr, { border: { diagonalDown: '#0000FF' } }));
      const canonicalDown = sheet.getCellStyle(addr);
      expect(canonicalDown?.border?.diagonalDown).toBe('#0000FF');
      expect(canonicalDown).not.toBe(canonicalUp);

      // Style C: both diagonals
      cmdMgr.execute(Commands.setStyle(sheet, addr, {
        border: { diagonalUp: '#FF0000', diagonalDown: '#0000FF' }
      }));
      const canonicalBoth = sheet.getCellStyle(addr);
      expect(canonicalBoth?.border?.diagonalUp).toBe('#FF0000');
      expect(canonicalBoth?.border?.diagonalDown).toBe('#0000FF');
      expect(canonicalBoth).not.toBe(canonicalDown);

      // Undo → down only (strict pointer)
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalDown);

      // Undo → up only (strict pointer)
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalUp);

      // Redo → down (strict pointer)
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalDown);

      // Redo → both (strict pointer)
      cmdMgr.redo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalBoth);
    });

    it('should handle diagonal borders with complex cell styles through undo', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 2, col: 3 };

      // Complex style with diagonal border
      const styleA = {
        bold: true,
        fontSize: 14,
        border: {
          top: '#CCCCCC',
          diagonalUp: '#FF0000'
        }
      };
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleA));
      const canonicalA = sheet.getCellStyle(addr);

      // Change diagonal color
      const styleB = {
        bold: true,
        fontSize: 14,
        border: {
          top: '#CCCCCC',
          diagonalUp: '#0000FF'
        }
      };
      cmdMgr.execute(Commands.setStyle(sheet, addr, styleB));
      const canonicalB = sheet.getCellStyle(addr);

      // Different pointers (diagonal color changed)
      expect(canonicalB).not.toBe(canonicalA);
      expect(canonicalB?.border?.diagonalUp).toBe('#0000FF');

      // Undo restores exact pointer
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr)).toBe(canonicalA);
      expect(sheet.getCellStyle(addr)?.border?.diagonalUp).toBe('#FF0000');
    });

    it('should maintain diagonal border pointer stability across range operations', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();

      const range = {
        start: { row: 1, col: 1 },
        end: { row: 2, col: 2 }
      };

      const cells = [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 }
      ];

      // Apply diagonal borders to range
      const style = { border: { diagonalUp: '#FF0000', diagonalDown: '#FF0000' } };
      cmdMgr.execute(Commands.setRangeStyle(sheet, range, style));

      // Capture canonical pointers
      const canonicals = cells.map(addr => sheet.getCellStyle(addr));

      // All should be same canonical pointer (same style)
      expect(canonicals[0]).toBe(canonicals[1]);
      expect(canonicals[1]).toBe(canonicals[2]);
      expect(canonicals[2]).toBe(canonicals[3]);

      const canonicalDiag = canonicals[0];
      expect(canonicalDiag?.border?.diagonalUp).toBe('#FF0000');
      expect(canonicalDiag?.border?.diagonalDown).toBe('#FF0000');

      // Remove diagonals
      cmdMgr.execute(Commands.setRangeStyle(sheet, range, { border: { top: '#000000' } }));
      const canonicalNoDiag = sheet.getCellStyle(cells[0]);
      expect(canonicalNoDiag?.border?.diagonalUp).toBeUndefined();
      expect(canonicalNoDiag).not.toBe(canonicalDiag);

      // Undo: All cells restore to same diagonal pointer
      cmdMgr.undo();
      cells.forEach(addr => {
        expect(sheet.getCellStyle(addr)).toBe(canonicalDiag);
      });
    });

    it('should handle mixed border styles in batches', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();

      const addr1 = { row: 1, col: 1 };
      const addr2 = { row: 1, col: 2 };

      // Initial state
      cmdMgr.execute(Commands.setStyle(sheet, addr1, { border: { diagonalUp: '#FF0000' } }));
      cmdMgr.execute(Commands.setStyle(sheet, addr2, { border: { diagonalDown: '#0000FF' } }));

      const canonicalUp = sheet.getCellStyle(addr1);
      const canonicalDown = sheet.getCellStyle(addr2);

      // Batch change both
      cmdMgr.execute(Commands.batch([
        Commands.setStyle(sheet, addr1, { border: { diagonalUp: '#00FF00' } }),
        Commands.setStyle(sheet, addr2, { border: { diagonalDown: '#00FF00' } })
      ]));

      const newUp = sheet.getCellStyle(addr1);
      const newDown = sheet.getCellStyle(addr2);
      expect(newUp?.border?.diagonalUp).toBe('#00FF00');
      expect(newDown?.border?.diagonalDown).toBe('#00FF00');

      // Undo batch: Both restore original pointers
      cmdMgr.undo();
      expect(sheet.getCellStyle(addr1)).toBe(canonicalUp);
      expect(sheet.getCellStyle(addr2)).toBe(canonicalDown);
    });

    it('should cycle diagonal borders through 100 undo/redo operations', () => {
      const wb = new Workbook();
      const sheet = wb.addSheet('Test');
      const cmdMgr = new CommandManager();
      const addr = { row: 5, col: 5 };

      const styles = [
        { border: { diagonalUp: '#FF0000' } },
        { border: { diagonalDown: '#0000FF' } },
        { border: { diagonalUp: '#FF0000', diagonalDown: '#0000FF' } }
      ];

      const canonicals: any[] = [];

      // Apply 3 different diagonal styles
      for (const style of styles) {
        cmdMgr.execute(Commands.setStyle(sheet, addr, style));
        canonicals.push(sheet.getCellStyle(addr));
      }

      // Verify all different
      expect(canonicals[0]).not.toBe(canonicals[1]);
      expect(canonicals[1]).not.toBe(canonicals[2]);

      // 100 cycles of undo/redo
      for (let i = 0; i < 100; i++) {
        cmdMgr.undo(); // both → down
        expect(sheet.getCellStyle(addr)).toBe(canonicals[1]);

        cmdMgr.undo(); // down → up
        expect(sheet.getCellStyle(addr)).toBe(canonicals[0]);

        cmdMgr.redo(); // up → down
        expect(sheet.getCellStyle(addr)).toBe(canonicals[1]);

        cmdMgr.redo(); // down → both
        expect(sheet.getCellStyle(addr)).toBe(canonicals[2]);
      }

      // Final state: both diagonals (strict pointer)
      expect(sheet.getCellStyle(addr)).toBe(canonicals[2]);
      expect(sheet.getCellStyle(addr)?.border?.diagonalUp).toBe('#FF0000');
      expect(sheet.getCellStyle(addr)?.border?.diagonalDown).toBe('#0000FF');
    });
  });
});
