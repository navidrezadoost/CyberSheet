/**
 * Transaction Enforcement Verification
 * 
 * Tests that all mutations go through transaction boundaries.
 */

import { Worksheet } from '../worksheet';

describe('Transaction Enforcement', () => {
  function createWorksheet() {
    const ws = new Worksheet('Sheet1', 100, 26);
    return ws;
  }

  test('Gate 0: setCellValue auto-wraps in transaction', () => {
    const ws = createWorksheet();
    
    const events: any[] = [];
    ws.on(e => events.push(e));

    // Single setCellValue call should emit exactly one event
    ws.setCellValue({ row: 0, col: 0 }, '10');
    
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('cell-changed');
  });

  test('Gate 4: runTransaction emits exactly one event', () => {
    const ws = createWorksheet();
    
    const events: any[] = [];
    ws.on(e => events.push(e));

    ws.runTransaction(() => {
      ws.setCellValue({ row: 0, col: 0 }, '1');
      ws.setCellValue({ row: 1, col: 0 }, '2');
      ws.setCellValue({ row: 2, col: 0 }, '3');
    });

    // Three setCellValue calls in one transaction = 1 emitted event
    expect(events.length).toBe(1);
  });

  test('Gate 4c: no events during transaction', () => {
    const ws = createWorksheet();
    
    const events: any[] = [];
    let sawEventDuringTransaction = false;

    ws.on(e => {
      if (ws.isTransactionActive()) {
        sawEventDuringTransaction = true;
      }
      events.push(e);
    });

    ws.runTransaction(() => {
      ws.setCellValue({ row: 0, col: 0 }, '1');
      ws.setCellValue({ row: 1, col: 0 }, '2');
    });

    expect(sawEventDuringTransaction).toBe(false);
    expect(events.length).toBe(1);
  });

  test('Spill mutations emit spill events', () => {
    const ws = createWorksheet();
    
    const events: any[] = [];
    ws.on(e => events.push(e));

    ws.setSpillSource({ row: 0, col: 0 }, { dimensions: [2, 2], endAddress: { row: 1, col: 1 } });
    
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('spill-source-changed');
    expect(events[0].after).toEqual({ dimensions: [2, 2], endAddress: { row: 1, col: 1 } });
  });

  test('Style mutations emit style events', () => {
    const ws = createWorksheet();
    
    const events: any[] = [];
    ws.on(e => events.push(e));

    ws.setCellStyle({ row: 0, col: 0 }, { bold: true });
    
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('style-changed');
  });

  test('Nested runTransaction is re-entrant', () => {
    const ws = createWorksheet();
    
    const events: any[] = [];
    ws.on(e => events.push(e));

    ws.runTransaction(() => {
      ws.setCellValue({ row: 0, col: 0 }, '1');
      
      ws.runTransaction(() => {
        ws.setCellValue({ row: 1, col: 0 }, '2');
      });
      
      ws.setCellValue({ row: 2, col: 0 }, '3');
    });

    // Nested transactions should coalesce into one event
    expect(events.length).toBe(1);
  });
});
