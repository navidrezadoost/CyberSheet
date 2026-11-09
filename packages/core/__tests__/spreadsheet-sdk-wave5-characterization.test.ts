import { createSpreadsheet } from '../src/sdk';
import type { WorksheetPatch } from '../src/patch/WorksheetPatch';

describe('P1-08H.06 SpreadsheetSDK standalone public operation batch 5', () => {
  test('public cell, merge, visibility, protection, locking, freeze, and filter paths report coherent state', () => {
    const sheet = createSpreadsheet('H06 SDK', { rows: 5, cols: 5 });
    const tracedOperations: string[] = [];
    sheet.setMutationTraceHook((event) => tracedOperations.push(event.operation));
    try {
      expect(sheet.name).toBe('H06 SDK');
      sheet.setCell(1, 1, 'alpha');
      expect(sheet.getCell(1, 1)?.value).toBe('alpha');
      expect(sheet.getCellValue(1, 1)).toBe('alpha');

      const patch: WorksheetPatch = {
        seq: 0,
        ops: [{ op: 'setCellValue', row: 1, col: 2, before: null, after: 'patched' }],
      };
      const inverse = sheet.applyPatch(patch);
      expect(sheet.getCellValue(1, 2)).toBe('patched');
      expect(inverse.ops).toHaveLength(1);
      expect(sheet.undo()).toBe(true);
      expect(sheet.getCellValue(1, 1)).toBeNull();
      expect(sheet.getCellValue(1, 2)).toBe('patched');
      expect(sheet.redo()).toBe(true);
      expect(sheet.getCellValue(1, 1)).toBe('alpha');
      expect(sheet.getCellValue(1, 2)).toBe('patched');

      sheet.mergeCells(2, 1, 2, 2);
      expect(sheet.isInMerge(2, 2)).toBe(true);
      expect(sheet.getMergedRanges()).toHaveLength(1);
      sheet.cancelMerge(2, 1, 2, 2);
      expect(sheet.isInMerge(2, 2)).toBe(false);

      sheet.hideRow(3);
      expect(sheet.isRowHidden(3)).toBe(true);
      sheet.showRow(3);
      expect(sheet.isRowHidden(3)).toBe(false);
      sheet.hideCol(4);
      expect(sheet.isColHidden(4)).toBe(true);
      sheet.showCol(4);
      expect(sheet.isColHidden(4)).toBe(false);

      sheet.setSheetProtection({ allowFormatCells: true, allowFormatRows: true, allowFormatColumns: true, allowFilter: true });
      expect(sheet.isSheetProtected()).toBe(true);
      expect(sheet.getSheetProtection()?.allowFormatCells).toBe(true);
      sheet.unlockCell(1, 1);
      expect(sheet.isCellLocked(1, 1)).toBe(false);
      sheet.lockCell(1, 1);
      expect(sheet.isCellLocked(1, 1)).toBe(true);
      sheet.unlockCells({ start: { row: 2, col: 1 }, end: { row: 2, col: 2 } });
      expect(sheet.isCellLocked(2, 2)).toBe(false);
      sheet.lockCells({ start: { row: 2, col: 1 }, end: { row: 2, col: 2 } });
      expect(sheet.isCellLocked(2, 2)).toBe(true);
      sheet.removeSheetProtection();
      expect(sheet.isSheetProtected()).toBe(false);

      sheet.setFreezePanes(1, 1);
      expect(sheet.getFreezePanes()).toEqual({ rows: 1, cols: 1 });
      sheet.clearFreezePanes();
      expect(sheet.getFreezePanes()).toBeNull();

      sheet.setFilter(1, { type: 'in', value: ['alpha'] });
      expect(sheet.getFilter(1)).toEqual({ type: 'in', value: ['alpha'] });
      sheet.clearFilter(1);
      expect(sheet.getFilter(1)).toBeUndefined();

      expect(sheet.getVisibleRows()).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
      expect(tracedOperations).toEqual(expect.arrayContaining(['setCell', 'applyPatch', 'undo', 'redo']));
    } finally {
      sheet.dispose();
    }
  });
});
