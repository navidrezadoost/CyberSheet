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
import { OwnerBackedWorkbookSheetView } from '../src/WorkbookSheetView';
import { Workbook } from '../src/workbook';
import type { WorkbookId, WorksheetId, WorkbookSheetView } from '../src/workbook-access-types';
import type { Address, Range, CellStyle } from '../src/types';

describe('ClipboardService', () => {
  let service: ClipboardService;
  let worksheet: Worksheet;
  
  beforeEach(() => {
    service = new ClipboardService();
    worksheet = new Worksheet('Test', 100, 26);
  });

  describe('R1 ownership and diagnostics', () => {
    const address = { row: 1, col: 1 };
    const range = { start: address, end: address };

    function adoptWithView(sheet: Worksheet) {
      const workbook = Workbook.create({ sheets: [{ name: 'Owner container' }] });
      workbook.attachDevImportSheet(sheet);
      return workbook.getSheet(sheet.name)!;
    }

    test('owner-view Copy remains detached and formula-cache masked, while owner-view Cut fails without replacing payload', () => {
      const source = new Worksheet('Owner view copy', 2, 2);
      source.setCellFormula(address, '=40+2', 42);
      const view = adoptWithView(source);
      const seeded = new Worksheet('Standalone seed', 2, 2);
      seeded.setCellValue(address, 'seed');
      const priorPayload = service.copy(seeded, range);

      const copied = service.copy(view, range);
      expect(copied.cells).toMatchObject([{ value: null, formula: '40+2' }]);
      expect(copied.cells[0]).not.toBe(source.getCell(address));

      const currentPayload = service.getPayload();
      expect(() => service.cut(view, range)).toThrow(/unavailable/);
      expect(service.getPayload()).toBe(currentPayload);
      expect(currentPayload).not.toBe(priorPayload);
    });

    test('merged Copy preserves standalone geometry and detaches an owner-view anchor without exposing its cached result', () => {
      const copyRange: Range = {
        start: address,
        end: { row: 2, col: 2 },
      };
      const makeMergedSource = (name: string, cachedValue: string) => {
        const source = new Worksheet(name, 2, 2);
        source.setCellFormula(address, '=40+2', cachedValue);
        source.setCellStyle(address, {
          border: { top: { color: '#f00', style: 'thin' } },
        });
        source.mergeCells({ start: address, end: { row: 2, col: 2 } });
        return source;
      };

      const standalone = makeMergedSource('Standalone merged copy', 'standalone-cache');
      const standaloneEvents: unknown[] = [];
      const disposeStandaloneEvents = standalone.on(event => standaloneEvents.push(event));
      const standaloneMergesBefore = standalone.getMergedRanges();
      const standalonePayload = service.copy(standalone, copyRange);
      disposeStandaloneEvents.dispose();

      expect(standalonePayload).toMatchObject({ width: 2, height: 2, isCut: false });
      expect(standalonePayload.cells).toHaveLength(1);
      expect(standalonePayload.cells[0]).toMatchObject({
        rowOffset: 0,
        colOffset: 0,
        value: 'standalone-cache',
        formula: '40+2',
        isMergeAnchor: true,
        mergeHeight: 2,
        mergeWidth: 2,
        style: { border: { top: { color: '#f00', style: 'thin' } } },
      });
      expect(standalone.getCell(address)).toMatchObject({ value: 'standalone-cache', formula: '=40+2' });
      expect(standalone.getMergedRanges()).toEqual(standaloneMergesBefore);
      expect(standaloneEvents).toHaveLength(0);

      const ownerSource = makeMergedSource('Owner merged copy', 'owner-cache-sentinel');
      const ownerCellBefore = ownerSource.getCell(address);
      const ownerStyleBefore = JSON.stringify(ownerSource.getCellStyle(address));
      const ownerMergesBefore = ownerSource.getMergedRanges();
      const ownerEvents: unknown[] = [];
      const disposeOwnerEvents = ownerSource.on(event => ownerEvents.push(event));
      const ownerView = adoptWithView(ownerSource);
      const mergeQuerySpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getMergedRangeForCell');

      const ownerPayload = service.copy(ownerView, copyRange);

      const ownerMergeQueryCalls = mergeQuerySpy.mock.calls.length;
      const ownerMergeQueryResults = mergeQuerySpy.mock.results.map(result => result.value);
      mergeQuerySpy.mockRestore();
      disposeOwnerEvents.dispose();

      expect(ownerMergeQueryCalls).toBe(4);
      expect(JSON.stringify(ownerMergeQueryResults)).not.toContain('owner-cache-sentinel');
      expect(ownerPayload).toMatchObject({ width: 2, height: 2, isCut: false });
      expect(ownerPayload.cells).toHaveLength(1);
      expect(ownerPayload.cells[0]).toMatchObject({
        rowOffset: 0,
        colOffset: 0,
        value: null,
        formula: '40+2',
        isMergeAnchor: true,
        mergeHeight: 2,
        mergeWidth: 2,
        style: { border: { top: { color: '#f00', style: 'thin' } } },
      });
      expect(ownerPayload.cells[0]?.value).not.toBe('owner-cache-sentinel');
      expect(Object.isFrozen(ownerPayload.cells)).toBe(true);
      expect(Object.isFrozen(ownerPayload.cells[0])).toBe(true);
      expect(Reflect.set(ownerPayload.cells[0]!, 'mergeWidth', 9)).toBe(false);
      expect(ownerPayload.cells[0]?.mergeWidth).toBe(2);
      expect(ownerPayload.cells[0]?.style).not.toBe(ownerSource.getCellStyle(address));
      expect(ownerPayload.cells[0]?.style?.border?.top).not.toBe(ownerSource.getCellStyle(address)?.border?.top);
      ownerPayload.cells[0]!.style!.border!.top!.color = '#00f';
      expect(JSON.stringify(ownerSource.getCellStyle(address))).toBe(ownerStyleBefore);
      expect(ownerSource.getCell(address)).toMatchObject({
        value: ownerCellBefore?.value,
        formula: ownerCellBefore?.formula,
      });
      expect(ownerSource.getMergedRanges()).toEqual(ownerMergesBefore);
      expect(ownerEvents).toHaveLength(0);
    });

    test('owner-view merged-range query returns frozen detached geometry while standalone queries remain mutable', () => {
      const source = new Worksheet('Merge query detachment', 2, 2);
      const mergedRange: Range = {
        start: { row: 1, col: 1 },
        end: { row: 2, col: 2 },
      };
      source.mergeCells(mergedRange);
      const sourceGeometry = source.getMergedRanges();
      const view = adoptWithView(source);

      const ownerResult = view.getMergedRangeForCell({ row: 2, col: 2 });
      expect(ownerResult).toEqual(mergedRange);
      expect(Object.isFrozen(ownerResult)).toBe(true);
      expect(Object.isFrozen(ownerResult?.start)).toBe(true);
      expect(Object.isFrozen(ownerResult?.end)).toBe(true);
      expect(Reflect.set(ownerResult!, 'end', { row: 2, col: 1 })).toBe(false);
      expect(Reflect.set(ownerResult!.start, 'row', 2)).toBe(false);
      expect(source.getMergedRanges()).toEqual(sourceGeometry);
      expect(view.getMergedRangeForCell({ row: 2, col: 2 })).toEqual(mergedRange);

      const standalone = new Worksheet('Standalone merge query', 2, 2);
      standalone.mergeCells(mergedRange);
      const standaloneResult = standalone.getMergedRangeForCell({ row: 2, col: 2 });
      expect(standaloneResult).toEqual(mergedRange);
      expect(Object.isFrozen(standaloneResult)).toBe(false);
      standaloneResult!.start.row = 2;
      expect(standalone.getMergedRanges()).toEqual([mergedRange]);
      expect(standalone.getMergedRangeForCell({ row: 2, col: 2 })).toEqual(mergedRange);
    });

    test('only Workbook-issued views can copy adopted worksheet data', () => {
      const sentinel = 'structural-facade-cache-sentinel';
      const source = new Worksheet('Structural facade source', 2, 2);
      source.setCellFormula(address, '=40+2', sentinel);
      const sourceCellBefore = source.getCell(address);
      const sourceMergesBefore = source.getMergedRanges();
      const sourceEvents: unknown[] = [];
      const disposeEvents = source.on(event => sourceEvents.push(event));
      const genuineView = adoptWithView(source);

      const seeded = new Worksheet('Facade payload seed', 2, 2);
      seeded.setCellValue(address, 'prior-payload');
      const priorPayload = service.copy(seeded, range);
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});

      let mergeReads = 0;
      let cellReads = 0;
      let valueReads = 0;
      const facade = {
        workbookId: 'clipboard-service-facade-owner',
        worksheetId: source.getWorksheetId(),
        getMergedRangeForCell: (cellAddress: Address) => {
          mergeReads++;
          return source.getMergedRangeForCell(cellAddress);
        },
        getCell: (cellAddress: Address) => {
          cellReads++;
          return source.getCell(cellAddress);
        },
        getCellValue: (cellAddress: Address) => {
          valueReads++;
          return source.getCellValue(cellAddress);
        },
      } as unknown as WorkbookSheetView;

      expect(Workbook.isWorkbookIssuedSheetView(genuineView)).toBe(true);
      expect(Workbook.isWorkbookIssuedSheetView(facade)).toBe(false);
      expect(Object.getOwnPropertyDescriptor(Workbook, 'isWorkbookIssuedSheetView')).toMatchObject({
        writable: false,
        configurable: false,
      });
      expect(() => Object.defineProperty(Workbook, 'isWorkbookIssuedSheetView', { value: () => true })).toThrow();
      expect(() => service.copy(facade, range)).toThrow(/Workbook-issued/);
      expect(() => service.copy(facade, range, 'values')).toThrow(/Workbook-issued/);
      expect(mergeReads).toBe(0);
      expect(cellReads).toBe(0);
      expect(valueReads).toBe(0);
      expect(service.getPayload()).toBe(priorPayload);
      expect(priorPayload.cells).toMatchObject([{ value: 'prior-payload' }]);
      expect(log).not.toHaveBeenCalled();

      let directResolverCalls = 0;
      const directlyConstructedView = new OwnerBackedWorkbookSheetView(
        'caller-workbook-id' as WorkbookId,
        source.getWorksheetId() as WorksheetId,
        () => {
          directResolverCalls++;
          return source;
        },
      );
      expect(Workbook.isWorkbookIssuedSheetView(directlyConstructedView)).toBe(false);
      expect(() => service.copy(directlyConstructedView, range)).toThrow(/Workbook-issued/);
      expect(directResolverCalls).toBe(0);
      expect(service.getPayload()).toBe(priorPayload);
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();

      const genuinePayload = service.copy(genuineView, range);
      expect(genuinePayload.cells).toMatchObject([{ value: null, formula: '40+2' }]);
      expect(genuinePayload.cells[0]?.value).not.toBe(sentinel);
      expect(service.getPayload()).toBe(genuinePayload);
      expect(priorPayload.cells).toMatchObject([{ value: 'prior-payload' }]);
      expect(source.getCell(address)).toMatchObject({
        value: sourceCellBefore?.value,
        formula: sourceCellBefore?.formula,
      });
      expect(source.getMergedRanges()).toEqual(sourceMergesBefore);
      expect(sourceEvents).toHaveLength(0);
      disposeEvents.dispose();
    });

    test('adopted raw Copy/Cut reject before reads, payload replacement, or diagnostics, even when ownership is shadowed', () => {
      const source = new Worksheet('Adopted raw clipboard source', 2, 2);
      source.setCellFormula(address, '=40+2', 'raw-clipboard-sentinel');
      Object.defineProperty(source, 'isWorkbookOwned', {
        configurable: true,
        value: () => false,
      });
      const standalonePayload = service.copy(source, range);
      expect(standalonePayload.cells).toMatchObject([{ value: 'raw-clipboard-sentinel', formula: '40+2' }]);

      const workbook = Workbook.create({ sheets: [{ name: 'Raw owner container' }] });
      workbook.attachDevImportSheet(source);
      const issuedView = workbook.getSheet(source.name)!;
      const seeded = new Worksheet('Standalone seed', 2, 2);
      seeded.setCellValue(address, 'seed');
      const priorPayload = service.copy(seeded, range);

      const getCell = jest.spyOn(Worksheet.prototype, 'getCell');
      const getCellValue = jest.spyOn(Worksheet.prototype, 'getCellValue');
      const getMerge = jest.spyOn(Worksheet.prototype, 'getMergedRangeForCell');
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      Object.defineProperty(source, 'isWorkbookOwned', {
        configurable: true,
        value: () => false,
      });

      expect(() => service.copy(source, range)).toThrow(/unavailable/);
      expect(() => service.cut(source, range)).toThrow(/unavailable/);
      expect(getCell).not.toHaveBeenCalled();
      expect(getCellValue).not.toHaveBeenCalled();
      expect(getMerge).not.toHaveBeenCalled();
      expect(service.getPayload()).toBe(priorPayload);
      expect(log).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain('raw-clipboard-sentinel');

      getCell.mockRestore();
      getCellValue.mockRestore();
      getMerge.mockRestore();
      log.mockRestore();

      const issuedPayload = service.copy(issuedView, range);
      expect(issuedPayload.cells).toMatchObject([{ value: null, formula: '40+2' }]);
    });

    test('snapshot diagnostics retain structural metadata and omit values and formula text', () => {
      const sentinel = 'clipboard-diagnostic-private-value';
      const formula = '=SECRET_FORMULA()';
      worksheet.setCellFormula(address, formula, sentinel);
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});

      service.copy(worksheet, range);

      const serialized = JSON.stringify(log.mock.calls);
      expect(serialized).not.toContain(sentinel);
      expect(serialized).not.toContain('SECRET_FORMULA');
      expect(serialized).toContain('hasFormula');
      expect(serialized).toContain('dimensions');
    });
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
      worksheet.setCellFormula({ row: 1, col: 1 }, 'A1+B1');
      
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
