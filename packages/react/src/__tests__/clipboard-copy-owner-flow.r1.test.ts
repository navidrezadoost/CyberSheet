import React from 'react';
import { jest } from '@jest/globals';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { ClipboardService, Workbook } from '@cyber-sheet/core';
import * as clipboardOperations from '../utils/clipboardOperations';
import { ExcelApp } from '../components/ExcelApp';
import { Worksheet, adoptWorksheetByWorkbook } from '../../../core/src/worksheet';
import { OwnerBackedWorkbookSheetView } from '../../../core/src/WorkbookSheetView';
import type { WorkbookId } from '../../../core/src/workbook-access-types';
import { performCopy } from '../utils/clipboardOperations';

jest.mock('../CyberSheet', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    CyberSheet: (props: { onSelectionChange: (selection: typeof range) => void }) =>
      ReactModule.createElement(
        'button',
        {
          'data-testid': 'select-copy-range',
          onClick: () => props.onSelectionChange(formulaAndLiteralRange),
        },
        'select copy range',
      ),
  };
});
jest.mock('../components/DrawingCanvas', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return { DrawingCanvas: ReactModule.forwardRef(() => null) };
});

jest.mock('@cyber-sheet/icons/react', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return new Proxy({}, {
    get: (_target, name) =>
      name === '__esModule'
        ? true
        : (props: Record<string, unknown>) => ReactModule.createElement('span', props),
  });
}, { virtual: true });
jest.mock('@cyber-sheet/react', () => ({ DataValidationDialog: () => null }), { virtual: true });

jest.mock('../components/MiniToolbar', () => ({ MiniToolbar: () => null }));
jest.mock('../components/excel-app.css', () => ({}), { virtual: true });
jest.mock('../components/ribbon/ribbon.css', () => ({}), { virtual: true });

const range = {
  start: { row: 1, col: 1 },
  end: { row: 1, col: 1 },
};
const formulaAndLiteralRange = {
  start: { row: 1, col: 1 },
  end: { row: 1, col: 2 },
};

describe('R1 clipboard copy owner flow', () => {
  const writeText = jest.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const originalLog = console.log;

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    console.log = jest.fn();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    console.log = originalLog;
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  test('first-party Workbook.activeSheet view is accepted by the copy helper', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Copy ingress', rows: 2, cols: 2 }] });
    const sheet = workbook.activeSheet;
    expect(sheet).toBeDefined();

    const clipboard = new ClipboardService();
    performCopy(sheet!, clipboard, range, { mode: 'all' });
    await Promise.resolve();

    expect(clipboard.getPayload()).toMatchObject({ copyMode: 'all', cells: [] });
    expect(writeText).not.toHaveBeenCalled();
  });

  test('ExcelApp Ctrl+C passes the active owner view and current selection to performCopy', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'ExcelApp copy', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet;
    const performCopySpy = jest.spyOn(clipboardOperations, 'performCopy').mockImplementation(() => {});
    render(React.createElement(ExcelApp, { workbook }));

    fireEvent.click(screen.getByTestId('select-copy-range'));
    act(() => {
      fireEvent.keyDown(window, { key: 'c', code: 'KeyC', ctrlKey: true });
    });

    expect(performCopySpy).toHaveBeenCalledTimes(1);
    expect(performCopySpy).toHaveBeenCalledWith(
      activeView,
      expect.any(ClipboardService),
      formulaAndLiteralRange,
      { mode: 'all' },
    );
  });

  test('ExcelApp Ribbon Copy button passes the active owner view and selection to performCopy', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Ribbon copy', rows: 2, cols: 2 }] });
    const activeView = workbook.activeSheet;
    const performCopySpy = jest.spyOn(clipboardOperations, 'performCopy');
    render(React.createElement(ExcelApp, { workbook }));

    fireEvent.click(screen.getByTestId('select-copy-range'));
    fireEvent.click(screen.getByTitle('Copy (Ctrl+C)'));

    expect(performCopySpy).toHaveBeenCalledTimes(1);
    const [sheet, clipboard, copiedRange, options] = performCopySpy.mock.calls[0]!;
    expect(sheet).toBe(activeView);
    expect(clipboard).toBeInstanceOf(ClipboardService);
    expect(copiedRange).toEqual(formulaAndLiteralRange);
    // ClipboardGroup omits options; the real helper therefore applies its all-mode default.
    expect(options).toBeUndefined();
    expect(clipboard.getPayload()?.copyMode).toBe('all');
  });

  test('owner view masks cached formula results in all, values, and plain-text modes', async () => {
    // Seed a standalone source, then let Workbook adopt it and issue its authentic view.
    const worksheet = new Worksheet('Formula copy', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.setCellValue({ row: 1, col: 2 }, 'visible');
    worksheet.setCellStyle({ row: 1, col: 1 }, {
      border: { top: { color: '#f00', style: 'thin' } },
    });
    const workbook = Workbook.create({ sheets: [{ name: 'Clipboard copy owner' }] });
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.getSheet(worksheet.name)!;
    expect(Workbook.isWorkbookIssuedSheetView(view)).toBe(true);
    const clipboard = new ClipboardService();

    performCopy(view, clipboard, formulaAndLiteralRange, { mode: 'all' });
    await Promise.resolve();
    const allPayload = clipboard.getPayload()!;
    expect(allPayload.cells).toHaveLength(2);
    expect(allPayload.cells[0]).toMatchObject({ value: null, formula: '40+2' });
    expect(writeText).toHaveBeenLastCalledWith('\tvisible');

    performCopy(view, clipboard, formulaAndLiteralRange, { mode: 'values' });
    await Promise.resolve();
    expect(clipboard.getPayload()!.cells).toMatchObject([
      { rowOffset: 0, colOffset: 1, value: 'visible' },
    ]);
    expect(writeText).toHaveBeenLastCalledWith('\tvisible');

    const before = view.getCellStyle({ row: 1, col: 1 });
    const detachedPayload = new ClipboardService();
    detachedPayload.copy(view, formulaAndLiteralRange, 'all');
    const payloadCell = detachedPayload.getPayload()!.cells[0];
    expect(payloadCell.style?.border?.top?.color).toBe('#f00');
    payloadCell.style!.border!.top!.color = '#00f';
    expect(view.getCellStyle({ row: 1, col: 1 })).toEqual(before);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe(42);
  });

  test('standalone Worksheet copy preserves cached value, formula, and style', async () => {
    const worksheet = new Worksheet('Standalone copy', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.setCellValue({ row: 1, col: 2 }, 'visible');
    worksheet.setCellStyle({ row: 1, col: 1 }, {
      border: { top: { color: '#f00', style: 'thin' } },
    });
    const clipboard = new ClipboardService();

    performCopy(worksheet, clipboard, formulaAndLiteralRange, { mode: 'all' });
    await Promise.resolve();

    expect(clipboard.getPayload()!.cells[0]).toMatchObject({
      value: 42,
      formula: '40+2',
      style: { border: { top: { color: '#f00', style: 'thin' } } },
    });
    expect(writeText).toHaveBeenLastCalledWith('42\tvisible');
  });

  test('ExcelApp used-range shortcuts enumerate an issued view without exposing formula cache', () => {
    const worksheet = new Worksheet('Used range owner', 3, 3);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'used-range-cache-sentinel');
    worksheet.setCellValue({ row: 3, col: 2 }, 'visible-value');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet!;
    expect(Workbook.isWorkbookIssuedSheetView(view)).toBe(true);

    const observed: Array<{ row: number; col: number; value: unknown; formula?: string }> = [];
    const originalForEach = OwnerBackedWorkbookSheetView.prototype.forEachNonEmptyCell;
    const forEachSpy = jest
      .spyOn(OwnerBackedWorkbookSheetView.prototype, 'forEachNonEmptyCell')
      .mockImplementation(function (
        this: OwnerBackedWorkbookSheetView,
        callback: Parameters<OwnerBackedWorkbookSheetView['forEachNonEmptyCell']>[0],
      ) {
        return originalForEach.call(this, (row, col, cell) => {
          observed.push({ row, col, value: cell.value, formula: cell.formula });
          callback(row, col, cell);
        });
      });

    render(React.createElement(ExcelApp, { workbook }));
    const ctrlA = new KeyboardEvent('keydown', {
      key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true, cancelable: true,
    });
    act(() => { window.dispatchEvent(ctrlA); });
    const ctrlEnd = new KeyboardEvent('keydown', {
      key: 'End', code: 'End', ctrlKey: true, bubbles: true, cancelable: true,
    });
    act(() => { window.dispatchEvent(ctrlEnd); });

    expect(forEachSpy).toHaveBeenCalledTimes(2);
    expect(ctrlA.defaultPrevented).toBe(true);
    expect(ctrlEnd.defaultPrevented).toBe(true);
    expect(observed).toContainEqual({
      row: 1, col: 1, value: null, formula: '=40+2',
    });
    expect(observed).toContainEqual({
      row: 3, col: 2, value: 'visible-value', formula: undefined,
    });
    expect(JSON.stringify(observed)).not.toContain('used-range-cache-sentinel');
  });

  test('ExcelApp selection displays formula text without exposing its cached result', () => {
    const worksheet = new Worksheet('Formula selection owner', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'formula-selection-cache-sentinel');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-copy-range'));

    expect(screen.getByPlaceholderText(/Type = to start a formula/)).toHaveValue('=40+2');
    expect(document.body.textContent).not.toContain('formula-selection-cache-sentinel');
    expect(workbook.activeSheet?.getCellValue({ row: 1, col: 1 })).toBeNull();
  });

  test('adopted raw Worksheet Copy rejects before reads, staging, diagnostics, or browser publication', () => {
    const worksheet = new Worksheet('Adopted raw copy', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'raw-copy-sentinel');
    Object.defineProperty(worksheet, 'isWorkbookOwned', {
      configurable: true,
      value: () => false,
    });
    adoptWorksheetByWorkbook(worksheet, 'clipboard-copy-raw-owner' as WorkbookId);
    const clipboard = new ClipboardService();
    const seed = new Worksheet('Clipboard preservation seed', 2, 2);
    seed.setCellValue({ row: 1, col: 1 }, 'prior-payload');
    const priorPayload = clipboard.copy(seed, range);
    (console.log as jest.Mock).mockClear();
    const getCell = jest.spyOn(Worksheet.prototype, 'getCell');
    const getCellValue = jest.spyOn(Worksheet.prototype, 'getCellValue');

    expect(() => performCopy(worksheet, clipboard, range)).toThrow(/unavailable/);

    expect(clipboard.getPayload()).toBe(priorPayload);
    expect(getCell).not.toHaveBeenCalled();
    expect(getCellValue).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(JSON.stringify((console.log as jest.Mock).mock.calls)).not.toContain('raw-copy-sentinel');
  });
});
