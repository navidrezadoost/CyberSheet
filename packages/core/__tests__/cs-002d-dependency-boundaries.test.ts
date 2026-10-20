import { FormulaEngine } from '../src/FormulaEngine';
import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { SnapshotCodec } from '../src/persistence/SnapshotCodec';
import { extractFormulaDependencies } from '../src/utils/formula-reference-extractor';
import { packKey, unpackKey } from '../src/storage/CellStoreV1';
import { TransactionContext } from '../src/transaction/TransactionContext';

const A1 = { row: 1, col: 1 };
const B1 = { row: 1, col: 2 };
const C1 = { row: 1, col: 3 };

describe('CS-002D dependency identity and boundaries', () => {
  it('exposes stable sheet identities through read-only workbook views', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const first = Workbook.create({ sheets: [{ name: 'Data' }, { name: 'Keep' }] });
      const second = Workbook.create({ sheets: [{ name: 'Data' }] });
      const one = first.getSheet('Data')!;
      const two = second.getSheet('Data')!;
      const oldId = one.getWorksheetId();

      expect(two.getWorksheetId()).not.toBe(oldId);
      expect(first.getSheet('Data')!.getWorksheetId()).toBe(oldId);
      expect('extractSnapshot' in one).toBe(false);
      expect('applySnapshot' in one).toBe(false);
      expect(() => first.renameSheet('Data', 'Renamed')).toThrow(/unavailable/);
      expect(() => first.deleteSheet('Data')).toThrow(/unavailable/);
      expect(first.getSheetNames()).toEqual(['Data', 'Keep']);
    } finally {
      now.mockRestore();
    }
  });

  it('keeps qualified references out of the local coordinate graph', () => {
    expect(extractFormulaDependencies('=Other!A1+A1+\'Other Data\'!B1:C3', A1)).toEqual({
      cells: [{ row: 0, col: 0 }],
      ranges: [],
    });
    const local = new Worksheet('Local');
    local.setCellFormula(C1, '=Other!A1+B1');
    expect(local.getPrecedents(C1)).toEqual([B1]);
    expect(local.getDependents(A1)).toEqual([]);
    expect(local.getDependents(B1)).toEqual([C1]);
  });

  it('keeps identical coordinates on separate standalone worksheets isolated', () => {
    const left = new Worksheet('Data', 20, 10, new FormulaEngine() as any);
    const right = new Worksheet('Other', 20, 10, new FormulaEngine() as any);
    const external = new Worksheet('Data', 20, 10, new FormulaEngine() as any);
    for (const ws of [left, right, external]) {
      ws.setFormulaEngine(new FormulaEngine() as any);
      ws.setCellValue(A1, 1);
      ws.setCellFormula(B1, '=A1+1');
      ws.autoRecalculate();
    }
    left.setCellValue(A1, 2);
    expect(left.isDirty(B1)).toBe(true);
    expect(right.isDirty(B1)).toBe(false);
    expect(external.isDirty(B1)).toBe(false);
  });

  it('invalidates overlapping and nested range watchers at interior and inclusive boundaries', () => {
    const ws = new Worksheet('Ranges', 20, 10, new FormulaEngine() as any);
    const outer = { row: 1, col: 5 };
    const inner = { row: 2, col: 5 };
    ws.setCellFormula(outer, '=SUM(A1:C4)');
    ws.setCellFormula(inner, '=SUM(B2:C3)');
    ws.autoRecalculate();

    ws.setCellValue({ row: 2, col: 2 }, 7);
    expect(ws.isDirty(outer)).toBe(true);
    expect(ws.isDirty(inner)).toBe(true);
    ws.autoRecalculate();
    ws.setCellValue({ row: 4, col: 3 }, 8);
    expect(ws.isDirty(outer)).toBe(true);
    expect(ws.isDirty(inner)).toBe(false);
    ws.autoRecalculate();
    ws.setCellValue({ row: 5, col: 3 }, 9);
    expect(ws.isDirty(outer)).toBe(false);
    expect(ws.isDirty(inner)).toBe(false);
  });

  it('reconstructs compact range watchers after binary snapshot restore', () => {
    const ws = new Worksheet('Snapshot', 20, 10, new FormulaEngine() as any);
    ws.setCellFormula(C1, '=SUM(A1:B3)');
    ws.autoRecalculate();
    const snapshot = new SnapshotCodec().decode(new SnapshotCodec().encode(ws.extractSnapshot()));
    ws.applySnapshot(snapshot);
    ws.autoRecalculate();
    ws.setCellValue({ row: 2, col: 2 }, 4);
    expect(ws.isDirty(C1)).toBe(true);
    ws.autoRecalculate();
    expect(ws.getCellValue(C1)).toBe(4);
  });

  it('removes obsolete range watchers on replacement and relocation', () => {
    const ws = new Worksheet('Lifecycle', 20, 10, new FormulaEngine() as any);
    ws.setCellFormula(C1, '=SUM(A1:A3)');
    ws.autoRecalculate();
    ws.setCellFormula(C1, '=B1');
    ws.autoRecalculate();
    ws.setCellValue({ row: 2, col: 1 }, 7);
    expect(ws.isDirty(C1)).toBe(false);
    ws.setCellValue(B1, 8);
    expect(ws.isDirty(C1)).toBe(true);
    ws.autoRecalculate();
    ws.clearCellFormula(C1);
    ws.autoRecalculate();
    ws.setCellValue(B1, 9);
    expect(ws.isDirty(C1)).toBe(false);

    ws.setCellFormula(C1, '=SUM(A1:A3)');
    ws.autoRecalculate();
    ws.insertRows(0, 1);
    ws.autoRecalculate();
    const movedFormula = { row: 2, col: 3 };
    ws.setCellValue({ row: 3, col: 1 }, 11);
    expect(ws.isDirty(movedFormula)).toBe(true);
    ws.autoRecalculate();
    expect(ws.getCellValue(movedFormula)).toBe(11);
  });

  it('restores range watchers after transaction rollback', () => {
    const ws = new Worksheet('Rollback', 20, 10, new FormulaEngine() as any);
    ws.setCellFormula(C1, '=SUM(A1:A3)');
    ws.autoRecalculate();
    const transaction = new TransactionContext(ws);
    ws.setCellFormula(C1, '=B1');
    transaction.rollback();
    ws.autoRecalculate();
    expect(ws.getCell(C1)?.formula).toBe('=SUM(A1:A3)');
    ws.setCellValue({ row: 2, col: 1 }, 5);
    expect(ws.isDirty(C1)).toBe(true);
    ws.autoRecalculate();
    expect(ws.getCellValue(C1)).toBe(5);
  });

  it('rejects invalid public coordinates and packed-key aliases', () => {
    const ws = new Worksheet('Bounds');
    for (const addr of [
      { row: 0, col: 1 }, { row: -1, col: 1 }, { row: 1048577, col: 1 },
      { row: 1, col: 0 }, { row: 1, col: -1 }, { row: 1, col: 16385 },
    ]) {
      expect(() => ws.getCell(addr)).toThrow(RangeError);
      expect(() => ws.getPrecedents(addr)).toThrow(RangeError);
      expect(() => ws.getDependents(addr)).toThrow(RangeError);
      expect(() => ws.isDirty(addr)).toThrow(RangeError);
      expect(() => ws.notifyChanged(addr)).toThrow(RangeError);
    }
    expect(unpackKey(packKey(1048576, 16384))).toEqual({ row: 1048576, col: 16384 });
    expect(() => packKey(1, 20001)).toThrow(RangeError);
    expect(() => packKey(1048577, 1)).toThrow(RangeError);
  });

  it('rejects malformed graph snapshots before replacing live cells', () => {
    const ws = new Worksheet('SnapshotBounds');
    ws.setCellValue(A1, 12);
    const snapshot = ws.extractSnapshot();
    snapshot.dagEdges.push({ row: 1, col: 2, deps: [{ row: 0, col: 1 }] });
    expect(() => ws.applySnapshot(snapshot)).toThrow(RangeError);
    expect(ws.getCellValue(A1)).toBe(12);
    snapshot.dagEdges.pop();
    snapshot.cells.push({ row: 1, col: 20001, cell: { value: 3 } });
    expect(() => ws.applySnapshot(snapshot)).toThrow(RangeError);
    expect(ws.getCellValue(A1)).toBe(12);
  });
});
