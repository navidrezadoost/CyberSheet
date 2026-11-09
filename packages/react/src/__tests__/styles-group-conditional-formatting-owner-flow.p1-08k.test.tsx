import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, FormattingController, Worksheet } from '@cyber-sheet/core';
import { StylesGroup } from '../components/ribbon/StylesGroup';

jest.mock('@cyber-sheet/icons/react', () => ({ StylesGroupIcon1: () => null }), { virtual: true });

const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } };
const selectedRanges = [{ startRow: 1, startCol: 1, endRow: 2, endCol: 1 }];

function renderStylesGroup(worksheet: Worksheet, commands: CommandManager) {
  return render(<StylesGroup
    formattingController={new FormattingController(worksheet, commands)}
    worksheet={worksheet}
    commandManager={commands}
    selectedRanges={selectedRanges}
    currentRange={range}
  />);
}

describe('P1-08K mounted StylesGroup conditional-formatting flow', () => {
  afterEach(cleanup);

  test('gallery preview restores prior rules and applying a gallery rule is undoable', () => {
    const worksheet = new Worksheet('K05 style preview', 4, 3);
    const commands = new CommandManager(20, worksheet);
    const existing = {
      id: 'existing', type: 'value' as const, operator: '>' as const, value: 5,
      ranges: [{ start: { row: 4, col: 1 }, end: { row: 4, col: 1 } }],
    };
    worksheet.setConditionalFormattingRules([existing]);
    renderStylesGroup(worksheet, commands);

    fireEvent.click(screen.getByTitle('Conditional Formatting'));
    fireEvent.mouseEnter(document.querySelector('[data-cf-submenu-root="dataBars"]')!);
    const blueBar = screen.getByText('Blue Data Bar');
    fireEvent.mouseEnter(blueBar);
    const previewRules = worksheet.getConditionalFormattingRules();
    expect(previewRules).toHaveLength(2);
    expect(previewRules[0]).toEqual(existing);
    expect(previewRules[1]).toMatchObject({ type: 'data-bar', color: '#4472C4' });
    fireEvent.click(document.body);
    expect(worksheet.getConditionalFormattingRules()).toEqual([existing]);

    fireEvent.click(screen.getByTitle('Conditional Formatting'));
    fireEvent.mouseEnter(document.querySelector('[data-cf-submenu-root="dataBars"]')!);
    const applyBlueBar = screen.getByText('Blue Data Bar');
    fireEvent.mouseEnter(applyBlueBar);
    fireEvent.click(applyBlueBar);
    const appliedRules = worksheet.getConditionalFormattingRules();
    expect(appliedRules).toHaveLength(2);
    expect(appliedRules[0]).toEqual(existing);
    expect(appliedRules[1]).toMatchObject({ type: 'data-bar', color: '#4472C4' });
    expect(commands.getUndoHistory()).toEqual(['Add Conditional Formatting Rule']);
    expect(commands.undo()).toBe(true);
    expect(worksheet.getConditionalFormattingRules()).toEqual([existing]);
  });

  test('clear rules from the selected range preserves out-of-range rules and is undoable', () => {
    const worksheet = new Worksheet('K05 style clear', 5, 3);
    const commands = new CommandManager(20, worksheet);
    const selected = {
      id: 'selected', type: 'value' as const, operator: '>' as const, value: 5,
      ranges: [range],
    };
    const outside = {
      id: 'outside', type: 'value' as const, operator: '<' as const, value: 2,
      ranges: [{ start: { row: 5, col: 2 }, end: { row: 5, col: 2 } }],
    };
    worksheet.setConditionalFormattingRules([selected, outside]);
    renderStylesGroup(worksheet, commands);

    fireEvent.click(screen.getByTitle('Conditional Formatting'));
    const clearRules = screen.getByText('Clear Rules').parentElement!;
    fireEvent.mouseEnter(clearRules);
    fireEvent.click(screen.getByText('Clear Rules from Selected Cells'));
    expect(worksheet.getConditionalFormattingRules()).toEqual([outside]);
    expect(commands.getUndoHistory()).toEqual(['Clear Conditional Formatting Rules']);
    expect(commands.undo()).toBe(true);
    expect(worksheet.getConditionalFormattingRules()).toEqual([selected, outside]);
  });
});
