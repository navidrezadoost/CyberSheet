import { ClearCellsCommand } from '../src/ClearCellsCommand';
import { CommandManager } from '../src/CommandManager';
import { SetHyperlinkCommand } from '../src/SetHyperlinkCommand';
import { Worksheet } from '../src/worksheet';

describe('P1-08J.06 standalone Core command characterization', () => {
  test('hyperlink set, remove, undo, and redo preserve standalone cell snapshots', () => {
    const worksheet = new Worksheet('J06 hyperlink', 3, 3);
    const address = { row: 1, col: 1 };
    worksheet.setCellValue(address, 'Documentation');
    worksheet.setCellStyle(address, { bold: true, color: '#222222' });
    const before = {
      value: worksheet.getCellValue(address),
      style: worksheet.getCellStyle(address),
    };
    const manager = new CommandManager();

    manager.execute(new SetHyperlinkCommand(
      worksheet,
      address,
      { target: 'https://example.invalid/docs', kind: 'url' },
    ));
    expect(worksheet.getCell(address)?.hyperlink?.target).toBe('https://example.invalid/docs');
    expect(worksheet.getCellValue(address)).toBe('example.invalid/docs');
    expect(worksheet.getCellStyle(address)).toMatchObject({ underline: 'single' });
    expect(manager.undo()).toBe(true);
    expect(worksheet.getCellValue(address)).toBe(before.value);
    expect(worksheet.getCell(address)?.hyperlink).toBeUndefined();
    expect(worksheet.getCellStyle(address)).toEqual(before.style);
    expect(manager.redo()).toBe(true);
    expect(worksheet.getCell(address)?.hyperlink?.target).toBe('https://example.invalid/docs');

    const removeManager = new CommandManager();
    removeManager.execute(new SetHyperlinkCommand(worksheet, address, null));
    expect(worksheet.getCell(address)?.hyperlink).toBeUndefined();
    expect(worksheet.getCellStyle(address)).toEqual(before.style);
    expect(removeManager.undo()).toBe(true);
    expect(worksheet.getCell(address)?.hyperlink?.target).toBe('https://example.invalid/docs');

    const fallbackAddress = { row: 1, col: 2 };
    worksheet.setCellValue(fallbackAddress, 'raw link');
    worksheet.setCellStyle(fallbackAddress, { bold: true, color: '#0563C1', underline: 'single' });
    worksheet.setHyperlink(fallbackAddress, { target: 'https://example.invalid/raw', kind: 'url' });
    const fallbackRemove = new CommandManager();
    fallbackRemove.execute(new SetHyperlinkCommand(worksheet, fallbackAddress, null));
    expect(worksheet.getCell(fallbackAddress)?.hyperlink).toBeUndefined();
    expect(worksheet.getCellStyle(fallbackAddress)).toEqual({ bold: true });
  });

  test('ClearCells executes and restores formula, value, and style through its command manager', () => {
    const worksheet = new Worksheet('J06 clear cells', 3, 3);
    const plainAddress = { row: 2, col: 1 };
    const formulaAddress = { row: 2, col: 2 };
    worksheet.setCellValue(plainAddress, 'plain');
    worksheet.setCellStyle(plainAddress, { bold: true });
    worksheet.setCellFormula(formulaAddress, '=1+2', 3);
    worksheet.setCellStyle(formulaAddress, { italic: true, color: '#345678' });
    const addresses = [plainAddress, formulaAddress];
    const snapshot = () => addresses.map((address) => ({
      value: worksheet.getCellValue(address),
      formula: worksheet.getCell(address)?.formula,
      style: worksheet.getCellStyle(address),
    }));
    const before = snapshot();
    const manager = new CommandManager();
    manager.execute(new ClearCellsCommand(worksheet, { start: plainAddress, end: formulaAddress }));
    expect(snapshot().map(({ formula, value }) => ({ formula, value }))).toEqual([
      { formula: '', value: null },
      { formula: '', value: null },
    ]);
    expect(manager.undo()).toBe(true);
    expect(snapshot()).toEqual(before);
    expect(manager.redo()).toBe(true);
    expect(snapshot().map(({ formula, value }) => ({ formula, value }))).toEqual([
      { formula: '', value: null },
      { formula: '', value: null },
    ]);
  });
});
