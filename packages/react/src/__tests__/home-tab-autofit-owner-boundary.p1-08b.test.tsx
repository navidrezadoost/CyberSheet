import React from 'react';
import { jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  CommandManager,
  FormattingController,
  Workbook,
  Worksheet,
  type Address,
  type SheetEvents,
} from '@cyber-sheet/core';
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

describe('HomeTab AutoFit Column Width owner boundary (P1-08B.01)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  function mountHomeTab(
    worksheet: Worksheet | NonNullable<Workbook['activeSheet']>,
    commandManager: CommandManager,
    formattingWorksheet: Worksheet,
  ) {
    render(
      <HomeTab
        commandManager={commandManager}
        selection={{
          start: { row: 1, col: 1 },
          end: { row: 1, col: 2 },
        } as never}
        worksheet={worksheet}
        formattingController={new FormattingController(formattingWorksheet, commandManager)}
      />,
    );
  }

  function openAutoFitMenuItem() {
    fireEvent.click(screen.getByTitle('Format'));
    return screen.getByRole('menuitem', { name: 'AutoFit Column Width' });
  }

  test('mounted Cells > Format AutoFit measures standalone values, applies widths, and restores them on undo', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 }),
    } as unknown as CanvasRenderingContext2D));
    const worksheet = new Worksheet('P1-08B standalone', 1, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=20+22', 42);
    worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary-visible-value');
    worksheet.setColumnWidth(1, 20);
    worksheet.setColumnWidth(2, 30);

    const originalGetCellValue = worksheet.getCellValue.bind(worksheet);
    const originalGetCellStyle = worksheet.getCellStyle.bind(worksheet);
    const valueReads: { address: Address; value: unknown }[] = [];
    const styleReads: Address[] = [];
    Object.defineProperty(worksheet, 'getCellValue', {
      configurable: true,
      value: (address: Address) => {
        const value = originalGetCellValue(address);
        valueReads.push({ address: { ...address }, value });
        return value;
      },
    });
    Object.defineProperty(worksheet, 'getCellStyle', {
      configurable: true,
      value: (address: Address) => {
        styleReads.push({ ...address });
        return originalGetCellStyle(address);
      },
    });

    const commandManager = new CommandManager();
    const execute = jest.spyOn(commandManager, 'execute');
    const events: SheetEvents[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const previousWidths = [worksheet.getColumnWidth(1), worksheet.getColumnWidth(2)];

    mountHomeTab(worksheet, commandManager, worksheet);
    fireEvent.click(openAutoFitMenuItem());

    expect(valueReads).toEqual(expect.arrayContaining([
      { address: { row: 1, col: 1 }, value: 42 },
      { address: { row: 1, col: 2 }, value: 'ordinary-visible-value' },
    ]));
    expect(styleReads).toEqual(expect.arrayContaining([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]));
    const appliedWidths = [worksheet.getColumnWidth(1), worksheet.getColumnWidth(2)];
    expect(appliedWidths[0]).toBeGreaterThan(previousWidths[0]);
    expect(appliedWidths[1]).toBeGreaterThan(previousWidths[1]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0].description).toBe('AutoFit Column Width');
    expect(events.some((event) => event.type === 'sheet-mutated')).toBe(true);

    expect(commandManager.undo()).toBe(true);
    expect([worksheet.getColumnWidth(1), worksheet.getColumnWidth(2)]).toEqual(previousWidths);
    expect(events.filter((event) => event.type === 'sheet-mutated').length).toBeGreaterThan(1);
    subscription.dispose();
  });

  test('mounted AutoFit control rejects a genuine published Workbook view before reads, dispatch, writes, or events', () => {
    const worksheet = new Worksheet('P1-08B owned', 1, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=20+22', 'owned-formula-cache-secret');
    worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary-owned-value');
    worksheet.setColumnWidth(1, 20);
    worksheet.setColumnWidth(2, 30);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet;
    expect(view).toBeDefined();
    expect(Workbook.isWorkbookIssuedSheetView(view)).toBe(true);
    expect(Object.isFrozen(view)).toBe(true);
    expect(view?.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(view?.getCellValue({ row: 1, col: 2 })).toBe('ordinary-owned-value');

    const commandManager = new CommandManager();
    const execute = jest.spyOn(commandManager, 'execute');
    const events: SheetEvents[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const previousWidths = [worksheet.getColumnWidth(1), worksheet.getColumnWidth(2)];

    // The real HomeTab handler is mounted with the published view. A controller
    // is supplied only to expose the actual Cells control in this boundary test;
    // the handler must still reject before invoking the AutoFit helper.
    mountHomeTab(view!, commandManager, worksheet);
    const item = openAutoFitMenuItem();
    let reportedError: unknown;
    const captureError = (event: ErrorEvent) => {
      reportedError = event.error;
      event.preventDefault();
    };
    window.addEventListener('error', captureError);
    fireEvent.click(item);
    window.removeEventListener('error', captureError);

    expect(reportedError).toBeInstanceOf(Error);
    expect((reportedError as Error).message).toContain('workbook-owned operation is unavailable');
    expect(execute).not.toHaveBeenCalled();
    expect([worksheet.getColumnWidth(1), worksheet.getColumnWidth(2)]).toEqual(previousWidths);
    expect(events).toEqual([]);
    subscription.dispose();
  });
});
