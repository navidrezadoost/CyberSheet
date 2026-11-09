import { CommandManager, SetValueCommand } from '../src/CommandManager';
import { Worksheet } from '../src/worksheet';

describe('P1-08K Core exact-key command lifecycle', () => {
  test('SetValueCommand captures and replays a standalone Worksheet value', () => {
    const worksheet = new Worksheet('K06 SetValueCommand', 2, 2);
    const address = { row: 1, col: 1 };
    worksheet.setCellValue(address, 'before');
    const manager = new CommandManager(10, worksheet);

    manager.execute(new SetValueCommand(worksheet, address, 'after'));
    expect(worksheet.getCellValue(address)).toBe('after');
    expect(manager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(manager.undo()).toBe(true);
    expect(worksheet.getCellValue(address)).toBe('before');
    expect(manager.redo()).toBe(true);
    expect(worksheet.getCellValue(address)).toBe('after');
  });
});
