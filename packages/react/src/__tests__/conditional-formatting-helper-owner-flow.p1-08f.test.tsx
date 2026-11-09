import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import {
  addConditionalRule,
  applyPreviewRules,
  clearAllConditionalRules,
  clearRulesFromRange,
  inferHasHeaders,
  resolveTableDataRange,
  restoreConditionalRules,
} from '../utils/conditionalFormattingRibbon';
import { StatusBar } from '../components/StatusBar';

jest.mock('@cyber-sheet/icons/react', () => ({
  StatusBarIcon1: () => null,
  StatusBarIcon2: () => null,
  StatusBarIcon3: () => null,
}), { virtual: true });

describe('P1-08F.05 conditional-formatting helper characterization', () => {
  afterEach(cleanup);

  test('table range and header inference use the supplied Worksheet observations', () => {
    const worksheet = new Worksheet('F05 helper', 5, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'Name');
    worksheet.setCellValue({ row: 1, col: 2 }, 'Score');
    worksheet.setCellValue({ row: 2, col: 1 }, 'Ada');
    worksheet.setCellValue({ row: 2, col: 2 }, 91);

    expect(resolveTableDataRange(worksheet, {
      start: { row: 2, col: 2 }, end: { row: 1, col: 1 },
    })).toEqual({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    expect(resolveTableDataRange(worksheet, null)).toEqual({
      start: { row: 1, col: 1 }, end: { row: 2, col: 2 },
    });
    expect(inferHasHeaders(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 1, col: 2 },
    })).toBe(true);

    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    expect(resolveTableDataRange(workbook.activeSheet!, null)).toEqual({
      start: { row: 1, col: 1 }, end: { row: 2, col: 2 },
    });
    expect(inferHasHeaders(workbook.activeSheet!, {
      start: { row: 1, col: 1 }, end: { row: 1, col: 2 },
    })).toBe(true);
  });

  test('preview replacement is temporary and command-backed clear operations are undoable', () => {
    const worksheet = new Worksheet('F05 conditional formatting', 8, 4);
    const commands = new CommandManager(20, worksheet);
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } };
    const outside = { id: 'outside', type: 'value' as const, operator: '>' as const, value: 0,
      ranges: [{ start: { row: 6, col: 1 }, end: { row: 6, col: 1 } }] };
    const original = { id: 'original', type: 'value' as const, operator: '>' as const, value: 10,
      ranges: [range] };
    worksheet.setConditionalFormattingRules([outside, original]);

    const previous = applyPreviewRules(worksheet, range, [
      { id: 'preview', type: 'value', operator: '<', value: 5 },
    ]);
    expect(previous).toEqual([outside, original]);
    expect(worksheet.getConditionalFormattingRules().map((rule) => rule.id)).toEqual(['outside', 'preview']);
    restoreConditionalRules(worksheet, previous);
    expect(worksheet.getConditionalFormattingRules().map((rule) => rule.id)).toEqual(['outside', 'original']);

    addConditionalRule(worksheet, commands, range, {
      id: 'added', type: 'value', operator: '=', value: 10,
    });
    expect(worksheet.getConditionalFormattingRules().map((rule) => rule.id)).toEqual(['outside', 'original', 'added']);
    clearRulesFromRange(worksheet, commands, range);
    expect(worksheet.getConditionalFormattingRules().map((rule) => rule.id)).toEqual(['outside']);
    expect(commands.undo()).toBe(true);
    expect(worksheet.getConditionalFormattingRules().map((rule) => rule.id)).toEqual(['outside', 'original', 'added']);
    clearAllConditionalRules(worksheet, commands);
    expect(worksheet.getConditionalFormattingRules()).toEqual([]);
  });

  test('mounted StatusBar selection statistics observe the Workbook active-sheet view', () => {
    const worksheet = new Worksheet('F05 status', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 1, col: 2 }, 3);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);

    render(<StatusBar
      zoom={100}
      onZoomChange={() => {}}
      workbook={workbook}
      selection={{ start: { row: 1, col: 1 }, end: { row: 1, col: 2 } }}
    />);

    expect(screen.getByText(/Average: 2\.5/)).toBeInTheDocument();
    expect(screen.getByText(/Count: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Sum: 5/)).toBeInTheDocument();
  });
});
