import {
  Workbook,
  WorkbookMutationRollbackError,
  WorkbookOperationCancelledError,
  WorkbookRecoveryRequiredError,
  Worksheet,
} from '../src';
import { snapshotCodec } from '../src/persistence/SnapshotCodec';
import { getWorkbookMutationStrategy } from '../src/workbookMutationStrategy';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

function fixture(options: {
  alphaWidths?: Array<[number, number]>;
  betaWidths?: Array<[number, number]>;
  hiddenAlphaCols?: number[];
} = {}) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 3 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 4, 3) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 3, 2) as Worksheet;
  for (const [col, widthPx] of options.alphaWidths ?? []) alphaRaw.setColumnWidth(col, widthPx);
  for (const [col, widthPx] of options.betaWidths ?? []) betaRaw.setColumnWidth(col, widthPx);
  for (const col of options.hiddenAlphaCols ?? []) alphaRaw.hideCol(col);
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  return {
    workbook,
    alpha: workbook.getSheet('Alpha')!,
    beta: workbook.getSheet('Beta')!,
    alphaRaw,
    betaRaw,
  };
}

function exactWidths(sheet: Worksheet) {
  return (sheet.extractSnapshot().columnWidths ?? [])
    .map(({ col, width }) => ({ col, width }))
    .sort((a, b) => a.col - b.col);
}

function exactRows(sheet: Worksheet) {
  return (sheet.extractSnapshot().rowHeights ?? [])
    .map(({ row, height }) => ({ row, height }))
    .sort((a, b) => a.row - b.row);
}

describe('PKG-02B Workbook-owned column-width transaction', () => {
  afterEach(() => jest.restoreAllMocks());

  test('port and transaction context commit widths and publish one event per staged write', async () => {
    const { workbook, alpha } = fixture();
    const events: unknown[] = [];
    alpha.on((event) => events.push({ event, width: alpha.getColumnWidth(1) }));

    expect(getWorkbookMutationStrategy(workbook)).toBe('journal');
    await workbook.mutationPort.setColumnWidth(alpha, 1, 96.5);
    expect(alpha.getColumnWidth(1)).toBe(96.5);
    expect(events).toEqual([{ event: { type: 'sheet-mutated' }, width: 96.5 }]);

    events.length = 0;
    await workbook.transact((tx) => {
      tx.setColumnWidth(alpha, 1, 96.5);
      tx.setColumnWidth(alpha, 1, 104);
      expect(events).toEqual([]);
    });
    expect(alpha.getColumnWidth(1)).toBe(104);
    expect(events).toEqual([
      { event: { type: 'sheet-mutated' }, width: 104 },
      { event: { type: 'sheet-mutated' }, width: 104 },
    ]);
  });

  test('preflights all target columns and width values before applying any operation', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    for (const column of [0, -1, 1.5, NaN, Infinity, 4]) {
      await expect(workbook.mutationPort.setColumnWidth(alpha, column, 40)).rejects.toThrow(RangeError);
    }
    for (const width of [0, -1, NaN, Infinity, -Infinity, '32', null] as unknown[]) {
      await expect(workbook.mutationPort.setColumnWidth(alpha, 1, width as number)).rejects.toThrow(RangeError);
    }

    await expect(workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'must not apply');
      tx.setColumnWidth(alpha, 1, 45);
      tx.setColumnWidth(alpha, 4, 46);
    })).rejects.toThrow(RangeError);

    expect(alpha.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(exactWidths(alphaRaw)).toEqual([]);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
  });

  test('requires this Workbook owner and keeps the raw adopted setter guarded', async () => {
    const first = fixture();
    const second = fixture();
    expect(() => first.alphaRaw.setColumnWidth(1, 30)).toThrow();
    await expect(first.workbook.mutationPort.setColumnWidth(second.alpha, 1, 30)).rejects.toThrow();
    expect(exactWidths(first.alphaRaw)).toEqual([]);
    expect(exactWidths(second.alphaRaw)).toEqual([]);
  });

  test.each([
    ['absent entry', false],
    ['explicit default entry', true],
  ])('Journal restores exact sparse state for an %s and repeated writes', async (_label, explicitDefault) => {
    const { workbook, alpha, alphaRaw } = fixture({ alphaWidths: explicitDefault ? [[1, 80]] : [] });
    const before = exactWidths(alphaRaw);
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    const injected = new Error('fail after repeated column-width assignment');
    let writes = 0;
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-column-width-map-write' && ++writes === 2) throw injected;
      },
    });

    await expect(workbook.transact((tx) => {
      tx.setColumnWidth(alpha, 1, 91);
      tx.setColumnWidth(alpha, 1, 92);
    })).rejects.toBe(injected);
    expect(exactWidths(alphaRaw)).toEqual(before);
    expect(alpha.getColumnWidth(1)).toBe(80);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s independently restores absent and explicit-default width state', async (strategy) => {
    const { workbook, alpha, alphaRaw } = fixture({ alphaWidths: [[2, 80], [3, 120]] });
    const before = exactWidths(alphaRaw);
    const injected = new Error(`${strategy} column-width rollback`);
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      worksheetFailure: (phase) => {
        if (phase === 'after-column-width-map-write') throw injected;
      },
    });

    await expect(workbook.transact((tx) => {
      tx.setColumnWidth(alpha, 1, 81); // absent default 80
      tx.setColumnWidth(alpha, 2, 82); // explicit default 80
      tx.setColumnWidth(alpha, 3, 83);
    })).rejects.toBe(injected);
    expect(exactWidths(alphaRaw)).toEqual(before);
    expect(alpha.getColumnWidth(1)).toBe(80);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test('failure before the width-map write leaves state and events untouched', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const before = exactWidths(alphaRaw);
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    const injected = new Error('before column-width map write');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'before-column-width-map-write') throw injected;
      },
    });

    await expect(workbook.mutationPort.setColumnWidth(alpha, 1, 88)).rejects.toBe(injected);
    expect(exactWidths(alphaRaw)).toEqual(before);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s commits all seven operation kinds across sheets with staged event order', async (strategy) => {
    const { workbook, alpha, beta, alphaRaw } = fixture({ hiddenAlphaCols: [2] });
    const events: string[] = [];
    alpha.on((event) => events.push(`Alpha:${event.type}`));
    beta.on((event) => events.push(`Beta:${event.type}`));
    const registration = setWorkbookMutationTestHooks(workbook, { strategy });

    await workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'value');
      tx.setCellFormula(alpha, { row: 1, col: 2 }, '=1+2');
      tx.clearCellContent(alpha, { row: 1, col: 1 });
      tx.clearCellFormula(alpha, { row: 1, col: 2 });
      tx.setCellStyle(beta, { row: 1, col: 1 }, { bold: true });
      tx.setRowHeight(beta, 2, 31);
      tx.setColumnWidth(alpha, 2, 111.25);
      expect(events).toEqual([]);
    });

    expect(alpha.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(alpha.getCell({ row: 1, col: 2 })?.formula).toBeUndefined();
    expect(beta.getCellStyle({ row: 1, col: 1 })?.bold).toBe(true);
    expect(beta.getRowHeight(2)).toBe(31);
    expect(alpha.getColumnWidth(2)).toBe(111.25);
    expect(alphaRaw.extractSnapshot().hiddenCols).toContain(2);
    expect(events.filter((event) => event.endsWith(':sheet-mutated'))).toEqual([
      'Beta:sheet-mutated', 'Alpha:sheet-mutated',
    ]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s publishes interleaved cell and dimension events in global staged order', async (strategy) => {
    const { workbook, alpha, beta } = fixture();
    const events: string[] = [];
    alpha.on((event) => events.push(`Alpha:${event.type}`));
    beta.on((event) => events.push(`Beta:${event.type}`));
    const registration = setWorkbookMutationTestHooks(workbook, { strategy });

    await workbook.transact((tx) => {
      tx.setColumnWidth(beta, 1, 90);
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'first');
      tx.setRowHeight(beta, 1, 25);
      tx.setColumnWidth(alpha, 2, 110);
      tx.setCellValue(beta, { row: 1, col: 1 }, 'last');
    });

    expect(events).toEqual([
      'Beta:sheet-mutated',
      'Alpha:cell-changed',
      'Beta:sheet-mutated',
      'Alpha:sheet-mutated',
      'Beta:cell-changed',
    ]);
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s rolls back mixed seven-kind, multi-Worksheet transactions without publishing events', async (strategy) => {
    const { workbook, alpha, beta, alphaRaw, betaRaw } = fixture({ alphaWidths: [[2, 80]], betaWidths: [[1, 125]] });
    const alphaBefore = alphaRaw.extractSnapshot();
    const betaBefore = betaRaw.extractSnapshot();
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    beta.on((event) => events.push(event));
    const injected = new Error(`fail ${strategy} after width write`);
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      worksheetFailure: (phase) => {
        if (phase === 'after-column-width-map-write' && ++widthWrites === 2) throw injected;
      },
    });
    let widthWrites = 0;

    await expect(workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'x');
      tx.setCellFormula(alpha, { row: 1, col: 2 }, '=3');
      tx.clearCellContent(alpha, { row: 1, col: 1 });
      tx.clearCellFormula(alpha, { row: 1, col: 2 });
      tx.setCellStyle(beta, { row: 1, col: 1 }, { italic: true });
      tx.setRowHeight(beta, 2, 42);
      tx.setColumnWidth(alpha, 1, 99);
      tx.setColumnWidth(beta, 1, 130);
    })).rejects.toBe(injected);

    expect(exactWidths(alphaRaw)).toEqual(alphaBefore.columnWidths);
    expect(exactWidths(betaRaw)).toEqual(betaBefore.columnWidths);
    expect(exactRows(alphaRaw)).toEqual(alphaBefore.rowHeights);
    expect(exactRows(betaRaw)).toEqual(betaBefore.rowHeights);
    expect(alphaRaw.extractSnapshot().cells).toEqual(alphaBefore.cells);
    expect(betaRaw.extractSnapshot().cells).toEqual(betaBefore.cells);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test('validates hidden state remains independent and same-value writes stay eventful', async () => {
    const { workbook, alpha, alphaRaw } = fixture({ hiddenAlphaCols: [1] });
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    await workbook.transact((tx) => {
      tx.setColumnWidth(alpha, 1, 80);
      tx.setColumnWidth(alpha, 1, 80);
    });
    expect(alphaRaw.extractSnapshot().hiddenCols).toEqual([1]);
    expect(alpha.getColumnWidth(1)).toBe(80);
    expect(events).toEqual([{ type: 'sheet-mutated' }, { type: 'sheet-mutated' }]);
  });

  test('listener exceptions after commit do not undo width state or block later observers', async () => {
    const { workbook, alpha } = fixture();
    const observerError = new Error('observer failed');
    const laterObserver = jest.fn();
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    alpha.on(() => { throw observerError; });
    alpha.on(laterObserver);

    await workbook.mutationPort.setColumnWidth(alpha, 1, 135);

    expect(alpha.getColumnWidth(1)).toBe(135);
    expect(laterObserver).toHaveBeenCalledWith({ type: 'sheet-mutated' });
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    expect(log).toHaveBeenCalled();
  });

  test('column restoration failure retains both errors and requires recovery', async () => {
    const { workbook, alpha } = fixture();
    const operationError = new Error('primary width failure');
    const rollbackError = new Error('width restoration failure');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-column-width-map-write') throw operationError;
        if (phase === 'during-column-width-restore') throw rollbackError;
      },
    });

    const failure = await workbook.mutationPort.setColumnWidth(alpha, 1, 150).catch((error) => error);
    expect(failure).toBeInstanceOf(WorkbookMutationRollbackError);
    expect((failure as WorkbookMutationRollbackError).operationError).toBe(operationError);
    expect((failure as WorkbookMutationRollbackError).rollbackErrors).toContain(rollbackError);
    expect(workbook.getMutationHealth().status).toBe('recovery-required');
    registration.dispose();
    await expect(workbook.mutationPort.setColumnWidth(alpha, 2, 90)).rejects.toBeInstanceOf(WorkbookRecoveryRequiredError);
  });

  test('existing post-restoration hook covers the point before batch discard', async () => {
    const { workbook, alpha } = fixture();
    const operationError = new Error('apply failed');
    const cleanupError = new Error('post-restore cleanup failure');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-column-width-map-write') throw operationError;
        if (phase === 'after-row-height-restore-before-discard') throw cleanupError;
      },
    });
    const failure = await workbook.mutationPort.setColumnWidth(alpha, 1, 151).catch((error) => error);
    expect(failure).toBeInstanceOf(WorkbookMutationRollbackError);
    expect((failure as WorkbookMutationRollbackError).operationError).toBe(operationError);
    expect((failure as WorkbookMutationRollbackError).rollbackErrors).toContain(cleanupError);
    expect(workbook.getMutationHealth().status).toBe('recovery-required');
    registration.dispose();
  });

  test('disposing while queued cancels width mutation before apply', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const active = workbook.transact(async () => { await gate; });
    const queued = workbook.mutationPort.setColumnWidth(alpha, 1, 160);
    workbook.dispose();
    await expect(active).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    await expect(queued).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    expect(exactWidths(alphaRaw)).toEqual([]);
    release();
  });

  test('standalone setter remains permissive and emits directly; object snapshots retain widths while binary codec omits them', () => {
    const standalone = new Worksheet('Standalone', 3, 3);
    const events: unknown[] = [];
    standalone.on((event) => events.push(event));
    standalone.setColumnWidth(0, 80);
    standalone.setColumnWidth(0, 80);
    standalone.setColumnWidth(1, 0);
    expect(standalone.getColumnWidth(0)).toBe(80);
    expect(standalone.getColumnWidth(1)).toBe(0);
    expect(events).toHaveLength(3);

    const objectSnapshotSheet = new Worksheet('ObjectSnapshot', 3, 3);
    objectSnapshotSheet.setColumnWidth(2, 117.5);
    const objectSnapshot = objectSnapshotSheet.extractSnapshot();
    objectSnapshotSheet.setColumnWidth(2, 143);
    objectSnapshotSheet.applySnapshot(objectSnapshot);
    expect(objectSnapshotSheet.getColumnWidth(2)).toBe(117.5);

    const binarySnapshot = standalone.extractSnapshot();
    const roundTrip = snapshotCodec.decode(snapshotCodec.encode(binarySnapshot));
    expect(binarySnapshot.columnWidths).toEqual([{ col: 0, width: 80 }, { col: 1, width: 0 }]);
    expect(roundTrip.columnWidths).toBeUndefined();
  });
});
