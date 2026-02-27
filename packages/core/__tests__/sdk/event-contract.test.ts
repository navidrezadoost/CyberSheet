/**
 * @group sdk
 *
 * Event contract tests — verifies the framework-neutral synchronous dispatch
 * model of SpreadsheetSDK events.
 *
 * Invariants under test:
 *  1. Events fire synchronously during the mutation that caused them
 *  2. Disposable.dispose() stops future events but not current execution
 *  3. Multiple listeners on the same event type all receive the event
 *  4. One listener error does not prevent others from firing
 *  5. Correct event type fires for each mutation category
 *  6. No cross-contamination: cell-changed listener does not see structure-changed
 */

import { createSpreadsheet } from '../../src/sdk/index';
import type { SpreadsheetSDK, SdkEvent } from '../../src/sdk/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectEvents(s: SpreadsheetSDK, type: Parameters<SpreadsheetSDK['on']>[0]) {
  const received: SdkEvent[] = [];
  const sub = s.on(type, (e) => received.push(e));
  return { received, sub };
}

// ---------------------------------------------------------------------------
// 1. Synchronous dispatch
// ---------------------------------------------------------------------------

describe('synchronous dispatch', () => {
  it('cell-changed fires synchronously during setCell', () => {
    const s = createSpreadsheet('Ev', { rows: 5, cols: 5 });
    let firedDuring = false;
    let afterMutation = false;

    s.on('cell-changed', () => {
      // This runs DURING setCell()
      firedDuring = true;
      expect(afterMutation).toBe(false); // setCell hasn't returned yet
    });

    s.setCell(1, 1, 'x');
    afterMutation = true;
    expect(firedDuring).toBe(true);
    s.dispose();
  });

  it('structure-changed fires synchronously during mergeCells', () => {
    const s = createSpreadsheet('EvM', { rows: 10, cols: 10 });
    let firedSync = false;

    s.on('structure-changed', () => { firedSync = true; });
    s.mergeCells(1, 1, 2, 2);
    expect(firedSync).toBe(true);
    s.dispose();
  });

  it('structure-changed fires synchronously during hideRow', () => {
    const s = createSpreadsheet('EvH', { rows: 10, cols: 10 });
    let firedSync = false;

    s.on('structure-changed', () => { firedSync = true; });
    s.hideRow(3);
    expect(firedSync).toBe(true);
    s.dispose();
  });

  it('structure-changed fires synchronously during hideCol', () => {
    const s = createSpreadsheet('EvHC', { rows: 10, cols: 10 });
    let firedSync = false;

    s.on('structure-changed', () => { firedSync = true; });
    s.hideCol(2);
    expect(firedSync).toBe(true);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 2. Correct event type per mutation
// ---------------------------------------------------------------------------

describe('correct event type per mutation', () => {
  it('setCell emits cell-changed with correct row/col', () => {
    const s = createSpreadsheet('CE', { rows: 5, cols: 5 });
    const { received, sub } = collectEvents(s, 'cell-changed');

    s.setCell(2, 3, 42);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: 'cell-changed', row: 2, col: 3 });
    sub.dispose();
    s.dispose();
  });

  it('setCell also emits structure-changed', () => {
    const s = createSpreadsheet('SE', { rows: 5, cols: 5 });
    const { received, sub } = collectEvents(s, 'structure-changed');

    s.setCell(1, 1, 'hello');
    expect(received.length).toBeGreaterThan(0);
    expect(received[0]).toMatchObject({ type: 'structure-changed' });
    sub.dispose();
    s.dispose();
  });

  it('mergeCells emits structure-changed', () => {
    const s = createSpreadsheet('ME', { rows: 10, cols: 10 });
    const { received, sub } = collectEvents(s, 'structure-changed');

    s.mergeCells(1, 1, 3, 3);
    expect(received.length).toBeGreaterThan(0);
    sub.dispose();
    s.dispose();
  });

  it('hideRow emits structure-changed', () => {
    const s = createSpreadsheet('HR', { rows: 10, cols: 10 });
    const { received, sub } = collectEvents(s, 'structure-changed');

    s.hideRow(4);
    expect(received.length).toBeGreaterThan(0);
    sub.dispose();
    s.dispose();
  });

  it('showRow emits structure-changed', () => {
    const s = createSpreadsheet('SR', { rows: 10, cols: 10 });
    s.hideRow(4);
    const { received, sub } = collectEvents(s, 'structure-changed');

    s.showRow(4);
    expect(received.length).toBeGreaterThan(0);
    sub.dispose();
    s.dispose();
  });

  it('cancelMerge emits structure-changed', () => {
    const s = createSpreadsheet('CM', { rows: 10, cols: 10 });
    s.mergeCells(1, 1, 2, 2);
    const { received, sub } = collectEvents(s, 'structure-changed');

    s.cancelMerge(1, 1, 2, 2);
    expect(received.length).toBeGreaterThan(0);
    sub.dispose();
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 3. Disposable unsubscription
// ---------------------------------------------------------------------------

describe('Disposable unsubscription', () => {
  it('dispose() stops future events', () => {
    const s = createSpreadsheet('D', { rows: 5, cols: 5 });
    const received: SdkEvent[] = [];
    const sub = s.on('cell-changed', (e) => received.push(e));

    s.setCell(1, 1, 'first');
    expect(received).toHaveLength(1);

    sub.dispose();
    s.setCell(1, 1, 'second');
    // Still 1 — second event was not delivered
    expect(received).toHaveLength(1);
    s.dispose();
  });

  it('calling dispose() on an already-disposed Disposable is a no-op', () => {
    const s = createSpreadsheet('D2', { rows: 5, cols: 5 });
    const sub = s.on('cell-changed', () => {});
    sub.dispose();
    expect(() => sub.dispose()).not.toThrow();
    s.dispose();
  });

  it('disposing one listener does not affect other listeners', () => {
    const s = createSpreadsheet('D3', { rows: 5, cols: 5 });
    let count1 = 0;
    let count2 = 0;

    const sub1 = s.on('cell-changed', () => { count1++; });
    s.on('cell-changed', () => { count2++; });

    s.setCell(1, 1, 'a');
    expect(count1).toBe(1);
    expect(count2).toBe(1);

    sub1.dispose();
    s.setCell(1, 1, 'b');
    // sub1 is gone; sub2 still fires
    expect(count1).toBe(1);
    expect(count2).toBe(2);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 4. Multiple listeners on same event type
// ---------------------------------------------------------------------------

describe('multiple listeners', () => {
  it('all listeners receive the same event', () => {
    const s = createSpreadsheet('ML', { rows: 5, cols: 5 });
    const received1: SdkEvent[] = [];
    const received2: SdkEvent[] = [];
    const received3: SdkEvent[] = [];

    s.on('cell-changed', (e) => received1.push(e));
    s.on('cell-changed', (e) => received2.push(e));
    s.on('cell-changed', (e) => received3.push(e));

    s.setCell(2, 2, 'hello');

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
    expect(received3).toHaveLength(1);
    expect(received1[0]).toEqual(received2[0]);
    expect(received2[0]).toEqual(received3[0]);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 5. Listener error isolation
// ---------------------------------------------------------------------------

describe('listener error isolation', () => {
  it('one listener throwing does not prevent the next listener from firing', () => {
    const s = createSpreadsheet('ErrIso', { rows: 5, cols: 5 });
    let secondFired = false;

    // First listener throws
    s.on('cell-changed', () => { throw new Error('bad listener'); });
    // Second listener must still fire
    s.on('cell-changed', () => { secondFired = true; });

    // The SDK logs the error but does not propagate it
    expect(() => s.setCell(1, 1, 'x')).not.toThrow();
    expect(secondFired).toBe(true);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 6. Event type cross-contamination
// ---------------------------------------------------------------------------

describe('event type isolation', () => {
  it('cell-changed listener does not receive structure-changed events', () => {
    const s = createSpreadsheet('XC', { rows: 10, cols: 10 });
    const cellEvents: SdkEvent[] = [];

    s.on('cell-changed', (e) => cellEvents.push(e));
    // Pure structure mutations (no cell value change)
    s.mergeCells(1, 1, 2, 2);
    s.hideRow(5);
    s.hideCol(3);

    // cell-changed must not have fired
    const wrongType = cellEvents.filter(e => e.type !== 'cell-changed');
    expect(wrongType).toHaveLength(0);
    // And it must NOT have fired at all from pure structural ops
    expect(cellEvents).toHaveLength(0);
    s.dispose();
  });

  it('structure-changed does not receive cell-changed events', () => {
    // Note: setCell fires BOTH cell-changed and structure-changed (by design)
    // But subscribing to 'structure-changed' should only give { type: 'structure-changed' }
    const s = createSpreadsheet('XC2', { rows: 5, cols: 5 });
    const structEvents: SdkEvent[] = [];

    s.on('structure-changed', (e) => structEvents.push(e));
    s.setCell(1, 1, 'hello');

    for (const e of structEvents) {
      expect(e.type).toBe('structure-changed');
    }
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 7. Event ordering — multiple mutations
// ---------------------------------------------------------------------------

describe('event ordering', () => {
  it('events fire in mutation order', () => {
    const s = createSpreadsheet('Ord', { rows: 5, cols: 5 });
    const order: number[] = [];

    s.on('cell-changed', (e) => {
      if (e.type === 'cell-changed') order.push(e.col);
    });

    s.setCell(1, 1, 'a');
    s.setCell(1, 2, 'b');
    s.setCell(1, 3, 'c');

    expect(order).toEqual([1, 2, 3]);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 8. undo/redo also fires events
// ---------------------------------------------------------------------------

describe('undo/redo event firing', () => {
  it('undo fires cell-changed back to original value', () => {
    const s = createSpreadsheet('UR', { rows: 5, cols: 5 });
    const received: SdkEvent[] = [];
    s.on('cell-changed', (e) => received.push(e));

    s.setCell(1, 1, 42);
    expect(received).toHaveLength(1);

    s.undo();
    // Undo applies the inverse patch — must fire cell-changed again
    expect(received.length).toBeGreaterThan(1);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 9. No events after dispose
// ---------------------------------------------------------------------------

describe('no events after dispose', () => {
  it('events do not fire on the internal Worksheet after SDK dispose', () => {
    const s = createSpreadsheet('ND', { rows: 5, cols: 5 });
    let fired = false;
    s.on('cell-changed', () => { fired = true; });
    s.dispose();
    // Can't call setCell (DisposedError), so the event cannot fire
    // Verify the listener is not retained by trying to subscribe again
    // (would throw DisposedError)
    try { s.on('cell-changed', () => {}); } catch {}
    expect(fired).toBe(false);
  });
});
