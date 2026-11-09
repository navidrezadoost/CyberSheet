import React from 'react';
import { jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import { OwnerBackedWorkbookSheetView } from '../../../core/src/WorkbookSheetView';
import { HomeTab } from '../components/ribbon/HomeTab';

jest.mock('../components/ribbon/ribbon.css', () => ({}), { virtual: true });
jest.mock('@cyber-sheet/icons/react', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return new Proxy({}, {
    get: (_target, name) => name === '__esModule'
      ? true
      : (props: Record<string, unknown>) => ReactModule.createElement('span', props),
  });
}, { virtual: true });

const selectedRange = {
  start: { row: 1, col: 1 },
  end: { row: 2, col: 2 },
};

describe('HomeTab row and column dimension controls (P1-08B.02)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  function renderStandaloneHomeTab(worksheet: Worksheet) {
    const commandManager = new CommandManager(100, worksheet);
    render(React.createElement(HomeTab, {
      commandManager,
      selection: selectedRange as any,
      worksheet,
    }));
    return commandManager;
  }

  function openFormatMenu() {
    fireEvent.click(screen.getByTitle('Format'));
  }

  // Caller flow 250589cd9ec466822dd2; helper writes cc07e3cff21109c8f1d3;
  // undo restore write 0a07922170d3e5b49799.
  test('manual Row Height executes through the actual dialog and restores/replays selected rows', () => {
    const worksheet = new Worksheet('B02 manual row height', 3, 3);
    worksheet.setRowHeight(1, 30);
    worksheet.setRowHeight(2, 42);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = renderStandaloneHomeTab(worksheet);
    const execute = jest.spyOn(commandManager, 'execute');

    openFormatMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Row Height...' }));
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '18' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(execute).toHaveBeenCalledTimes(1);
    expect(commandManager.getUndoHistory()).toEqual(['Row Height']);
    expect(worksheet.getRowHeight(1)).toBe(24);
    expect(worksheet.getRowHeight(2)).toBe(24);
    expect(events).toHaveLength(2);

    act(() => { expect(commandManager.undo()).toBe(true); });
    expect(worksheet.getRowHeight(1)).toBe(30);
    expect(worksheet.getRowHeight(2)).toBe(42);
    expect(commandManager.getUndoHistory()).toEqual([]);
    expect(commandManager.getHistorySize()).toMatchObject({ undoCount: 0, redoCount: 1 });

    act(() => { expect(commandManager.redo()).toBe(true); });
    expect(worksheet.getRowHeight(1)).toBe(24);
    expect(worksheet.getRowHeight(2)).toBe(24);
    expect(commandManager.getUndoHistory()).toEqual(['Row Height']);
    expect(events).toHaveLength(6);
    subscription.dispose();
  });

  // Caller flow a52c4f71a8c756234e7d; helper writes 2d8f6ab8a169fa26724a;
  // undo restore write 1b3f587c0f92741718c1.
  test('manual Column Width executes through the actual dialog and restores/replays selected columns', () => {
    const worksheet = new Worksheet('B02 manual column width', 3, 3);
    worksheet.setColumnWidth(1, 91);
    worksheet.setColumnWidth(2, 117);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = renderStandaloneHomeTab(worksheet);
    const execute = jest.spyOn(commandManager, 'execute');

    openFormatMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Column Width...' }));
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '12.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(execute).toHaveBeenCalledTimes(1);
    expect(commandManager.getUndoHistory()).toEqual(['Column Width']);
    expect(worksheet.getColumnWidth(1)).toBe(100);
    expect(worksheet.getColumnWidth(2)).toBe(100);
    expect(events).toHaveLength(2);

    act(() => { expect(commandManager.undo()).toBe(true); });
    expect(worksheet.getColumnWidth(1)).toBe(91);
    expect(worksheet.getColumnWidth(2)).toBe(117);
    expect(commandManager.getHistorySize()).toMatchObject({ undoCount: 0, redoCount: 1 });

    act(() => { expect(commandManager.redo()).toBe(true); });
    expect(worksheet.getColumnWidth(1)).toBe(100);
    expect(worksheet.getColumnWidth(2)).toBe(100);
    expect(commandManager.getUndoHistory()).toEqual(['Column Width']);
    expect(events).toHaveLength(6);
    subscription.dispose();
  });

  // Caller flow 0d7f82674826815c5eb4; helper write 0ad77d7bda12921ab03b.
  test('AutoFit Row Height executes from the actual Format menu and restores/replays selected rows', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      font: '',
      measureText: (text: string) => ({ width: text.length * 7 }),
    } as unknown as CanvasRenderingContext2D));
    const worksheet = new Worksheet('B02 autofit row height', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'a long enough label to measure');
    worksheet.setCellValue({ row: 2, col: 2 }, 'another measured value');
    worksheet.setRowHeight(1, 80);
    worksheet.setRowHeight(2, 96);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = renderStandaloneHomeTab(worksheet);
    const execute = jest.spyOn(commandManager, 'execute');

    openFormatMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'AutoFit Row Height' }));

    const fittedRow1 = worksheet.getRowHeight(1);
    const fittedRow2 = worksheet.getRowHeight(2);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(commandManager.getUndoHistory()).toEqual(['AutoFit Row Height']);
    expect(fittedRow1).toBeGreaterThan(0);
    expect(fittedRow2).toBeGreaterThan(0);
    expect(fittedRow1).toBeLessThan(80);
    expect(fittedRow2).toBeLessThan(96);
    expect(events).toHaveLength(2);

    act(() => { expect(commandManager.undo()).toBe(true); });
    expect(worksheet.getRowHeight(1)).toBe(80);
    expect(worksheet.getRowHeight(2)).toBe(96);
    expect(commandManager.getHistorySize()).toMatchObject({ undoCount: 0, redoCount: 1 });

    act(() => { expect(commandManager.redo()).toBe(true); });
    expect(worksheet.getRowHeight(1)).toBe(fittedRow1);
    expect(worksheet.getRowHeight(2)).toBe(fittedRow2);
    expect(commandManager.getUndoHistory()).toEqual(['AutoFit Row Height']);
    expect(events).toHaveLength(6);
    subscription.dispose();
  });

  test('published Workbook view omits the HomeTab Cells controls without exposing a mutation route', () => {
    const worksheet = new Worksheet('B02 published owner view', 3, 3);
    worksheet.setRowHeight(1, 31);
    worksheet.setColumnWidth(1, 93);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const ownerView = workbook.activeSheet;
    expect(ownerView).toBeInstanceOf(OwnerBackedWorkbookSheetView);
    expect(Object.isFrozen(ownerView)).toBe(true);

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = new CommandManager(100, worksheet);
    const execute = jest.spyOn(commandManager, 'execute');
    render(React.createElement(HomeTab, {
      commandManager,
      selection: selectedRange as any,
      worksheet: ownerView,
    }));

    expect(screen.queryByRole('button', { name: 'Format' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Row Height...' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Column Width...' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'AutoFit Row Height' })).not.toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
    expect(commandManager.getUndoHistory()).toEqual([]);
    expect(commandManager.getHistorySize()).toMatchObject({ undoCount: 0, redoCount: 0 });
    expect(worksheet.getRowHeight(1)).toBe(31);
    expect(worksheet.getColumnWidth(1)).toBe(93);
    expect(events).toEqual([]);
    expect(ownerView).toBe(workbook.activeSheet);
    expect(Object.isFrozen(ownerView)).toBe(true);

    subscription.dispose();
  });
});
