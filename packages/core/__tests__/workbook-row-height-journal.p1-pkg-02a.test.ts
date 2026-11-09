import { Workbook, WorkbookMutationRollbackError, WorkbookOperationCancelledError, WorkbookRecoveryRequiredError, Worksheet } from '../src';
import { getWorkbookMutationStrategy } from '../src/workbookMutationStrategy';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

function fixture(options: { alphaHeights?: Array<[number, number]> } = {}) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 3 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 4, 3) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 3, 2) as Worksheet;
  for (const [row, heightPx] of options.alphaHeights ?? []) alphaRaw.setRowHeight(row, heightPx);
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

function exactRowHeights(sheet: Worksheet) {
  return (sheet.extractSnapshot().rowHeights ?? [])
    .map(({ row, height }) => ({ row, height }))
    .sort((a, b) => a.row - b.row);
}

describe('PKG-02A Workbook-owned row-height transaction', () => {
  afterEach(() => jest.restoreAllMocks());

  test('port and transaction context commit row heights and publish one event per staged write in order', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const events: unknown[] = [];
    alpha.on((event) => events.push({ event, visibleHeight: alpha.getRowHeight(1) }));

    expect(getWorkbookMutationStrategy(workbook)).toBe('journal');
    await workbook.mutationPort.setRowHeight(alpha, 1, 20);
    expect(alpha.getRowHeight(1)).toBe(20);
    expect(exactRowHeights(alphaRaw)).toEqual([{ row: 1, height: 20 }]);
    expect(events).toHaveLength(1);

    events.length = 0;
    await workbook.transact((transaction) => {
      transaction.setRowHeight(alpha, 1, 30);
      transaction.setRowHeight(alpha, 1, 30);
      transaction.setRowHeight(alpha, 2, 40);
      expect(events).toHaveLength(0);
    });
    expect(alpha.getRowHeight(1)).toBe(30);
    expect(alpha.getRowHeight(2)).toBe(40);
    expect(events).toHaveLength(3);
    expect(events).toEqual([
      { event: { type: 'sheet-mutated' }, visibleHeight: 30 },
      { event: { type: 'sheet-mutated' }, visibleHeight: 30 },
      { event: { type: 'sheet-mutated' }, visibleHeight: 30 },
    ]);
  });

  test('validates all row and height arguments before applying any staged operation', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    const before = exactRowHeights(alphaRaw);

    for (const row of [0, -1, 1.5, NaN, Infinity, 5]) {
      await expect(workbook.mutationPort.setRowHeight(alpha, row, 24)).rejects.toThrow(RangeError);
    }
    for (const height of [0, -1, NaN, Infinity, -Infinity]) {
      await expect(workbook.mutationPort.setRowHeight(alpha, 1, height)).rejects.toThrow(RangeError);
    }
    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(alpha, { row: 1, col: 1 }, 'must not apply');
      transaction.setRowHeight(alpha, 5, 50);
    })).rejects.toThrow(RangeError);

    expect(alpha.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(exactRowHeights(alphaRaw)).toEqual(before);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
  });

  test.each([
    ['absent entry', false],
    ['explicit default entry', true],
  ])('journal rollback restores exact sparse state for an %s', async (_label, explicitDefault) => {
    const { workbook, alpha, alphaRaw } = fixture({
      alphaHeights: explicitDefault ? [[1, 20]] : [],
    });
    const before = exactRowHeights(alphaRaw);
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    const injected = new Error('after row-height map write');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-row-height-map-write') throw injected;
      },
    });

    await expect(workbook.mutationPort.setRowHeight(alpha, 1, 35)).rejects.toBe(injected);
    expect(exactRowHeights(alphaRaw)).toEqual(before);
    expect(alpha.getRowHeight(1)).toBe(20);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s retains explicit default-height presence on rollback', async (strategy) => {
    const { workbook, alpha, alphaRaw } = fixture({ alphaHeights: [[1, 20]] });
    const before = exactRowHeights(alphaRaw);
    const injected = new Error(`rollback ${strategy} explicit default`);
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      worksheetFailure: (phase) => {
        if (phase === 'after-row-height-map-write') throw injected;
      },
    });

    await expect(workbook.mutationPort.setRowHeight(alpha, 1, 34)).rejects.toBe(injected);
    expect(exactRowHeights(alphaRaw)).toEqual(before);
    expect(alpha.getRowHeight(1)).toBe(20);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test('failure before the primary map write leaves state and events untouched', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const before = exactRowHeights(alphaRaw);
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    const injected = new Error('before row-height map write');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'before-row-height-map-write') throw injected;
      },
    });

    await expect(workbook.mutationPort.setRowHeight(alpha, 1, 35)).rejects.toBe(injected);
    expect(exactRowHeights(alphaRaw)).toEqual(before);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test('repeated writes retain the first before-image and multiple row writes roll back', async () => {
    const { workbook, alpha, alphaRaw } = fixture({ alphaHeights: [[2, 20]] });
    const before = exactRowHeights(alphaRaw);
    let rowWrites = 0;
    const injected = new Error('fail after second row write');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-row-height-map-write' && ++rowWrites === 3) throw injected;
      },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setRowHeight(alpha, 1, 21);
      transaction.setRowHeight(alpha, 1, 22);
      transaction.setRowHeight(alpha, 2, 23);
    })).rejects.toBe(injected);
    expect(exactRowHeights(alphaRaw)).toEqual(before);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s atomically rolls back mixed cell and row-height writes in either order', async (strategy) => {
    const { workbook, alpha, alphaRaw } = fixture();
    const beforeRows = exactRowHeights(alphaRaw);
    const beforeValue = alpha.getCellValue({ row: 1, col: 1 });
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    const injected = new Error(`fail ${strategy} mixed batch`);
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: (index) => { if (index === 2) throw injected; },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setRowHeight(alpha, 1, 31);
      transaction.setCellValue(alpha, { row: 1, col: 1 }, 'temporary');
      transaction.setRowHeight(alpha, 2, 41);
    })).rejects.toBe(injected);
    expect(alpha.getCellValue({ row: 1, col: 1 })).toBe(beforeValue);
    expect(exactRowHeights(alphaRaw)).toEqual(beforeRows);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s commits mixed cell/row-height changes across Worksheets with staged event order', async (strategy) => {
    const { workbook, alpha, beta } = fixture();
    const events: string[] = [];
    alpha.on((event) => { if (event.type === 'sheet-mutated') events.push('Alpha'); });
    beta.on((event) => { if (event.type === 'sheet-mutated') events.push('Beta'); });
    const registration = setWorkbookMutationTestHooks(workbook, { strategy });

    await workbook.transact((transaction) => {
      transaction.setRowHeight(beta, 2, 32);
      transaction.setCellValue(alpha, { row: 1, col: 1 }, 'committed');
      transaction.setRowHeight(alpha, 3, 42);
      transaction.setRowHeight(beta, 2, 33);
    });

    expect(alpha.getCellValue({ row: 1, col: 1 })).toBe('committed');
    expect(alpha.getRowHeight(3)).toBe(42);
    expect(beta.getRowHeight(2)).toBe(33);
    expect(events).toEqual(['Beta', 'Alpha', 'Beta']);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test.each(['journal', 'snapshot'] as const)('%s restores multiple Worksheets after a later sheet write fails', async (strategy) => {
    const { workbook, alpha, beta, alphaRaw, betaRaw } = fixture();
    const beforeAlpha = exactRowHeights(alphaRaw);
    const beforeBeta = exactRowHeights(betaRaw);
    const events: unknown[] = [];
    alpha.on((event) => events.push(event));
    beta.on((event) => events.push(event));
    let writes = 0;
    const injected = new Error('fail after cross-sheet writes');
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      worksheetFailure: (phase) => {
        if (phase === 'after-row-height-map-write' && ++writes === 2) throw injected;
      },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setRowHeight(alpha, 1, 27);
      transaction.setRowHeight(beta, 2, 37);
    })).rejects.toBe(injected);
    expect(exactRowHeights(alphaRaw)).toEqual(beforeAlpha);
    expect(exactRowHeights(betaRaw)).toEqual(beforeBeta);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    registration.dispose();
  });

  test('restoration failure retains both errors and recovery-required rejects later queued mutations', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const operationError = new Error('primary row-height failure');
    const rollbackError = new Error('row-height restoration failure');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-row-height-map-write') throw operationError;
        if (phase === 'during-row-height-restore') throw rollbackError;
      },
    });

    const failure = await workbook.mutationPort.setRowHeight(alpha, 1, 39).catch((error) => error);
    expect(failure).toBeInstanceOf(WorkbookMutationRollbackError);
    expect((failure as WorkbookMutationRollbackError).operationError).toBe(operationError);
    expect((failure as WorkbookMutationRollbackError).rollbackErrors).toContain(rollbackError);
    expect(workbook.getMutationHealth()).toMatchObject({ status: 'recovery-required' });
    await expect(workbook.mutationPort.setRowHeight(alpha, 2, 49)).rejects.toBeInstanceOf(WorkbookRecoveryRequiredError);
    expect(exactRowHeights(alphaRaw)).toEqual([{ row: 1, height: 39 }]);
    registration.dispose();
  });

  test('failure after restoration but before batch discard is surfaced as recovery-required', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    const before = exactRowHeights(alphaRaw);
    const operationError = new Error('apply failed');
    const cleanupError = new Error('post-restore cleanup failure');
    const registration = setWorkbookMutationTestHooks(workbook, {
      worksheetFailure: (phase) => {
        if (phase === 'after-row-height-map-write') throw operationError;
        if (phase === 'after-row-height-restore-before-discard') throw cleanupError;
      },
    });

    const failure = await workbook.mutationPort.setRowHeight(alpha, 1, 55).catch((error) => error);
    expect(failure).toBeInstanceOf(WorkbookMutationRollbackError);
    expect((failure as WorkbookMutationRollbackError).operationError).toBe(operationError);
    expect((failure as WorkbookMutationRollbackError).rollbackErrors).toContain(cleanupError);
    expect(exactRowHeights(alphaRaw)).toEqual(before);
    expect(workbook.getMutationHealth()).toMatchObject({ status: 'recovery-required' });
    registration.dispose();
  });

  test('listener exceptions do not uncommit or prevent later observers from receiving committed events', async () => {
    const { workbook, alpha } = fixture();
    const observerError = new Error('observer failed');
    const laterObserver = jest.fn();
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    alpha.on(() => { throw observerError; });
    alpha.on(laterObserver);

    await workbook.mutationPort.setRowHeight(alpha, 1, 26);

    expect(alpha.getRowHeight(1)).toBe(26);
    expect(laterObserver).toHaveBeenCalledWith({ type: 'sheet-mutated' });
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    expect(log).toHaveBeenCalled();
  });

  test('disposal cancels a queued row-height operation before apply', async () => {
    const { workbook, alpha, alphaRaw } = fixture();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const transaction = workbook.transact(async () => { await gate; });
    const queued = workbook.mutationPort.setRowHeight(alpha, 1, 29);
    workbook.dispose();

    await expect(transaction).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    await expect(queued).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    expect(exactRowHeights(alphaRaw)).toEqual([]);
    release();
  });

  test('standalone Worksheet setter keeps its permissive direct-event behavior', () => {
    const standalone = new Worksheet('Standalone', 3, 2);
    const events: unknown[] = [];
    standalone.on((event) => events.push(event));

    standalone.setRowHeight(0, 20);
    standalone.setRowHeight(0, 20);

    expect(standalone.getRowHeight(0)).toBe(20);
    expect(events).toEqual([{ type: 'sheet-mutated' }, { type: 'sheet-mutated' }]);
    expect(exactRowHeights(standalone)).toEqual([{ row: 0, height: 20 }]);
  });
});
