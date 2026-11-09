import {
  Workbook,
  WorkbookOperationCancelledError,
  Worksheet,
  type WorkbookColumnWidthChangeEvent,
  type WorkbookRowHeightChangeEvent,
  type WorksheetId,
} from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

function fixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 3 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 4, 3) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 4, 3) as Worksheet;
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  return {
    workbook,
    alpha: workbook.getSheet('Alpha')!,
    beta: workbook.getSheet('Beta')!,
  };
}

describe('PKG-02E Workbook dimension event contract', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['journal', 'snapshot'] as const)(
    '%s publishes typed dimension events after their Worksheet event in staged order',
    async (strategy) => {
      const { workbook, alpha, beta } = fixture();
      const events: unknown[] = [];
      alpha.on((event) => events.push({ source: 'worksheet:Alpha', type: event.type }));
      beta.on((event) => events.push({ source: 'worksheet:Beta', type: event.type }));
      workbook.eventBus.on('row-height-change', (event) => {
        const worksheetId: WorksheetId = event.worksheetId;
        const payload: WorkbookRowHeightChangeEvent = event;
        events.push({ source: 'workbook', type: 'row-height-change', payload, worksheetId });
      });
      workbook.eventBus.on('column-width-change', (event) => {
        const worksheetId: WorksheetId = event.worksheetId;
        const payload: WorkbookColumnWidthChangeEvent = event;
        events.push({ source: 'workbook', type: 'column-width-change', payload, worksheetId });
      });
      const registration = setWorkbookMutationTestHooks(workbook, { strategy });

      await workbook.transact((tx) => {
        tx.setRowHeight(alpha, 1, 25);
        tx.setColumnWidth(beta, 2, 90);
        tx.setRowHeight(alpha, 1, 30);
        tx.setRowHeight(alpha, 1, 30);
        tx.setColumnWidth(beta, 2, 90);
        expect(events).toEqual([]);
      });

      expect(events).toEqual([
        { source: 'worksheet:Alpha', type: 'sheet-mutated' },
        {
          source: 'workbook', type: 'row-height-change',
          payload: { worksheetId: alpha.worksheetId, row: 1, heightPx: 25 },
          worksheetId: alpha.worksheetId,
        },
        { source: 'worksheet:Beta', type: 'sheet-mutated' },
        {
          source: 'workbook', type: 'column-width-change',
          payload: { worksheetId: beta.worksheetId, column: 2, widthPx: 90 },
          worksheetId: beta.worksheetId,
        },
        { source: 'worksheet:Alpha', type: 'sheet-mutated' },
        {
          source: 'workbook', type: 'row-height-change',
          payload: { worksheetId: alpha.worksheetId, row: 1, heightPx: 30 },
          worksheetId: alpha.worksheetId,
        },
        { source: 'worksheet:Alpha', type: 'sheet-mutated' },
        {
          source: 'workbook', type: 'row-height-change',
          payload: { worksheetId: alpha.worksheetId, row: 1, heightPx: 30 },
          worksheetId: alpha.worksheetId,
        },
        { source: 'worksheet:Beta', type: 'sheet-mutated' },
        {
          source: 'workbook', type: 'column-width-change',
          payload: { worksheetId: beta.worksheetId, column: 2, widthPx: 90 },
          worksheetId: beta.worksheetId,
        },
      ]);
      expect(alpha.getRowHeight(1)).toBe(30);
      expect(beta.getColumnWidth(2)).toBe(90);
      registration.dispose();
      workbook.dispose();
    },
  );

  test.each(['journal', 'snapshot'] as const)(
    '%s preserves mixed cell and dimension publication order across Worksheets',
    async (strategy) => {
      const { workbook, alpha, beta } = fixture();
      const events: string[] = [];
      alpha.on((event) => events.push(`Worksheet:Alpha:${event.type}`));
      beta.on((event) => events.push(`Worksheet:Beta:${event.type}`));
      workbook.eventBus.on('row-height-change', (event) => {
        events.push(`Workbook:row:${event.row}:${event.heightPx}:${alpha.getRowHeight(event.row)}`);
      });
      workbook.eventBus.on('column-width-change', (event) => {
        events.push(`Workbook:column:${event.column}:${event.widthPx}:${beta.getColumnWidth(event.column)}`);
      });
      workbook.eventBus.on('cell-value-change', () => events.push('Workbook:cell-value'));
      workbook.eventBus.on('cell-style-change', () => events.push('Workbook:cell-style'));
      const registration = setWorkbookMutationTestHooks(workbook, { strategy });

      await workbook.transact((tx) => {
        tx.setRowHeight(alpha, 1, 25);
        tx.setCellValue(alpha, { row: 1, col: 1 }, 'first');
        tx.setColumnWidth(beta, 2, 91);
        tx.setCellStyle(beta, { row: 2, col: 1 }, { bold: true });
        tx.setRowHeight(alpha, 1, 30);
        expect(events).toEqual([]);
      });

      expect(events).toEqual([
        'Worksheet:Alpha:sheet-mutated',
        'Workbook:row:1:25:30',
        'Worksheet:Alpha:cell-changed',
        'Workbook:cell-value',
        'Worksheet:Beta:sheet-mutated',
        'Workbook:column:2:91:91',
        'Worksheet:Beta:style-changed',
        'Workbook:cell-style',
        'Worksheet:Alpha:sheet-mutated',
        'Workbook:row:1:30:30',
      ]);
      expect(alpha.getCellValue({ row: 1, col: 1 })).toBe('first');
      expect(beta.getCellStyle({ row: 2, col: 1 })?.bold).toBe(true);
      registration.dispose();
      workbook.dispose();
    },
  );

  test.each(['journal', 'snapshot'] as const)(
    '%s discards dimension events and restores state when a later staged write fails',
    async (strategy) => {
      const { workbook, alpha, beta } = fixture();
      const events: unknown[] = [];
      alpha.on((event) => events.push(`Alpha:${event.type}`));
      beta.on((event) => events.push(`Beta:${event.type}`));
      workbook.eventBus.on('row-height-change', (event) => events.push(event));
      workbook.eventBus.on('column-width-change', (event) => events.push(event));
      const injected = new Error(`${strategy} fails after width write`);
      const registration = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-column-width-map-write') throw injected;
        },
      });

      await expect(workbook.transact((tx) => {
        tx.setRowHeight(alpha, 1, 35);
        tx.setColumnWidth(beta, 2, 95);
      })).rejects.toBe(injected);

      expect(alpha.getRowHeight(1)).toBe(20);
      expect(beta.getColumnWidth(2)).toBe(80);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      registration.dispose();
      workbook.dispose();
    },
  );

  test('listener failure does not block later typed observers or undo committed dimensions', async () => {
    const { workbook, alpha } = fixture();
    const report = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const thrown = new Error('dimension observer failed');
    const later = jest.fn();
    workbook.eventBus.on('row-height-change', () => { throw thrown; });
    workbook.eventBus.on('row-height-change', later);

    await workbook.mutationPort.setRowHeight(alpha, 2, 44);

    expect(alpha.getRowHeight(2)).toBe(44);
    expect(later).toHaveBeenCalledWith({ worksheetId: alpha.worksheetId, row: 2, heightPx: 44 });
    expect(report).toHaveBeenCalledWith("EventBus listener failed for 'row-height-change'", thrown);
    workbook.dispose();
  });

  test('disposal deactivates bridges, rejects new subscriptions, and leaves other Workbooks active', async () => {
    const first = fixture();
    const second = fixture();
    const originalOn = Worksheet.prototype.on;
    const disposals: jest.SpyInstance[] = [];
    jest.spyOn(Worksheet.prototype, 'on').mockImplementation(function (this: Worksheet, listener) {
      const subscription = originalOn.call(this, listener);
      disposals.push(jest.spyOn(subscription, 'dispose'));
      return subscription;
    });

    const firstHandler = jest.fn();
    const secondHandler = jest.fn();
    const unsubscribeFirst = first.workbook.eventBus.on('cell-value-change', firstHandler);
    const unsubscribeSecond = second.workbook.eventBus.on('cell-value-change', secondHandler);
    expect(disposals).toHaveLength(6);

    first.workbook.dispose();
    first.workbook.dispose();
    unsubscribeFirst();
    expect(disposals.slice(0, 3).every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(disposals.slice(3).every((dispose) => dispose.mock.calls.length === 0)).toBe(true);
    expect(() => first.workbook.eventBus.on('row-height-change', jest.fn()))
      .toThrow(WorkbookOperationCancelledError);
    expect(() => first.workbook.eventBus.once('row-height-change', jest.fn()))
      .toThrow(WorkbookOperationCancelledError);
    first.workbook.eventBus.off('cell-value-change', firstHandler);
    unsubscribeFirst();

    await expect(second.workbook.mutationPort.setCellValue(second.alpha, { row: 1, col: 1 }, 'still active'))
      .resolves.toBeUndefined();
    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'still active' }));
    expect(disposals.slice(3).every((dispose) => dispose.mock.calls.length === 0)).toBe(true);
    second.workbook.dispose();
    unsubscribeSecond();
    expect(disposals.slice(3).every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
  });
});
