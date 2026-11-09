import { createSpreadsheet } from '../src/sdk';

describe('SpreadsheetSDK standalone read contracts (P1-08E.05)', () => {
  test('visibility queries observe the public SDK row and column operations', () => {
    const sheet = createSpreadsheet('E05 visibility', { rows: 4, cols: 3 });
    try {
      expect(sheet.isRowHidden(2)).toBe(false);
      expect(sheet.isColHidden(2)).toBe(false);

      sheet.hideRow(2);
      sheet.hideCol(2);
      expect(sheet.isRowHidden(2)).toBe(true);
      expect(sheet.isColHidden(2)).toBe(true);

      sheet.showRow(2);
      sheet.showCol(2);
      expect(sheet.isRowHidden(2)).toBe(false);
      expect(sheet.isColHidden(2)).toBe(false);
    } finally {
      sheet.dispose();
    }
  });

  test('data validation reads reflect set, enumeration, and removal through the public facade', () => {
    const sheet = createSpreadsheet('E05 validation', { rows: 4, cols: 3 });
    try {
      const rule = {
        type: 'whole' as const,
        operator: 'between' as const,
        formula1: '1',
        formula2: '10',
      };
      expect(sheet.getDataValidation(1, 1)).toBeUndefined();
      sheet.setDataValidation(1, 1, rule);

      expect(sheet.getDataValidation(1, 1)).toEqual(rule);
      expect(sheet.getValidationCells()).toEqual([{ row: 1, col: 1 }]);

      sheet.removeDataValidation(1, 1);
      expect(sheet.getDataValidation(1, 1)).toBeUndefined();
      expect(sheet.getValidationCells()).toEqual([]);
    } finally {
      sheet.dispose();
    }
  });

  test('protection and lock observations follow public protection and lock changes', () => {
    const sheet = createSpreadsheet('E05 protection', { rows: 3, cols: 3 });
    try {
      expect(sheet.isSheetProtected()).toBe(false);
      expect(sheet.getSheetProtection()).toBeNull();
      expect(sheet.isCellProtected(1, 1)).toBe(false);
      expect(sheet.isCellLocked(1, 1)).toBe(true);

      sheet.setSheetProtection({ allowFormatCells: true });
      expect(sheet.isSheetProtected()).toBe(true);
      expect(sheet.getSheetProtection()).toEqual({ allowFormatCells: true });
      expect(sheet.isCellProtected(1, 1)).toBe(true);

      sheet.unlockCell(1, 1);
      expect(sheet.isCellLocked(1, 1)).toBe(false);
      expect(sheet.isCellProtected(1, 1)).toBe(false);
      sheet.lockCell(1, 1);
      expect(sheet.isCellLocked(1, 1)).toBe(true);
      expect(sheet.isCellProtected(1, 1)).toBe(true);

      sheet.unlockCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
      expect(sheet.isCellLocked(1, 1)).toBe(false);
      expect(sheet.isCellLocked(2, 2)).toBe(false);
      sheet.lockCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
      expect(sheet.isCellLocked(1, 1)).toBe(true);
      expect(sheet.isCellLocked(2, 2)).toBe(true);

      sheet.removeSheetProtection();
      expect(sheet.isSheetProtected()).toBe(false);
      expect(sheet.getSheetProtection()).toBeNull();
    } finally {
      sheet.dispose();
    }
  });
});
