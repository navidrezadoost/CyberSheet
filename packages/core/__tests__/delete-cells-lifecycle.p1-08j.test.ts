import { CommandManager } from '../src/CommandManager';
import { DeleteCellsCommand } from '../src/DeleteCellsCommand';
import { Worksheet } from '../src/worksheet';
import type { Address, Cell, CellValue, IFormulaEngine } from '../src/types';
import type { FormulaContext } from '../src/types/formula-types';

function createFormulaFixture(): Worksheet {
  const worksheet = new Worksheet('J02 formula lifecycle', 6, 3);
  function evaluate(address: Address, getCell: (addr: Address) => Cell | undefined): CellValue;
  function evaluate(formula: string, context: FormulaContext): CellValue;
  function evaluate(
    addressOrFormula: Address | string,
    source: ((addr: Address) => Cell | undefined) | FormulaContext,
  ): CellValue {
    const address = typeof addressOrFormula === 'string'
      ? (source as FormulaContext).currentCell
      : addressOrFormula;
    const formula = typeof addressOrFormula === 'string'
      ? addressOrFormula
      : (source as (addr: Address) => Cell | undefined)(address)?.formula ?? '';
    const getCell = typeof source === 'function'
      ? source
      : (addr: Address) => source.worksheet.getCell(addr);
    if (formula === '=A1+A2') {
      const first = getCell({ row: 1, col: 1 })?.value;
      const second = getCell({ row: 2, col: 1 })?.value;
      return (typeof first === 'number' ? first : 0) + (typeof second === 'number' ? second : 0);
    }
    if (formula === '=C3*2') {
      const precedent = getCell({ row: 3, col: 3 })?.value;
      return typeof precedent === 'number' ? precedent * 2 : null;
    }
    const value = getCell(address)?.value;
    return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
      ? value
      : null;
  }
  const formulaEngine: IFormulaEngine = { evaluate };
  worksheet.setFormulaEngine(formulaEngine);
  worksheet.setCellValue({ row: 1, col: 1 }, 1);
  worksheet.setCellValue({ row: 2, col: 1 }, 2);
  worksheet.setCellValue({ row: 3, col: 1 }, 3);
  worksheet.setCellFormula({ row: 3, col: 3 }, '=A1+A2', 333);
  worksheet.setCellFormula({ row: 4, col: 3 }, '=C3*2', 666);
  worksheet.autoRecalculate();
  // Reset to distinguishable historical caches after registering both formulas.
  worksheet.setCellFormula({ row: 3, col: 3 }, '=A1+A2', 333);
  worksheet.setCellFormula({ row: 4, col: 3 }, '=C3*2', 666);
  return worksheet;
}

function formulaState(worksheet: Worksheet) {
  return [2, 3, 4].map((row) => {
    const cell = worksheet.getCell({ row, col: 3 });
    return { row, formula: cell?.formula, value: cell?.value };
  });
}

describe('P1-08J deletion formula and event lifecycle characterization', () => {
  test('formula expressions and dependent values are observed across execute, undo, and redo', () => {
    const worksheet = createFormulaFixture();
    const manager = new CommandManager();
    const events: Array<{ type: string; address?: { row: number; col: number } }> = [];
    worksheet.on((event) => {
      events.push({ type: event.type, address: 'address' in event ? event.address : undefined });
    });
    const initial = formulaState(worksheet);
    manager.execute(new DeleteCellsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 3 } },
      'row',
    ));
    worksheet.autoRecalculate();
    const afterExecute = formulaState(worksheet);
    const executeEvents = events.slice();
    manager.undo();
    worksheet.autoRecalculate();
    const afterUndo = formulaState(worksheet);
    const undoEvents = events.slice(executeEvents.length);
    manager.redo();
    worksheet.autoRecalculate();
    const afterRedo = formulaState(worksheet);
    const redoEvents = events.slice(executeEvents.length + undoEvents.length);

    expect(initial).toEqual([
      { row: 2, formula: undefined, value: undefined },
      { row: 3, formula: '=A1+A2', value: 333 },
      { row: 4, formula: '=C3*2', value: 666 },
    ]);
    expect(afterExecute.map(({ value }) => value)).toEqual([5, '#CIRC!', null]);
    expect(afterExecute.map(({ formula }) => formula)).toEqual(['=A1+A2', '=C3*2', '']);
    expect(afterUndo.map(({ formula }) => formula)).toEqual([undefined, '=A1+A2', '=C3*2']);
    expect(afterUndo.map(({ value }) => value)).toEqual([null, 3, 6]);
    expect(afterRedo.map(({ formula }) => formula)).toEqual(afterExecute.map(({ formula }) => formula));
    expect(afterUndo.map(({ value }) => value)).not.toEqual(initial.map(({ value }) => value));
    expect(afterRedo).toEqual(afterExecute);
    expect(afterRedo.map(({ formula }) => formula)).toEqual(afterExecute.map(({ formula }) => formula));
    expect(executeEvents.length).toBeGreaterThan(0);
    expect(undoEvents.length).toBeGreaterThan(0);
    expect(redoEvents).toEqual(executeEvents);
    expect(manager.getHistorySize()).toEqual({ undoCount: 1, redoCount: 0 });
  });

  test('successful event type/address ordering is stable across repeated executions', () => {
    const run = () => {
      const worksheet = new Worksheet('J03 event order', 4, 4);
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 4; col++) worksheet.setCellValue({ row, col }, row * 10 + col);
      }
      const manager = new CommandManager();
      const eventOrder: string[] = [];
      const observedDuringEvents: unknown[] = [];
      worksheet.on((event) => {
        if (event.type !== 'cell-changed' && event.type !== 'style-changed') return;
        const address = 'address' in event ? event.address : undefined;
        eventOrder.push(`${event.type}:${address?.row ?? '-'}:${address?.col ?? '-'}`);
        observedDuringEvents.push(worksheet.getCellValue({ row: 2, col: 1 }));
      });
      manager.execute(new DeleteCellsCommand(
        worksheet,
        { start: { row: 2, col: 1 }, end: { row: 2, col: 4 } },
        'row',
      ));
      const executeOrder = eventOrder.slice();
      manager.undo();
      return { executeOrder, allOrder: eventOrder, observedDuringEvents };
    };

    const first = run();
    const second = run();
    expect(first).toEqual(second);
    expect(first.executeOrder.length).toBeGreaterThan(0);
    expect(new Set(first.observedDuringEvents).size).toBeGreaterThan(1);
  });
});
