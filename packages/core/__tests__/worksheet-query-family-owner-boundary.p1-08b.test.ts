import { Workbook, Worksheet } from '../src';
import { createSpreadsheet } from '../src/sdk';

describe('P1-08B.05 SpreadsheetSDK owner-backed read surface', () => {
  test('public SDK factory exposes standalone read observations but has no Workbook-view constructor', () => {
    const sdk = createSpreadsheet('SDK standalone', { rows: 6, cols: 4 });
    sdk.setCell(1, 1, 'header');
    sdk.setCell(2, 1, 'visible');
    sdk.setCell(1, 2, 10);
    sdk.mergeCells(4, 1, 4, 2);
    sdk.hideRow(3);
    sdk.hideCol(3);
    sdk.setSheetProtection({ password: 'p', allowFilter: true });
    sdk.setFreezePanes(2, 2);
    sdk.setAutoFilterRange(1, 1, 2);
    sdk.setFilter(1, { type: 'in', value: ['visible'] });

    expect(sdk.getMergedRanges()).toEqual([{ start: { row: 4, col: 1 }, end: { row: 4, col: 2 } }]);
    expect(sdk.isRowHidden(3)).toBe(true);
    expect(sdk.isColHidden(3)).toBe(true);
    expect(sdk.getSheetProtection()).toMatchObject({ password: 'p' });
    expect(sdk.getFreezePanes()).not.toBeNull();
    expect(sdk.getFilter(1)).toEqual({ type: 'in', value: ['visible'] });
    expect(sdk.getVisibleRows()).toContain(2);
    expect(sdk.getAutoFilterRange()).toEqual({ headerRow: 1, startCol: 1, endCol: 2 });

    // createSpreadsheet owns a private standalone Worksheet. The public SDK
    // surface does not accept a Workbook-issued sheet view or Workbook handle.
    expect(Workbook.isWorkbookIssuedSheetView(sdk)).toBe(false);
    sdk.dispose();
  });
});

describe('P1-08B.06 Worksheet range and region query family', () => {
  test('standalone and Workbook-issued queries return detached cell/range observations', () => {
    const standalone = new Worksheet('Standalone query', 8, 5);
    standalone.setCellValue({ row: 2, col: 2 }, 'a');
    standalone.setCellValue({ row: 2, col: 3 }, 'b');
    standalone.setCellValue({ row: 3, col: 2 }, 'c');
    standalone.setCellFormula({ row: 5, col: 5 }, '=1+1', 'cached-secret');
    const range = standalone.getUsedRange()!;
    const contiguous = standalone.getContiguousRange({ row: 2, col: 2 })!;
    expect(range).toEqual({ start: { row: 2, col: 2 }, end: { row: 5, col: 5 } });
    expect(contiguous).toEqual({ start: { row: 2, col: 2 }, end: { row: 3, col: 3 } });
    expect(standalone.getSpecialCells({ type: 'formulas' })).toEqual([{ row: 5, col: 5 }]);
    const standaloneCell = standalone.getCell({ row: 2, col: 2 })!;
    expect(Object.isFrozen(standaloneCell)).toBe(true);
    expect(standalone.getCellValue({ row: 2, col: 2 })).toBe('a');

    const workbook = new Workbook();
    const source = new Worksheet('Owned query source', 8, 5);
    source.setCellValue({ row: 2, col: 2 }, 'a');
    source.setCellValue({ row: 2, col: 3 }, 'b');
    source.setCellValue({ row: 3, col: 2 }, 'c');
    source.setCellFormula({ row: 5, col: 5 }, '=1+1', 'cached-secret');
    const attach = (workbook as unknown as { attachDevImportSheet?: (sheet: Worksheet) => void }).attachDevImportSheet;
    expect(typeof attach).toBe('function');
    // This fixture is used only to obtain a genuine frozen Workbook-issued
    // view for the Worksheet query contract; it is not a supported SDK path.
    attach!.call(workbook, source);
    const view = workbook.activeSheet!;

    const ownerRange = view.getUsedRange()!;
    const ownerContiguous = view.getContiguousRange({ row: 2, col: 2 })!;
    const ownerCell = view.getCell({ row: 2, col: 2 })!;
    expect(ownerRange).toEqual(range);
    expect(ownerContiguous).toEqual(contiguous);
    expect(ownerCell?.value).toBe('a');
    expect(view.getCellValue({ row: 5, col: 5 })).toBeNull();
    expect(view.getCell({ row: 5, col: 5 })?.value).toBeNull();
    expect(standalone.getCellValue({ row: 5, col: 5 })).toBe('cached-secret');
    expect(Object.isFrozen(ownerRange)).toBe(true);
    expect(Object.isFrozen(ownerCell)).toBe(true);
    expect(() => ownerCell && ((ownerCell as { value: unknown }).value = 'tamper')).toThrow();
    expect(source.getCellValue({ row: 2, col: 2 })).toBe('a');
    expect('getSpecialCells' in view).toBe(false);
  });
});
