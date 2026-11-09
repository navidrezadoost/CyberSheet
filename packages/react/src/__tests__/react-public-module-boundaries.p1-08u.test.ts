import { describe, expect, test, jest } from '@jest/globals';
import {
  CommandManager,
  EventBus,
  FormattingController,
  SetValueCommand,
  Workbook,
  Worksheet,
} from '@cyber-sheet/core';
import { attachOnEventForwarder } from '../config/eventForwarder';
import { createGuardedCommandManager } from '../config/guardedCommandManager';
import { DEFAULT_APP_CONFIG } from '../config/appConfig';
import { applyTableFormat } from '../utils/createTable';
import { openHyperlinkTarget } from '../utils/hyperlinkNavigation';
import { executeDeleteCells, executeInsertCells } from '../utils/insertDeleteCells';

describe('P1-08U React public module-family observations', () => {
  test('table-format helper executes on standalone Worksheet and preflights owner views', () => {
    const sheet = new Worksheet('table', 4, 4);
    const commands = new CommandManager(20, sheet);
    const formatting = new FormattingController(sheet, commands);
    sheet.setCellValue({ row: 1, col: 1 }, 'Header');
    sheet.setCellValue({ row: 2, col: 1 }, 'Value');

    applyTableFormat(formatting, commands, sheet, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 1 },
    }, true);
    expect(sheet.getCellStyle({ row: 1, col: 1 })).toBeDefined();
    expect(commands.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });

    const workbook = new Workbook();
    workbook.attachDevImportSheet(new Worksheet('owned', 4, 4));
    const view = workbook.activeSheet!;
    const execute = jest.spyOn(commands, 'execute');
    expect(() => applyTableFormat(formatting, commands, view, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 1 },
    }, true)).toThrow(/journal slice/i);
    expect(execute).not.toHaveBeenCalled();
  });

  test('insert/delete utility dispatches standalone commands and hyperlink navigation respects the sheet-lifecycle boundary', () => {
    const sheet = new Worksheet('cells', 4, 4);
    const history = new CommandManager(20, sheet);
    sheet.setCellValue({ row: 1, col: 1 }, 'top');
    sheet.setCellValue({ row: 2, col: 1 }, 'bottom');
    executeInsertCells(sheet, history, {
      start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
    }, 'down');
    expect(sheet.getCellValue({ row: 2, col: 1 })).toBe('top');
    executeDeleteCells(sheet, history, {
      start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
    }, 'up');
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBe('top');

    const workbook = new Workbook();
    workbook.attachDevImportSheet(new Worksheet('First', 4, 4));
    workbook.attachDevImportSheet(new Worksheet('Second', 4, 4));
    const changes: string[] = [];
    const navigations: Array<{ row: number; col: number }> = [];
    const opened = openHyperlinkTarget(
      'B4', workbook, null,
      (name) => changes.push(name),
      (address) => navigations.push(address),
    );
    expect(opened).toBe(true);
    expect(changes).toEqual([]);
    expect(navigations).toEqual([{ row: 4, col: 2 }]);
    expect(() => openHyperlinkTarget('Second!B4', workbook, null)).toThrow(/sheet changes are unavailable/i);
  });

  test('event forwarding honors its filter and disposer; guarded command manager blocks edits', () => {
    const events = new EventBus();
    const forwarded: string[] = [];
    const dispose = attachOnEventForwarder(
      events,
      (event) => forwarded.push(event),
      (event) => event === 'cell-value-change',
    );
    events.emit('cell-value-change', {});
    events.emit('cell-style-change', {});
    dispose();
    events.emit('cell-value-change', {});
    expect(forwarded).toEqual(['cell-value-change']);

    const sheet = new Worksheet('guard', 2, 2);
    const base = new CommandManager(20, sheet);
    const guarded = createGuardedCommandManager(base, {
      ...DEFAULT_APP_CONFIG,
      allowEdit: false,
    });
    guarded.execute(new SetValueCommand(sheet, { row: 1, col: 1 }, 'blocked'));
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(base.getHistorySize()).toEqual({ undoCount: 0, redoCount: 0 });
  });
});
