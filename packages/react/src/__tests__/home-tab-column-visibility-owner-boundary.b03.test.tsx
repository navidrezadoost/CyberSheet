import React from 'react';
import { jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import { HomeTab } from '../components/ribbon/HomeTab';
import type { SheetAccess } from '../utils/workbookSheetAccess';

jest.mock('../components/ribbon/ribbon.css', () => ({}), { virtual: true });
jest.mock('@cyber-sheet/icons/react', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return new Proxy({}, {
    get: (_target, name) => name === '__esModule'
      ? true
      : (props: Record<string, unknown>) => ReactModule.createElement('span', props),
  });
}, { virtual: true });

const selectedColumnTwo = {
  start: { row: 1, col: 2 },
  end: { row: 3, col: 2 },
};

const selectedColumnOne = {
  start: { row: 1, col: 1 },
  end: { row: 3, col: 1 },
};

function renderHomeTab(
  worksheet: SheetAccess,
  commandManager: CommandManager,
  selection = selectedColumnTwo,
) {
  return render(
    <HomeTab
      commandManager={commandManager}
      selection={selection as any}
      worksheet={worksheet}
    />,
  );
}

function chooseFormatOperation(label: 'Hide Columns' | 'Unhide Columns') {
  fireEvent.click(screen.getByTitle('Format'));
  fireEvent.click(screen.getByRole('menuitem', { name: label }));
}

// Exact B.03 coverage:
// - dfea06232c99a0b9ca8e / 2107f3e04ec707d17a5f: mounted HomeTab callers.
// - 708d9fc245865db95bbc, 377e798b0d3307377078, 6711cd72552843e1b032,
//   5f8fefa37642f492a847, 72ce4361b9d85b7cfd02: utility read/write occurrences.
describe('HomeTab column visibility owner boundary (P1-08B.03)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test('standalone Hide Columns executes, records history, and supports undo and redo', () => {
    const worksheet = new Worksheet('B03 standalone hide', 3, 3);
    const commandManager = new CommandManager();
    const execute = jest.spyOn(commandManager, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    renderHomeTab(worksheet, commandManager);
    chooseFormatOperation('Hide Columns');

    expect(worksheet.isColHidden(2)).toBe(true);
    expect(commandManager.getUndoHistory()).toEqual(['Hide Columns']);
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'col-hidden', col: 2 }),
    ]));

    expect(commandManager.undo()).toBe(true);
    expect(worksheet.isColHidden(2)).toBe(false);
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 1 });
    expect(commandManager.redo()).toBe(true);
    expect(worksheet.isColHidden(2)).toBe(true);
    expect(commandManager.getUndoHistory()).toEqual(['Hide Columns']);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'col-shown', col: 2 }),
    ]));

    const eventCountAfterRedo = events.length;
    chooseFormatOperation('Hide Columns');
    expect(worksheet.isColHidden(2)).toBe(true);
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(eventCountAfterRedo);

    subscription.dispose();
  });

  test('standalone Unhide Columns reads nearby hidden columns, records history, and supports undo and redo', () => {
    const worksheet = new Worksheet('B03 standalone unhide', 3, 3);
    worksheet.hideCol(2);
    const commandManager = new CommandManager();
    const execute = jest.spyOn(commandManager, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    renderHomeTab(worksheet, commandManager, selectedColumnOne);
    chooseFormatOperation('Unhide Columns');

    expect(worksheet.isColHidden(2)).toBe(false);
    expect(commandManager.getUndoHistory()).toEqual(['Unhide Columns']);
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'col-shown', col: 2 }),
    ]));

    expect(commandManager.undo()).toBe(true);
    expect(worksheet.isColHidden(2)).toBe(true);
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 1 });
    expect(commandManager.redo()).toBe(true);
    expect(worksheet.isColHidden(2)).toBe(false);
    expect(commandManager.getUndoHistory()).toEqual(['Unhide Columns']);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'col-hidden', col: 2 }),
    ]));

    subscription.dispose();
  });

  test.each([
    ['Hide Columns', selectedColumnTwo] as const,
    ['Unhide Columns', selectedColumnOne] as const,
  ])('published Workbook view omits the unreachable %s control', (label, selection) => {
    const worksheet = new Worksheet(`B03 owner ${label}`, 3, 3);
    if (label === 'Unhide Columns') worksheet.hideCol(2);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const ownerView = workbook.activeSheet;
    expect(ownerView).toBeDefined();
    expect(Workbook.isWorkbookIssuedSheetView(ownerView)).toBe(true);
    expect(Object.isFrozen(ownerView)).toBe(true);

    const commandManager = new CommandManager();
    const execute = jest.spyOn(commandManager, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    renderHomeTab(ownerView!, commandManager, selection);
    // HomeTab does not publish Cells > Format for an owner view. The helper's
    // standalone preflight is source-mapped, but this mounted path is unreachable.
    expect(screen.queryByTitle('Format')).toBeNull();
    expect(screen.queryByRole('menuitem', { name: label })).toBeNull();

    expect(execute).not.toHaveBeenCalled();
    expect(commandManager.getHistorySize()).toEqual({ undoCount: 0, redoCount: 0 });
    expect(worksheet.isColHidden(2)).toBe(label === 'Unhide Columns');
    expect(events).toEqual([]);
    subscription.dispose();
  });
});
