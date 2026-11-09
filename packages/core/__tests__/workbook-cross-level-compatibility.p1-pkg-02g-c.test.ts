import { Workbook, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

function fixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 4 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 4, 4) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 4, 4) as Worksheet;
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  return {
    workbook,
    alpha: workbook.getSheet('Alpha')!,
    beta: workbook.getSheet('Beta')!,
  };
}

describe('PKG-02G-C commit-boundary event compatibility', () => {
  test.each([
    ['Cell/value', 'cell-value-change', 'value'] as const,
    ['Cell/style', 'cell-style-change', 'style'] as const,
  ])('%s observers both see committed state regardless of bridge activation order', async (_label, eventName, kind) => {
    for (const workbookFirst of [true, false]) {
      const { workbook, alpha } = fixture();
      const observed: Array<{ surface: string; state: unknown }> = [];
      const subscribeWorkbook = () => workbook.eventBus.on(eventName, () => {
        observed.push({
          surface: 'workbook',
          state: kind === 'value'
            ? alpha.getCellValue({ row: 1, col: 1 })
            : alpha.getCellStyle({ row: 1, col: 1 })?.bold,
        });
      });
      const subscribeWorksheet = () => alpha.on((event) => {
        if ((kind === 'value' && event.type === 'cell-changed') ||
          (kind === 'style' && event.type === 'style-changed')) {
          observed.push({
            surface: 'worksheet',
            state: kind === 'value'
              ? alpha.getCellValue({ row: 1, col: 1 })
              : alpha.getCellStyle({ row: 1, col: 1 })?.bold,
          });
        }
      });
      const worksheetSubscription = workbookFirst ? undefined : subscribeWorksheet();
      const unsubscribeWorkbook = subscribeWorkbook();
      const lateWorksheetSubscription = workbookFirst ? subscribeWorksheet() : undefined;

      await workbook.transact((tx) => {
        if (kind === 'value') tx.setCellValue(alpha, { row: 1, col: 1 }, 'committed');
        else tx.setCellStyle(alpha, { row: 1, col: 1 }, { bold: true });
        expect(observed).toEqual([]);
      });

      expect(observed).toHaveLength(2);
      expect(observed.map(({ surface }) => surface).sort()).toEqual(['workbook', 'worksheet']);
      expect(observed.every(({ state }) => kind === 'value' ? state === 'committed' : state === true)).toBe(true);
      worksheetSubscription?.dispose();
      lateWorksheetSubscription?.dispose();
      unsubscribeWorkbook();
      workbook.dispose();
    }
  });

  test.each(['journal', 'snapshot'] as const)(
    '%s keeps mixed seven-operation Worksheet and Workbook traces commit-only and stage-consistent',
    async (strategy) => {
      const { workbook, alpha, beta } = fixture();
      const sheetTrace: string[] = [];
      const valuePayloads: unknown[] = [];
      const formulaPayloads: unknown[] = [];
      const stylePayloads: unknown[] = [];
      const rowPayloads: unknown[] = [];
      const columnPayloads: unknown[] = [];

      alpha.on((event) => sheetTrace.push(`Alpha:${event.type}`));
      beta.on((event) => sheetTrace.push(`Beta:${event.type}`));
      workbook.eventBus.on('cell-value-change', (event) => valuePayloads.push(event));
      workbook.eventBus.on('cell-formula-change', (event) => formulaPayloads.push(event));
      workbook.eventBus.on('cell-style-change', (event) => stylePayloads.push(event));
      workbook.eventBus.on('row-height-change', (event) => rowPayloads.push(event));
      workbook.eventBus.on('column-width-change', (event) => columnPayloads.push(event));
      const registration = setWorkbookMutationTestHooks(workbook, { strategy });

      await workbook.transact((tx) => {
        tx.setCellValue(alpha, { row: 1, col: 1 }, 'temporary');
        tx.setCellFormula(alpha, { row: 1, col: 2 }, '=7', 7);
        tx.clearCellContent(alpha, { row: 1, col: 1 });
        tx.clearCellFormula(alpha, { row: 1, col: 2 });
        tx.setCellStyle(beta, { row: 2, col: 2 }, { bold: true });
        tx.setRowHeight(alpha, 3, 34);
        tx.setColumnWidth(beta, 3, 101);
        expect(sheetTrace).toEqual([]);
        expect(valuePayloads).toEqual([]);
        expect(formulaPayloads).toEqual([]);
        expect(stylePayloads).toEqual([]);
        expect(rowPayloads).toEqual([]);
        expect(columnPayloads).toEqual([]);
      });

      expect(sheetTrace).toEqual([
        'Alpha:cell-changed',
        'Alpha:cell-changed',
        'Alpha:cell-changed',
        'Alpha:cell-changed',
        'Beta:style-changed',
        'Alpha:sheet-mutated',
        'Beta:sheet-mutated',
      ]);
      expect(valuePayloads.map((event: any) => event.newValue)).toEqual(['temporary', 7, null, 7]);
      expect(formulaPayloads).toEqual([{ row: 1, col: 2, formula: '=7' }]);
      expect(stylePayloads).toHaveLength(1);
      expect(stylePayloads[0]).toMatchObject({ row: 2, col: 2, style: { bold: true } });
      expect(rowPayloads).toEqual([{ worksheetId: alpha.worksheetId, row: 3, heightPx: 34 }]);
      expect(columnPayloads).toEqual([{ worksheetId: beta.worksheetId, column: 3, widthPx: 101 }]);

      // All observers run after the whole transaction has committed.
      expect(alpha.getCellValue({ row: 1, col: 1 })).toBeNull();
      expect(alpha.getCell({ row: 1, col: 2 })?.formula).toBeUndefined();
      expect(alpha.getCellValue({ row: 1, col: 2 })).toBe(7);
      expect(beta.getCellStyle({ row: 2, col: 2 })?.bold).toBe(true);
      expect(alpha.getRowHeight(3)).toBe(34);
      expect(beta.getColumnWidth(3)).toBe(101);

      registration.dispose();
      workbook.dispose();
    },
  );

  test('preserves cell no-op suppression while dimensions remain eventful per staged write', async () => {
    const { workbook, alpha } = fixture();
    const cellChanges: unknown[] = [];
    const rowChanges: unknown[] = [];
    alpha.on((event) => { if (event.type === 'cell-changed') cellChanges.push(event); });
    workbook.eventBus.on('cell-value-change', (event) => cellChanges.push(event));
    workbook.eventBus.on('row-height-change', (event) => rowChanges.push(event));

    await workbook.mutationPort.setCellValue(alpha, { row: 1, col: 1 }, 'same');
    cellChanges.length = 0;
    await workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'same');
      tx.clearCellContent(alpha, { row: 2, col: 2 });
      tx.setRowHeight(alpha, 1, 24);
      tx.setRowHeight(alpha, 1, 24);
    });

    expect(cellChanges).toEqual([]);
    expect(rowChanges).toEqual([
      { worksheetId: alpha.worksheetId, row: 1, heightPx: 24 },
      { worksheetId: alpha.worksheetId, row: 1, heightPx: 24 },
    ]);
    workbook.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s suppresses every event after clean mixed rollback', async (strategy) => {
    const { workbook, alpha, beta } = fixture();
    const observed: unknown[] = [];
    alpha.on((event) => observed.push(event));
    beta.on((event) => observed.push(event));
    for (const eventName of [
      'cell-value-change', 'cell-formula-change', 'cell-style-change',
      'row-height-change', 'column-width-change',
    ]) workbook.eventBus.on(eventName, (event) => observed.push(event));
    const failure = new Error(`rollback ${strategy} compatibility trace`);
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: (index) => { if (index === 4) throw failure; },
    });

    await expect(workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'temporary');
      tx.setCellFormula(alpha, { row: 1, col: 2 }, '=3', 3);
      tx.setCellStyle(beta, { row: 1, col: 1 }, { italic: true });
      tx.setRowHeight(alpha, 2, 29);
      tx.setColumnWidth(beta, 2, 93);
    })).rejects.toBe(failure);

    expect(observed).toEqual([]);
    expect(alpha.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(alpha.getCell({ row: 1, col: 2 })).toBeUndefined();
    expect(beta.getCellStyle({ row: 1, col: 1 })).toBeUndefined();
    expect(alpha.getRowHeight(2)).toBe(20);
    expect(beta.getColumnWidth(2)).toBe(80);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
    workbook.dispose();
  });
});
