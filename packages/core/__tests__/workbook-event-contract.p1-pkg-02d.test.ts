import { Workbook, Worksheet } from '../src';

function fixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Alpha', rows: 4, cols: 4 }] });
  const betaRaw = workbook.createDevImportWorksheet('Beta', 4, 4) as Worksheet;
  workbook.attachDevImportSheet(betaRaw);
  return {
    workbook,
    alpha: workbook.getSheet('Alpha')!,
    beta: workbook.getSheet('Beta')!,
  };
}

describe('PKG-02D Workbook event contract', () => {
  afterEach(() => jest.restoreAllMocks());

  test('installs one lazy worksheet bridge per event only while public subscribers exist', async () => {
    const { workbook, alpha } = fixture();
    const actualOn = Worksheet.prototype.on;
    const disposals: jest.SpyInstance[] = [];
    const on = jest.spyOn(Worksheet.prototype, 'on');
    on.mockImplementation(function (this: Worksheet, listener) {
      const subscription = actualOn.call(this, listener);
      disposals.push(jest.spyOn(subscription, 'dispose'));
      return subscription;
    });

    await workbook.transact((tx) => tx.setCellValue(alpha, { row: 1, col: 1 }, 'before subscription'));
    expect(on).not.toHaveBeenCalled();

    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = workbook.eventBus.on('cell-value-change', first);
    expect(on).toHaveBeenCalledTimes(2);
    const unsubscribeSecond = workbook.eventBus.on('cell-value-change', second);
    expect(on).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    expect(on).toHaveBeenCalledTimes(2);
    await workbook.transact((tx) => tx.setCellValue(alpha, { row: 1, col: 2 }, 'second subscriber'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeSecond();
    expect(disposals).toHaveLength(2);
    expect(disposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    const beforeResubscribe = on.mock.calls.length;
    const resubscribed = jest.fn();
    const unsubscribeAgain = workbook.eventBus.on('cell-value-change', resubscribed);
    expect(on).toHaveBeenCalledTimes(beforeResubscribe + 2);
    await workbook.transact((tx) => tx.setCellValue(alpha, { row: 1, col: 3 }, 'resubscribed'));
    expect(resubscribed).toHaveBeenCalledTimes(1);

    unsubscribeAgain();
    expect(disposals.slice(2).every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    workbook.dispose();
  });

  test('keeps committed dimension events on the Worksheet surface, not the Workbook EventBus', async () => {
    const { workbook, alpha, beta } = fixture();
    const sheetEvents: string[] = [];
    const alphaSubscription = alpha.on((event) => sheetEvents.push(`Alpha:${event.type}`));
    const betaSubscription = beta.on((event) => sheetEvents.push(`Beta:${event.type}`));
    const workbookDimensionEvent = jest.fn();
    const unsubscribe = workbook.eventBus.on('sheet-mutated', workbookDimensionEvent);

    await workbook.transact((tx) => {
      tx.setRowHeight(beta, 2, 31);
      tx.setColumnWidth(alpha, 3, 105);
      tx.setRowHeight(beta, 2, 31);
    });

    expect(sheetEvents).toEqual([
      'Beta:sheet-mutated',
      'Alpha:sheet-mutated',
      'Beta:sheet-mutated',
    ]);
    expect(workbookDimensionEvent).not.toHaveBeenCalled();

    alphaSubscription.dispose();
    betaSubscription.dispose();
    unsubscribe();
    workbook.dispose();
  });

  test('isolates Workbook listener exceptions after commit and stops publication after disposal', async () => {
    const { workbook, alpha } = fixture();
    const report = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const thrown = new Error('Workbook observer failure');
    const later = jest.fn();
    workbook.eventBus.on('cell-value-change', () => { throw thrown; });
    workbook.eventBus.on('cell-value-change', later);

    await workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'committed');
    });
    expect(alpha.getCellValue({ row: 1, col: 1 })).toBe('committed');
    expect(later).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      expect.stringContaining("EventBus listener failed for 'cell-value-change'"),
      thrown,
    );

    workbook.dispose();
    await expect(workbook.mutationPort.setCellValue(alpha, { row: 1, col: 2 }, 'after dispose'))
      .rejects.toThrow();
  });

  test('disposal during a Workbook notification preserves committed state and stops remaining observers', async () => {
    const { workbook, alpha } = fixture();
    const later = jest.fn();
    workbook.eventBus.on('cell-value-change', () => workbook.dispose());
    workbook.eventBus.on('cell-value-change', later);

    await workbook.transact((tx) => {
      tx.setCellValue(alpha, { row: 1, col: 1 }, 'first');
      tx.setCellValue(alpha, { row: 1, col: 2 }, 'second');
    });

    expect(alpha.getCellValue({ row: 1, col: 1 })).toBe('first');
    expect(alpha.getCellValue({ row: 1, col: 2 })).toBe('second');
    expect(later).not.toHaveBeenCalled();
  });

  test('Workbook disposal releases owned bridge listeners and keeps unsubscribe idempotent', () => {
    const { workbook } = fixture();
    const actualOn = Worksheet.prototype.on;
    const bridgeDisposals: jest.SpyInstance[] = [];
    jest.spyOn(Worksheet.prototype, 'on').mockImplementation(function (this: Worksheet, listener) {
      const subscription = actualOn.call(this, listener);
      bridgeDisposals.push(jest.spyOn(subscription, 'dispose'));
      return subscription;
    });

    const unsubscribe = workbook.eventBus.on('cell-value-change', () => undefined);
    expect(bridgeDisposals).toHaveLength(2);
    workbook.dispose();

    expect(bridgeDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    unsubscribe();
    expect(bridgeDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
  });
});
