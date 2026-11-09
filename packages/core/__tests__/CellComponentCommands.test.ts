import { SetCellComponentCommand } from '../src/commands/CellComponentCommands';
import { Worksheet } from '../src/worksheet';

describe('SetCellComponentCommand', () => {
  it('sets and undoes a custom cell component', () => {
    const sheet = new Worksheet('Sheet1');
    const address = { row: 2, col: 3 };
    const component = {
      type: 'icon' as const,
      id: 'status-ok',
      props: { source: '✅', iconType: 'emoji' },
      position: 'left' as const,
      size: 16,
    };

    const command = new SetCellComponentCommand(sheet, address, component);
    command.execute();

    expect(sheet.getCellComponent(address)).toEqual(component);

    command.undo();
    expect(sheet.getCellComponent(address)).toBeUndefined();

    command.execute();
    expect(sheet.getCellComponent(address)).toEqual(component);
  });
});
