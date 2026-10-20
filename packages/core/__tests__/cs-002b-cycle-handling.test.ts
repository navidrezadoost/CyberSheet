import { FormulaEngine } from '../src/FormulaEngine';
import { SpreadsheetEngine } from '../src/SpreadsheetEngine';
import { packKey, RecalcCoordinator, DependencyGraph } from '../src/dag/DependencyGraph';
import { TransactionContext } from '../src/transaction/TransactionContext';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

const a = (row: number, col: number): Address => ({ row, col });

describe('CS-002B circular reference policy (iteration disabled)', () => {
  it.each([
    ['direct self reference', a(1, 1), '=A1-3'],
    ['mutual references', a(1, 1), '=B1+1'],
    ['self-inclusive range', a(1, 1), '=SUM(A1:A2)'],
  ])('writes #CIRC! for %s and propagates it to downstream formulas', (_label, first, formula) => {
    const ws = new Worksheet('Cycles', 20, 20, new FormulaEngine() as any);
    ws.setCellFormula(first, formula as string);
    if (formula === '=B1+1') ws.setCellFormula(a(1, 2), '=A1+1');
    ws.setCellFormula(a(1, 3), '=A1+10');
    ws.setCellValue(a(1, 5), 4);
    ws.setCellFormula(a(1, 4), '=E1+1');

    const result = ws.autoRecalculate();
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(ws.getCellValue(first)).toBe('#CIRC!');
    expect(ws.getCellValue(a(1, 3))).toBe('#CIRC!');
    expect(ws.getCellValue(a(1, 4))).toBe(5);
  });

  it('handles a cycle and downstream formula through SpreadsheetEngine, then recovers when broken', async () => {
    const engine = new SpreadsheetEngine();
    const events: any[] = [];
    const ws = (engine as any)._ws as Worksheet;
    ws.on((event) => events.push(event));

    await engine.run((sheet) => {
      sheet.setCellFormula(a(1, 1), '=B1+1');
      sheet.setCellFormula(a(1, 2), '=A1+1');
      sheet.setCellFormula(a(1, 3), '=A1*2');
      sheet.setCellValue(a(1, 5), 4);
      sheet.setCellFormula(a(1, 4), '=E1+1');
    });
    expect([engine.getCellValue(a(1, 1)), engine.getCellValue(a(1, 2)), engine.getCellValue(a(1, 3)), engine.getCellValue(a(1, 4))])
      .toEqual(['#CIRC!', '#CIRC!', '#CIRC!', 5]);
    expect(events.filter((e) => e.origin === 'formula-result').map((e) => e.cell.value).sort())
      .toEqual(['#CIRC!', '#CIRC!', '#CIRC!', 5].sort());

    await engine.run((sheet) => {
      sheet.setCellValue(a(1, 1), 10);
      sheet.setCellFormula(a(1, 2), '=A1+1');
    });
    expect([engine.getCellValue(a(1, 1)), engine.getCellValue(a(1, 2)), engine.getCellValue(a(1, 3))]).toEqual([10, 11, 20]);
  });

  it('expands an existing cycle, emits derived results, then recovers through the scheduler', async () => {
    const engine = new SpreadsheetEngine('ExpandedCycle');
    const ws = (engine as any)._ws as Worksheet;
    const events: any[] = [];
    ws.on((event) => events.push(event));

    await engine.run((sheet) => {
      sheet.setCellFormula(a(1, 1), '=B1+1');
      sheet.setCellFormula(a(1, 2), '=A1+1');
      sheet.setCellFormula(a(1, 3), '=1+1');
      sheet.setCellFormula(a(1, 4), '=C1+1');
    });
    expect([1, 2, 3, 4].map((col) => engine.getCellValue(a(1, col))))
      .toEqual(['#CIRC!', '#CIRC!', 2, 3]);

    events.length = 0;
    await engine.run((sheet) => {
      sheet.setCellFormula(a(1, 2), '=C1+1');
      sheet.setCellFormula(a(1, 3), '=A1+1');
    });
    expect([1, 2, 3, 4].map((col) => engine.getCellValue(a(1, col))))
      .toEqual(['#CIRC!', '#CIRC!', '#CIRC!', '#CIRC!']);
    expect(events.filter((event) => event.origin === 'formula-result')
      .map((event) => [event.address.row, event.address.col, event.cell.value]))
      .toEqual([[1, 3, '#CIRC!'], [1, 4, '#CIRC!']]);

    events.length = 0;
    await engine.run((sheet) => sheet.setCellValue(a(1, 1), 10));
    expect([1, 2, 3, 4].map((col) => engine.getCellValue(a(1, col))))
      .toEqual([10, 12, 11, 12]);
    expect(events.filter((event) => event.origin === 'formula-result')
      .map((event) => event.cell.value).sort())
      .toEqual([11, 12, 12].sort());
  });

  it('persists circular cache values in snapshots and restores graph/value on rollback', () => {
    const ws = new Worksheet('SnapshotCycle', 20, 20, new FormulaEngine() as any);
    ws.setCellFormula(a(1, 1), '=A1+1');
    ws.setCellFormula(a(1, 2), '=A1*2');
    ws.autoRecalculate();
    expect(ws.getCellValue(a(1, 1))).toBe('#CIRC!');
    expect(ws.getCellValue(a(1, 2))).toBe('#CIRC!');

    const restored = new Worksheet('RestoredCycle', 20, 20, new FormulaEngine() as any);
    restored.applySnapshot(ws.extractSnapshot());
    expect(restored.getCellValue(a(1, 1))).toBe('#CIRC!');
    expect(restored.autoRecalculate().cycles).toHaveLength(1);
    expect(restored.getCellValue(a(1, 2))).toBe('#CIRC!');
    const unchangedEvents: any[] = [];
    restored.on((event) => unchangedEvents.push(event));
    restored.autoRecalculate();
    expect(unchangedEvents.filter((event) => event.origin === 'formula-result')).toHaveLength(0);

    const tx = new TransactionContext(ws);
    ws.setCellFormula(a(1, 1), '=7');
    ws.autoRecalculate();
    expect(ws.getCellValue(a(1, 1))).toBe(7);
    expect(ws.getCellValue(a(1, 2))).toBe(14);
    tx.rollback();
    expect(ws.getCell(a(1, 1))?.formula).toBe('=A1+1');
    expect(ws.getCellValue(a(1, 1))).toBe('#CIRC!');
    expect(ws.getPrecedents(a(1, 1))).toEqual([a(1, 1)]);
  });

  it('keeps a listener edit dirty when a formula result changes from circular error to a value', () => {
    const ws = new Worksheet('DeferredCycleEvent', 20, 20, new FormulaEngine() as any);
    ws.setCellFormula(a(1, 1), '=A1+1');
    ws.autoRecalculate();
    ws.setCellValue(a(1, 1), 1);
    ws.setCellFormula(a(1, 2), '=A1*2');
    let changed = false;
    ws.on((event: any) => {
      if (!changed && event.origin === 'formula-result' && event.address.row === 1 && event.address.col === 2) {
        changed = true;
        ws.setCellValue(a(1, 1), 2);
      }
    });

    ws.autoRecalculate();
    expect(ws.getCellValue(a(1, 2))).toBe(2);
    expect(ws.isDirty(a(1, 2))).toBe(true);
    ws.autoRecalculate();
    expect(ws.getCellValue(a(1, 2))).toBe(4);
  });

  it('publishes engine results after completion so a listener can schedule the next transaction', async () => {
    const engine = new SpreadsheetEngine();
    const ws = (engine as any)._ws as Worksheet;
    let scheduled: Promise<void> | undefined;
    let dirtyDuringListener = false;
    let reentered = false;
    ws.on((event: any) => {
      if (reentered || event.origin !== 'formula-result' || event.address.row !== 1 || event.address.col !== 2) return;
      reentered = true;
      scheduled = engine.run((sheet) => sheet.setCellValue(a(1, 1), 2));
      dirtyDuringListener = ws.isDirty(a(1, 2));
    });

    await engine.run((sheet) => {
      sheet.setCellValue(a(1, 1), 1);
      sheet.setCellFormula(a(1, 2), '=A1*2');
    });
    expect(dirtyDuringListener).toBe(true);
    await scheduled;
    expect(engine.getCellValue(a(1, 2))).toBe(4);
    expect(ws.isDirty(a(1, 2))).toBe(false);
  });
});

describe('CS-002B worksheet coordinate bounds', () => {
  it('rejects coordinates outside Excel bounds before graph key registration', () => {
    const coordinator = new RecalcCoordinator(new DependencyGraph());
    expect(() => coordinator.registerFormula(0, 1, [])).toThrow(RangeError);
    expect(() => coordinator.registerFormula(1, 0, [])).toThrow(RangeError);
    expect(() => coordinator.registerFormula(1, 16_385, [])).toThrow(RangeError);
    expect(() => coordinator.notifyChanged(1_048_577, 1)).toThrow(RangeError);
    expect(() => coordinator.notifyChanged(1, 16_385)).toThrow(RangeError);

    const ws = new Worksheet('Bounds', 1_048_576, 16_384, new FormulaEngine() as any);
    expect(() => ws.setCellFormula(a(0, 1), '=1')).toThrow(RangeError);
    expect(() => ws.setCellFormula(a(1, 16_385), '=1')).toThrow(RangeError);
    expect(packKey(1_048_576, 16_384)).toBe(20_971_536_384);
    expect(Number.isSafeInteger(packKey(1_048_576, 16_384))).toBe(true);
    expect(packKey(1, 16_384)).not.toBe(packKey(2, 1));
  });
});
