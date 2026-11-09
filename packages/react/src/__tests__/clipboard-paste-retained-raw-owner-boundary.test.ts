import { ClipboardService, CommandManager, PasteCommand, Workbook } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook, Worksheet } from '../../../core/src/worksheet';
import { OwnerBackedWorkbookSheetView } from '../../../core/src/WorkbookSheetView';
import type { WorkbookId } from '../../../core/src/workbook-access-types';
import { performPasteAsync } from '../utils/clipboardOperations';

describe('R1 retained raw Worksheet async paste boundary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('adopted raw Worksheet async Paste rejects before payload lookup, target reads, or diagnostics', async () => {
    // This internal adoption seam characterizes retained-raw behavior; it is not a supported public Workbook lifecycle.
    const worksheet = new Worksheet('Retained raw paste target', 2, 2);
    const formula = '=40+2';
    const cachedValueSentinel = 'retained-formula-cache-sentinel';
    const targetAddress = { row: 1, col: 1 };
    worksheet.setCellFormula(targetAddress, formula, cachedValueSentinel);

    const clipboard = new ClipboardService();
    const sourceWorksheet = new Worksheet('Paste payload source', 2, 2);
    sourceWorksheet.setCellValue(targetAddress, 'replacement');
    clipboard.copy(sourceWorksheet, { start: targetAddress, end: targetAddress });

    adoptWorksheetByWorkbook(worksheet, 'retained-raw-paste-owner' as WorkbookId);
    expect(worksheet.isWorkbookOwned()).toBe(true);
    expect('workbookId' in worksheet).toBe(false);

    const commandManager = new CommandManager();
    const historyBefore = commandManager.getHistorySize();
    const worksheetEvents: unknown[] = [];
    const eventSubscription = worksheet.on((event) => worksheetEvents.push(event));
    const observations: string[] = [];
    const targetReadAddresses: string[] = [];
    let targetReadExposedSentinel = false;
    let snapshotLogExposedSentinel = false;
    let submittedCommand: unknown;

    const originalGetCell = Worksheet.prototype.getCell;
    const originalGetMergedRangeForCell = Worksheet.prototype.getMergedRangeForCell;
    const getMergedRangeSpy = jest
      .spyOn(Worksheet.prototype, 'getMergedRangeForCell')
      .mockImplementation(function (this: Worksheet, address) {
        if (this === worksheet) {
          observations.push('target merge read');
          targetReadAddresses.push(`merge:${address.row},${address.col}`);
        }
        return originalGetMergedRangeForCell.call(this, address);
      });
    const getCellSpy = jest
      .spyOn(Worksheet.prototype, 'getCell')
      .mockImplementation(function (this: Worksheet, address) {
        const cell = originalGetCell.call(this, address);
        if (this === worksheet) {
          observations.push('target cell read');
          targetReadAddresses.push(`cell:${address.row},${address.col}`);
          targetReadExposedSentinel ||= cell?.value === cachedValueSentinel;
        }
        return cell;
      });
    const getPayloadSpy = jest.spyOn(clipboard, 'getPayload');
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      observations.push(String(args[0]));
    });
    const executeSpy = jest.spyOn(commandManager, 'execute').mockImplementation((command) => {
      observations.push('command manager execute');
      submittedCommand = command;
    });
    const pasteExecuteSpy = jest.spyOn(PasteCommand.prototype, 'execute');

    try {
      await expect(
        performPasteAsync(worksheet, commandManager, clipboard, targetAddress),
      ).rejects.toThrow(/unavailable/);

      expect(getPayloadSpy).not.toHaveBeenCalled();
      expect(getMergedRangeSpy).not.toHaveBeenCalled();
      expect(getCellSpy).not.toHaveBeenCalled();
      expect(targetReadAddresses).toEqual([]);
      expect(targetReadExposedSentinel).toBe(false);
      expect(snapshotLogExposedSentinel).toBe(false);
      expect(observations).toEqual([]);
      expect(submittedCommand).toBeUndefined();
      expect(executeSpy).not.toHaveBeenCalled();
      expect(pasteExecuteSpy).not.toHaveBeenCalled();
      expect(commandManager.getHistorySize()).toEqual(historyBefore);
      expect(worksheetEvents).toHaveLength(0);
      expect(JSON.stringify(consoleLogSpy.mock.calls)).not.toContain(cachedValueSentinel);

      const finalCell = originalGetCell.call(worksheet, targetAddress);
      expect(finalCell?.value === cachedValueSentinel && finalCell?.formula === formula).toBe(true);
    } finally {
      eventSubscription.dispose();
    }
  });

  test('standalone async Paste continues to apply an existing detached payload', async () => {
    const target = new Worksheet('Standalone async paste target', 2, 2);
    const source = new Worksheet('Standalone async paste source', 2, 2);
    source.setCellValue({ row: 1, col: 1 }, 'standalone-paste-value');
    const clipboard = new ClipboardService();
    clipboard.copy(source, {
      start: { row: 1, col: 1 },
      end: { row: 1, col: 1 },
    });
    const commandManager = new CommandManager();

    await expect(
      performPasteAsync(target, commandManager, clipboard, { row: 2, col: 2 }),
    ).resolves.toBe(true);

    expect(target.getCellValue({ row: 2, col: 2 })).toBe('standalone-paste-value');
  });

  test('standalone async Paste applies valid external clipboard text when the internal payload is empty', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const readText = jest.fn<Promise<string>, []>().mockResolvedValue('external-A\texternal-B\nexternal-C\texternal-D');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });

    try {
      const target = new Worksheet('Standalone external text target', 3, 3);
      const clipboard = new ClipboardService();
      const commandManager = new CommandManager();
      const eventLog: unknown[] = [];
      const subscription = target.on(event => eventLog.push(event));

      await expect(
        performPasteAsync(target, commandManager, clipboard, { row: 1, col: 1 }),
      ).resolves.toBe(true);

      expect(readText).toHaveBeenCalledTimes(1);
      expect(target.getCellValue({ row: 1, col: 1 })).toBe('external-A');
      expect(target.getCellValue({ row: 1, col: 2 })).toBe('external-B');
      expect(target.getCellValue({ row: 2, col: 1 })).toBe('external-C');
      expect(target.getCellValue({ row: 2, col: 2 })).toBe('external-D');
      expect(commandManager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
      expect(eventLog.length).toBeGreaterThan(0);
      subscription.dispose();
    } finally {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });

  test('owner-view async Paste rejects an empty internal payload before external clipboard reads', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const readText = jest.fn<Promise<string>, []>().mockResolvedValue('must-not-be-read');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });

    try {
      const workbook = Workbook.create({
        sheets: [{ name: 'Owner external paste', rows: 2, cols: 2 }],
      });
      const ownerView = workbook.activeSheet!;
      expect(ownerView).toBeInstanceOf(OwnerBackedWorkbookSheetView);
      const clipboard = new ClipboardService();
      const commandManager = new CommandManager();
      const getPayloadSpy = jest.spyOn(clipboard, 'getPayload');
      const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
      const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');
      const ownerGetCellReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellRead');

      await expect(
        performPasteAsync(ownerView, commandManager, clipboard, { row: 1, col: 1 }),
      ).rejects.toThrow(/workbook-owned operation is unavailable/);

      expect(getPayloadSpy).not.toHaveBeenCalled();
      expect(readText).not.toHaveBeenCalled();
      expect(ownerGetCellSpy).not.toHaveBeenCalled();
      expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
      expect(ownerGetCellReadSpy).not.toHaveBeenCalled();
      expect(commandManager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 0 });
    } finally {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });

});
