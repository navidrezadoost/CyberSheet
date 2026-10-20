import { Workbook } from '../src/workbook';
import { Worksheet, adoptWorksheetByWorkbook } from '../src/worksheet';
import { OwnerBackedWorkbookSheetView } from '../src/WorkbookSheetView';
import type { WorksheetId } from '../src/workbook-access-types';

describe('R1 owner-backed workbook sheet views', () => {
  test('bootstrap validates the complete initial directory before publication', () => {
    expect(() => Workbook.create({ sheets: [{ name: 'One' }, { name: 'One' }] })).toThrow(/already exists/);
    const workbook = Workbook.create({ sheets: [{ name: 'One' }, { name: 'Two', rows: 10, cols: 4 }] });
    expect(workbook.getSheetNames()).toEqual(['One', 'Two']);
    expect(workbook.getSheet('One')).toMatchObject({ name: 'One', workbookId: workbook.workbookId });
    expect(workbook.activeSheet?.name).toBe('One');
  });

  test('retained views resolve by stable owner and worksheet identities', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Original' }] });
    const view = workbook.getSheet('Original')!;
    expect(view).toBe(workbook.getSheet('Original'));
    expect(view.worksheetId).toBeTruthy();
    expect(view.workbookId).toBe(workbook.workbookId);
  });

  test('cell reads are detached and formula status is never claimed current in R1', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Read' }] });
    const view = workbook.activeSheet!;
    const read = view.getCellRead({ row: 1, col: 1 });
    expect(read.formulaResultStatus).toBe('unavailable');
    expect(Object.isFrozen(read)).toBe(true);
  });

  test('formula cache values are withheld from view reads until generation ownership exists', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owner' }] });
    const raw = new Worksheet('Candidate', 4, 4);
    raw.setCellFormula({ row: 1, col: 1 }, '=1+1', 2);
    adoptWorksheetByWorkbook(raw, workbook.workbookId);
    const worksheetId = 'candidate-id' as WorksheetId;
    const view = new OwnerBackedWorkbookSheetView(
      workbook.workbookId,
      worksheetId,
      () => raw,
    );

    expect(view.getCell({ row: 1, col: 1 })).toMatchObject({ formula: '=1+1', value: null });
    expect(view.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(view.getCellRead({ row: 1, col: 1 }).formulaResultStatus).toBe('unavailable');
  });

  test('post-publication sheet lifecycle calls reject before changing the directory', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Keep' }] });
    expect(() => workbook.addSheet('Later')).toThrow(/unavailable/);
    expect(() => workbook.deleteSheet('Keep')).toThrow(/unavailable/);
    expect(() => workbook.renameSheet('Keep', 'Changed')).toThrow(/unavailable/);
    expect(workbook.getSheetNames()).toEqual(['Keep']);
  });
});
