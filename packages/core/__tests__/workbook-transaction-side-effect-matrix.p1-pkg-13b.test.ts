import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';

const A1 = { row: 1, col: 1 };
const A2 = { row: 2, col: 1 };
const B1 = { row: 1, col: 2 };
const C3 = { row: 3, col: 3 };

function fixture(strategy: Strategy) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 5, cols: 4 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 5, 4) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 5, 4) as Worksheet;

  // Seed a dependency that will be invalidated and replaced while A1 itself
  // receives several operation kinds in one transaction.
  alphaRaw.setCellValue(A1, 10);
  alphaRaw.setCellValue(B1, 3);
  alphaRaw.setCellFormula(A2, '=A1+1', 11);
  alphaRaw.setCellStyle(A1, { bold: true });
  betaRaw.setRowHeight(1, 20); // explicit default, distinct from absence
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);

  const alpha: WorkbookSheetView = workbook.getSheet('Alpha')!;
  const beta: WorkbookSheetView = workbook.getSheet('Beta')!;
  const registration = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, alpha, beta, alphaRaw, betaRaw, registration };
}

function exactState(sheet: Worksheet) {
  const addresses = [A1, A2, B1, C3];
  return {
    snapshot: sheet.extractSnapshot(),
    graph: addresses.map((address) => ({
      address,
      precedents: sheet.getPrecedents(address),
      dependents: sheet.getDependents(address),
      dirty: sheet.isDirty(address),
    })),
    dirtyCount: sheet.dirtyCount,
    volatileCount: sheet.volatileCount,
  };
}

describe('PKG-13B seven-operation side-effect rollback matrix', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['journal', 'snapshot'] as const)(
    '%s restores repeated same-address cell/formula/style writes, graph state, sparse presence, dimensions, and pending events',
    async (strategy) => {
      const { workbook, alpha, beta, alphaRaw, betaRaw, registration } = fixture(strategy);
      const before = [exactState(alphaRaw), exactState(betaRaw)];
      const sheetEvents: unknown[] = [];
      const workbookEvents: unknown[] = [];
      alpha.on((event) => sheetEvents.push(['Alpha', event]));
      beta.on((event) => sheetEvents.push(['Beta', event]));
      for (const eventName of [
        'cell-value-change',
        'cell-formula-change',
        'cell-style-change',
        'row-height-change',
        'column-width-change',
      ] as const) {
        workbook.eventBus.on(eventName, (event) => workbookEvents.push([eventName, event]));
      }

      const injected = new Error(`PKG-13B ${strategy} failure after sparse cell write`);
      let cellRecords = 0;
      registration.dispose();
      const failureRegistration = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-cell-record' && ++cellRecords === 4) throw injected;
        },
      });

      await expect(workbook.transact((tx) => {
        // Dimension and cell state are interleaved across two Worksheets.
        tx.setRowHeight(beta, 1, 27);
        tx.setColumnWidth(beta, 2, 96);
        // Repeated, mixed writes to one existing address mutate and replace
        // its formula dependencies before the later sparse-cell fault.
        tx.setCellValue(alpha, A1, 12);
        tx.setCellFormula(alpha, A1, '=B1+4', 7);
        tx.setCellStyle(alpha, A1, { italic: true });
        tx.setCellValue(alpha, C3, 'transient');
      })).rejects.toBe(injected);

      expect(cellRecords).toBe(4);
      expect(exactState(alphaRaw)).toEqual(before[0]);
      expect(exactState(betaRaw)).toEqual(before[1]);
      expect(alphaRaw.getCell(C3)).toBeUndefined();
      expect(alphaRaw.getPrecedents(A1)).toEqual([]);
      expect(alphaRaw.getDependents(A1)).toContainEqual(A2);
      expect(alphaRaw.getPrecedents(A2)).toEqual([A1]);
      expect(sheetEvents).toEqual([]);
      expect(workbookEvents).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });

      failureRegistration.dispose();
      workbook.dispose();
    },
  );
});
