import { ClipboardService, CommandManager, PasteCommand } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook, Worksheet } from '../../../core/src/worksheet';
import type { WorkbookId } from '../../../core/src/workbook-access-types';
import { performPaste } from '../utils/clipboardOperations';

describe('R1 retained raw Worksheet synchronous paste boundary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('adopted raw Worksheet synchronous Paste rejects before payload lookup or target snapshot logging', () => {
    // This internal adoption seam characterizes retained-raw behavior; it is not a supported public Workbook lifecycle.
    const worksheet = new Worksheet('Retained raw sync paste target', 2, 2);
    const formula = '=40+2';
    const cachedValueSentinel = 'retained-sync-formula-cache-sentinel';
    const targetAddress = { row: 1, col: 1 };
    worksheet.setCellFormula(targetAddress, formula, cachedValueSentinel);

    const clipboard = new ClipboardService();
    const sourceWorksheet = new Worksheet('Sync paste payload source', 2, 2);
    sourceWorksheet.setCellValue(targetAddress, 'replacement');
    clipboard.copy(sourceWorksheet, { start: targetAddress, end: targetAddress });

    adoptWorksheetByWorkbook(worksheet, 'retained-raw-sync-paste-owner' as WorkbookId);
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
    let pasteExecuteError: unknown;
    let managerExecuteError: unknown;

    const originalGetCell = Worksheet.prototype.getCell;
    const originalGetMergedRangeForCell = Worksheet.prototype.getMergedRangeForCell;
    const originalPasteExecute = PasteCommand.prototype.execute;
    const originalManagerExecute = commandManager.execute.bind(commandManager);

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
    const diagnosticLog = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      observations.push(String(args[0]));
    });
    const pasteExecuteSpy = jest
      .spyOn(PasteCommand.prototype, 'execute')
      .mockImplementation(function (this: PasteCommand) {
        try {
          return originalPasteExecute.call(this);
        } catch (error) {
          pasteExecuteError = error;
          throw error;
        }
      });
    const managerExecuteSpy = jest
      .spyOn(commandManager, 'execute')
      .mockImplementation((command) => {
        observations.push('command manager execute');
        try {
          return originalManagerExecute(command);
        } catch (error) {
          managerExecuteError = error;
          throw error;
        }
      });

    try {
      expect(() => performPaste(worksheet, commandManager, clipboard, targetAddress)).toThrow(/unavailable/);

      expect(pasteExecuteError).toBeUndefined();
      expect(managerExecuteError).toBeUndefined();
      expect(getPayloadSpy).not.toHaveBeenCalled();
      expect(getMergedRangeSpy).not.toHaveBeenCalled();
      expect(getCellSpy).not.toHaveBeenCalled();
      expect(targetReadAddresses).toEqual([]);
      expect(targetReadExposedSentinel).toBe(false);
      expect(snapshotLogExposedSentinel).toBe(false);
      expect(observations).toEqual([]);
      expect(diagnosticLog).not.toHaveBeenCalled();
      expect(managerExecuteSpy).not.toHaveBeenCalled();
      expect(pasteExecuteSpy).not.toHaveBeenCalled();
      expect(commandManager.getHistorySize()).toEqual(historyBefore);
      expect(worksheetEvents).toHaveLength(0);

      const finalCell = originalGetCell.call(worksheet, targetAddress);
      expect(finalCell?.value === cachedValueSentinel && finalCell?.formula === formula).toBe(true);
    } finally {
      eventSubscription.dispose();
    }
  });

  test('standalone synchronous Paste continues to execute and preserve undo history', () => {
    const target = new Worksheet('Standalone sync paste target', 2, 2);
    const source = new Worksheet('Standalone sync paste source', 2, 2);
    source.setCellValue({ row: 1, col: 1 }, 'standalone-sync-value');
    const clipboard = new ClipboardService();
    clipboard.copy(source, {
      start: { row: 1, col: 1 },
      end: { row: 1, col: 1 },
    });
    const commandManager = new CommandManager();

    expect(performPaste(target, commandManager, clipboard, { row: 2, col: 2 })).toBe(true);
    expect(target.getCellValue({ row: 2, col: 2 })).toBe('standalone-sync-value');
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
  });
});
