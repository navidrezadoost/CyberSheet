import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { ClipboardService, Workbook } from '@cyber-sheet/core';
import * as clipboardOperations from '../utils/clipboardOperations';
import { ExcelApp } from '../components/ExcelApp';
import { OwnerBackedWorkbookSheetView } from '../../../core/src/WorkbookSheetView';
import { Worksheet, adoptWorksheetByWorkbook } from '../../../core/src/worksheet';
import type { WorkbookId, WorksheetId } from '../../../core/src/workbook-access-types';
import { performCopy } from '../utils/clipboardOperations';

jest.mock('../CyberSheet', () => {
  const ReactModule = require('react');
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
  const ReactModule = require('react');
  return { DrawingCanvas: ReactModule.forwardRef(() => null) };
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
  const writeText = jest.fn<Promise<void>, [string]>().mockResolvedValue();
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
    // Controlled internal fixture: Workbook.create currently has no public R1 formula-write path.
    const worksheet = new Worksheet('Formula copy', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.setCellValue({ row: 1, col: 2 }, 'visible');
    worksheet.setCellStyle({ row: 1, col: 1 }, {
      border: { top: { color: '#f00', style: 'thin' } },
    });
    adoptWorksheetByWorkbook(worksheet, 'clipboard-copy-test-owner' as WorkbookId);
    const view = new OwnerBackedWorkbookSheetView(
      'clipboard-copy-test-owner' as WorkbookId,
      worksheet.getWorksheetId()! as WorksheetId,
      () => worksheet,
    );
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
});
