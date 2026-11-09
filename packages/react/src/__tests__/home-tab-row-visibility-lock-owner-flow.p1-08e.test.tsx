import React from 'react';
import { jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
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

describe('HomeTab row visibility and lock operations (P1-08E.04)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  function mount(worksheet: Worksheet, range = {
    start: { row: 1, col: 1 },
    end: { row: 2, col: 2 },
  }) {
    const commandManager = new CommandManager(100, worksheet);
    render(React.createElement(HomeTab, {
      commandManager,
      selection: range as any,
      worksheet,
    }));
    return commandManager;
  }

  function chooseFormatItem(label: string) {
    fireEvent.click(screen.getByTitle('Format'));
    fireEvent.click(screen.getByRole('menuitem', { name: label }));
  }

  test('mounted Hide Rows filters already hidden rows and undo/redo follows the selected range', () => {
    const worksheet = new Worksheet('E04 hide rows', 4, 3);
    worksheet.hideRow(2);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = mount(worksheet);

    chooseFormatItem('Hide Rows');
    expect(worksheet.isRowHidden(1)).toBe(true);
    expect(worksheet.isRowHidden(2)).toBe(true);
    expect(worksheet.isRowHidden(3)).toBe(false);
    expect(commandManager.getUndoHistory()).toEqual(['Hide Rows']);
    expect(events).toHaveLength(2);

    act(() => { expect(commandManager.undo()).toBe(true); });
    expect(worksheet.isRowHidden(1)).toBe(false);
    expect(worksheet.isRowHidden(2)).toBe(true);
    act(() => { expect(commandManager.redo()).toBe(true); });
    expect(worksheet.isRowHidden(1)).toBe(true);
    expect(worksheet.isRowHidden(2)).toBe(true);
    expect(events).toHaveLength(6);
    subscription.dispose();
  });

  test('mounted Unhide Rows finds only hidden neighbors and undo restores the hidden row', () => {
    const worksheet = new Worksheet('E04 unhide rows', 5, 3);
    worksheet.hideRow(1);
    worksheet.hideRow(3);
    worksheet.hideRow(5);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = mount(worksheet, {
      start: { row: 2, col: 1 },
      end: { row: 2, col: 1 },
    });

    chooseFormatItem('Unhide Rows');
    expect(worksheet.isRowHidden(1)).toBe(false);
    expect(worksheet.isRowHidden(3)).toBe(false);
    expect(worksheet.isRowHidden(5)).toBe(true);
    expect(commandManager.getUndoHistory()).toEqual(['Unhide Rows']);
    expect(events).toHaveLength(4);

    act(() => { expect(commandManager.undo()).toBe(true); });
    expect(worksheet.isRowHidden(1)).toBe(true);
    expect(worksheet.isRowHidden(3)).toBe(true);
    expect(worksheet.isRowHidden(5)).toBe(true);
    expect(events).toHaveLength(8);
    subscription.dispose();
  });

  test('mounted Lock Cell preserves other style fields through undo and redo', () => {
    const worksheet = new Worksheet('E04 lock cell', 3, 3);
    worksheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = mount(worksheet, {
      start: { row: 1, col: 1 },
      end: { row: 1, col: 1 },
    });

    chooseFormatItem('Lock Cell');
    expect(worksheet.getCellStyle({ row: 1, col: 1 })).toMatchObject({ bold: true, locked: true });
    expect(commandManager.getUndoHistory()).toEqual(['Lock Cells']);

    act(() => { expect(commandManager.undo()).toBe(true); });
    expect(worksheet.getCellStyle({ row: 1, col: 1 })).toMatchObject({ bold: true });
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.locked).toBeUndefined();
    act(() => { expect(commandManager.redo()).toBe(true); });
    expect(worksheet.getCellStyle({ row: 1, col: 1 })).toMatchObject({ bold: true, locked: true });
    expect(events.length).toBeGreaterThanOrEqual(3);
    subscription.dispose();
  });

  test('Workbook-issued HomeTab view does not publish standalone row or lock controls', () => {
    const worksheet = new Worksheet('E04 owned view', 3, 3);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const ownerView = workbook.activeSheet!;
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const commandManager = new CommandManager(100, worksheet);
    const execute = jest.spyOn(commandManager, 'execute');

    render(React.createElement(HomeTab, {
      commandManager,
      selection: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } } as any,
      worksheet: ownerView,
    }));

    expect(screen.queryByTitle('Format')).not.toBeInTheDocument();
    expect(execute).not.toHaveBeenCalled();
    expect(commandManager.getUndoHistory()).toEqual([]);
    expect(worksheet.isRowHidden(1)).toBe(false);
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.locked).toBeUndefined();
    expect(events).toEqual([]);
    subscription.dispose();
  });
});
