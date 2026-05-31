import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/EventBus';
import { Workbook } from '../src/workbook';
import { CommandManager, SetValueCommand } from '../src/CommandManager';

describe('EventBus lazy bridges', () => {
  it('activates and deactivates registered bridges with listener count', () => {
    const bus = new EventBus();
    const activate = vi.fn();
    const deactivate = vi.fn();

    bus.registerBridge('lazy', activate, deactivate);
    expect(activate).not.toHaveBeenCalled();

    const unsub = bus.on('lazy', vi.fn());
    expect(activate).toHaveBeenCalledTimes(1);
    expect(bus.isBridgeActive('lazy')).toBe(true);

    unsub();
    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(bus.isBridgeActive('lazy')).toBe(false);
  });
});

describe('EventBus', () => {
  it('supports on, once, and off', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsub = bus.on('test', handler);
    bus.emit('test', { value: 1 });
    expect(handler).toHaveBeenCalledWith({ value: 1 });

    unsub();
    bus.emit('test', { value: 2 });
    expect(handler).toHaveBeenCalledTimes(1);

    const onceHandler = vi.fn();
    bus.once('once', onceHandler);
    bus.emit('once', 'a');
    bus.emit('once', 'b');
    expect(onceHandler).toHaveBeenCalledTimes(1);
    expect(onceHandler).toHaveBeenCalledWith('a');
  });
});

describe('Workbook event bridge', () => {
  it('emits cell-value-change when a cell is updated', () => {
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const handler = vi.fn();
    workbook.eventBus.on('cell-value-change', handler);

    sheet.setCellValue({ row: 1, col: 1 }, 42);

    expect(handler).toHaveBeenCalledWith({
      row: 1,
      col: 1,
      oldValue: null,
      newValue: 42,
      formula: undefined,
    });
  });

  it('does not bridge cell-value-change until subscribed', () => {
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const handler = vi.fn();

    sheet.setCellValue({ row: 1, col: 1 }, 42);
    expect(handler).not.toHaveBeenCalled();

    const unsub = workbook.eventBus.on('cell-value-change', handler);
    sheet.setCellValue({ row: 2, col: 2 }, 99);
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    sheet.setCellValue({ row: 3, col: 3 }, 1);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('CommandManager event bridge', () => {
  it('emits command-execute and command-undo', () => {
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const executeHandler = vi.fn();
    const undoHandler = vi.fn();
    workbook.eventBus.on('command-execute', executeHandler);
    workbook.eventBus.on('command-undo', undoHandler);

    const manager = new CommandManager(100, sheet, workbook.eventBus);
    manager.execute(new SetValueCommand(sheet, { row: 1, col: 1 }, 'hello'));

    expect(executeHandler).toHaveBeenCalledWith(
      expect.objectContaining({ commandType: 'SetValueCommand' }),
    );

    manager.undo();
    expect(undoHandler).toHaveBeenCalledWith(
      expect.objectContaining({ commandType: 'SetValueCommand' }),
    );
  });
});
