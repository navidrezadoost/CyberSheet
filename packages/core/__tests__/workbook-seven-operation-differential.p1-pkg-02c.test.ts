import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';

function fixture(strategy: Strategy, explicitDefaults = false) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 6, cols: 4 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 6, 4) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 5, 3) as Worksheet;
  if (explicitDefaults) {
    alphaRaw.setRowHeight(1, 20);
    alphaRaw.setColumnWidth(1, 80);
    betaRaw.setRowHeight(2, 20);
    betaRaw.setColumnWidth(2, 80);
  }
  alphaRaw.setCellValue({ row: 1, col: 1 }, 10);
  alphaRaw.setCellValue({ row: 2, col: 1 }, 20);
  alphaRaw.setCellFormula({ row: 3, col: 1 }, '=SUM(A1:A2)');
  alphaRaw.hideCol(3);
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  const alpha = workbook.getSheet('Alpha')!;
  const beta = workbook.getSheet('Beta')!;
  const registration = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, alpha, beta, alphaRaw, betaRaw, registration };
}

function state(sheet: Worksheet) {
  const snapshot = sheet.extractSnapshot();
  return {
    snapshot,
    precedents: [1, 2, 3].map((row) => sheet.getPrecedents({ row, col: 1 })),
    dependents: [1, 2, 3].map((row) => sheet.getDependents({ row, col: 1 })),
    dirty: [1, 2, 3].map((row) => sheet.isDirty({ row, col: 1 })),
    dirtyCount: sheet.dirtyCount,
    volatileCount: sheet.volatileCount,
  };
}

async function applyMixed(workbook: Workbook, alpha: WorkbookSheetView, beta: WorkbookSheetView) {
  await workbook.transact((tx) => {
    tx.setCellValue(alpha, { row: 1, col: 2 }, 'first');
    tx.setRowHeight(beta, 2, 31);
    tx.setCellFormula(alpha, { row: 4, col: 1 }, '=A3+1');
    tx.setColumnWidth(alpha, 2, 101.5);
    tx.setCellStyle(beta, { row: 1, col: 1 }, { bold: true, color: '#123456' });
    tx.clearCellContent(alpha, { row: 1, col: 2 });
    tx.setRowHeight(beta, 2, 33);
    tx.setColumnWidth(alpha, 2, 102.5);
    tx.setCellValue(beta, { row: 2, col: 2 }, 77);
    tx.clearCellFormula(alpha, { row: 4, col: 1 });
    tx.setCellStyle(beta, { row: 1, col: 1 }, { italic: true });
    tx.setColumnWidth(beta, 1, 91);
  });
}

describe('PKG-02C seven-operation Journal/Snapshot differential', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Journal and Snapshot produce identical detached state for the same mixed sequence', async () => {
    const journal = fixture('journal', true);
    const snapshot = fixture('snapshot', true);
    await applyMixed(journal.workbook, journal.alpha, journal.beta);
    await applyMixed(snapshot.workbook, snapshot.alpha, snapshot.beta);
    expect([state(journal.alphaRaw), state(journal.betaRaw)]).toEqual([
      state(snapshot.alphaRaw), state(snapshot.betaRaw),
    ]);
    expect(journal.workbook.getMutationHealth()).toEqual(snapshot.workbook.getMutationHealth());
    journal.registration.dispose();
    snapshot.registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s commits a deterministic mixed sequence with staged event visibility', async (strategy) => {
    const { workbook, alpha, beta, alphaRaw, betaRaw, registration } = fixture(strategy, true);
    const seen: Array<{ type: string; alphaValue: unknown; betaValue: unknown; rowHeight: number; colWidth: number }> = [];
    const unsub = workbook.eventBus.on('cell-value-change', () => {
      seen.push({
        type: 'cell-value-change',
        alphaValue: alpha.getCellValue({ row: 1, col: 2 }),
        betaValue: beta.getCellValue({ row: 2, col: 2 }),
        rowHeight: beta.getRowHeight(2),
        colWidth: alpha.getColumnWidth(2),
      });
    });
    await applyMixed(workbook, alpha, beta);
    expect(alpha.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(beta.getCellValue({ row: 2, col: 2 })).toBe(77);
    expect(alpha.getCell({ row: 4, col: 1 })?.formula).toBeUndefined();
    expect(alpha.getRowHeight(1)).toBe(20);
    expect(alpha.getColumnWidth(1)).toBe(80);
    expect(beta.getRowHeight(2)).toBe(33);
    expect(alpha.getColumnWidth(2)).toBe(102.5);
    expect(alphaRaw.extractSnapshot().hiddenCols).toEqual([3]);
    expect(exactDimensionEntries(alphaRaw)).toEqual({ rows: [{ row: 1, height: 20 }], cols: [{ col: 1, width: 80 }, { col: 2, width: 102.5 }] });
    expect(exactDimensionEntries(betaRaw)).toEqual({ rows: [{ row: 2, height: 33 }], cols: [{ col: 1, width: 91 }, { col: 2, width: 80 }] });
    expect(seen).toHaveLength(5);
    expect(seen.every((event) =>
      event.alphaValue === null && event.betaValue === 77 &&
      event.rowHeight === 33 && event.colWidth === 102.5,
    )).toBe(true);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    unsub();
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s restores exact multi-sheet state and emits no committed event after a mixed-operation failure', async (strategy) => {
    const { workbook, alpha, beta, alphaRaw, betaRaw, registration } = fixture(strategy);
    const before = [state(alphaRaw), state(betaRaw)];
    const events: unknown[] = [];
    alpha.on((event) => events.push(['Alpha', event]));
    beta.on((event) => events.push(['Beta', event]));
    const injected = new Error(`PKG-02C ${strategy} mixed rollback`);
    let widthWrites = 0;
    registration.dispose();
    const failureRegistration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      worksheetFailure: (phase) => {
        if (phase === 'after-column-width-map-write' && ++widthWrites === 2) throw injected;
      },
    });
    await expect(workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 5, col: 1 }, 'transient');
      tx.setCellFormula(alpha, { row: 5, col: 2 }, '=A3');
      tx.setCellStyle(beta, { row: 3, col: 1 }, { underline: true });
      tx.setRowHeight(beta, 3, 44);
      tx.setColumnWidth(alpha, 3, 121);
      tx.clearCellContent(alpha, { row: 1, col: 1 });
      tx.clearCellFormula(alpha, { row: 3, col: 1 });
      tx.setColumnWidth(beta, 2, 122);
    })).rejects.toBe(injected);
    expect([state(alphaRaw), state(betaRaw)]).toEqual(before);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    failureRegistration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s restores state if the second Worksheet fails while settling its event batch', async (strategy) => {
    const { workbook, alpha, beta, alphaRaw, betaRaw, registration } = fixture(strategy);
    const before = [state(alphaRaw), state(betaRaw)];
    const events: unknown[] = [];
    alpha.on((event) => events.push(['Alpha', event]));
    beta.on((event) => events.push(['Beta', event]));
    const injected = new Error(`PKG-02C ${strategy} event-batch settlement`);
    let settlements = 0;
    registration.dispose();
    const failureRegistration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeBatchSettlement: (index) => {
        settlements++;
        if (index === 1) throw injected;
      },
    });
    await expect(workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 6, col: 1 }, 'settlement');
      tx.setRowHeight(beta, 4, 46);
      tx.setColumnWidth(alpha, 4, 123);
      tx.setCellStyle(beta, { row: 4, col: 2 }, { bold: true });
    })).rejects.toBe(injected);
    expect(settlements).toBe(2);
    expect([state(alphaRaw), state(betaRaw)]).toEqual(before);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    failureRegistration.dispose();
  });
});

function exactDimensionEntries(sheet: Worksheet) {
  const snapshot = sheet.extractSnapshot();
  return {
    rows: [...(snapshot.rowHeights ?? [])].sort((a, b) => a.row - b.row),
    cols: [...(snapshot.columnWidths ?? [])].sort((a, b) => a.col - b.col),
  };
}
