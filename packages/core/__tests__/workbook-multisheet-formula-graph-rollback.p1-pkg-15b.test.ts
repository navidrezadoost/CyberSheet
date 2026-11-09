import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';
import {
  getWorksheetCellWriteJournalStatusForTesting,
  getWorksheetDependencyGraphStateForTesting,
} from '../src/worksheet';

const A1 = { row: 1, col: 1 };
const A2 = { row: 2, col: 1 };
const A3 = { row: 3, col: 1 };

function fixture(strategy: 'journal' | 'snapshot') {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 3 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 4, 3) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 4, 3) as Worksheet;
  alphaRaw.setCellValue(A1, 10);
  alphaRaw.setCellFormula(A2, '=A1+1', 11);
  betaRaw.setCellValue(A1, 20);
  betaRaw.setCellFormula(A2, '=A1+2', 22);
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  const alpha = workbook.getSheet('Alpha') as WorkbookSheetView;
  const beta = workbook.getSheet('Beta') as WorkbookSheetView;
  const hooks = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, alphaRaw, betaRaw, alpha, beta, hooks };
}

function exactState(sheet: Worksheet) {
  return {
    snapshot: sheet.extractSnapshot(),
    graph: getWorksheetDependencyGraphStateForTesting(sheet),
  };
}

describe('PKG-15B cross-Worksheet formula graph rollback', () => {
  test.each(['journal', 'snapshot'] as const)(
    '%s restores an earlier Worksheet when graph registration fails on the next Worksheet',
    async (strategy) => {
      const { workbook, alphaRaw, betaRaw, alpha, beta, hooks } = fixture(strategy);
      const before = [exactState(alphaRaw), exactState(betaRaw)];
      const worksheetEvents: unknown[] = [];
      alpha.on((event) => worksheetEvents.push(['Alpha', event]));
      beta.on((event) => worksheetEvents.push(['Beta', event]));
      const workbookEvents: unknown[] = [];
      for (const name of ['cell-value-change', 'cell-formula-change'] as const) {
        workbook.eventBus.on(name, (event) => workbookEvents.push([name, event]));
      }

      const injected = new Error(`${strategy} second-Worksheet dependency registration`);
      let registrations = 0;
      let injectedAtSecondRegistration = false;
      hooks.dispose();
      const failureHooks = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-dependency-registration' && !injectedAtSecondRegistration && ++registrations === 2) {
            injectedAtSecondRegistration = true;
            throw injected;
          }
        },
      });

      try {
        await expect(workbook.transact((tx) => {
          tx.setCellFormula(alpha, A3, '=A1+3', 13);
          tx.setCellFormula(beta, A3, '=A1+4', 24);
        })).rejects.toBe(injected);

        expect(injectedAtSecondRegistration).toBe(true);
        expect(exactState(alphaRaw)).toEqual(before[0]);
        expect(exactState(betaRaw)).toEqual(before[1]);
        expect(alphaRaw.getPrecedents(A3)).toEqual([]);
        expect(betaRaw.getPrecedents(A3)).toEqual([]);
        expect(worksheetEvents).toEqual([]);
        expect(workbookEvents).toEqual([]);
        expect(getWorksheetCellWriteJournalStatusForTesting(alphaRaw).active).toBe(false);
        expect(getWorksheetCellWriteJournalStatusForTesting(betaRaw).active).toBe(false);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      } finally {
        failureHooks.dispose();
        workbook.dispose();
      }
    },
  );
});
