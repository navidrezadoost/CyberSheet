import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { StyleCache } from '../src/StyleCache';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';

function fixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 4 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 4, 4) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 4, 4) as Worksheet;
  alphaRaw.setCellStyle({ row: 1, col: 1 }, { bold: true });
  betaRaw.setCellStyle({ row: 1, col: 1 }, { italic: true });
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  return {
    workbook,
    alpha: workbook.getSheet('Alpha') as WorkbookSheetView,
    beta: workbook.getSheet('Beta') as WorkbookSheetView,
    alphaRaw,
    betaRaw,
  };
}

describe('PKG-18C cross-Worksheet StyleCache rollback', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['journal', 'snapshot'] as const)(
    '%s releases every provisional reference when a shared canonical style was applied across sheets',
    async (strategy: Strategy) => {
      const { workbook, alpha, beta, alphaRaw, betaRaw } = fixture();
      const before = [alphaRaw.extractSnapshot(), betaRaw.extractSnapshot()];
      const events: unknown[] = [];
      const alphaSubscription = alpha.on((event) => events.push(['Alpha', event]));
      const betaSubscription = beta.on((event) => events.push(['Beta', event]));
      const release = jest.spyOn(StyleCache.prototype, 'release');
      const injected = new Error(`${strategy} failure after cross-sheet style writes`);
      let cellRecordWrites = 0;
      const hooks = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-cell-record' && ++cellRecordWrites === 3) throw injected;
        },
      });

      await expect(workbook.transact((tx) => {
        tx.setCellStyle(alpha, { row: 2, col: 1 }, { color: '#2468ac', underline: true });
        tx.setCellStyle(beta, { row: 2, col: 1 }, { underline: true, color: '#2468ac' });
        tx.setCellValue(alpha, { row: 3, col: 1 }, 'fault after both style applies');
      })).rejects.toBe(injected);

      expect(cellRecordWrites).toBe(3);
      expect(alphaRaw.extractSnapshot()).toEqual(before[0]);
      expect(betaRaw.extractSnapshot()).toEqual(before[1]);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });

      // Both structurally equal staged styles intern to one canonical object,
      // but each staged assignment owns one provisional cache reference.
      expect(release).toHaveBeenCalledTimes(2);
      expect(release.mock.calls[0][0]).toBe(release.mock.calls[1][0]);
      expect(alphaRaw.getCellStyle({ row: 2, col: 1 })).toBeUndefined();
      expect(betaRaw.getCellStyle({ row: 2, col: 1 })).toBeUndefined();

      hooks.dispose();
      alphaSubscription.dispose();
      betaSubscription.dispose();
      workbook.dispose();
    },
  );
});
