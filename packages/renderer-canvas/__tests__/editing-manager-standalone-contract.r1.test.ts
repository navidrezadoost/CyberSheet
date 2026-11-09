import { EditingManager } from '../src/EditingManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

describe('EditingManager standalone Worksheet contract', () => {
  test('rejects an adopted Worksheet before registering clipboard listeners', () => {
    const worksheet = new Worksheet('Already owned', 2, 2);
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-constructor-owner' as WorkbookId);
    const addListener = jest.spyOn(document, 'addEventListener');

    try {
      expect(() => new EditingManager(worksheet)).toThrow(
        /EditingManager cannot operate on a Workbook-owned Worksheet/,
      );
      expect(addListener.mock.calls.filter(([type]) => ['copy', 'cut', 'paste'].includes(String(type)))).toEqual([]);
    } finally {
      addListener.mockRestore();
    }
  });

  test('rejects a structural Worksheet facade even when it claims to be standalone', () => {
    const facade = {
      isWorkbookOwned: () => false,
      getCell: jest.fn(),
      setCellValue: jest.fn(),
    } as unknown as Worksheet;
    const addListener = jest.spyOn(document, 'addEventListener');

    try {
      expect(() => new EditingManager(facade)).toThrow(
        /EditingManager requires an authentic standalone Worksheet/,
      );
      expect(facade.getCell).not.toHaveBeenCalled();
      expect(addListener.mock.calls.filter(([type]) => ['copy', 'cut', 'paste'].includes(String(type)))).toEqual([]);
    } finally {
      addListener.mockRestore();
    }
  });

  test('rejects adopted redo before executing a command or consuming redo history', () => {
    const worksheet = new Worksheet('Redo owner transition', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 10);
    worksheet.setCellValue({ row: 2, col: 1 }, 20);
    const manager = new EditingManager(worksheet, { enableClipboard: false });
    manager.fillCells({ row: 1, col: 1 }, { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } });
    expect(manager.undo()).toBe(true);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 1 });

    Object.defineProperty(worksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-redo-owner' as WorkbookId);

    expect(() => manager.redo()).toThrow(/EditingManager cannot operate on a Workbook-owned Worksheet/);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(20);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 1 });
  });
});
