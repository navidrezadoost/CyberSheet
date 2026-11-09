import { DeleteCellsCommand } from '../src/DeleteCellsCommand';
import { CommandManager } from '../src/CommandManager';
import { Worksheet } from '../src/worksheet';
import type { Address, Cell, CellValue, IFormulaEngine } from '../src/types';
import type { FormulaContext } from '../src/types/formula-types';

function referenceEngine(): IFormulaEngine {
  function evaluate(address: Address, getCell: (address: Address) => Cell | undefined): CellValue;
  function evaluate(formula: string, context: FormulaContext): CellValue;
  function evaluate(
    addressOrFormula: Address | string,
    source: ((address: Address) => Cell | undefined) | FormulaContext,
  ): CellValue {
    const formula = typeof addressOrFormula === 'string'
      ? addressOrFormula
      : (source as (address: Address) => Cell | undefined)(addressOrFormula)?.formula ?? '';
    const getCell = typeof source === 'function'
      ? source
      : (address: Address) => source.worksheet.getCell(address);
    const match = /^=\$?([A-Z]+)\$?(\d+)$/.exec(formula);
    if (!match) return null;
    let col = 0;
    for (const char of match[1]) col = col * 26 + char.charCodeAt(0) - 64;
    const value = getCell({ row: Number(match[2]), col })?.value;
    return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
      ? value
      : null;
  }
  return { evaluate };
}

function formulaSnapshot(worksheet: Worksheet, addresses: Array<{ row: number; col: number }>) {
  return addresses.map((address) => ({
    address,
    formula: worksheet.getCell(address)?.formula,
    value: worksheet.getCellValue(address),
    dependencies: worksheet.getPrecedents(address),
  }));
}

describe('P1-08K deletion formula-reference contract characterization', () => {
  test('row deletion preserves direct, absolute, and mixed reference text across replay', () => {
    const worksheet = new Worksheet('K03 row references', 6, 6, referenceEngine());
    worksheet.setCellValue({ row: 1, col: 1 }, 10);
    worksheet.setCellValue({ row: 2, col: 1 }, 20);
    worksheet.setCellValue({ row: 3, col: 1 }, 30);
    worksheet.setCellValue({ row: 4, col: 1 }, 40);
    worksheet.setCellFormula({ row: 5, col: 5 }, '=A3');
    worksheet.setCellFormula({ row: 5, col: 6 }, '=$A$3');
    worksheet.setCellFormula({ row: 6, col: 5 }, '=A$3');
    worksheet.setCellFormula({ row: 6, col: 6 }, '=$A3');
    worksheet.autoRecalculate();

    const formulaAddresses = [
      { row: 5, col: 5 }, { row: 5, col: 6 },
      { row: 6, col: 5 }, { row: 6, col: 6 },
    ];
    const postDeleteAddresses = [
      { row: 4, col: 5 }, { row: 4, col: 6 },
      { row: 5, col: 5 }, { row: 5, col: 6 },
    ];
    const before = formulaSnapshot(worksheet, formulaAddresses);
    const events: string[] = [];
    worksheet.on((event) => events.push(event.type));
    const manager = new CommandManager();
    manager.execute(new DeleteCellsCommand(
      worksheet,
      { start: { row: 2, col: 1 }, end: { row: 2, col: 6 } },
      'row',
    ));
    worksheet.autoRecalculate();
    const afterExecute = formulaSnapshot(worksheet, postDeleteAddresses);
    const executeEvents = events.slice();
    manager.undo();
    worksheet.autoRecalculate();
    const afterUndo = formulaSnapshot(worksheet, formulaAddresses);
    const undoEvents = events.slice(executeEvents.length);
    manager.redo();
    worksheet.autoRecalculate();
    const afterRedo = formulaSnapshot(worksheet, postDeleteAddresses);
    const redoEvents = events.slice(executeEvents.length + undoEvents.length);

    expect(before.map(({ formula }) => formula)).toEqual(['=A3', '=$A$3', '=A$3', '=$A3']);
    expect(before.map(({ value }) => value)).toEqual([30, 30, 30, 30]);
    expect(afterExecute.map(({ formula }) => formula)).toEqual(before.map(({ formula }) => formula));
    expect(afterExecute.map(({ value }) => value)).toEqual([40, 40, 40, 40]);
    expect(afterExecute.map(({ dependencies }) => dependencies)).toEqual(before.map(({ dependencies }) => dependencies));
    expect(afterUndo.map(({ formula }) => formula)).toEqual(before.map(({ formula }) => formula));
    expect(afterUndo.map(({ value }) => value)).toEqual([30, 30, 30, 30]);
    expect(afterRedo).toEqual(afterExecute);
    expect(executeEvents.length).toBeGreaterThan(0);
    expect(undoEvents.length).toBeGreaterThan(0);
    expect(redoEvents).toEqual(executeEvents);
  });

  test('column deletion preserves direct, absolute, and mixed reference text across replay', () => {
    const worksheet = new Worksheet('K03 column references', 4, 7, referenceEngine());
    for (let col = 1; col <= 5; col++) worksheet.setCellValue({ row: 1, col }, col * 10);
    worksheet.setCellFormula({ row: 3, col: 7 }, '=B1');
    worksheet.setCellFormula({ row: 4, col: 7 }, '=$B$1');
    worksheet.setCellFormula({ row: 3, col: 6 }, '=B$1');
    worksheet.setCellFormula({ row: 4, col: 6 }, '=$B1');
    worksheet.autoRecalculate();

    const formulaAddresses = [
      { row: 3, col: 6 }, { row: 3, col: 7 },
      { row: 4, col: 6 }, { row: 4, col: 7 },
    ];
    const postDeleteAddresses = [
      { row: 3, col: 5 }, { row: 3, col: 6 },
      { row: 4, col: 5 }, { row: 4, col: 6 },
    ];
    const before = formulaSnapshot(worksheet, formulaAddresses);
    const events: string[] = [];
    worksheet.on((event) => events.push(event.type));
    const manager = new CommandManager();
    manager.execute(new DeleteCellsCommand(
      worksheet,
      { start: { row: 1, col: 2 }, end: { row: 4, col: 2 } },
      'column',
    ));
    worksheet.autoRecalculate();
    const afterExecute = formulaSnapshot(worksheet, postDeleteAddresses);
    const executeEvents = events.slice();
    manager.undo();
    worksheet.autoRecalculate();
    const afterUndo = formulaSnapshot(worksheet, formulaAddresses);
    const undoEvents = events.slice(executeEvents.length);
    manager.redo();
    worksheet.autoRecalculate();
    const afterRedo = formulaSnapshot(worksheet, postDeleteAddresses);
    const redoEvents = events.slice(executeEvents.length + undoEvents.length);

    expect(before.map(({ formula }) => formula)).toEqual(['=B$1', '=B1', '=$B1', '=$B$1']);
    expect(before.map(({ value }) => value)).toEqual([20, 20, 20, 20]);
    expect(afterExecute.map(({ formula }) => formula)).toEqual(before.map(({ formula }) => formula));
    expect(afterExecute.map(({ value }) => value)).toEqual([30, 30, 30, 30]);
    expect(afterExecute.map(({ dependencies }) => dependencies)).toEqual(before.map(({ dependencies }) => dependencies));
    expect(afterUndo.map(({ formula }) => formula)).toEqual(before.map(({ formula }) => formula));
    expect(afterUndo.map(({ value }) => value)).toEqual([20, 20, 20, 20]);
    expect(afterRedo).toEqual(afterExecute);
    expect(executeEvents.length).toBeGreaterThan(0);
    expect(undoEvents.length).toBeGreaterThan(0);
    expect(redoEvents).toEqual(executeEvents);
  });
});
