import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';

function fixture(strategy: Strategy) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 5, cols: 5 }] });
  const raw = workbook.createDevImportWorksheet('Merged', 5, 5) as Worksheet;
  raw.setCellValue({ row: 1, col: 4 }, 2);
  raw.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
  workbook.attachDevImportSheet(raw);
  const view = workbook.getSheet('Merged')!;
  const registration = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, raw, view, registration };
}

function mergedMember(): { row: number; col: number } {
  return { row: 2, col: 2 };
}

describe('PKG-12A Workbook merged-member transaction integrity', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['journal', 'snapshot'] as const)(
    '%s formula write through a merged member stores formula dependencies at the effective anchor',
    async (strategy) => {
      const { workbook, raw, view, registration } = fixture(strategy);
      const anchor = { row: 1, col: 1 };
      const precedent = { row: 1, col: 4 };

      await workbook.transact((tx) => {
        tx.setCellFormula(view, mergedMember(), '=$D$1+1', 3);
      });

      expect(raw.getCell(anchor)).toMatchObject({ formula: '=$D$1+1', value: 3 });
      // Owner-backed formula reads intentionally mask cached results.
      expect(view.getCell(mergedMember())).toMatchObject({ formula: '=$D$1+1', value: null });
      expect(raw.getPrecedents(anchor)).toEqual([precedent]);
      expect(raw.getDependents(precedent)).toContainEqual(anchor);
      expect(raw.getPrecedents(mergedMember())).toEqual([]);

      await workbook.transact((tx) => {
        tx.clearCellFormula(view, mergedMember());
      });
      expect(raw.getCell(anchor)?.formula).toBeUndefined();
      expect(raw.getPrecedents(anchor)).toEqual([]);
      expect(raw.getDependents(precedent)).not.toContainEqual(anchor);

      await workbook.transact((tx) => {
        tx.setCellFormula(view, mergedMember(), '=$D$1+2', 4);
      });
      await workbook.transact((tx) => {
        tx.setCellValue(view, mergedMember(), 8);
      });
      expect(raw.getCell(anchor)).toMatchObject({ value: 8, formula: undefined });
      expect(raw.getPrecedents(anchor)).toEqual([]);
      expect(raw.getDependents(precedent)).not.toContainEqual(anchor);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      registration.dispose();
    },
  );

  test.each(['journal', 'snapshot'] as const)(
    '%s rollback restores exact anchor state and suppresses events after merged-member writes',
    async (strategy) => {
      const { workbook, raw, view, registration } = fixture(strategy);
      const before = raw.extractSnapshot();
      const events: unknown[] = [];
      view.on((event) => events.push(event));
      const injected = new Error(`PKG-12A merged member ${strategy} rollback`);
      let cellWrites = 0;
      registration.dispose();
      const failureRegistration = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-cell-record' && ++cellWrites === 2) throw injected;
        },
      });

      await expect(workbook.transact((tx) => {
        tx.setCellStyle(view, mergedMember(), { bold: true });
        tx.setCellFormula(view, mergedMember(), '=$D$1+1', 3);
      })).rejects.toBe(injected);

      expect(raw.extractSnapshot()).toEqual(before);
      expect(raw.getCell({ row: 1, col: 1 })).toBeUndefined();
      expect(raw.getPrecedents({ row: 1, col: 1 })).toEqual([]);
      expect(raw.getPrecedents({ row: 2, col: 2 })).toEqual([]);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      failureRegistration.dispose();
    },
  );

  test('successful multi-sheet transaction redirects value and style writes through merged members', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 5, cols: 5 }] });
    const alphaRaw = workbook.createDevImportWorksheet('Alpha', 5, 5) as Worksheet;
    const betaRaw = workbook.createDevImportWorksheet('Beta', 5, 5) as Worksheet;
    alphaRaw.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    betaRaw.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    workbook.attachDevImportSheet(alphaRaw);
    workbook.attachDevImportSheet(betaRaw);
    const alpha: WorkbookSheetView = workbook.getSheet('Alpha')!;
    const beta: WorkbookSheetView = workbook.getSheet('Beta')!;

    await workbook.transact((tx) => {
      tx.setCellValue(alpha, mergedMember(), 'alpha');
      tx.setCellStyle(beta, mergedMember(), { italic: true });
    });

    expect(alpha.getCellValue({ row: 1, col: 1 })).toBe('alpha');
    expect(alpha.getCellValue(mergedMember())).toBe('alpha');
    expect(beta.getCellStyle({ row: 1, col: 1 })?.italic).toBe(true);
    expect(beta.getCellStyle(mergedMember())?.italic).toBe(true);
    expect(alphaRaw.extractSnapshot().cells).toHaveLength(1);
    expect(betaRaw.extractSnapshot().cells).toHaveLength(1);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
  });
});
