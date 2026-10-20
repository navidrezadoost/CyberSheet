import { FormulaEngine } from '../src/FormulaEngine';
import { SpreadsheetEngine } from '../src/SpreadsheetEngine';
import { TransactionContext } from '../src/transaction/TransactionContext';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

const A1: Address = { row: 1, col: 1 };
const B1: Address = { row: 1, col: 2 };
const C1: Address = { row: 1, col: 3 };
const D1: Address = { row: 1, col: 4 };

describe('CS-002A one-based coordinate and dependency contract', () => {
  it('recalculates A1 → B1 → C1 directly and records one-based graph edges', () => {
    const formulaEngine = new FormulaEngine();
    const originalEvaluate = formulaEngine.evaluate.bind(formulaEngine);
    const evaluate = jest.spyOn(formulaEngine, 'evaluate');
    const inputTrace: unknown[] = [];
    (evaluate as jest.Mock).mockImplementation((formula: string, context: any) => {
      inputTrace.push({
        formula,
        currentCell: { row: context.currentCell.row, col: context.currentCell.col },
        inputs: { A1: context.worksheet.getCellValue(A1), B1: context.worksheet.getCellValue(B1) },
      });
      return originalEvaluate(formula, context);
    });
    const ws = new Worksheet('Direct', 100, 26, formulaEngine as any);
    const events: unknown[] = [];
    ws.on((event) => events.push(event));

    ws.setCellValue(A1, 10);
    ws.setCellFormula(B1, '=A1*2');
    ws.setCellFormula(C1, '=B1+5');
    expect(ws.getPrecedents(B1)).toEqual([A1]);
    expect(ws.getPrecedents(C1)).toEqual([B1]);
    expect(ws.getRecalculationPlan().addresses).toEqual([B1, C1]);

    events.length = 0;
    const resultOnlyTransaction = new TransactionContext(ws);
    ws.autoRecalculate();
    expect(resultOnlyTransaction.commit().patch.ops).toHaveLength(0);
    expect([ws.getCellValue(A1), ws.getCellValue(B1), ws.getCellValue(C1)]).toEqual([10, 20, 25]);
    // The scheduler visits B1 then C1. FormulaEngine's evaluator also
    // recursively re-evaluates referenced formula cells, so C1's evaluation
    // invokes B1's formula once more.
    expect(evaluate.mock.calls.map(([formula]) => formula)).toEqual(['=A1*2', '=B1+5', '=A1*2']);
    expect(inputTrace).toEqual([
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 10, B1: null } },
      { formula: '=B1+5', currentCell: C1, inputs: { A1: 10, B1: 20 } },
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 10, B1: 20 } },
    ]);
    expect(events.filter((event: any) => event.type === 'cell-changed' && event.address.col > 1)).toHaveLength(2);
    expect(events.filter((event: any) => event.origin === 'formula-result')).toHaveLength(2);
    expect(ws.dagStats.edges).toBe(2);
    expect(ws.dirtyCount).toBe(0);
    const completedEventCount = events.length;
    ws.autoRecalculate();
    expect(events).toHaveLength(completedEventCount);

    events.length = 0;
    ws.setCellValue(A1, 50);
    expect(ws.getRecalculationPlan().addresses).toEqual([B1, C1]);
    expect(ws.isDirty(B1)).toBe(true);
    expect(ws.isDirty(C1)).toBe(true);
    ws.autoRecalculate();
    expect([ws.getCellValue(A1), ws.getCellValue(B1), ws.getCellValue(C1)]).toEqual([50, 100, 105]);
    expect(evaluate.mock.calls.slice(3).map(([formula]) => formula)).toEqual(['=A1*2', '=B1+5', '=A1*2']);
    expect(inputTrace.slice(3)).toEqual([
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 50, B1: 20 } },
      { formula: '=B1+5', currentCell: C1, inputs: { A1: 50, B1: 100 } },
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 50, B1: 100 } },
    ]);
    expect(events.some((event: any) => event.type === 'cell-changed' && event.address.row === 1 && event.address.col === 2)).toBe(true);
  });

  it('recalculates the same chain through SpreadsheetEngine and emits post-compute events', async () => {
    const engine = new SpreadsheetEngine();
    const engineFormulaEngine = (engine as any)._formulaEngine as FormulaEngine;
    const originalEvaluate = engineFormulaEngine.evaluate.bind(engineFormulaEngine);
    const evaluate = jest.spyOn(engineFormulaEngine, 'evaluate');
    const inputTrace: unknown[] = [];
    (evaluate as jest.Mock).mockImplementation((formula: string, context: any) => {
      inputTrace.push({
        formula,
        currentCell: { row: context.currentCell.row, col: context.currentCell.col },
        inputs: { A1: context.worksheet.getCellValue(A1), B1: context.worksheet.getCellValue(B1) },
      });
      return originalEvaluate(formula, context);
    });
    const events: Array<{ type: string; payload: any }> = [];
    engine.on('cellsChanged', (payload) => events.push({ type: 'cellsChanged', payload }));
    engine.on('formulasEvaluated', (payload) => events.push({ type: 'formulasEvaluated', payload }));
    const ws = (engine as any)._ws as Worksheet;

    await engine.run((sheet) => {
      sheet.setCellValue(A1, 10);
      sheet.setCellFormula(B1, '=A1*2');
      sheet.setCellFormula(C1, '=B1+5');
    });
    expect(ws.getPrecedents(B1)).toEqual([A1]);
    expect(ws.getPrecedents(C1)).toEqual([B1]);
    expect([engine.getCellValue(A1), engine.getCellValue(B1), engine.getCellValue(C1)]).toEqual([10, 20, 25]);
    expect(engine.metrics.completed).toBe(2);
    expect((engine as any)._scheduler.generation).toBe(1);
    expect(events.map((event) => event.type)).toEqual(['cellsChanged', 'formulasEvaluated']);
    expect(events[1].payload).toMatchObject({ count: 2, hasCycles: false });
    expect(inputTrace).toEqual([
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 10, B1: null } },
      { formula: '=B1+5', currentCell: C1, inputs: { A1: 10, B1: 20 } },
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 10, B1: 20 } },
    ]);

    engine.resetMetrics();
    events.length = 0;
    await engine.run((sheet) => sheet.setCellValue(A1, 50));
    expect([engine.getCellValue(A1), engine.getCellValue(B1), engine.getCellValue(C1)]).toEqual([50, 100, 105]);
    expect(engine.metrics.completed).toBe(2);
    expect((engine as any)._scheduler.generation).toBe(2);
    expect(events[1].payload).toMatchObject({ count: 2, hasCycles: false });
    expect(inputTrace.slice(3)).toEqual([
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 50, B1: 20 } },
      { formula: '=B1+5', currentCell: C1, inputs: { A1: 50, B1: 100 } },
      { formula: '=A1*2', currentCell: B1, inputs: { A1: 50, B1: 100 } },
    ]);
  });

  it('removes obsolete edges when a formula is replaced or cleared', () => {
    const ws = new Worksheet('Edges', 20, 20, new FormulaEngine() as any);
    ws.setCellFormula(C1, '=A1+B1');
    expect(ws.getPrecedents(C1)).toEqual([A1, B1]);
    ws.setCellValue(C1, 7);
    expect(ws.getPrecedents(C1)).toEqual([]);
    expect(ws.getDependents(A1)).toEqual([]);

    ws.setCellFormula(C1, '=B1*3');
    expect(ws.getPrecedents(C1)).toEqual([B1]);
    ws.clearCellFormula(C1);
    expect(ws.getPrecedents(C1)).toEqual([]);
    expect(ws.getDependents(B1)).toEqual([]);
  });

  it('rebuilds one-based dependencies when a worksheet snapshot is applied', () => {
    const source = new Worksheet('SnapshotSource', 20, 20, new FormulaEngine() as any);
    source.setCellValue(A1, 10);
    source.setCellFormula(B1, '=A1*2');
    source.autoRecalculate();

    const restored = new Worksheet('SnapshotRestored', 20, 20, new FormulaEngine() as any);
    restored.applySnapshot(source.extractSnapshot());
    expect(restored.getPrecedents(B1)).toEqual([A1]);
    restored.setCellValue(A1, 50);
    restored.autoRecalculate();
    expect(restored.getCellValue(B1)).toBe(100);
  });

  it('flushes formula-result events after clearing dirty state so reentrant edits remain pending', () => {
    const ws = new Worksheet('ReentrantResultEvent', 20, 20, new FormulaEngine() as any);
    ws.setCellValue(A1, 1);
    ws.setCellFormula(B1, '=A1*2');
    let reentered = false;
    ws.on((event: any) => {
      if (!reentered && event.type === 'cell-changed' && event.address.row === B1.row && event.address.col === B1.col) {
        reentered = true;
        ws.setCellValue(A1, 2);
      }
    });

    ws.autoRecalculate();
    expect(reentered).toBe(true);
    expect(ws.getCellValue(B1)).toBe(2);
    expect(ws.isDirty(B1)).toBe(true);
    expect(ws.dagStats.edges).toBe(1);

    ws.autoRecalculate();
    expect(ws.getCellValue(B1)).toBe(4);
    expect(ws.isDirty(B1)).toBe(false);
    expect(ws.dagStats.edges).toBe(1);
  });

  it('restores formula edges when a transaction rolls back', () => {
    const ws = new Worksheet('Rollback', 20, 20, new FormulaEngine() as any);
    ws.setCellFormula(C1, '=A1+B1');
    const tx = new TransactionContext(ws);
    ws.setCellFormula(C1, '=D1*2');
    expect(ws.getPrecedents(C1)).toEqual([D1]);
    tx.rollback();
    expect(ws.getCell(C1)?.formula).toBe('=A1+B1');
    expect(ws.getPrecedents(C1)).toEqual([A1, B1]);
  });

  it('orders a diamond after both branches and watches interior range edits', () => {
    const formulaEngine = new FormulaEngine();
    const evaluate = jest.spyOn(formulaEngine, 'evaluate');
    const ws = new Worksheet('DiamondAndRange', 20, 20, formulaEngine as any);
    ws.setCellValue(A1, 1);
    ws.setCellFormula(B1, '=A1+1');
    ws.setCellFormula(C1, '=A1+2');
    ws.setCellFormula(D1, '=B1+C1');
    ws.autoRecalculate();
    expect(ws.getCellValue(D1)).toBe(5);
    expect(evaluate.mock.calls.slice(0, 3).map(([formula]) => formula)).toEqual(['=A1+1', '=A1+2', '=B1+C1']);

    const rangeTotal: Address = { row: 6, col: 1 };
    ws.setCellFormula(rangeTotal, '=SUM(A1:A5)');
    ws.autoRecalculate();
    ws.setCellValue({ row: 3, col: 1 }, 9); // Interior A3
    expect(ws.getRecalculationPlan().addresses).toEqual([rangeTotal]);
    ws.autoRecalculate();
    expect(ws.getCellValue(rangeTotal)).toBe(10);
  });

  it('does not evaluate unrelated formulas and preserves maximum Excel coordinates', () => {
    const formulaEngine = new FormulaEngine();
    const evaluate = jest.spyOn(formulaEngine, 'evaluate');
    const ws = new Worksheet('SparseCoordinates', 1_048_576, 16_384, formulaEngine as any);
    const unrelatedFormula: Address = { row: 5, col: 5 };
    ws.setCellFormula(unrelatedFormula, '=1+2');
    ws.autoRecalculate();
    evaluate.mockClear();

    ws.setCellValue({ row: 10, col: 10 }, 3);
    expect(ws.getRecalculationPlan().addresses).toEqual([]);
    ws.autoRecalculate();
    expect(evaluate).not.toHaveBeenCalled();

    const max: Address = { row: 1_048_576, col: 16_384 };
    ws.setCellValue(max, 42);
    ws.setCellFormula(A1, '=XFD1048576');
    expect(ws.getPrecedents(A1)).toEqual([max]);
    ws.autoRecalculate();
    expect(ws.getCellValue(A1)).toBe(42);
  });

  it('detects a cycle deterministically and does not silently evaluate cycle nodes', () => {
    const ws = new Worksheet('Cycle', 20, 20, new FormulaEngine() as any);
    ws.setCellFormula(A1, '=B1+1');
    ws.setCellFormula(B1, '=A1+1');
    const first = ws.getRecalculationPlan();
    const second = ws.getRecalculationPlan();
    expect(first.addresses).toEqual([]);
    expect(first.cycles).toEqual(second.cycles);
    expect(first.cycles).toHaveLength(1);
    expect(first.cycles[0].cells).toEqual([A1, B1]);
    expect(ws.autoRecalculate().cycles).toEqual(first.cycles);
  });
});
