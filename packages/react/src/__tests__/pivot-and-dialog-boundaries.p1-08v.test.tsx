import React from 'react';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CommandManager, FormattingController, Workbook, Worksheet } from '@cyber-sheet/core';
import { CreatePivotTableDialog } from '../components/dialogs/CreatePivotTableDialog';
import { CreateTableDialog } from '../components/dialogs/CreateTableDialog';
import FindReplaceDialog from '../components/dialogs/FindReplaceDialog';
import { applyTableFormat } from '../utils/createTable';
import { insertPivotTable } from '../utils/insertPivotTable';

afterEach(cleanup);

const reversedRange = {
  start: { row: 2, col: 2 },
  end: { row: 1, col: 1 },
};
const normalizedRange = {
  start: { row: 1, col: 1 },
  end: { row: 2, col: 2 },
};

function populatedWorksheet(name: string) {
  const worksheet = new Worksheet(name, 8, 6);
  worksheet.setCellValue({ row: 1, col: 1 }, 'Region');
  worksheet.setCellValue({ row: 1, col: 2 }, 'Sales');
  worksheet.setCellValue({ row: 2, col: 1 }, 'East');
  worksheet.setCellValue({ row: 2, col: 2 }, 12);
  return worksheet;
}

describe('P1-08V mounted table and pivot dialog boundaries', () => {
  test('CreateTableDialog normalizes selection, forwards header choice, and cancellation does not confirm', () => {
    const worksheet = populatedWorksheet('table-dialog');
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = render(
      <CreateTableDialog
        isOpen
        worksheet={worksheet}
        selection={reversedRange}
        styleName="TableStyleMedium2"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('A1:B2')).toBeTruthy();
    expect((screen.getByLabelText('My table has headers') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onConfirm).toHaveBeenCalledWith(normalizedRange, true);

    view.rerender(
      <CreateTableDialog
        isOpen
        worksheet={worksheet}
        selection={reversedRange}
        styleName="TableStyleMedium2"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('CreateTableDialog owner-view callback rejects before command dispatch or Worksheet events', () => {
    const worksheet = populatedWorksheet('owned-table');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet!;
    const commandSheet = new Worksheet('command-target', 8, 6);
    const commands = new CommandManager(20, commandSheet);
    const formatting = new FormattingController(commandSheet, commands);
    const execute = jest.spyOn(commands, 'execute');
    const events: unknown[] = [];
    const subscription = view.on((event) => events.push(event));
    const failures: unknown[] = [];

    render(
      <CreateTableDialog
        isOpen
        worksheet={view}
        selection={reversedRange}
        styleName="TableStyleMedium2"
        onClose={jest.fn()}
        onConfirm={(range, hasHeaders) => {
          try {
            applyTableFormat(formatting, commands, view, range, hasHeaders);
          } catch (error) {
            failures.push(error);
          }
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(failures).toHaveLength(1);
    expect(String(failures[0])).toMatch(/journal slice/i);
    expect(execute).not.toHaveBeenCalled();
    expect(view.getCellStyle({ row: 1, col: 1 })).toBeUndefined();
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('CreatePivotTableDialog normalizes source, proposes a target, and owner insert rejects before mutation', () => {
    const worksheet = populatedWorksheet('owned-pivot');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet!;
    const commands = new CommandManager();
    const execute = jest.spyOn(commands, 'execute');
    const events: unknown[] = [];
    const subscription = view.on((event) => events.push(event));
    const failures: unknown[] = [];
    const onCreate = (range: typeof normalizedRange, target: { row: number; col: number }) => {
      try {
        insertPivotTable(view, commands, range, target);
      } catch (error) {
        failures.push(error);
      }
    };

    render(
      <CreatePivotTableDialog
        isOpen
        worksheet={view}
        selection={reversedRange}
        onClose={jest.fn()}
        onCreate={onCreate}
      />,
    );

    expect(screen.getByText('A1:B2')).toBeTruthy();
    expect(screen.getByText(/starting at A4/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(failures).toHaveLength(1);
    expect(String(failures[0])).toMatch(/journal slice/i);
    expect(execute).not.toHaveBeenCalled();
    expect(view.getCellValue({ row: 4, col: 1 })).toBeNull();
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('CreatePivotTableDialog cancellation closes without invoking creation', () => {
    const worksheet = populatedWorksheet('pivot-cancel');
    const onCreate = jest.fn();
    const onClose = jest.fn();
    render(
      <CreatePivotTableDialog
        isOpen
        worksheet={worksheet}
        selection={reversedRange}
        onClose={onClose}
        onCreate={onCreate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });
});

describe('P1-08V mounted FindReplaceDialog boundary', () => {
  test('owner-view literal search selects the match; cancel closes without mutation', () => {
    const worksheet = populatedWorksheet('find-dialog');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet!;
    const events: unknown[] = [];
    const subscription = view.on((event) => events.push(event));
    const onClose = jest.fn();
    const onMatchSelected = jest.fn();

    render(
      <FindReplaceDialog
        isOpen
        worksheet={view}
        onClose={onClose}
        onMatchSelected={onMatchSelected}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Enter search term'), { target: { value: 'East' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find All' }));

    expect(screen.getByText(/Found 1 match/)).toBeTruthy();
    expect(onMatchSelected).toHaveBeenCalledWith({ row: 2, col: 1 });
    expect(view.getCellValue({ row: 2, col: 1 })).toBe('East');
    expect(events).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);
    subscription.dispose();
  });
});
