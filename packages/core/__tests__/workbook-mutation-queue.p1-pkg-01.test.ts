import {
  Workbook,
  WorkbookMutationRollbackError,
  WorkbookOperationCancelledError,
  WorkbookRecoveryRequiredError,
  isInternedStyle,
  WorksheetFormulaPostCommitError,
} from '../src';
import { StyleCache } from '../src/StyleCache';
import { getWorkbookMutationStrategy } from '../src/workbookMutationStrategy';
import type { WorkbookTransactionContext } from '../src/workbook-access-types';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';
import {
  Worksheet,
  getWorksheetCellWriteJournalStatusForTesting,
  getWorksheetDependencyGraphStateForTesting,
  setStandaloneFormulaExtractionTestHook,
  setStandaloneFormulaGraphFailureTestHook,
  setStandaloneFormulaRestorationTestHook,
  setStandaloneFormulaRegistrationTestHook,
} from '../src/worksheet';

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture(rows = 10, cols = 10) {
  const workbook = Workbook.create({ sheets: [{ name: 'Main', rows, cols }] });
  const raw = workbook.createDevImportWorksheet('Edit', rows, cols);
  raw.setCellValue({ row: 1, col: 1 }, 4);
  raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 5);
  raw.setCellFormula({ row: 1, col: 4 }, '=SUM(A1:A3)', 9);
  raw.setCellStyle({ row: 1, col: 3 }, { bold: true });
  raw.completeScheduledRecalculation();
  workbook.attachDevImportSheet(raw);
  const view = workbook.getSheet('Edit')!;
  return { workbook, raw: raw as Worksheet, view };
}

function exactState(raw: Worksheet) {
  const cells: Array<{ row: number; col: number; cell: unknown }> = [];
  raw.forEachNonEmptyCell((row, col, cell) => cells.push({
    row,
    col,
    // The store callback can expose a live Cell record; retain the before-image.
    cell: cell && typeof cell === 'object' ? { ...cell } : cell,
  }));
  cells.sort((a, b) => a.row - b.row || a.col - b.col);
  return { cells, graph: getWorksheetDependencyGraphStateForTesting(raw) };
}

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('PKG-01 Workbook mutation queue and atomic cell-write transactions', () => {
  afterEach(() => jest.restoreAllMocks());
  test('production default selects Journal without a strategy override for all five write kinds', async () => {
    const { workbook, raw, view } = fixture();
    const before = exactState(raw);
    expect(getWorkbookMutationStrategy(workbook)).toBe('journal');
    let journalCaptures = 0;
    let snapshotCaptures = 0;
    const injected = new Error('default-journal rollback');
    // Instrumentation is installed without a strategy override; selection still
    // comes from the production default, not from this test hook.
    const observation = setWorkbookMutationTestHooks(workbook, {
      beforeApplyOperation: (index) => { if (index === 5) throw injected; },
      afterJournalCreation: () => { journalCaptures++; },
      afterSnapshotCapture: () => { snapshotCaptures++; },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 2, col: 1 }, 'default-journal');
      transaction.setCellFormula(view, { row: 2, col: 2 }, '=A2+1', 12);
      transaction.setCellStyle(view, { row: 1, col: 3 }, { underline: true });
      transaction.clearCellFormula(view, { row: 1, col: 2 });
      transaction.clearCellContent(view, { row: 1, col: 4 });
      transaction.setCellValue(view, { row: 4, col: 1 }, 'injected failure');
    })).rejects.toBe(injected);

    expect(journalCaptures).toBe(1);
    expect(snapshotCaptures).toBe(0);
    expect(exactState(raw)).toEqual(before);
    expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
      active: false,
      cellBeforeImages: 0,
      graph: { active: false, structureKeys: [], dirtyKeys: [] },
    });
    observation.dispose();

    expect(getWorkbookMutationStrategy(workbook)).toBe('journal');
    await workbook.mutationPort.setCellValue(view, { row: 4, col: 1 }, 'default-journal');
    expect(view.getCellValue({ row: 4, col: 1 })).toBe('default-journal');
    expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
      active: false,
      cellBeforeImages: 0,
      graph: { active: false, structureKeys: [], dirtyKeys: [] },
    });
  });

  test('independent Workbooks select default Journal and explicit Snapshot override independently', async () => {
    const journal = fixture();
    const snapshot = fixture();
    let journalCaptures = 0;
    let snapshotCaptures = 0;
    const journalObservation = setWorkbookMutationTestHooks(journal.workbook, {
      afterJournalCreation: () => { journalCaptures++; },
    });
    const snapshotOverride = setWorkbookMutationTestHooks(snapshot.workbook, {
      strategy: 'snapshot',
      afterSnapshotCapture: () => { snapshotCaptures++; },
    });

    await Promise.all([
      journal.workbook.mutationPort.setCellValue(journal.view, { row: 4, col: 1 }, 'journal'),
      snapshot.workbook.mutationPort.setCellValue(snapshot.view, { row: 4, col: 1 }, 'snapshot'),
    ]);

    expect(journalCaptures).toBe(1);
    expect(snapshotCaptures).toBe(1);
    expect(journal.view.getCellValue({ row: 4, col: 1 })).toBe('journal');
    expect(snapshot.view.getCellValue({ row: 4, col: 1 })).toBe('snapshot');
    snapshotOverride.dispose();
    journalObservation.dispose();
  });

  test('strategy is selected once before transaction operations and stays fixed through commit', async () => {
    const { workbook, view } = fixture();
    let journalCaptures = 0;
    let snapshotCaptures = 0;
    const hooks: {
      strategy: 'snapshot' | 'journal';
      beforeApplyOperation: (index: number) => void;
      afterJournalCreation: () => void;
      afterSnapshotCapture: () => void;
    } = {
      strategy: 'journal',
      beforeApplyOperation: (index) => {
        if (index === 0) hooks.strategy = 'snapshot';
      },
      afterJournalCreation: () => { journalCaptures++; },
      afterSnapshotCapture: () => { snapshotCaptures++; },
    };
    const registration = setWorkbookMutationTestHooks(workbook, hooks);

    await workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 4, col: 1 }, 'one');
      transaction.setCellValue(view, { row: 4, col: 2 }, 'two');
    });

    expect(journalCaptures).toBe(1);
    expect(snapshotCaptures).toBe(0);
    expect(view.getCellValue({ row: 4, col: 2 })).toBe('two');
    registration.dispose();
  });

  test.each(['snapshot', 'journal'] as const)(
    '%s strategy restores a formula cell after failure inside Worksheet mutation phases',
    async (strategy) => {
      const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: 10, cols: 10 }] });
      const raw = workbook.createDevImportWorksheet('Edit', 10, 10) as Worksheet;
      raw.setCellValue({ row: 1, col: 1 }, 4);
      raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 5);
      raw.setCellFormula({ row: 1, col: 4 }, '=SUM(A1:A3)', 9);
      raw.registerVolatile({ row: 1, col: 4 }, [{ row: 1, col: 1 }]);
      raw.completeScheduledRecalculation();
      workbook.attachDevImportSheet(raw);
      const view = workbook.getSheet('Edit')!;
      const beforeDirty = raw.dirtyCount;
      const beforeVolatile = raw.volatileCount;
      const beforeFormula = raw.getCell({ row: 1, col: 2 });
      const beforePrecedents = raw.getPrecedents({ row: 1, col: 2 });
      const beforeRangePrecedents = raw.getPrecedents({ row: 1, col: 4 });

      for (const failingPhase of ['after-cell-record', 'during-dependency-update'] as const) {
        const injected = new Error(`partial ${failingPhase}`);
        let failed = false;
        const hook = setWorkbookMutationTestHooks(workbook, {
          strategy,
          worksheetFailure: (phase) => {
            if (!failed && phase === failingPhase) {
              failed = true;
              throw injected;
            }
          },
        });
        await expect(workbook.transact((transaction) => {
          if (failingPhase === 'after-cell-record') {
            transaction.setCellFormula(view, { row: 1, col: 2 }, '=D1+100', 999);
          } else {
            transaction.setCellFormula(view, { row: 1, col: 2 }, '=D1+100', 999);
          }
        })).rejects.toBe(injected);
        hook.dispose();

        expect(raw.getCell({ row: 1, col: 2 })).toEqual(beforeFormula);
        expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual(beforePrecedents);
        expect(raw.getPrecedents({ row: 1, col: 4 })).toEqual(beforeRangePrecedents);
        expect(raw.getDependents({ row: 1, col: 1 })).toContainEqual({ row: 1, col: 2 });
        expect(raw.volatileCount).toBe(beforeVolatile);
        expect(raw.dirtyCount).toBe(beforeDirty);
        expect(raw.isDirty({ row: 1, col: 2 })).toBe(false);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      }
    },
  );

  test('journal is first-write-wins for repeated cell edits and releases after rollback', async () => {
    const { workbook, raw, view } = fixture();
    const original = raw.getCell({ row: 1, col: 1 });
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy: 'journal',
      beforeApplyOperation: (index) => { if (index === 3) throw new Error('repeat rollback'); },
    });
    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 1, col: 1 }, 10);
      transaction.setCellFormula(view, { row: 1, col: 1 }, '=B1+2', 12);
      transaction.clearCellFormula(view, { row: 1, col: 1 });
      transaction.setCellValue(view, { row: 1, col: 1 }, 20);
    })).rejects.toThrow('repeat rollback');
    hook.dispose();
    expect(raw.getCell({ row: 1, col: 1 })).toEqual(original);
    expect(raw.getPrecedents({ row: 1, col: 1 })).toEqual([]);

    await workbook.transact((transaction) => transaction.setCellValue(view, { row: 1, col: 1 }, 31));
    expect(view.getCellValue({ row: 1, col: 1 })).toBe(31);
  });

  test('journal rolls back all participating Worksheets and buffers all their events', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: 10, cols: 10 }] });
    const first = workbook.createDevImportWorksheet('First', 10, 10);
    const second = workbook.createDevImportWorksheet('Second', 10, 10);
    first.setCellValue({ row: 1, col: 1 }, 'first-before');
    second.setCellFormula({ row: 1, col: 1 }, '=B1+1', 2);
    workbook.attachDevImportSheet(first);
    workbook.attachDevImportSheet(second);
    const firstView = workbook.getSheet('First')!;
    const secondView = workbook.getSheet('Second')!;
    const events: unknown[] = [];
    firstView.on((event) => events.push(event));
    secondView.on((event) => events.push(event));
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy: 'journal',
      beforeApplyOperation: (index) => { if (index === 2) throw new Error('two-sheet journal rollback'); },
    });
    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(firstView, { row: 1, col: 1 }, 'first-after');
      transaction.setCellFormula(secondView, { row: 1, col: 1 }, '=A1+7', 8);
      transaction.setCellValue(firstView, { row: 2, col: 1 }, 'failure');
    })).rejects.toThrow('two-sheet journal rollback');
    hook.dispose();
    expect(firstView.getCellValue({ row: 1, col: 1 })).toBe('first-before');
    expect(second.getCell({ row: 1, col: 1 })).toMatchObject({ formula: '=B1+1', value: 2 });
    expect(second.getPrecedents({ row: 1, col: 1 })).toEqual([{ row: 1, col: 2 }]);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
  });

  test('journal preserves queue order and observer isolation after commit', async () => {
    const { workbook, view } = fixture(20, 20);
    const observed: number[] = [];
    const first = view.on((event) => {
      if (event.type !== 'cell-changed' || event.address.row !== 6) return;
      observed.push(event.address.col);
      if (event.address.col === 1) throw new Error('journal observer failure');
    });
    const second = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 6) observed.push(event.address.col * 100);
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const hook = setWorkbookMutationTestHooks(workbook, { strategy: 'journal' });
    await Promise.all(Array.from({ length: 12 }, (_, index) =>
      workbook.mutationPort.setCellValue(view, { row: 6, col: index + 1 }, index),
    ));
    expect(observed).toEqual(Array.from({ length: 12 }, (_, index) => [index + 1, (index + 1) * 100]).flat());
    expect(consoleError).toHaveBeenCalledWith('Workbook cell-write observer failed after commit', expect.any(Error));
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    hook.dispose();
    first.dispose();
    second.dispose();
    consoleError.mockRestore();
  });

  test('journal rollback uncertainty transitions to recovery-required', async () => {
    const { workbook, raw, view } = fixture();
    const operationFailure = new Error('journal operation failure');
    const rollbackFailure = new Error('journal rollback failure');
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy: 'journal',
      beforeApplyOperation: (index) => { if (index === 1) throw operationFailure; },
      beforeRollback: () => { throw rollbackFailure; },
    });
    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 8, col: 1 }, 'applied');
      transaction.setCellValue(view, { row: 8, col: 2 }, 'fails');
    })).rejects.toMatchObject({ operationError: operationFailure, rollbackErrors: [rollbackFailure] });
    expect(workbook.getMutationHealth()).toMatchObject({ status: 'recovery-required' });
    await expect(workbook.mutationPort.clearCellContent(view, { row: 8, col: 1 })).rejects.toBeInstanceOf(WorkbookRecoveryRequiredError);
    hook.dispose();
  });

  test('journal commit remains committed when disposal interrupts event publication', async () => {
    const { workbook, view } = fixture();
    const observed: number[] = [];
    const first = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 9) {
        observed.push(event.address.col);
        if (event.address.col === 1) workbook.dispose();
      }
    });
    const second = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 9) observed.push(event.address.col * 100);
    });
    const hook = setWorkbookMutationTestHooks(workbook, { strategy: 'journal' });
    await workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 9, col: 1 }, 'committed');
      transaction.setCellValue(view, { row: 9, col: 2 }, 'committed without publication');
    });
    expect(view.getCellValue({ row: 9, col: 1 })).toBe('committed');
    expect(view.getCellValue({ row: 9, col: 2 })).toBe('committed without publication');
    expect(observed).toEqual([1]);
    hook.dispose();
    first.dispose();
    second.dispose();
  });

  test('all five writes use Workbook authority while retained Worksheet writes remain rejected', async () => {
    const { workbook, raw, view } = fixture();
    const events: unknown[] = [];
    const subscription = view.on((event) => events.push(event));

    await workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 2, col: 1 }, 'value');
      transaction.setCellFormula(view, { row: 2, col: 2 }, '=A2&"!"', 'value!');
      transaction.clearCellFormula(view, { row: 2, col: 2 });
      transaction.setCellFormula(view, { row: 2, col: 2 }, '=A2&"?"', 'value?');
      transaction.clearCellContent(view, { row: 2, col: 2 });
      transaction.setCellStyle(view, { row: 2, col: 1 }, { italic: true });
    });

    expect(view.getCellValue({ row: 2, col: 1 })).toBe('value');
    expect(view.getCell({ row: 2, col: 2 })).toMatchObject({ value: null });
    expect(view.getCellStyle({ row: 2, col: 1 })).toMatchObject({ italic: true });
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(() => raw.setCellValue({ row: 3, col: 1 }, 'blocked')).toThrow(/Workbook-owned Worksheet/);
    expect(() => raw.setCellStyle({ row: 3, col: 1 }, { bold: true })).toThrow(/Workbook-owned Worksheet/);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    subscription.dispose();
  });

  test('one context groups nested writes and publishes only after every staged write is visible', async () => {
    const { workbook, view } = fixture();
    let secondCellVisibleFromFirstEvent = false;
    const subscription = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 4 && event.address.col === 1) {
        secondCellVisibleFromFirstEvent = view.getCellValue({ row: 4, col: 2 }) === 22;
      }
    });

    await workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 4, col: 1 }, 11);
      transaction.setCellValue(view, { row: 4, col: 2 }, 22);
    });

    expect(secondCellVisibleFromFirstEvent).toBe(true);
    subscription.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s: same-Workbook independent writes enter one FIFO queue', async (strategy) => {
    const { workbook, view } = fixture();
    const hook = setWorkbookMutationTestHooks(workbook, { strategy });
    const observed: string[] = [];
    const subscription = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 5) observed.push(`${event.address.col}:${event.cell.value}`);
    });
    const first = workbook.mutationPort.setCellValue(view, { row: 5, col: 1 }, 'one');
    const second = workbook.mutationPort.setCellValue(view, { row: 5, col: 2 }, 'two');
    const third = workbook.mutationPort.setCellValue(view, { row: 5, col: 3 }, 'three');
    await Promise.all([first, second, third]);

    expect(observed).toEqual(['1:one', '2:two', '3:three']);
    hook.dispose();
    subscription.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s: a 100-request concurrent burst preserves FIFO commit and event order', async (strategy) => {
    const { workbook, view } = fixture(20, 120);
    const hook = setWorkbookMutationTestHooks(workbook, { strategy });
    const observed: number[] = [];
    const subscription = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 11) observed.push(event.address.col);
    });
    const requests = Array.from({ length: 100 }, (_, index) =>
      workbook.mutationPort.setCellValue(view, { row: 11, col: index + 1 }, index),
    );

    await Promise.all(requests);

    expect(observed).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    hook.dispose();
    subscription.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s: repeated operation failures do not poison later queued requests', async (strategy) => {
    const { workbook, view } = fixture();
    let call = 0;
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: () => {
        const current = call++;
        if (current === 0 || current === 2) throw new Error(`injected ${current}`);
      },
    });
    const requests = Array.from({ length: 4 }, (_, index) =>
      workbook.mutationPort.setCellValue(view, { row: 12, col: index + 1 }, index),
    );
    const results = await Promise.allSettled(requests);

    expect(results.map((result) => result.status)).toEqual(['rejected', 'fulfilled', 'rejected', 'fulfilled']);
    expect(view.getCellValue({ row: 12, col: 1 })).toBeNull();
    expect(view.getCellValue({ row: 12, col: 2 })).toBe(1);
    expect(view.getCellValue({ row: 12, col: 3 })).toBeNull();
    expect(view.getCellValue({ row: 12, col: 4 })).toBe(3);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    hook.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s: an independent request stays queued while an active transaction is suspended', async (strategy) => {
    const { workbook, view } = fixture();
    const hook = setWorkbookMutationTestHooks(workbook, { strategy });
    const entered = deferred();
    const release = deferred();
    const observed: string[] = [];
    const subscription = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 5) observed.push(`${event.address.col}:${event.cell.value}`);
    });
    let independent!: Promise<void>;
    const first = workbook.transact(async (transaction) => {
      transaction.setCellValue(view, { row: 5, col: 1 }, 'first');
      independent = workbook.mutationPort.setCellValue(view, { row: 5, col: 2 }, 'second');
      entered.resolve();
      await release.promise;
      transaction.setCellValue(view, { row: 5, col: 3 }, 'nested');
    });
    await entered.promise;
    expect(view.getCell({ row: 5, col: 1 })).toBeUndefined();
    release.resolve();
    await first;
    await independent;

    expect(observed).toEqual(['1:first', '3:nested', '2:second']);
    hook.dispose();
    subscription.dispose();
  });

  test('retained transaction contexts are revoked after completion', async () => {
    const { workbook, view } = fixture();
    let retained!: WorkbookTransactionContext;
    await workbook.transact((transaction) => { retained = transaction; });

    expect(() => retained.setCellValue(view, { row: 13, col: 1 }, 'late')).toThrow(/no longer active/);
    expect(view.getCell({ row: 13, col: 1 })).toBeUndefined();
  });

  test('awaiting an independent queued write from its own transaction self-awaits', async () => {
    const { workbook, view } = fixture();
    const entered = deferred();
    const active = workbook.transact(async (transaction) => {
      transaction.setCellValue(view, { row: 14, col: 1 }, 'staged');
      entered.resolve();
      await workbook.mutationPort.setCellValue(view, { row: 14, col: 2 }, 'queued behind self');
    });
    await entered.promise;
    const outcome = await Promise.race([
      active.then(() => 'settled', () => 'rejected'),
      new Promise<string>((resolve) => setTimeout(() => resolve('pending'), 25)),
    ]);

    expect(outcome).toBe('pending');
    workbook.dispose();
    await expect(active).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    expect(view.getCell({ row: 14, col: 1 })).toBeUndefined();
    expect(view.getCell({ row: 14, col: 2 })).toBeUndefined();
  });

  test('independent writes created in a transaction can be awaited after that transaction settles', async () => {
    const { workbook, view } = fixture();
    const order: string[] = [];
    const subscription = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 15) {
        order.push(`${event.address.col}:${String(event.cell.value)}`);
      }
    });
    let independent!: Promise<void>;
    const outer = workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 15, col: 1 }, 'transaction write');
      independent = workbook.mutationPort.setCellValue(view, { row: 15, col: 2 }, 'independent write');
      order.push('callback-return');
    });

    await outer;
    await independent;

    expect(order).toEqual([
      'callback-return',
      '1:transaction write',
      '2:independent write',
    ]);
    expect(view.getCellValue({ row: 15, col: 1 })).toBe('transaction write');
    expect(view.getCellValue({ row: 15, col: 2 })).toBe('independent write');
    subscription.dispose();
  });

  test('indirectly awaited independent work remains unsupported and disposal releases the queue', async () => {
    const { workbook, view } = fixture();
    const entered = deferred();
    const enqueueThenAwait = async () => {
      await workbook.mutationPort.setCellValue(view, { row: 16, col: 2 }, 'indirect queued write');
    };
    const active = workbook.transact(async (transaction) => {
      transaction.setCellValue(view, { row: 16, col: 1 }, 'staged');
      entered.resolve();
      await enqueueThenAwait();
    });
    await entered.promise;
    const outcome = await Promise.race([
      active.then(() => 'settled', () => 'rejected'),
      new Promise<string>((resolve) => setTimeout(() => resolve('pending'), 25)),
    ]);

    // This is direct characterization of the unresolved cycle, not evidence
    // that a timeout prevents it. Disposal is the existing deterministic abort.
    expect(outcome).toBe('pending');
    workbook.dispose();
    await expect(active).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    expect(view.getCell({ row: 16, col: 1 })).toBeUndefined();
    expect(view.getCell({ row: 16, col: 2 })).toBeUndefined();
  });

  test('different Workbooks make progress independently', async () => {
    const first = fixture();
    const second = fixture();
    const entered = deferred();
    const release = deferred();
    const waiting = first.workbook.transact(async (transaction) => {
      transaction.setCellValue(first.view, { row: 6, col: 1 }, 'held');
      entered.resolve();
      await release.promise;
    });
    await entered.promise;

    await second.workbook.mutationPort.setCellValue(second.view, { row: 6, col: 1 }, 'independent');
    expect(second.view.getCellValue({ row: 6, col: 1 })).toBe('independent');
    expect(first.view.getCell({ row: 6, col: 1 })).toBeUndefined();
    release.resolve();
    await waiting;
  });

  test.each(['snapshot', 'journal'] as const)('%s restores every participating Worksheet after failure and publishes no events', async (strategy) => {
    const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: 10, cols: 10 }] });
    const first = workbook.createDevImportWorksheet('First', 10, 10);
    const second = workbook.createDevImportWorksheet('Second', 10, 10);
    first.setCellValue({ row: 1, col: 1 }, 'first-before');
    second.setCellValue({ row: 1, col: 1 }, 'second-before');
    workbook.attachDevImportSheet(first);
    workbook.attachDevImportSheet(second);
    const firstView = workbook.getSheet('First')!;
    const secondView = workbook.getSheet('Second')!;
    const firstBefore = exactState(first);
    const secondBefore = exactState(second);
    const events: unknown[] = [];
    firstView.on((event) => events.push(event));
    secondView.on((event) => events.push(event));
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: (index) => { if (index === 2) throw new Error('cross-sheet rollback'); },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(firstView, { row: 1, col: 1 }, 'first-after');
      transaction.setCellValue(secondView, { row: 1, col: 1 }, 'second-after');
      transaction.setCellValue(firstView, { row: 1, col: 2 }, 'fail');
    })).rejects.toThrow('cross-sheet rollback');

    expect(exactState(first)).toEqual(firstBefore);
    expect(exactState(second)).toEqual(secondBefore);
    expect(events).toEqual([]);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    hook.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s restores all five operation kinds and their shared state', async (strategy) => {
    const { workbook, raw, view } = fixture();
    const beforeDirty = raw.dirtyCount;
    const beforePrecedents = raw.getPrecedents({ row: 1, col: 2 });
    const beforeDependents = raw.getDependents({ row: 1, col: 1 });
    const beforeStyle = raw.getCellStyle({ row: 1, col: 3 });
    const events: unknown[] = [];
    const subscription = view.on((event) => events.push(event));
    const operationFailure = new Error('injected operation failure');
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: (index) => { if (index === 5) throw operationFailure; },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 1, col: 1 }, 99);
      transaction.setCellFormula(view, { row: 1, col: 2 }, '=C1+2', 77);
      transaction.setCellStyle(view, { row: 1, col: 3 }, { italic: true });
      transaction.clearCellFormula(view, { row: 1, col: 2 });
      transaction.clearCellContent(view, { row: 1, col: 2 });
      transaction.setCellValue(view, { row: 1, col: 4 }, 'trigger failure');
    })).rejects.toBe(operationFailure);

    hook.dispose();
    expect(raw.getCellValue({ row: 1, col: 1 })).toBe(4);
    expect(raw.getCell({ row: 1, col: 2 })).toMatchObject({ value: 5, formula: '=A1+1' });
    expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual(beforePrecedents);
    expect(raw.getDependents({ row: 1, col: 1 })).toEqual(beforeDependents);
    expect(raw.getCell({ row: 1, col: 4 })?.formula).toBe('=SUM(A1:A3)');
    expect(raw.isDirty({ row: 1, col: 4 })).toBe(false);
    expect(raw.getCellStyle({ row: 1, col: 3 })).toEqual(beforeStyle);
    expect(isInternedStyle(raw.getCellStyle({ row: 1, col: 3 }))).toBe(true);
    expect(raw.dirtyCount).toBe(beforeDirty);
    expect(events).toEqual([]);

    await workbook.mutationPort.setCellValue(view, { row: 7, col: 1 }, 'queue continued');
    expect(view.getCellValue({ row: 7, col: 1 })).toBe('queue continued');
    subscription.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s commits release each displaced StyleCache reference', async (strategy) => {
    const { workbook, raw, view } = fixture();
    const initialStyle = raw.getDirectCellStyle({ row: 1, col: 3 })!;
    const release = jest.spyOn(StyleCache.prototype, 'release');
    const hook = setWorkbookMutationTestHooks(workbook, { strategy });
    const observedStyles: Array<{ style?: object; previousStyle?: object }> = [];
    const subscription = view.on((event) => {
      if (event.type === 'style-changed' && event.address.row === 1 && event.address.col === 3) {
        observedStyles.push(event);
      }
    });

    await workbook.transact((transaction) => {
      transaction.setCellStyle(view, { row: 1, col: 3 }, { italic: true });
      transaction.setCellStyle(view, { row: 1, col: 3 }, { underline: true });
      transaction.setCellStyle(view, { row: 1, col: 3 }, { bold: true, color: '#224466' });
    });

    expect(observedStyles).toHaveLength(3);
    const releasedStyles = release.mock.calls.map(([style]) => style);
    expect(releasedStyles).toHaveLength(3);
    expect(releasedStyles[0]).toMatchObject(initialStyle);
    expect(releasedStyles[1]).toMatchObject(observedStyles[0].style!);
    expect(releasedStyles[2]).toMatchObject(observedStyles[1].style!);
    expect(raw.getDirectCellStyle({ row: 1, col: 3 })).toMatchObject(observedStyles[2].style!);
    hook.dispose();
    subscription.dispose();
    release.mockRestore();
  });

  test.each(['snapshot', 'journal'] as const)('%s rollback releases provisional styles and retains the original', async (strategy) => {
    const { workbook, raw, view } = fixture();
    const initialStyle = raw.getDirectCellStyle({ row: 1, col: 3 })!;
    const release = jest.spyOn(StyleCache.prototype, 'release');
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: (index) => { if (index === 1) throw new Error('injected after style allocation'); },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setCellStyle(view, { row: 1, col: 3 }, { italic: true });
      transaction.setCellValue(view, { row: 1, col: 1 }, 'trigger rollback');
    })).rejects.toThrow('injected after style allocation');

    expect(release).toHaveBeenCalledTimes(1);
    expect(raw.getDirectCellStyle({ row: 1, col: 3 })).toMatchObject(initialStyle);
    expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    hook.dispose();
    release.mockRestore();
  });

  test.each(['snapshot', 'journal'] as const)('%s rollback failure retains both errors and moves the Workbook to recovery-required', async (strategy) => {
    const { workbook, raw, view } = fixture();
    const operationFailure = new Error('operation failed');
    const rollbackFailure = new Error('restore failed');
    let journalCaptures = 0;
    let snapshotCaptures = 0;
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy,
      afterJournalCreation: () => { journalCaptures++; },
      afterSnapshotCapture: () => { snapshotCaptures++; },
      beforeApplyOperation: (index) => { if (index === 1) throw operationFailure; },
      beforeRollback: () => { throw rollbackFailure; },
    });
    const failing = workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 8, col: 1 }, 'partial');
      transaction.setCellValue(view, { row: 8, col: 2 }, 'fails');
    });
    const later = workbook.mutationPort.setCellValue(view, { row: 8, col: 1 }, 'must not start');

    await expect(failing).rejects.toMatchObject({
      operationError: operationFailure,
      rollbackErrors: [rollbackFailure],
    });
    await expect(later).rejects.toBeInstanceOf(WorkbookRecoveryRequiredError);
    expect(workbook.getMutationHealth()).toMatchObject({ status: 'recovery-required' });
    await expect(workbook.mutationPort.clearCellContent(view, { row: 8, col: 1 })).rejects.toBeInstanceOf(WorkbookRecoveryRequiredError);
    expect(view.getCellValue({ row: 8, col: 1 })).toBe('partial');
    expect(journalCaptures).toBe(strategy === 'journal' ? 1 : 0);
    expect(snapshotCaptures).toBe(strategy === 'snapshot' ? 1 : 0);
    expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
      active: false,
      cellBeforeImages: 0,
      graph: { active: false, structureKeys: [], dirtyKeys: [] },
    });
    hook.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s rollback preserves nested values, volatile registration, and retained reads', async (strategy) => {
    const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: 10, cols: 10 }] });
    const raw = workbook.createDevImportWorksheet('Data', 10, 10);
    const entity = {
      kind: 'entity' as const,
      type: 'product',
      display: 'Widget A',
      fields: { price: 29.99, active: true },
      metadata: { id: 'widget-a', provider: 'fixture' },
    };
    raw.setCellValue({ row: 1, col: 1 }, entity);
    raw.setCellFormula({ row: 1, col: 2 }, '=A1', 'Widget A');
    raw.registerVolatile({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    workbook.attachDevImportSheet(raw);
    const view = workbook.getSheet('Data')!;
    const retained = view.getCell({ row: 1, col: 1 })!;
    const volatileCount = raw.volatileCount;
    const dirtyCount = raw.dirtyCount;
    const hook = setWorkbookMutationTestHooks(workbook, {
      strategy,
      beforeApplyOperation: (index) => { if (index === 1) throw new Error('rollback nested value'); },
    });

    await expect(workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 1, col: 1 }, {
        runs: [{ text: 'replacement', style: { bold: true, color: '#123456' } }],
      });
      transaction.setCellValue(view, { row: 1, col: 3 }, 'force rollback');
    })).rejects.toThrow('rollback nested value');

    expect(view.getCellValue({ row: 1, col: 1 })).toEqual(entity);
    expect(retained.value).toEqual(entity);
    expect(raw.volatileCount).toBe(volatileCount);
    expect(raw.dirtyCount).toBe(dirtyCount);
    expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual([{ row: 1, col: 1 }]);
    hook.dispose();
  });

  test.each(['snapshot', 'journal'] as const)('%s listener writes are queued independently and listener exceptions do not reverse or stop publication', async (strategy) => {
    const { workbook, view } = fixture();
    const hook = setWorkbookMutationTestHooks(workbook, { strategy });
    const error = new Error('observer failure');
    const laterListener = jest.fn();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let queued!: Promise<void>;
    const first = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 9 && event.address.col === 1) {
        queued = workbook.mutationPort.setCellValue(view, { row: 9, col: 2 }, 'listener write');
        throw error;
      }
    });
    const second = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 9) laterListener(event);
    });

    await workbook.mutationPort.setCellValue(view, { row: 9, col: 1 }, 'committed');
    await queued;
    expect(view.getCellValue({ row: 9, col: 1 })).toBe('committed');
    expect(view.getCellValue({ row: 9, col: 2 })).toBe('listener write');
    expect(laterListener).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Workbook cell-write observer failed after commit', error);
    hook.dispose();
    first.dispose();
    second.dispose();
    consoleError.mockRestore();
  });

  test.each(['snapshot', 'journal'] as const)('%s disposal cancels queued and in-flight work and revokes late transaction capabilities', async (strategy) => {
    const { workbook, view } = fixture();
    const hook = setWorkbookMutationTestHooks(workbook, { strategy });
    const entered = deferred();
    const release = deferred();
    const active = workbook.transact(async (transaction) => {
      transaction.setCellValue(view, { row: 10, col: 1 }, 'staged before wait');
      entered.resolve();
      await release.promise;
      transaction.setCellValue(view, { row: 10, col: 2 }, 'late write');
    });
    await entered.promise;
    const queued = workbook.mutationPort.setCellValue(view, { row: 10, col: 3 }, 'queued');

    workbook.dispose();
    await expect(active).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    await expect(queued).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    release.resolve();
    await Promise.resolve();
    expect(view.getCell({ row: 10, col: 1 })).toBeUndefined();
    expect(view.getCell({ row: 10, col: 2 })).toBeUndefined();
    expect(view.getCell({ row: 10, col: 3 })).toBeUndefined();
    expect(workbook.getMutationHealth()).toEqual({ status: 'disposed' });
    hook.dispose();
  });

  test('disposal during committed event publication prevents later observers and events', async () => {
    const { workbook, view } = fixture();
    const received: string[] = [];
    const first = view.on((event) => {
      if (event.type !== 'cell-changed' || event.address.row !== 9) return;
      received.push(`first:${event.address.col}`);
      if (event.address.col === 1) workbook.dispose();
    });
    const second = view.on((event) => {
      if (event.type === 'cell-changed' && event.address.row === 9) received.push(`second:${event.address.col}`);
    });

    await workbook.transact((transaction) => {
      transaction.setCellValue(view, { row: 9, col: 1 }, 'committed before disposal');
      transaction.setCellValue(view, { row: 9, col: 2 }, 'must not publish after disposal');
    });

    expect(received).toEqual(['first:1']);
    expect(view.getCellValue({ row: 9, col: 1 })).toBe('committed before disposal');
    expect(view.getCellValue({ row: 9, col: 2 })).toBe('must not publish after disposal');
    first.dispose();
    second.dispose();
  });

  test.each([0x01d0a11, 0x05eed21, 0x0badc0de])(
    'seed %i produces exact snapshot/journal parity across committed and rolled-back mixed sequences',
    async (seed) => {
      const left = fixture(40, 20);
      const right = fixture(40, 20);
      const leftEvents: unknown[] = [];
      const rightEvents: unknown[] = [];
      const leftSub = left.view.on((event) => leftEvents.push(event));
      const rightSub = right.view.on((event) => rightEvents.push(event));
      expect(getWorksheetDependencyGraphStateForTesting(left.raw)).toEqual(getWorksheetDependencyGraphStateForTesting(right.raw));
      expect(getWorksheetDependencyGraphStateForTesting(left.raw).ranges).toContainEqual([
        20_004,
        [{ startRow: 1, endRow: 3, startCol: 1, endCol: 1 }],
      ]);
      expect(left.raw.getPrecedents({ row: 1, col: 2 })).toEqual([{ row: 1, col: 1 }]);

      const random = seeded(seed);
      const runOne = async (
        target: ReturnType<typeof fixture>, strategy: 'snapshot' | 'journal',
        batch: Array<{ kind: number; row: number; col: number; value: number }>, fail: boolean,
      ) => {
        const hook = setWorkbookMutationTestHooks(target.workbook, {
          strategy,
          ...(fail ? { beforeApplyOperation: (index: number) => { if (index === 1) throw new Error('seeded rollback'); } } : {}),
        });
        try {
          const operation = target.workbook.transact((transaction) => {
            for (const item of batch) {
              const address = { row: item.row, col: item.col };
              switch (item.kind) {
                case 0: transaction.setCellValue(target.view, address, item.value); break;
                case 1: transaction.setCellFormula(target.view, address, `=A${item.row}+${item.value}`, item.value); break;
                case 2: transaction.clearCellFormula(target.view, address); break;
                case 3: transaction.clearCellContent(target.view, address); break;
                default: transaction.setCellStyle(target.view, address, { bold: (item.value & 1) === 0, italic: (item.value & 2) !== 0 });
              }
            }
          });
          if (fail) await expect(operation).rejects.toThrow('seeded rollback');
          else await operation;
        } finally {
          hook.dispose();
        }
      };

      for (let step = 0; step < 36; step++) {
        const count = 1 + Math.floor(random() * 4);
        const batch = Array.from({ length: count }, () => ({
          kind: Math.floor(random() * 5),
          row: 2 + Math.floor(random() * 30),
          col: 1 + Math.floor(random() * 12),
          value: Math.floor(random() * 1000),
        }));
        const fail = step % 6 === 4 && count > 1;
        await runOne(left, 'snapshot', batch, fail);
        await runOne(right, 'journal', batch, fail);
        expect(JSON.stringify(exactState(right.raw))).toBe(JSON.stringify(exactState(left.raw)));
        expect(right.workbook.getMutationHealth()).toEqual(left.workbook.getMutationHealth());
        expect(rightEvents).toEqual(leftEvents);
        expect(getWorksheetCellWriteJournalStatusForTesting(right.raw)).toEqual({
          active: false,
          cellBeforeImages: 0,
          graph: { active: false, structureKeys: [], dirtyKeys: [] },
        });
      }
      leftSub.dispose();
      rightSub.dispose();
    },
  );

  test.each(['after-cell-record', 'after-predecessor-removal', 'during-dependency-update',
    'after-range-watcher-registration', 'after-dependency-registration',
    'after-formula-node-registration', 'after-dirty-propagation', 'after-volatile-state-change'] as const)(
    'snapshot and journal restore exact graph and cell state after %s fault cut', async (phase) => {
      for (const strategy of ['snapshot', 'journal'] as const) {
        const { workbook, raw, view } = fixture();
        const before = exactState(raw);
        const injected = new Error(`fault at ${phase}`);
        let fired = false;
        let injectedVolatile = false;
        let journalAtFault: ReturnType<typeof getWorksheetCellWriteJournalStatusForTesting> | undefined;
        const hook = setWorkbookMutationTestHooks(workbook, {
          strategy,
          worksheetFailure: (actual) => {
            if (phase === 'after-volatile-state-change' && !injectedVolatile
              && actual === 'after-formula-node-registration') {
              injectedVolatile = true;
              raw.registerVolatile({ row: 1, col: 7 }, []);
            }
            if (!fired && actual === phase) {
              fired = true;
              journalAtFault = getWorksheetCellWriteJournalStatusForTesting(raw);
              throw injected;
            }
          },
        });
        const formula = phase === 'after-range-watcher-registration' || phase === 'after-dependency-registration'
          ? '=SUM(A1:A3)' : '=C1+2';
        const address = formula.includes('SUM') ? { row: 1, col: 4 } : { row: 1, col: 2 };
        await expect(workbook.transact((transaction) => transaction.setCellFormula(view, address, formula, 77)))
          .rejects.toBe(injected);
        hook.dispose();
        expect(fired).toBe(true);
        if (strategy === 'journal' && phase === 'after-dirty-propagation') {
          expect(journalAtFault?.graph.structureKeys).toContain(20_003);
        }
        const after = exactState(raw);
        if (JSON.stringify(after) !== JSON.stringify(before)) {
          throw new Error(`${strategy} ${phase} did not restore exact before-state: ${JSON.stringify({ before, after })}`);
        }
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
        expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
          active: false,
          cellBeforeImages: 0,
          graph: { active: false, structureKeys: [], dirtyKeys: [] },
        });
      }
    },
  );

  test('journal strategy cancellation while callback is suspended prevents late writes', async () => {
    const { workbook, view } = fixture();
    const entered = deferred();
    const release = deferred();
    const hook = setWorkbookMutationTestHooks(workbook, { strategy: 'journal' });
    const pending = workbook.transact(async (transaction) => {
      transaction.setCellValue(view, { row: 18, col: 1 }, 'late');
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    workbook.dispose();
    await expect(pending).rejects.toBeInstanceOf(WorkbookOperationCancelledError);
    release.resolve();
    await Promise.resolve();
    expect(view.getCellValue({ row: 18, col: 1 })).toBeNull();
    hook.dispose();
  });

  test('style allocation fault releases provisional StyleCache ownership', async () => {
    for (const strategy of ['snapshot', 'journal'] as const) {
      const { workbook, raw, view } = fixture();
      const release = jest.spyOn(StyleCache.prototype, 'release');
      const before = exactState(raw);
      const injected = new Error(`style allocation cut ${strategy}`);
      const hook = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => { if (phase === 'after-style-allocation') throw injected; },
      });
      await expect(workbook.transact((transaction) =>
        transaction.setCellStyle(view, { row: 4, col: 4 }, { bold: false, italic: true }),
      )).rejects.toBe(injected);
      hook.dispose();
      expect(release).toHaveBeenCalledTimes(1);
      expect(exactState(raw)).toEqual(before);
      expect(getWorksheetCellWriteJournalStatusForTesting(raw).active).toBe(false);
      release.mockRestore();
    }
  });

  test('standalone setCellFormula restores exact state and suppresses events after registration failure', () => {
    const raw = new Worksheet('Standalone', 20, 10);
    raw.setCellValue({ row: 1, col: 2 }, 'before');
    const before = exactState(raw);
    const events: unknown[] = [];
    raw.on((event) => events.push(event));
    const injected = new Error('standalone graph registration failed');
    const registration = setStandaloneFormulaRegistrationTestHook(raw, () => { throw injected; });
    expect(() => raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2)).toThrow(injected);
    expect(exactState(raw)).toEqual(before);
    expect(events).toEqual([]);
    registration.dispose();
  });

  test.each([
    'after-predecessor-removal',
    'during-dependency-update',
    'after-range-watcher-registration',
    'after-dependency-registration',
    'after-dirty-propagation',
  ] as const)('standalone formula replacement exactly restores graph after %s', (cut) => {
    const raw = new Worksheet('Standalone', 20, 10);
    raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2);
    const before = exactState(raw);
    const events: unknown[] = [];
    raw.on((event) => events.push(event));
    const injected = new Error(`standalone graph failure at ${cut}`);
    const failure = setStandaloneFormulaGraphFailureTestHook(raw, (phase) => {
      if (phase === cut) throw injected;
    });

    const replacement = cut === 'after-range-watcher-registration' ? '=SUM(C1:C3)' : '=C1+4';
    expect(() => raw.setCellFormula({ row: 1, col: 2 }, replacement, 7)).toThrow(injected);
    expect(exactState(raw)).toEqual(before);
    expect(events).toEqual([]);
    failure.dispose();

    raw.setCellFormula({ row: 1, col: 2 }, '=D1+5', 8);
    expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual([{ row: 1, col: 4 }]);
    expect(events).toHaveLength(1);
  });

  test('standalone repeated formula replacements retain only the latest dependency set', () => {
    const raw = new Worksheet('Standalone', 20, 10);
    raw.setCellFormula({ row: 1, col: 4 }, '=A1+1', 2);
    raw.setCellFormula({ row: 1, col: 4 }, '=B1+2', 3);
    raw.setCellFormula({ row: 1, col: 4 }, '=SUM(C1:C4)', 4);
    expect(raw.getCell({ row: 1, col: 4 })).toMatchObject({ formula: '=SUM(C1:C4)', value: 4 });
    expect(raw.getPrecedents({ row: 1, col: 4 })).toEqual([]);
    expect(getWorksheetDependencyGraphStateForTesting(raw).ranges).toContainEqual([
      20004,
      [{ startRow: 1, endRow: 4, startCol: 3, endCol: 3 }],
    ]);
    expect(getWorksheetDependencyGraphStateForTesting(raw).successors
      .filter(([, dependents]) => dependents.includes(20004))).toEqual([]);
  });

  test('standalone formula replacement composes inside an existing transaction without early publication', () => {
    const raw = new Worksheet('Standalone', 20, 10);
    raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2);
    const before = exactState(raw);
    const events: unknown[] = [];
    raw.on((event) => events.push(event));
    const injected = new Error('nested formula graph failure');
    const failure = setStandaloneFormulaGraphFailureTestHook(raw, (phase) => {
      if (phase === 'after-dependency-registration') throw injected;
    });

    raw.runTransaction(() => {
      expect(() => raw.setCellFormula({ row: 1, col: 2 }, '=C1+1', 3)).toThrow(injected);
      expect(exactState(raw)).toEqual(before);
      expect(events).toEqual([]);
      failure.dispose();
      raw.setCellFormula({ row: 2, col: 2 }, '=A2+1', 4);
      expect(events).toEqual([]);
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'cell-changed', address: { row: 2, col: 2 } });
  });

  test('formula-engine callback can reenter standalone formula writes after graph registration', () => {
    let raw!: Worksheet;
    let reentered = false;
    const engine = {
      evaluate: () => null,
      onCellChanged: (address: { row: number; col: number }) => {
        if (address.row === 1 && address.col === 2 && !reentered) {
          reentered = true;
          raw.setCellFormula({ row: 1, col: 3 }, '=A1+2', 3);
        }
      },
    };
    raw = new Worksheet('Standalone', 20, 10, engine);
    raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2);

    expect(reentered).toBe(true);
    expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual([{ row: 1, col: 1 }]);
    expect(raw.getPrecedents({ row: 1, col: 3 })).toEqual([{ row: 1, col: 1 }]);
  });

  test('formula-engine callback failure reports committed state and retry publishes one event', () => {
    const callbackError = new Error('formula callback failed');
    let failCallback = true;
    const engine = {
      evaluate: () => null,
      onCellChanged: () => { if (failCallback) throw callbackError; },
    };
    const raw = new Worksheet('Standalone', 20, 10, engine);
    const events: unknown[] = [];
    raw.on((event) => events.push(event));

    let caught: unknown;
    try {
      raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WorksheetFormulaPostCommitError);
    expect(caught).toMatchObject({
      committed: true,
      address: { row: 1, col: 2 },
      phase: 'formula-engine-callback',
      originalError: callbackError,
    });
    expect(raw.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A1+1', value: 2 });
    expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual([{ row: 1, col: 1 }]);
    expect(events).toEqual([]);

    failCallback = false;
    raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2);
    expect(events).toHaveLength(1);
  });

  test.each(['snapshot', 'journal'] as const)(
    'Workbook %s transaction still rolls back a Formula Engine callback failure',
    async (strategy) => {
      const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: 10, cols: 10 }] });
      const raw = workbook.createDevImportWorksheet('Edit', 10, 10) as Worksheet;
      const callbackError = new Error(`Workbook callback failure (${strategy})`);
      raw.setFormulaEngine({ evaluate: () => null, onCellChanged: () => { throw callbackError; } });
      workbook.attachDevImportSheet(raw);
      const view = workbook.getSheet('Edit')!;
      const before = exactState(raw);
      const events: unknown[] = [];
      raw.on((event) => events.push(event));
      const hooks = setWorkbookMutationTestHooks(workbook, { strategy });

      await expect(workbook.transact((transaction) =>
        transaction.setCellFormula(view, { row: 1, col: 2 }, '=A1+1', 2),
      )).rejects.toBe(callbackError);

      expect(exactState(raw)).toEqual(before);
      expect(events).toEqual([]);
      hooks.dispose();
    },
  );

  test('standalone formula restoration failure is distinguishable and retains both errors', () => {
    const raw = new Worksheet('Standalone', 20, 10);
    raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2);
    const before = exactState(raw);
    const mutationError = new Error('registration failed');
    const restorationError = new Error('restoration verification failed');
    const registration = setStandaloneFormulaRegistrationTestHook(raw, () => { throw mutationError; });
    const restoration = setStandaloneFormulaRestorationTestHook(raw, () => { throw restorationError; });

    let caught: unknown;
    try {
      raw.setCellFormula({ row: 1, col: 2 }, '=C1+1', 3);
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      name: 'WorksheetFormulaRestorationError',
      originalMutationError: mutationError,
      restorationErrors: [restorationError],
    });
    // The test seam reports a restoration concern while the remaining
    // best-effort graph and cell restoration still returns to the before-image.
    expect(exactState(raw)).toEqual(before);
    registration.dispose();
    restoration.dispose();
  });

  test('standalone setCellFormula keeps dependency-extraction failures warning-only', () => {
    const raw = new Worksheet('Standalone', 20, 10);
    const injected = new Error('extractor compatibility cut');
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const extraction = setStandaloneFormulaExtractionTestHook(raw, () => { throw injected; });
    expect(() => raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 2)).not.toThrow();
    expect(raw.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A1+1', value: 2 });
    expect(raw.getPrecedents({ row: 1, col: 2 })).toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Failed to extract dependencies from formula at 1:2:', injected,
    );
    extraction.dispose();
    warning.mockRestore();
  });

  test('adversarial high-degree, overlapping-range, chain, and volatile graphs retain exact strategy parity', async () => {
    const build = () => {
      const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: 1200, cols: 30 }] });
      const raw = workbook.createDevImportWorksheet('Graph', 1200, 30) as Worksheet;
      raw.setCellValue({ row: 1, col: 1 }, 1);
      // High fan-out plus overlapping watchers.
      for (let row = 2; row < 82; row++) raw.setCellFormula({ row, col: 2 }, '=A1+1', row);
      for (let row = 400; row < 440; row++) raw.setCellFormula({ row, col: 2 }, '=SUM(A1:A50)', row);
      // High fan-in.
      raw.setCellFormula({ row: 100, col: 2 }, `=${Array.from({ length: 40 }, (_, i) => `A${i + 1}`).join('+')}`, 40);
      // Long chain.
      raw.setCellValue({ row: 200, col: 1 }, 1);
      for (let row = 201; row < 301; row++) raw.setCellFormula({ row, col: 1 }, `=A${row - 1}+1`, row);
      // Volatile registrations are pre-existing graph state; the five-operation
      // transaction slice must preserve them and dirty them on source changes.
      for (let row = 500; row < 510; row++) {
        raw.setCellFormula({ row, col: 2 }, '=RAND()', row);
        raw.registerVolatile({ row, col: 2 }, []);
      }
      workbook.attachDevImportSheet(raw);
      return { workbook, raw, view: workbook.getSheet('Graph')! };
    };
    const snapshot = build();
    const journal = build();
    const before = exactState(snapshot.raw);
    expect(before.graph.formulaNodes.length).toBeGreaterThan(200);
    expect(before.graph.ranges.length).toBeGreaterThanOrEqual(40);
    expect(before.graph.volatiles).toHaveLength(10);
    const run = async (target: ReturnType<typeof build>, strategy: 'snapshot' | 'journal') => {
      const hook = setWorkbookMutationTestHooks(target.workbook, { strategy });
      await target.workbook.transact((transaction) => {
        transaction.setCellValue(target.view, { row: 1, col: 1 }, 2);
        transaction.setCellFormula(target.view, { row: 100, col: 2 }, '=A1+A2+A3', 99);
      });
      hook.dispose();
    };
    await run(snapshot, 'snapshot');
    await run(journal, 'journal');
    expect(exactState(journal.raw)).toEqual(exactState(snapshot.raw));
    const dirty = new Set(getWorksheetDependencyGraphStateForTesting(journal.raw).dirty);
    expect(dirty.size).toBeGreaterThan(100);
    expect(getWorksheetDependencyGraphStateForTesting(journal.raw).volatiles).toHaveLength(10);

    const rollbackExpected = exactState(journal.raw);
    const hook = setWorkbookMutationTestHooks(journal.workbook, {
      strategy: 'journal',
      beforeApplyOperation: (index) => { if (index === 1) throw new Error('adversarial rollback'); },
    });
    await expect(journal.workbook.transact((transaction) => {
      transaction.setCellFormula(journal.view, { row: 1, col: 2 }, '=D1+1', 12);
      transaction.setCellValue(journal.view, { row: 1, col: 1 }, 3);
    })).rejects.toThrow('adversarial rollback');
    hook.dispose();
    expect(exactState(journal.raw)).toEqual(rollbackExpected);
  });
});
