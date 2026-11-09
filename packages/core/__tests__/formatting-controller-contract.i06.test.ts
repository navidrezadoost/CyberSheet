import { CommandManager } from '../src/CommandManager';
import { FormattingController } from '../src/FormattingController';
import { Worksheet } from '../src/worksheet';

describe('P1-08I.06 FormattingController standalone contract', () => {
  test('style batches, row growth, merge and unmerge run through public Worksheet APIs', () => {
    const worksheet = new Worksheet('I06 formatting', 4, 4);
    const manager = new CommandManager();
    const formatting = new FormattingController(worksheet, manager);
    const events: string[] = [];
    worksheet.on((event) => events.push(event.type));

    formatting.setBold([{ row: 1, col: 1 }, { row: 1, col: 2 }], true);
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.bold).toBe(true);
    expect(worksheet.getCellStyle({ row: 1, col: 2 })?.bold).toBe(true);
    manager.undo();
    expect(worksheet.getCellStyle({ row: 1, col: 1 })).toBeUndefined();
    expect(worksheet.getCellStyle({ row: 1, col: 2 })).toBeUndefined();
    manager.redo();
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.bold).toBe(true);

    formatting.toggleBoldInRanges([{ startRow: 1, endRow: 1, startCol: 1, endCol: 2 }]);
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.bold).toBe(false);
    formatting.toggleItalic([{ row: 1, col: 1 }]);
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.italic).toBe(true);
    formatting.toggleItalicInRanges([{ startRow: 1, endRow: 1, startCol: 1, endCol: 1 }]);
    expect(worksheet.getCellStyle({ row: 1, col: 1 })?.italic).toBe(false);
    formatting.toggleUnderline([{ row: 1, col: 2 }]);
    expect(worksheet.getCellStyle({ row: 1, col: 2 })?.underline).toBe(true);
    formatting.toggleUnderlineInRanges([{ startRow: 1, endRow: 1, startCol: 2, endCol: 2 }]);
    expect(worksheet.getCellStyle({ row: 1, col: 2 })?.underline).toBe(false);

    formatting.setOuterBorder(
      [{ row: 2, col: 2 }, { row: 2, col: 3 }],
      { start: { row: 2, col: 2 }, end: { row: 2, col: 3 } },
      '#abcdef',
    );
    expect(worksheet.getCellStyle({ row: 2, col: 2 })?.border).toMatchObject({ left: '#abcdef' });
    expect(worksheet.getCellStyle({ row: 2, col: 3 })?.border).toMatchObject({ right: '#abcdef' });

    const defaultHeight = worksheet.getRowHeight(2);
    formatting.setFontSize([{ row: 2, col: 1 }], 36);
    expect(worksheet.getCellStyle({ row: 2, col: 1 })?.fontSize).toBe(36);
    expect(worksheet.getRowHeight(2)).toBeGreaterThan(defaultHeight);
    manager.undo();
    expect(worksheet.getCellStyle({ row: 2, col: 1 })).toBeUndefined();
    expect(worksheet.getRowHeight(2)).toBe(defaultHeight);

    worksheet.setCellValue({ row: 3, col: 2 }, 'preserved');
    worksheet.setCellStyle({ row: 3, col: 2 }, { italic: true, color: '#123456' });
    formatting.mergeCells({ start: { row: 3, col: 1 }, end: { row: 3, col: 2 } });
    expect(worksheet.isInMerge({ row: 3, col: 1 })).toBe(true);
    expect(worksheet.getCellValue({ row: 3, col: 2 })).toBe(worksheet.getCellValue({ row: 3, col: 1 }));
    manager.undo();
    expect(worksheet.isInMerge({ row: 3, col: 1 })).toBe(false);
    expect(worksheet.getCellValue({ row: 3, col: 2 })).toBe('preserved');
    expect(worksheet.getCellStyle({ row: 3, col: 2 })).toMatchObject({ italic: true, color: '#123456' });

    formatting.unmergeCells({ start: { row: 3, col: 1 }, end: { row: 3, col: 2 } });
    expect(worksheet.isInMerge({ row: 3, col: 1 })).toBe(false);

    expect(events).toContain('style-changed');
    expect(worksheet.isWorkbookOwned()).toBe(false);
  });
});
