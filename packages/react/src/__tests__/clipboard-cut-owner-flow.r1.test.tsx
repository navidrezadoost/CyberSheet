import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ClipboardService, CommandManager, PasteCommand, Workbook, Worksheet } from '@cyber-sheet/core';
import * as clipboardOperations from '../utils/clipboardOperations';
import * as guardedCommandManager from '../config/guardedCommandManager';
import { ExcelApp } from '../components/ExcelApp';
import { ClipboardGroup } from '../components/ribbon/ClipboardGroup';
import { OwnerBackedWorkbookSheetView } from '../../../core/src/WorkbookSheetView';
import type { Range } from '../../../core/src/types';

jest.mock('../CyberSheet', () => {
  const ReactModule = require('react');
  return {
    CyberSheet: (props: any) => {
      const [ready, setReady] = ReactModule.useState(false);
      const selection = ReactModule.useMemo(() => ({
        start: { row: 1, col: 1 },
        end: { row: 1, col: 2 },
      }), []);
      ReactModule.useEffect(() => {
        const canvas = document.querySelector('[data-testid="mock-sheet-canvas"]');
        props.onRendererReady({
          canvas,
          selection,
          getSelections: jest.fn(() => [selection]),
          hitTest: jest.fn(() => ({ type: 'cell', addr: { row: 1, col: 2 } })),
          getViewportSize: () => ({ width: 800, height: 500 }),
          getScroll: () => ({ x: 0, y: 0 }),
          onScrollChange: () => ({ dispose: () => {} }),
          setViewMode: () => {},
          invalidateRange: () =>
            window.dispatchEvent(new Event('excelapp-renderer-invalidate-range')),
          scheduleRedraw: () =>
            window.dispatchEvent(new Event('excelapp-renderer-schedule-redraw')),
          sheetReadonly: undefined,
        });
        setReady(true);
      }, [props.onRendererReady]);
      return ReactModule.createElement(
        ReactModule.Fragment,
        null,
        ReactModule.createElement(
          'button',
          {
            'data-testid': 'select-cut-range',
            onClick: () => props.onSelectionChange(selection),
          },
          'select cut range',
        ),
        ReactModule.createElement('canvas', { 'data-testid': 'mock-sheet-canvas' }),
        ready
          ? ReactModule.createElement('span', { 'data-testid': 'renderer-ready' }, 'ready')
          : null,
      );
    },
  };
});

jest.mock('../components/DrawingCanvas', () => {
  const ReactModule = require('react');
  return { DrawingCanvas: ReactModule.forwardRef(() => null) };
});
jest.mock('../components/CutRangeOverlay', () => {
  const ReactModule = require('react');
  return {
    CutRangeOverlay: ({ cutRange }: { cutRange: unknown }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'cut-range-overlay' },
        JSON.stringify(cutRange),
      ),
  };
});
jest.mock('@cyber-sheet/icons/react', () => {
  const ReactModule = require('react');
  return new Proxy({}, {
    get: (_target, name) =>
      name === '__esModule'
        ? true
        : (props: Record<string, unknown>) => ReactModule.createElement('span', props),
  });
}, { virtual: true });
jest.mock('@cyber-sheet/react', () => ({ DataValidationDialog: () => null }), { virtual: true });
jest.mock('../components/MiniToolbar', () => {
  const ReactModule = require('react');
  return {
    MiniToolbar: () => ReactModule.createElement('div', { 'data-testid': 'mock-mini-toolbar' }),
  };
});
jest.mock('../components/excel-app.css', () => ({}), { virtual: true });
jest.mock('../components/ribbon/ribbon.css', () => ({}), { virtual: true });

const range: Range = {
  start: { row: 1, col: 1 },
  end: { row: 1, col: 2 },
};

describe('R1 ExcelApp clipboard owner flows', () => {
  const writeText = jest.fn<Promise<void>, [string]>().mockResolvedValue();
  const readText = jest.fn<Promise<string>, []>().mockResolvedValue('external clipboard');
  const eventListenerDisposers: Array<() => void> = [];
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const originalLog = console.log;

  beforeEach(() => {
    writeText.mockClear();
    readText.mockClear();
    document.body.classList.remove('clipboard-action-pulse');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText, readText },
    });
    console.log = jest.fn();
  });

  afterEach(() => {
    cleanup();
    eventListenerDisposers.splice(0).forEach(dispose => dispose());
    Reflect.deleteProperty(window, '__renderer');
    jest.restoreAllMocks();
    console.log = originalLog;
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  const mountContextPasteApp = async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Context menu paste', rows: 3, cols: 3 }] });
    const activeView = workbook.activeSheet!;
    const seedWorksheet = new Worksheet('Clipboard seed', 1, 1);
    seedWorksheet.setCellFormula({ row: 1, col: 1 }, '=clipboard_formula_secret', 'clipboard_cached_value_secret');
    let clipboardAtPaste: ClipboardService | undefined;
    let payloadBefore: ReturnType<ClipboardService['getPayload']> = null;
    let commandManagerAtPaste: CommandManager | undefined;
    let commandManagerExecuteSpy: jest.SpyInstance | undefined;
    let getPayloadSpy: jest.SpyInstance | undefined;
    let historyBefore: ReturnType<CommandManager['getHistorySize']> | undefined;
    let completionSpy: jest.Mock | undefined;
    let capturedRejection: Promise<unknown> | undefined;

    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');
    const ownerGetCellReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellRead');
    const worksheetGetCellSpy = jest.spyOn(Worksheet.prototype, 'getCell');
    const worksheetGetCellValueSpy = jest.spyOn(Worksheet.prototype, 'getCellValue');
    const worksheetGetMergedRangeSpy = jest.spyOn(Worksheet.prototype, 'getMergedRangeForCell');
    const originalPerformPasteAsync = clipboardOperations.performPasteAsync;
    const performPasteSpy = jest.spyOn(clipboardOperations, 'performPasteAsync').mockImplementation(
      (sheet, commandManager, clipboardService, targetAnchor, options) => {
        clipboardAtPaste = clipboardService;
        clipboardService.copy(seedWorksheet, {
          start: { row: 1, col: 1 },
          end: { row: 1, col: 1 },
        });
        payloadBefore = clipboardService.getPayload();
        commandManagerAtPaste = commandManager;
        historyBefore = commandManager.getHistorySize();
        commandManagerExecuteSpy = jest.spyOn(commandManager, 'execute');
        getPayloadSpy = jest.spyOn(ClipboardService.prototype, 'getPayload');
        getPayloadSpy.mockClear();

        // Ignore setup reads from staging the existing payload; count only effects
        // after the real helper receives the owner-backed view.
        ownerGetCellSpy.mockClear();
        ownerGetCellValueSpy.mockClear();
        ownerGetCellReadSpy.mockClear();
        worksheetGetCellSpy.mockClear();
        worksheetGetCellValueSpy.mockClear();
        worksheetGetMergedRangeSpy.mockClear();

        // Preserve the real completion behavior while making its invocation observable.
        completionSpy = jest.fn(() => options?.onCutComplete?.());
        const observedOptions = { ...options, onCutComplete: completionSpy };
        const promise = originalPerformPasteAsync(
          sheet,
          commandManager,
          clipboardService,
          targetAnchor,
          observedOptions,
        );
        capturedRejection = promise.then(() => undefined, (error: unknown) => error);
        // Return the real rejection to ExcelApp; its production catch must handle it.
        return promise;
      },
    );

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));
    const renderer = (window as any).__renderer as {
      canvas: HTMLCanvasElement;
      getSelections: jest.Mock;
      hitTest: jest.Mock;
    };

    return {
      workbook,
      activeView,
      renderer,
      performPasteSpy,
      ownerGetCellSpy,
      ownerGetCellValueSpy,
      ownerGetCellReadSpy,
      worksheetGetCellSpy,
      worksheetGetCellValueSpy,
      worksheetGetMergedRangeSpy,
      get clipboardAtPaste() { return clipboardAtPaste; },
      get payloadBefore() { return payloadBefore; },
      get commandManagerAtPaste() { return commandManagerAtPaste; },
      get commandManagerExecuteSpy() { return commandManagerExecuteSpy; },
      get getPayloadSpy() { return getPayloadSpy; },
      get historyBefore() { return historyBefore; },
      get completionSpy() { return completionSpy; },
      get capturedRejection() { return capturedRejection; },
    };
  };

  test('ExcelApp Ctrl+X rejects the owner view before staging, reads, publication, or cut outline', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'ExcelApp cut', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet!;
    const seedWorksheet = new Worksheet('Clipboard seed', 2, 2);
    seedWorksheet.setCellValue({ row: 1, col: 1 }, 'previous payload');
    let serviceAtCut: ClipboardService | undefined;
    let preexistingPayload: ReturnType<ClipboardService['getPayload']> = null;
    const originalPerformCut = clipboardOperations.performCut;
    const performCutSpy = jest.spyOn(clipboardOperations, 'performCut').mockImplementation(
      (sheet, clipboard, selectedRange, options) => {
        clipboard.copy(seedWorksheet, { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });
        serviceAtCut = clipboard;
        preexistingPayload = clipboard.getPayload();
        return originalPerformCut(sheet, clipboard, selectedRange, options);
      },
    );
    const clipboardCutSpy = jest.spyOn(ClipboardService.prototype, 'cut');
    const ownerReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));
    expect(screen.queryByTestId('cut-range-overlay')).toBeNull();

    ownerReadSpy.mockClear();
    const windowErrors: Error[] = [];
    const onWindowError = (event: ErrorEvent) => {
      windowErrors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onWindowError);
    const keyboardEvent = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    let dispatchResult: boolean | undefined;
    let synchronousError: unknown;
    act(() => {
      try {
        dispatchResult = window.dispatchEvent(keyboardEvent);
      } catch (error) {
        synchronousError = error;
      }
    });
    window.removeEventListener('error', onWindowError);

    expect(performCutSpy).toHaveBeenCalledTimes(1);
    expect(performCutSpy).toHaveBeenCalledWith(activeView, expect.any(ClipboardService), range, { mode: 'all' });
    expect(serviceAtCut).toBeInstanceOf(ClipboardService);
    expect(clipboardCutSpy).not.toHaveBeenCalled();
    expect(ownerReadSpy).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(serviceAtCut!.getPayload()).toBe(preexistingPayload);
    expect(preexistingPayload).toMatchObject({ isCut: false, cells: [{ value: 'previous payload' }] });
    expect(screen.queryByTestId('cut-range-overlay')).toBeNull();

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(dispatchResult).toBe(false);
    expect(synchronousError).toBeUndefined();
    expect(windowErrors).toHaveLength(0);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
  });

  test('standalone performCut stages an isCut payload and leaves source cells intact', () => {
    const worksheet = new Worksheet('Standalone cut', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'source value');
    const clipboard = new ClipboardService();

    const result = clipboardOperations.performCut(worksheet, clipboard, range);

    expect(result).toEqual(range);
    expect(clipboard.getPayload()).toMatchObject({
      sourceRange: range,
      isCut: true,
      copyMode: 'all',
      cells: [{ rowOffset: 0, colOffset: 0, value: 'source value' }],
    });
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('source value');
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('source value');
    expect(writeText).toHaveBeenCalledWith('source value\t');
  });

  test('ClipboardGroup preserves successful standalone Worksheet Cut callbacks', () => {
    const worksheet = new Worksheet('Standalone Ribbon Cut', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'standalone cut value');
    const clipboardService = new ClipboardService();
    const onCut = jest.fn();
    const onCutComplete = jest.fn();
    const onAfterClipboard = jest.fn();

    render(React.createElement(ClipboardGroup, {
      worksheet,
      clipboardService,
      commandManager: new CommandManager(),
      selectedCells: [{ row: 1, col: 1 }],
      currentRange: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      onCut,
      onCutComplete,
      onAfterClipboard,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Cut' }));

    expect(clipboardService.getPayload()).toMatchObject({
      isCut: true,
      cells: [{ value: 'standalone cut value' }],
    });
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('standalone cut value');
    expect(onCut).toHaveBeenCalledTimes(1);
    expect(onCutComplete).toHaveBeenCalledWith({
      start: { row: 1, col: 1 },
      end: { row: 1, col: 1 },
    });
    expect(onAfterClipboard).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('standalone cut value');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body.classList.contains('clipboard-action-pulse')).toBe(true);
    document.body.classList.remove('clipboard-action-pulse');
  });

  test('ExcelApp Ribbon Cut reports owner rejection before clipboard reads, publication, or success effects', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Ribbon cut', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet!;
    const seedWorksheet = new Worksheet('Clipboard seed', 2, 2);
    seedWorksheet.setCellValue({ row: 1, col: 1 }, 'previous payload');
    let clipboardAtCut: ClipboardService | undefined;
    let preexistingPayload: ReturnType<ClipboardService['getPayload']> = null;
    const originalPerformCut = clipboardOperations.performCut;
    const performCutSpy = jest.spyOn(clipboardOperations, 'performCut').mockImplementation(
      (sheet, clipboard, selectedRange, options) => {
        clipboard.copy(seedWorksheet, { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });
        clipboardAtCut = clipboard;
        preexistingPayload = clipboard.getPayload();
        return originalPerformCut(sheet, clipboard, selectedRange, options);
      },
    );
    const clipboardCutSpy = jest.spyOn(ClipboardService.prototype, 'cut');
    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));

    const cutButton = screen.getByRole('button', { name: 'Cut' });
    const pasteButton = screen.getByRole('button', { name: 'Paste' });
    expect(cutButton).toBeEnabled();
    expect(pasteButton).toBeDisabled();
    expect(document.body.classList.contains('clipboard-action-pulse')).toBe(false);

    ownerGetCellSpy.mockClear();
    ownerGetCellValueSpy.mockClear();
    const redrawEvents: Event[] = [];
    const onRedraw = (event: Event) => redrawEvents.push(event);
    window.addEventListener('excelapp-renderer-schedule-redraw', onRedraw);
    const clickErrors: unknown[] = [];
    const onWindowError = (event: ErrorEvent) => {
      clickErrors.push(event.error ?? event.message);
      event.preventDefault();
    };
    window.addEventListener('error', onWindowError);
    let clickResult: boolean | undefined;
    let synchronousError: unknown;
    act(() => {
      try {
        clickResult = fireEvent.click(cutButton);
      } catch (error) {
        synchronousError = error;
      }
    });
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('excelapp-renderer-schedule-redraw', onRedraw);

    expect(performCutSpy).toHaveBeenCalledTimes(1);
    const [sheetArgument, clipboardArgument, rangeArgument, optionsArgument] = performCutSpy.mock.calls[0]!;
    expect(sheetArgument).toBe(activeView);
    expect(clipboardArgument).toBe(clipboardAtCut);
    expect(clipboardArgument).toBeInstanceOf(ClipboardService);
    expect(rangeArgument).toEqual(range);
    expect(optionsArgument).toBeUndefined();
    expect(clipboardAtCut!.getPayload()).toBe(preexistingPayload);
    expect(preexistingPayload).toMatchObject({ isCut: false, cells: [{ value: 'previous payload' }] });
    expect(clipboardCutSpy).not.toHaveBeenCalled();
    expect(ownerGetCellSpy).not.toHaveBeenCalled();
    expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();

    expect(pasteButton).toBeDisabled();
    expect(redrawEvents).toHaveLength(0);
    expect(document.body.classList.contains('clipboard-action-pulse')).toBe(false);
    expect(clickResult).toBe(true);
    expect(synchronousError).toBeUndefined();
    expect(clickErrors).toHaveLength(0);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
  });

  test('ExcelApp Ribbon Copy enables Paste, whose owner rejection has no clipboard or command effects', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Ribbon copy paste', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet!;
    expect(activeView).toBeInstanceOf(OwnerBackedWorkbookSheetView);

    let clipboardAtCopy: ClipboardService | undefined;
    let payloadAfterCopy: ReturnType<ClipboardService['getPayload']> = null;
    let commandManagerFromApp: CommandManager | undefined;
    let returnedPastePromise: Promise<boolean> | undefined;

    const originalPerformCopy = clipboardOperations.performCopy;
    const performCopySpy = jest.spyOn(clipboardOperations, 'performCopy').mockImplementation(
      (sheet, clipboardService, selectedRange, options) => {
        const result = originalPerformCopy(sheet, clipboardService, selectedRange, options);
        clipboardAtCopy = clipboardService;
        payloadAfterCopy = clipboardService.getPayload();
        return result;
      },
    );
    const clipboardCopySpy = jest.spyOn(ClipboardService.prototype, 'copy');

    const originalCreateGuardedCommandManager = guardedCommandManager.createGuardedCommandManager;
    const createGuardedCommandManagerSpy = jest.spyOn(
      guardedCommandManager,
      'createGuardedCommandManager',
    ).mockImplementation((base, config) => {
      commandManagerFromApp = originalCreateGuardedCommandManager(base, config);
      return commandManagerFromApp;
    });

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));

    const copyButton = screen.getByRole('button', { name: 'Copy' });
    const pasteButton = screen.getByRole('button', { name: 'Paste' });
    expect(pasteButton).toBeDisabled();

    fireEvent.click(copyButton);
    await waitFor(() => expect(pasteButton).toBeEnabled());

    expect(performCopySpy).toHaveBeenCalledTimes(1);
    const [copySheet, copyClipboard, copyRange, copyOptions] = performCopySpy.mock.calls[0]!;
    expect(copySheet).toBe(activeView);
    expect(copyClipboard).toBeInstanceOf(ClipboardService);
    expect(copyClipboard).toBe(clipboardAtCopy);
    expect(copyRange).toEqual(range);
    expect(copyOptions).toBeUndefined();
    expect(clipboardCopySpy).toHaveBeenCalledTimes(1);
    expect(clipboardCopySpy).toHaveBeenCalledWith(activeView, range, 'all');
    expect(payloadAfterCopy).toMatchObject({
      sourceRange: range,
      width: 2,
      height: 1,
      isCut: false,
    });
    expect(payloadAfterCopy).not.toBeNull();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(commandManagerFromApp).toBeDefined();
    expect(createGuardedCommandManagerSpy).toHaveBeenCalledTimes(1);

    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');
    const ownerGetCellReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellRead');
    const ownerGetMergedRangeSpy = jest.spyOn(
      OwnerBackedWorkbookSheetView.prototype,
      'getMergedRangeForCell',
    );
    const worksheetGetCellSpy = jest.spyOn(Worksheet.prototype, 'getCell');
    const worksheetGetCellValueSpy = jest.spyOn(Worksheet.prototype, 'getCellValue');
    const worksheetGetMergedRangeSpy = jest.spyOn(Worksheet.prototype, 'getMergedRangeForCell');
    const pasteCommandExecuteSpy = jest.spyOn(PasteCommand.prototype, 'execute');
    const serviceGetPayloadSpy = jest.spyOn(ClipboardService.prototype, 'getPayload');
    const appCommandExecuteSpy = jest.spyOn(commandManagerFromApp!, 'execute');
    const historyBefore = commandManagerFromApp!.getHistorySize();
    const worksheetEvents: unknown[] = [];
    const disposeWorksheetEvents = activeView.on(event => worksheetEvents.push(event));
    eventListenerDisposers.push(() => disposeWorksheetEvents.dispose());

    const renderer = (window as any).__renderer as {
      invalidateRange: jest.Mock;
      scheduleRedraw: jest.Mock;
    };
    const invalidateSpy = jest.spyOn(renderer, 'invalidateRange');
    const redrawSpy = jest.spyOn(renderer, 'scheduleRedraw');

    // Copy is valid and has completed. Clear its read, write, clipboard, and redraw
    // observations so only the subsequent Paste attempt is measured.
    ownerGetCellSpy.mockClear();
    ownerGetCellValueSpy.mockClear();
    ownerGetCellReadSpy.mockClear();
    ownerGetMergedRangeSpy.mockClear();
    worksheetGetCellSpy.mockClear();
    worksheetGetCellValueSpy.mockClear();
    worksheetGetMergedRangeSpy.mockClear();
    pasteCommandExecuteSpy.mockClear();
    serviceGetPayloadSpy.mockClear();
    appCommandExecuteSpy.mockClear();
    clipboardCopySpy.mockClear();
    writeText.mockClear();
    readText.mockClear();
    invalidateSpy.mockClear();
    redrawSpy.mockClear();

    const originalPerformPasteAsync = clipboardOperations.performPasteAsync;
    const performPasteSpy = jest.spyOn(clipboardOperations, 'performPasteAsync').mockImplementation(
      (sheet, commandManager, clipboardService, targetAnchor, options) => {
        const realPromise = originalPerformPasteAsync(
          sheet,
          commandManager,
          clipboardService,
          targetAnchor,
          options,
        );
        returnedPastePromise = realPromise;
        // Return the original rejection. ClipboardGroup's production rejection
        // handler must contain it. The test does not attach a rejection consumer.
        return realPromise;
      },
    );

    fireEvent.click(pasteButton);
    expect(returnedPastePromise).toBeDefined();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(performPasteSpy).toHaveBeenCalledTimes(1);
    const [pasteSheet, pasteCommandManager, pasteClipboard, targetAnchor, pasteOptions] =
      performPasteSpy.mock.calls[0]!;
    expect(pasteSheet).toBe(activeView);
    expect(pasteCommandManager).toBe(commandManagerFromApp);
    expect(pasteClipboard).toBe(clipboardAtCopy);
    expect(targetAnchor).toEqual({ row: 1, col: 1 });
    expect(pasteOptions).toBeUndefined();

    expect(serviceGetPayloadSpy).not.toHaveBeenCalled();
    serviceGetPayloadSpy.mockRestore();
    expect(clipboardAtCopy!.getPayload()).toBe(payloadAfterCopy);
    expect(readText).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(clipboardCopySpy).not.toHaveBeenCalled();
    expect(ownerGetCellSpy).not.toHaveBeenCalled();
    expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(ownerGetCellReadSpy).not.toHaveBeenCalled();
    expect(ownerGetMergedRangeSpy).not.toHaveBeenCalled();
    expect(worksheetGetCellSpy).not.toHaveBeenCalled();
    expect(worksheetGetCellValueSpy).not.toHaveBeenCalled();
    expect(worksheetGetMergedRangeSpy).not.toHaveBeenCalled();
    expect(pasteCommandExecuteSpy).not.toHaveBeenCalled();
    expect(appCommandExecuteSpy).not.toHaveBeenCalled();
    expect(commandManagerFromApp!.getHistorySize()).toEqual(historyBefore);
    expect(worksheetEvents).toHaveLength(0);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(redrawSpy).not.toHaveBeenCalled();
    expect(pasteButton).toBeEnabled();
  });

  test('ClipboardGroup presents owner-view Paste rejection without success effects', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Ribbon owner paste', rows: 2, cols: 2 }] });
    const ownerView = workbook.activeSheet!;
    const clipboardService = new ClipboardService();
    const commandManager = new CommandManager();
    const onPaste = jest.fn();
    const onAfterClipboard = jest.fn();
    const selection = [{ row: 1, col: 1 }];

    render(React.createElement(ClipboardGroup, {
      worksheet: ownerView,
      clipboardService,
      commandManager,
      selectedCells: selection,
      currentRange: range,
      onPaste,
      onAfterClipboard,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    const retainedPayload = clipboardService.getPayload();
    expect(retainedPayload).not.toBeNull();
    onAfterClipboard.mockClear();
    writeText.mockClear();
    readText.mockClear();
    document.body.classList.remove('clipboard-action-pulse');

    const getPayloadSpy = jest.spyOn(clipboardService, 'getPayload');
    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');
    const ownerGetCellReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellRead');
    const worksheetEvents: unknown[] = [];
    const disposeWorksheetEvents = ownerView.on(event => worksheetEvents.push(event));
    eventListenerDisposers.push(() => disposeWorksheetEvents.dispose());
    const executeSpy = jest.spyOn(commandManager, 'execute');
    const historyBefore = commandManager.getHistorySize();
    const originalPerformPasteAsync = clipboardOperations.performPasteAsync;
    let returnedPastePromise: Promise<boolean> | undefined;
    const performPasteSpy = jest.spyOn(clipboardOperations, 'performPasteAsync').mockImplementation(
      (sheet, manager, clipboard, target, options) => {
        const promise = originalPerformPasteAsync(sheet, manager, clipboard, target, options);
        returnedPastePromise = promise;
        // Preserve the original rejected Promise for ClipboardGroup's real handler;
        // no test-side rejection consumer masks the production catch.
        return promise;
      },
    );

    const pasteButton = screen.getByRole('button', { name: 'Paste' });
    expect(pasteButton).toBeEnabled();
    fireEvent.click(pasteButton);
    expect(returnedPastePromise).toBeDefined();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(performPasteSpy).toHaveBeenCalledTimes(1);
    expect(performPasteSpy.mock.calls[0]![0]).toBe(ownerView);
    expect(performPasteSpy.mock.calls[0]![1]).toBe(commandManager);
    expect(performPasteSpy.mock.calls[0]![2]).toBe(clipboardService);
    expect(performPasteSpy.mock.calls[0]![3]).toEqual({ row: 1, col: 1 });
    expect(getPayloadSpy).not.toHaveBeenCalled();
    expect(clipboardService.getPayload()).toBe(retainedPayload);
    expect(readText).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(ownerGetCellSpy).not.toHaveBeenCalled();
    expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(ownerGetCellReadSpy).not.toHaveBeenCalled();
    expect(worksheetEvents).toHaveLength(0);
    expect(executeSpy).not.toHaveBeenCalled();
    expect(commandManager.getHistorySize()).toEqual(historyBefore);
    expect(onPaste).not.toHaveBeenCalled();
    expect(onAfterClipboard).not.toHaveBeenCalled();
    expect(document.body.classList.contains('clipboard-action-pulse')).toBe(false);
    expect(pasteButton).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
  });

  test('ClipboardGroup preserves successful standalone Worksheet Paste callbacks', async () => {
    const worksheet = new Worksheet('Standalone Ribbon Paste', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'standalone paste value');
    const clipboardService = new ClipboardService();
    const commandManager = new CommandManager();
    const onPaste = jest.fn();
    const onAfterClipboard = jest.fn();
    const originalRange: Range = { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } };
    const targetRange: Range = { start: { row: 1, col: 2 }, end: { row: 1, col: 2 } };
    const baseProps = {
      worksheet,
      clipboardService,
      commandManager,
      onPaste,
      onAfterClipboard,
    };
    const { rerender } = render(React.createElement(ClipboardGroup, {
      ...baseProps,
      selectedCells: [originalRange.start],
      currentRange: originalRange,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(clipboardService.getPayload()).not.toBeNull();
    onAfterClipboard.mockClear();
    onPaste.mockClear();
    document.body.classList.remove('clipboard-action-pulse');
    rerender(React.createElement(ClipboardGroup, {
      ...baseProps,
      selectedCells: [targetRange.start],
      currentRange: targetRange,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    await waitFor(() => expect(onPaste).toHaveBeenCalledTimes(1));

    expect(onAfterClipboard).toHaveBeenCalledTimes(1);
    expect(worksheet.getCellValue(targetRange.start)).toBe('standalone paste value');
    expect(commandManager.getHistorySize()).toMatchObject({ undoCount: 1, redoCount: 0 });
    expect(readText).not.toHaveBeenCalled();
  });

  test('ExcelApp Ctrl+V captures the owner-view rejection before clipboard, worksheet, command, or renderer effects', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'ExcelApp paste', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet!;
    const seedWorksheet = new Worksheet('Clipboard seed', 2, 2);
    seedWorksheet.setCellFormula({ row: 1, col: 1 }, '=keyboard_formula_secret', 'keyboard_cached_value_secret');

    let clipboardAtPaste: ClipboardService | undefined;
    let payloadBefore: ReturnType<ClipboardService['cut']> | undefined;
    let commandManagerAtPaste: CommandManager | undefined;
    let commandManagerExecuteSpy: jest.SpyInstance | undefined;
    let getPayloadSpy: jest.SpyInstance | undefined;
    let historyBefore: ReturnType<CommandManager['getHistorySize']> | undefined;
    let completionSpy: jest.Mock | undefined;
    let capturedRejection: Promise<unknown> | undefined;

    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');
    const ownerGetCellReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellRead');
    const worksheetGetCellSpy = jest.spyOn(Worksheet.prototype, 'getCell');
    const worksheetGetCellValueSpy = jest.spyOn(Worksheet.prototype, 'getCellValue');
    const worksheetGetMergedRangeSpy = jest.spyOn(Worksheet.prototype, 'getMergedRangeForCell');

    const invalidateEvents: Event[] = [];
    const redrawEvents: Event[] = [];
    const onInvalidate = (event: Event) => invalidateEvents.push(event);
    const onRedraw = (event: Event) => redrawEvents.push(event);
    window.addEventListener('excelapp-renderer-invalidate-range', onInvalidate);
    window.addEventListener('excelapp-renderer-schedule-redraw', onRedraw);
    eventListenerDisposers.push(
      () => window.removeEventListener('excelapp-renderer-invalidate-range', onInvalidate),
      () => window.removeEventListener('excelapp-renderer-schedule-redraw', onRedraw),
    );

    const originalPerformPasteAsync = clipboardOperations.performPasteAsync;
    const performPasteSpy = jest.spyOn(clipboardOperations, 'performPasteAsync').mockImplementation(
      (sheet, commandManager, clipboardService, targetAnchor, options) => {
        clipboardAtPaste = clipboardService;
        payloadBefore = clipboardService.cut(seedWorksheet, range);
        commandManagerAtPaste = commandManager;
        historyBefore = commandManager.getHistorySize();
        commandManagerExecuteSpy = jest.spyOn(commandManager, 'execute');
        getPayloadSpy = jest.spyOn(ClipboardService.prototype, 'getPayload');
        getPayloadSpy.mockClear();

        // Ignore setup reads from staging the existing payload; count only effects
        // after the real helper receives the owner-backed view.
        ownerGetCellSpy.mockClear();
        ownerGetCellValueSpy.mockClear();
        ownerGetCellReadSpy.mockClear();
        worksheetGetCellSpy.mockClear();
        worksheetGetCellValueSpy.mockClear();
        worksheetGetMergedRangeSpy.mockClear();

        // Preserve the real completion behavior while making its invocation observable.
        completionSpy = jest.fn(() => options?.onCutComplete?.());
        const observedOptions = { ...options, onCutComplete: completionSpy };
        const promise = originalPerformPasteAsync(
          sheet,
          commandManager,
          clipboardService,
          targetAnchor,
          observedOptions,
        );
        // Observe the real helper rejection without replacing it. ExcelApp's
        // production caller must handle the original Promise.
        capturedRejection = promise.then(() => undefined, (error: unknown) => error);
        return promise;
      },
    );

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));
    const worksheetEvents: unknown[] = [];
    const disposeWorksheetEvents = activeView.on(event => worksheetEvents.push(event));
    eventListenerDisposers.push(() => disposeWorksheetEvents.dispose());

    const keyboardEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    let dispatchResult: boolean | undefined;
    let synchronousError: unknown;
    act(() => {
      try {
        dispatchResult = window.dispatchEvent(keyboardEvent);
      } catch (error) {
        synchronousError = error;
      }
    });

    expect(capturedRejection).toBeDefined();
    let rejection: unknown;
    await act(async () => {
      rejection = await capturedRejection!;
      await Promise.resolve();
    });

    expect(performPasteSpy).toHaveBeenCalledTimes(1);
    const [sheetArgument, managerArgument, clipboardArgument, targetArgument, optionsArgument] =
      performPasteSpy.mock.calls[0]!;
    expect(sheetArgument).toBe(activeView);
    expect(managerArgument).toBe(commandManagerAtPaste);
    expect(managerArgument).toEqual(expect.objectContaining({
      execute: expect.any(Function),
      getHistorySize: expect.any(Function),
      undo: expect.any(Function),
      redo: expect.any(Function),
    }));
    expect(clipboardArgument).toBe(clipboardAtPaste);
    expect(clipboardArgument).toBeInstanceOf(ClipboardService);
    expect(targetArgument).toEqual({ row: 1, col: 1 });
    expect(optionsArgument).toEqual(expect.objectContaining({
      renderer: expect.objectContaining({
        invalidateRange: expect.any(Function),
        scheduleRedraw: expect.any(Function),
      }),
      onCutComplete: expect.any(Function),
    }));
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toMatch(/workbook-owned operation is unavailable/);
    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(dispatchResult).toBe(false);
    expect(synchronousError).toBeUndefined();

    expect(getPayloadSpy).not.toHaveBeenCalled();
    expect(readText).not.toHaveBeenCalled();
    expect(clipboardAtPaste!.getPayload()).toBe(payloadBefore);
    expect(payloadBefore).toMatchObject({
      isCut: true,
      cells: [{ value: 'keyboard_cached_value_secret', formula: 'keyboard_formula_secret' }],
    });
    expect(ownerGetCellSpy).not.toHaveBeenCalled();
    expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(ownerGetCellReadSpy).not.toHaveBeenCalled();
    expect(worksheetGetCellSpy).not.toHaveBeenCalled();
    expect(worksheetGetCellValueSpy).not.toHaveBeenCalled();
    expect(worksheetGetMergedRangeSpy).not.toHaveBeenCalled();
    expect(worksheetEvents).toHaveLength(0);
    expect(commandManagerExecuteSpy).not.toHaveBeenCalled();
    expect(commandManagerAtPaste!.getHistorySize()).toEqual(historyBefore);
    expect(completionSpy).not.toHaveBeenCalled();
    expect(invalidateEvents).toHaveLength(0);
    expect(redrawEvents).toHaveLength(0);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
    expect(alert.textContent).not.toContain('keyboard_cached_value_secret');
    expect(alert.textContent).not.toContain('=keyboard_formula_secret');

  });

  test('ExcelApp Ctrl+V with an empty internal clipboard rejects before external read and shows a safe error', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Empty owner paste', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet!;
    let clipboardAtPaste: ClipboardService | undefined;
    let commandManagerAtPaste: CommandManager | undefined;
    let getPayloadSpy: jest.SpyInstance | undefined;
    let executeSpy: jest.SpyInstance | undefined;
    let historyBefore: ReturnType<CommandManager['getHistorySize']> | undefined;
    let completionSpy: jest.Mock | undefined;
    let capturedRejection: Promise<unknown> | undefined;
    const originalPerformPasteAsync = clipboardOperations.performPasteAsync;
    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');
    const ownerGetCellReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellRead');
    const worksheetEvents: unknown[] = [];
    const disposeWorksheetEvents = activeView.on(event => worksheetEvents.push(event));
    eventListenerDisposers.push(() => disposeWorksheetEvents.dispose());

    const performPasteSpy = jest.spyOn(clipboardOperations, 'performPasteAsync').mockImplementation(
      (sheet, commandManager, clipboardService, targetAnchor, options) => {
        clipboardAtPaste = clipboardService;
        commandManagerAtPaste = commandManager;
        historyBefore = commandManager.getHistorySize();
        executeSpy = jest.spyOn(commandManager, 'execute');
        getPayloadSpy = jest.spyOn(clipboardService, 'getPayload');
        completionSpy = jest.fn(() => options?.onCutComplete?.());
        getPayloadSpy.mockClear();
        ownerGetCellSpy.mockClear();
        ownerGetCellValueSpy.mockClear();
        ownerGetCellReadSpy.mockClear();

        const promise = originalPerformPasteAsync(
          sheet,
          commandManager,
          clipboardService,
          targetAnchor,
          { ...options, onCutComplete: completionSpy },
        );
        capturedRejection = promise.then(
          () => new Error('Expected owner-view Paste to reject'),
          (error: unknown) => error,
        );
        // Return the real rejection; ExcelApp's production catch owns handling.
        return promise;
      },
    );

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));

    const keyboardEvent = new KeyboardEvent('keydown', {
      key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true, cancelable: true,
    });
    act(() => { window.dispatchEvent(keyboardEvent); });
    let rejection: unknown;
    await act(async () => {
      rejection = await capturedRejection!;
      await Promise.resolve();
    });

    expect(performPasteSpy).toHaveBeenCalledTimes(1);
    expect(performPasteSpy.mock.calls[0]![0]).toBe(activeView);
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toMatch(/unavailable/);
    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(readText).not.toHaveBeenCalled();
    expect(getPayloadSpy).not.toHaveBeenCalled();
    expect(ownerGetCellSpy).not.toHaveBeenCalled();
    expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(ownerGetCellReadSpy).not.toHaveBeenCalled();
    expect(worksheetEvents).toHaveLength(0);
    expect(executeSpy).not.toHaveBeenCalled();
    expect(commandManagerAtPaste!.getHistorySize()).toEqual(historyBefore);
    expect(clipboardAtPaste!.getPayload()).toBeNull();
    expect(completionSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
  });

  test('ExcelApp context-menu Paste targets the captured selection and closes after owner rejection', async () => {
    const harness = await mountContextPasteApp();
    const worksheetEvents: unknown[] = [];
    const disposeWorksheetEvents = harness.activeView.on(event => worksheetEvents.push(event));
    eventListenerDisposers.push(() => disposeWorksheetEvents.dispose());
    const invalidateEvents: Event[] = [];
    const redrawEvents: Event[] = [];
    const onInvalidate = (event: Event) => invalidateEvents.push(event);
    const onRedraw = (event: Event) => redrawEvents.push(event);
    window.addEventListener('excelapp-renderer-invalidate-range', onInvalidate);
    window.addEventListener('excelapp-renderer-schedule-redraw', onRedraw);
    eventListenerDisposers.push(
      () => window.removeEventListener('excelapp-renderer-invalidate-range', onInvalidate),
      () => window.removeEventListener('excelapp-renderer-schedule-redraw', onRedraw),
    );

    harness.renderer.getSelections.mockClear();
    harness.renderer.hitTest.mockClear();
    fireEvent.contextMenu(harness.renderer.canvas, { clientX: 137, clientY: 246 });

    expect(harness.renderer.getSelections).toHaveBeenCalledTimes(1);
    expect(harness.renderer.hitTest).toHaveBeenCalledWith(137, 246);
    expect(harness.renderer.hitTest.mock.results[0]!.value).toEqual({
      type: 'cell',
      addr: { row: 1, col: 2 },
    });
    expect(document.querySelector('.excel-context-menu')).not.toBeNull();
    expect(screen.getByTestId('mock-mini-toolbar')).toBeInTheDocument();
    const menu = document.querySelector('.excel-context-menu') as HTMLElement;
    const pasteItem = within(menu).getByText('Paste');

    readText.mockClear();
    writeText.mockClear();
    const clickResult = fireEvent.click(pasteItem);
    expect(clickResult).toBe(true);
    expect(harness.capturedRejection).toBeDefined();
    let rejection: unknown;
    await act(async () => {
      rejection = await harness.capturedRejection!;
      await Promise.resolve();
    });

    expect(harness.performPasteSpy).toHaveBeenCalledTimes(1);
    const [sheetArgument, managerArgument, clipboardArgument, targetArgument, optionsArgument] =
      harness.performPasteSpy.mock.calls[0]!;
    expect(sheetArgument).toBe(harness.activeView);
    expect(sheetArgument).toBeInstanceOf(OwnerBackedWorkbookSheetView);
    expect(sheetArgument).not.toBeInstanceOf(Worksheet);
    expect(managerArgument).toBe(harness.commandManagerAtPaste);
    expect(clipboardArgument).toBe(harness.clipboardAtPaste);
    expect(clipboardArgument).toBeInstanceOf(ClipboardService);
    // The mock hit test identifies B1; Paste still uses the captured A1 range start.
    expect(targetArgument).toEqual({ row: 1, col: 1 });
    expect(optionsArgument).toEqual(expect.objectContaining({
      renderer: expect.objectContaining({
        invalidateRange: expect.any(Function),
        scheduleRedraw: expect.any(Function),
      }),
      onCutComplete: expect.any(Function),
    }));
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toMatch(/workbook-owned operation is unavailable/);

    expect(harness.getPayloadSpy).not.toHaveBeenCalled();
    expect(readText).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(harness.clipboardAtPaste!.getPayload()).toBe(harness.payloadBefore);
    expect(harness.payloadBefore).toMatchObject({
      isCut: false,
      cells: [{ value: 'clipboard_cached_value_secret', formula: 'clipboard_formula_secret' }],
    });
    expect(harness.ownerGetCellSpy).not.toHaveBeenCalled();
    expect(harness.ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(harness.ownerGetCellReadSpy).not.toHaveBeenCalled();
    expect(harness.worksheetGetCellSpy).not.toHaveBeenCalled();
    expect(harness.worksheetGetCellValueSpy).not.toHaveBeenCalled();
    expect(harness.worksheetGetMergedRangeSpy).not.toHaveBeenCalled();
    expect(worksheetEvents).toHaveLength(0);
    expect(harness.commandManagerExecuteSpy).not.toHaveBeenCalled();
    expect(harness.commandManagerAtPaste!.getHistorySize()).toEqual(harness.historyBefore);
    expect(harness.completionSpy).not.toHaveBeenCalled();
    expect(invalidateEvents).toHaveLength(0);
    expect(redrawEvents).toHaveLength(0);
    expect(document.querySelector('.excel-context-menu')).toBeNull();
    expect(screen.queryByTestId('mock-mini-toolbar')).toBeNull();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
    expect(alert.textContent).not.toContain('clipboard_cached_value_secret');
    expect(alert.textContent).not.toContain('=clipboard_formula_secret');
  });

  test('ExcelApp context-menu Paste observes mutation of its retained selection range reference', async () => {
    const harness = await mountContextPasteApp();
    const [rendererSelection] = harness.renderer.getSelections();
    harness.renderer.getSelections.mockClear();
    harness.renderer.hitTest.mockClear();
    fireEvent.contextMenu(harness.renderer.canvas, { clientX: 137, clientY: 246 });

    expect(harness.renderer.getSelections).toHaveBeenCalledTimes(1);
    expect(harness.renderer.hitTest).toHaveBeenCalledWith(137, 246);
    expect(harness.renderer.hitTest.mock.results[0]!.value).toEqual({
      type: 'cell',
      addr: { row: 1, col: 2 },
    });
    expect(document.querySelector('.excel-context-menu')).not.toBeNull();

    // This is an evidence-only characterization of the retained range reference.
    rendererSelection.start.row = 2;
    rendererSelection.start.col = 2;
    const menu = document.querySelector('.excel-context-menu') as HTMLElement;
    fireEvent.click(within(menu).getByText('Paste'));
    expect(harness.capturedRejection).toBeDefined();
    let rejection: unknown;
    await act(async () => {
      rejection = await harness.capturedRejection!;
      await Promise.resolve();
    });

    expect(harness.performPasteSpy).toHaveBeenCalledTimes(1);
    expect(harness.performPasteSpy.mock.calls[0]![0]).toBe(harness.activeView);
    // The hit-tested cell was B1; after the captured range object is mutated, its
    // live start address is B2 and remains the Paste destination.
    expect(harness.performPasteSpy.mock.calls[0]![3]).toEqual({ row: 2, col: 2 });
    expect(rejection).toBeInstanceOf(Error);
    expect(document.querySelector('.excel-context-menu')).toBeNull();
    expect(screen.queryByTestId('mock-mini-toolbar')).toBeNull();
    expect(harness.getPayloadSpy).not.toHaveBeenCalled();
    expect(harness.clipboardAtPaste!.getPayload()).toBe(harness.payloadBefore);
  });

  test('ExcelApp context menu with no active sheet renders no clipboard actions', async () => {
    const workbook = new Workbook();
    expect(workbook.activeSheet).toBeUndefined();
    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');

    const renderer = (window as any).__renderer as { canvas: HTMLCanvasElement };
    fireEvent.contextMenu(renderer.canvas, { clientX: 137, clientY: 246 });

    const menu = document.querySelector('.excel-context-menu') as HTMLElement;
    expect(menu).not.toBeNull();
    expect(within(menu).queryByText('Cut')).not.toBeInTheDocument();
    expect(within(menu).queryByText('Paste')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('context-menu Cut uses the still-active view when the public sheet transition is rejected', async () => {
    const workbook = Workbook.create({
      sheets: [
        { name: 'Original active sheet', rows: 2, cols: 2 },
        { name: 'Second sheet', rows: 2, cols: 2 },
      ],
    });
    const originalView = workbook.activeSheet!;
    const secondView = workbook.getSheet('Second sheet')!;
    const originalPerformCut = clipboardOperations.performCut;
    const performCutSpy = jest.spyOn(clipboardOperations, 'performCut').mockImplementation(
      (sheet, clipboardService, selectedRange, options) =>
        originalPerformCut(sheet, clipboardService, selectedRange, options),
    );
    const coreCutSpy = jest.spyOn(ClipboardService.prototype, 'cut');
    const ownerReadSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));
    const renderer = (window as any).__renderer as { canvas: HTMLCanvasElement };
    fireEvent.contextMenu(renderer.canvas, { clientX: 137, clientY: 246 });

    expect(() => { workbook.activeSheetName = 'Second sheet'; }).toThrow(
      /Active sheet changes are unavailable/,
    );
    expect(workbook.activeSheet).toBe(originalView);
    expect(workbook.activeSheet).not.toBe(secondView);

    const menu = document.querySelector('.excel-context-menu') as HTMLElement;
    fireEvent.mouseEnter(within(menu).getByText('Cut'));
    ownerReadSpy.mockClear();
    fireEvent.click(within(menu).getAllByText('Cut')[1]!);

    expect(performCutSpy).toHaveBeenCalledTimes(1);
    expect(performCutSpy.mock.calls[0]![0]).toBe(originalView);
    expect(coreCutSpy).not.toHaveBeenCalled();
    expect(ownerReadSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
    expect(document.querySelector('.excel-context-menu')).toBeNull();
  });

  test('context-menu Paste keeps its open-time selection when renderer selection is replaced', async () => {
    const harness = await mountContextPasteApp();
    const originalSelection = harness.renderer.getSelections()[0];
    harness.renderer.getSelections.mockClear();
    fireEvent.contextMenu(harness.renderer.canvas, { clientX: 137, clientY: 246 });

    const replacementSelection = {
      start: { row: 3, col: 3 },
      end: { row: 3, col: 3 },
    };
    harness.renderer.getSelections.mockReturnValue([replacementSelection]);
    fireEvent.click(within(document.querySelector('.excel-context-menu') as HTMLElement).getByText('Paste'));
    let rejection: unknown;
    await act(async () => {
      rejection = await harness.capturedRejection!;
      await Promise.resolve();
    });

    expect(harness.performPasteSpy).toHaveBeenCalledTimes(1);
    expect(harness.performPasteSpy.mock.calls[0]![0]).toBe(harness.activeView);
    expect(harness.performPasteSpy.mock.calls[0]![3]).toEqual(originalSelection.start);
    expect(harness.performPasteSpy.mock.calls[0]![3]).not.toEqual(replacementSelection.start);
    expect(rejection).toBeInstanceOf(Error);
    expect(harness.getPayloadSpy).not.toHaveBeenCalled();
    expect(harness.clipboardAtPaste!.getPayload()).toBe(harness.payloadBefore);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
    expect(document.querySelector('.excel-context-menu')).toBeNull();
  });

  test('detached context-menu Cut control has no effect after menu unmount', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Unmount menu', rows: 2, cols: 2 }] });
    const performCutSpy = jest.spyOn(clipboardOperations, 'performCut');
    const coreCutSpy = jest.spyOn(ClipboardService.prototype, 'cut');
    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));
    const renderer = (window as any).__renderer as { canvas: HTMLCanvasElement };
    fireEvent.contextMenu(renderer.canvas, { clientX: 137, clientY: 246 });

    const menu = document.querySelector('.excel-context-menu') as HTMLElement;
    fireEvent.mouseEnter(within(menu).getByText('Cut'));
    const staleCutControl = within(menu).getAllByText('Cut')[1]!;
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.excel-context-menu')).toBeNull();

    fireEvent.click(staleCutControl);

    expect(performCutSpy).not.toHaveBeenCalled();
    expect(coreCutSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelector('.excel-context-menu')).toBeNull();
  });

  test('ExcelApp context-menu Cut rejects before protected effects, announces the error, and closes the menu', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Context menu cut', rows: 3, cols: 3 }] });
    const activeView = workbook.activeSheet!;
    const seedWorksheet = new Worksheet('Clipboard seed', 1, 1);
    seedWorksheet.setCellValue({ row: 1, col: 1 }, 'preexisting-context-cut-payload');

    let clipboardAtCut: ClipboardService | undefined;
    let payloadBefore: ReturnType<ClipboardService['getPayload']> = null;
    const originalPerformCut = clipboardOperations.performCut;
    const performCutSpy = jest.spyOn(clipboardOperations, 'performCut').mockImplementation(
      (sheet, clipboard, selectedRange, options) => {
        clipboard.copy(seedWorksheet, {
          start: { row: 1, col: 1 },
          end: { row: 1, col: 1 },
        });
        clipboardAtCut = clipboard;
        payloadBefore = clipboard.getPayload();
        return originalPerformCut(sheet, clipboard, selectedRange, options);
      },
    );
    const coreCutSpy = jest.spyOn(ClipboardService.prototype, 'cut');
    const ownerGetCellSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCell');
    const ownerGetCellValueSpy = jest.spyOn(OwnerBackedWorkbookSheetView.prototype, 'getCellValue');

    render(React.createElement(ExcelApp, { workbook }));
    await screen.findByTestId('renderer-ready');
    fireEvent.click(screen.getByTestId('select-cut-range'));
    const renderer = (window as any).__renderer as { canvas: HTMLCanvasElement };
    fireEvent.contextMenu(renderer.canvas, { clientX: 137, clientY: 246 });

    const menu = document.querySelector('.excel-context-menu') as HTMLElement;
    expect(menu).not.toBeNull();
    fireEvent.mouseEnter(within(menu).getByText('Cut'));
    const cutItems = within(menu).getAllByText('Cut');
    expect(cutItems).toHaveLength(2);

    ownerGetCellSpy.mockClear();
    ownerGetCellValueSpy.mockClear();
    const sourceEvents: unknown[] = [];
    const subscription = activeView.on(event => sourceEvents.push(event));
    const windowErrors: unknown[] = [];
    const onWindowError = (event: ErrorEvent) => {
      windowErrors.push(event.error ?? event.message);
      event.preventDefault();
    };
    window.addEventListener('error', onWindowError);
    let synchronousError: unknown;
    let clickResult: boolean | undefined;
    act(() => {
      try {
        clickResult = fireEvent.click(cutItems[1]!);
      } catch (error) {
        synchronousError = error;
      }
    });
    window.removeEventListener('error', onWindowError);
    subscription.dispose();

    expect(clickResult).toBe(true);
    expect(synchronousError).toBeUndefined();
    expect(windowErrors).toHaveLength(0);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This workbook-owned operation is unavailable until its journal slice is authorized',
    );
    expect(performCutSpy).toHaveBeenCalledTimes(1);
    expect(performCutSpy.mock.calls[0]![0]).toBe(activeView);
    expect(clipboardAtCut).toBeInstanceOf(ClipboardService);
    expect(coreCutSpy).not.toHaveBeenCalled();
    expect(clipboardAtCut!.getPayload()).toBe(payloadBefore);
    expect(payloadBefore).toMatchObject({
      isCut: false,
      cells: [{ value: 'preexisting-context-cut-payload' }],
    });
    expect(ownerGetCellSpy).not.toHaveBeenCalled();
    expect(ownerGetCellValueSpy).not.toHaveBeenCalled();
    expect(sourceEvents).toHaveLength(0);
    expect(document.body.classList.contains('clipboard-action-pulse')).toBe(false);
    expect(document.querySelector('.excel-context-menu')).toBeNull();
  });
});
