import { EventBus } from '../src/EventBus';
import { CommandManager, SetValueCommand } from '../src/CommandManager';
import { Worksheet } from '../src/worksheet';

describe('EventBus lazy bridges', () => {
  it('activates and deactivates registered bridges with listener count', () => {
    const bus = new EventBus();
    const activate = jest.fn();
    const deactivate = jest.fn();

    bus.registerBridge('lazy', activate, deactivate);
    expect(activate).not.toHaveBeenCalled();

    const unsub = bus.on('lazy', jest.fn());
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
    const handler = jest.fn();

    const unsub = bus.on('test', handler);
    bus.emit('test', { value: 1 });
    expect(handler).toHaveBeenCalledWith({ value: 1 });

    unsub();
    bus.emit('test', { value: 2 });
    expect(handler).toHaveBeenCalledTimes(1);

    const onceHandler = jest.fn();
    bus.once('once', onceHandler);
    bus.emit('once', 'a');
    bus.emit('once', 'b');
    expect(onceHandler).toHaveBeenCalledTimes(1);
    expect(onceHandler).toHaveBeenCalledWith('a');
  });
});

describe('CommandManager event bridge', () => {
  it('emits command-execute and command-undo', () => {
    const sheet = new Worksheet('Standalone');
    const eventBus = new EventBus();
    const executeHandler = jest.fn();
    const undoHandler = jest.fn();
    eventBus.on('command-execute', executeHandler);
    eventBus.on('command-undo', undoHandler);

    const manager = new CommandManager(100, sheet, eventBus);
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
