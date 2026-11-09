import { EventBus } from '../src/EventBus';
import { Workbook, Worksheet } from '../src';

function workbookFixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 3, cols: 3 }] });
  const raw = workbook.createDevImportWorksheet('Data', 3, 3) as Worksheet;
  workbook.attachDevImportSheet(raw);
  return { workbook, sheet: workbook.getSheet('Data')! };
}

describe('PKG-02F EventBus once reentrancy', () => {
  test.each([false, true])(
    'a once listener is consumed before a nested same-event emission (isolated=%s)',
    (isolate) => {
    const bus = new EventBus(undefined, undefined, isolate);
    const calls: unknown[] = [];
    bus.once('pulse', (payload) => {
      calls.push(payload);
      if (payload === 'outer') bus.emit('pulse', 'nested');
    });

    bus.emit('pulse', 'outer');
    bus.emit('pulse', 'later');

    expect(calls).toEqual(['outer']);
  });

  test.each([false, true])(
    'multiple once listeners in an outer dispatch snapshot each run at most once (isolated=%s)',
    (isolate) => {
      const bus = new EventBus(undefined, undefined, isolate);
      const calls: string[] = [];
      bus.once('pulse', (payload) => {
        calls.push(`first:${String(payload)}`);
        if (payload === 'outer') bus.emit('pulse', 'nested');
      });
      bus.once('pulse', (payload) => calls.push(`second:${String(payload)}`));

      bus.emit('pulse', 'outer');

      expect(calls).toEqual(['first:outer', 'second:nested']);
    },
  );

  test('once listeners can emit another event and ordinary/once ordering remains stable', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    bus.on('outer', () => calls.push('ordinary:outer'));
    bus.once('outer', () => {
      calls.push('once:outer');
      bus.emit('inner', 'nested');
    });
    bus.once('inner', (payload) => calls.push(`once:inner:${String(payload)}`));

    bus.emit('outer', 'first');
    bus.emit('outer', 'second');
    bus.emit('inner', 'later');

    expect(calls).toEqual([
      'ordinary:outer', 'once:outer', 'once:inner:nested',
      'ordinary:outer',
    ]);
  });

  test('a throwing once callback stays consumed and isolated observers continue', () => {
    const report = jest.fn();
    const bus = new EventBus(report, undefined, true);
    const failure = new Error('once callback failed');
    const calls: string[] = [];
    bus.once('pulse', () => {
      calls.push('once');
      bus.emit('pulse', 'nested');
      throw failure;
    });
    bus.on('pulse', () => calls.push('ordinary'));

    bus.emit('pulse', 'outer');
    bus.emit('pulse', 'later');

    expect(calls).toEqual(['once', 'ordinary', 'ordinary', 'ordinary']);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(failure, 'pulse');
  });

  test('off before first emission and repeated unsubscription are safe', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    const unsubscribe = bus.on('pulse', handler);
    bus.off('pulse', handler);
    bus.off('pulse', handler);
    unsubscribe();
    bus.emit('pulse', 'never observed');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('PKG-02F listener mutation during dispatch', () => {
  test('non-isolated dispatch uses the live Set: removed listeners skip and added listeners can run now', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    let removeSelf: () => void = () => undefined;
    let removeNext: () => void = () => undefined;
    let changed = false;
    const late = () => calls.push('late');
    const first = () => {
      calls.push('first');
      if (changed) return;
      changed = true;
      removeSelf();
      removeNext();
      bus.on('pulse', late);
    };
    removeSelf = bus.on('pulse', first);
    removeNext = bus.on('pulse', () => calls.push('removed'));

    bus.emit('pulse', 'outer');
    expect(calls).toEqual(['first', 'late']);
    calls.length = 0;
    bus.emit('pulse', 'next');
    expect(calls).toEqual(['late']);
  });

  test('isolated dispatch uses a snapshot: removals do not cancel it and additions wait', () => {
    const bus = new EventBus(undefined, undefined, true);
    const calls: string[] = [];
    let removeNext: () => void = () => undefined;
    let changed = false;
    const late = () => calls.push('late');
    const lateOnce = () => calls.push('late-once');
    const first = () => {
      calls.push('first');
      if (changed) return;
      changed = true;
      removeNext();
      bus.on('pulse', late);
      bus.once('pulse', lateOnce);
      bus.emit('pulse', 'nested');
    };
    bus.on('pulse', first);
    removeNext = bus.on('pulse', () => calls.push('removed'));

    bus.emit('pulse', 'current');
    expect(calls).toEqual(['first', 'first', 'late', 'late-once', 'removed']);
    calls.length = 0;
    bus.emit('pulse', 'next');
    expect(calls).toEqual(['first', 'late']);
  });
});

describe('PKG-02F Workbook disposal during publication', () => {
  test('disposing inside a once dimension listener stops later notifications but keeps committed state', async () => {
    const { workbook, sheet } = workbookFixture();
    const calls: unknown[] = [];
    sheet.on((event) => calls.push(`sheet:${event.type}`));
    workbook.eventBus.once('row-height-change', (event) => {
      calls.push(event);
      workbook.dispose();
    });
    workbook.eventBus.on('row-height-change', (event) => calls.push(`later-row:${event.heightPx}`));
    workbook.eventBus.on('column-width-change', (event) => calls.push(`column:${event.widthPx}`));

    await workbook.transact((tx) => {
      tx.setRowHeight(sheet, 1, 26);
      tx.setColumnWidth(sheet, 1, 96);
      tx.setRowHeight(sheet, 1, 31);
    });

    expect(sheet.getRowHeight(1)).toBe(31);
    expect(sheet.getColumnWidth(1)).toBe(96);
    expect(calls).toEqual([
      'sheet:sheet-mutated',
      { worksheetId: sheet.worksheetId, row: 1, heightPx: 26 },
    ]);
  });
});
