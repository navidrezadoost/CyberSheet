import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CanvasTextMeasurer, CommandManager, Worksheet, type Range } from '@cyber-sheet/core';
import {
  autoFitColumnWidths,
  autoFitRowHeights,
  hideColumnsInRange,
  hideRowsInRange,
  normalizeRange,
  setColumnWidthsInRange,
  setRowHeightsInRange,
  setCellsLocked,
  unhideColumnsNearRange,
  unhideRowsNearRange,
} from '../utils/formatOperations';
import { useConditionalFormattingInspector } from '../conditional-formatting/useConditionalFormattingInspector';

const InspectorProbe = ({ worksheet }: { worksheet: Worksheet }) => {
  const detail = useConditionalFormattingInspector({
    worksheet,
    selection: { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } },
  });
  return <output data-testid="inspection">{JSON.stringify(detail)}</output>;
};

describe('P1-08G React exact-key batch 4', () => {
  afterEach(() => jest.restoreAllMocks());

  test('standalone formatting helpers normalize ranges, mutate, emit, undo, and redo', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    jest.spyOn(CanvasTextMeasurer.prototype, 'measure').mockReturnValue({ width: 30, height: 12 });
    const worksheet = new Worksheet('G05', 8, 8);
    const commands = new CommandManager(50);
    const reversed: Range = {
      start: { row: 2, col: 2 },
      end: { row: 1, col: 1 },
    };
    const events: string[] = [];
    worksheet.on((event) => events.push(event.type));

    expect(normalizeRange(reversed)).toEqual({
      start: { row: 1, col: 1 },
      end: { row: 2, col: 2 },
    });
    setRowHeightsInRange(commands, worksheet, reversed, 31);
    expect(worksheet.getRowHeight(1)).toBe(31);
    expect(worksheet.getRowHeight(2)).toBe(31);
    commands.undo();
    expect(worksheet.getRowHeight(1)).toBe(20);
    commands.redo();
    expect(worksheet.getRowHeight(2)).toBe(31);

    setColumnWidthsInRange(commands, worksheet, reversed, 88);
    expect(worksheet.getColumnWidth(1)).toBe(88);
    expect(worksheet.getColumnWidth(2)).toBe(88);
    commands.undo();
    expect(worksheet.getColumnWidth(1)).toBe(80);
    commands.redo();

    worksheet.setCellValue({ row: 1, col: 1 }, 'a reasonably long cell label');
    autoFitColumnWidths(commands, worksheet, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 1 },
    });
    expect(worksheet.getColumnWidth(1)).toBeGreaterThan(12);
    commands.undo();
    expect(worksheet.getColumnWidth(1)).toBe(88);

    worksheet.setCellValue({ row: 1, col: 2 }, 'a long wrapped row label');
    autoFitRowHeights(commands, worksheet, {
      start: { row: 1, col: 2 }, end: { row: 1, col: 2 },
    });
    expect(worksheet.getRowHeight(1)).toBeGreaterThanOrEqual(15);

    hideRowsInRange(commands, worksheet, {
      start: { row: 2, col: 1 }, end: { row: 3, col: 1 },
    });
    expect(worksheet.isRowHidden(2)).toBe(true);
    unhideRowsNearRange(commands, worksheet, {
      start: { row: 2, col: 1 }, end: { row: 2, col: 1 },
    });
    expect(worksheet.isRowHidden(2)).toBe(false);

    hideColumnsInRange(commands, worksheet, {
      start: { row: 1, col: 3 }, end: { row: 1, col: 4 },
    });
    expect(worksheet.isColHidden(3)).toBe(true);
    unhideColumnsNearRange(commands, worksheet, {
      start: { row: 1, col: 3 }, end: { row: 1, col: 3 },
    });
    expect(worksheet.isColHidden(3)).toBe(false);

    setCellsLocked(commands, worksheet, [{ row: 1, col: 1 }], true);
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.locked).toBe(true);
    commands.undo();
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.locked).toBeUndefined();
    expect(events).toContain('sheet-mutated');
  });

  test('conditional-formatting inspector reports the selected top-ranked cell', () => {
    const worksheet = new Worksheet('G05 inspector', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 10);
    worksheet.setCellValue({ row: 1, col: 2 }, 20);
    worksheet.setConditionalFormattingRules([{
      id: 'top-two',
      type: 'top-bottom',
      mode: 'top',
      rankType: 'number',
      rank: 2,
      ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 2 } }],
      description: 'Top values',
    }]);

    render(<InspectorProbe worksheet={worksheet} />);

    expect(screen.getByTestId('inspection')).toHaveTextContent('"ruleId":"top-two"');
    expect(screen.getByTestId('inspection')).toHaveTextContent('"rank":1');
    expect(screen.getByTestId('inspection')).toHaveTextContent('"total":2');
  });
});
