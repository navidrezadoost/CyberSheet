import { Workbook, Worksheet } from '../src';
import {
  getWorksheetCellWriteJournalStatusForTesting,
  getWorksheetDependencyGraphStateForTesting,
} from '../src/worksheet';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

function fixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 4 }] });
  const raw = workbook.createDevImportWorksheet('Edit', 4, 4) as Worksheet;
  raw.setCellValue({ row: 1, col: 1 }, 4);
  raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 5);
  raw.setCellStyle({ row: 1, col: 2 }, { bold: true });
  raw.completeScheduledRecalculation();
  workbook.attachDevImportSheet(raw);
  return { workbook, raw, view: workbook.getSheet('Edit')! };
}

function mergedFixture() {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 4, cols: 4 }] });
  const raw = workbook.createDevImportWorksheet('MergedEdit', 4, 4) as Worksheet;
  raw.setCellValue({ row: 1, col: 4 }, 9);
  raw.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
  raw.setCellFormula({ row: 1, col: 1 }, '=D1+1', 10);
  raw.setCellStyle({ row: 1, col: 1 }, { bold: true });
  raw.completeScheduledRecalculation();
  workbook.attachDevImportSheet(raw);
  return { workbook, raw, view: workbook.getSheet('MergedEdit')! };
}

function exactState(raw: Worksheet) {
  const cells: Array<{ row: number; col: number; cell: unknown }> = [];
  raw.forEachNonEmptyCell((row, col, cell) => cells.push({
    row,
    col,
    cell: cell && typeof cell === 'object' ? { ...cell } : cell,
  }));
  cells.sort((a, b) => a.row - b.row || a.col - b.col);
  return { cells, graph: getWorksheetDependencyGraphStateForTesting(raw) };
}

describe('PKG-17C immediate clear-operation rollback cuts', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['journal', 'snapshot'] as const)(
    '%s restores a formula cell and graph when clearCellContent fails after its cell-record write',
    async (strategy) => {
      const { workbook, raw, view } = fixture();
      const before = exactState(raw);
      const events: unknown[] = [];
      const subscription = view.on((event) => events.push(event));
      const injected = new Error(`${strategy} clearCellContent immediate cut`);
      let fired = false;
      const hooks = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (!fired && phase === 'after-cell-record') {
            fired = true;
            throw injected;
          }
        },
      });

      await expect(workbook.transact((tx) =>
        tx.clearCellContent(view, { row: 1, col: 2 }),
      )).rejects.toBe(injected);

      expect(fired).toBe(true);
      expect(exactState(raw)).toEqual(before);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
        active: false,
        cellBeforeImages: 0,
        graph: { active: false, structureKeys: [], dirtyKeys: [] },
      });
      hooks.dispose();
      subscription.dispose();
    },
  );

  test.each(['journal', 'snapshot'] as const)(
    '%s restores a formula cell and graph when clearCellFormula fails after its cell-record write',
    async (strategy) => {
      const { workbook, raw, view } = fixture();
      const before = exactState(raw);
      const events: unknown[] = [];
      const subscription = view.on((event) => events.push(event));
      const injected = new Error(`${strategy} clearCellFormula immediate cut`);
      let fired = false;
      const hooks = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (!fired && phase === 'after-cell-record') {
            fired = true;
            throw injected;
          }
        },
      });

      await expect(workbook.transact((tx) =>
        tx.clearCellFormula(view, { row: 1, col: 2 }),
      )).rejects.toBe(injected);

      expect(fired).toBe(true);
      expect(exactState(raw)).toEqual(before);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
        active: false,
        cellBeforeImages: 0,
        graph: { active: false, structureKeys: [], dirtyKeys: [] },
      });
      hooks.dispose();
      subscription.dispose();
    },
  );

  test.each([
    ['journal', 'clearCellContent'],
    ['snapshot', 'clearCellContent'],
    ['journal', 'clearCellFormula'],
    ['snapshot', 'clearCellFormula'],
  ] as const)(
    '%s restores the effective anchor and graph after %s through a merged member',
    async (strategy, operation) => {
      const { workbook, raw, view } = mergedFixture();
      const anchor = { row: 1, col: 1 };
      const member = { row: 2, col: 2 };
      const precedent = { row: 1, col: 4 };
      const before = exactState(raw);
      const events: unknown[] = [];
      const subscription = view.on((event) => events.push(event));
      const injected = new Error(`${strategy} ${operation} merged-member immediate cut`);
      let fired = false;
      const hooks = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (!fired && phase === 'after-cell-record') {
            fired = true;
            throw injected;
          }
        },
      });

      await expect(workbook.transact((tx) =>
        operation === 'clearCellContent'
          ? tx.clearCellContent(view, member)
          : tx.clearCellFormula(view, member),
      )).rejects.toBe(injected);

      expect(fired).toBe(true);
      expect(exactState(raw)).toEqual(before);
      expect(raw.getCell(anchor)).toMatchObject({ formula: '=D1+1', value: 10 });
      // Public reads resolve merged members to their anchor. The raw
      // forEachNonEmptyCell observation in exactState must contain no separate
      // stored record for the member coordinate.
      expect(raw.getCell(member)).toMatchObject({ formula: '=D1+1', value: 10 });
      expect(before.cells.some(({ row, col }) => row === member.row && col === member.col)).toBe(false);
      expect(raw.getPrecedents(anchor)).toEqual([precedent]);
      expect(raw.getPrecedents(member)).toEqual([]);
      expect(raw.getDependents(precedent)).toContainEqual(anchor);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
        active: false,
        cellBeforeImages: 0,
        graph: { active: false, structureKeys: [], dirtyKeys: [] },
      });
      hooks.dispose();
      subscription.dispose();
    },
  );

  test.each([
    ['journal', 'clearCellContent'],
    ['snapshot', 'clearCellContent'],
    ['journal', 'clearCellFormula'],
    ['snapshot', 'clearCellFormula'],
  ] as const)(
    '%s treats %s on an absent cell as a no-op without reaching after-cell-record',
    async (strategy, operation) => {
      const { workbook, raw, view } = fixture();
      const absent = { row: 3, col: 3 };
      const before = exactState(raw);
      const events: unknown[] = [];
      const subscription = view.on((event) => events.push(event));
      let fired = false;
      const hooks = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-cell-record') fired = true;
        },
      });

      await workbook.transact((tx) =>
        operation === 'clearCellContent'
          ? tx.clearCellContent(view, absent)
          : tx.clearCellFormula(view, absent),
      );

      expect(fired).toBe(false);
      expect(exactState(raw)).toEqual(before);
      expect(raw.getCell(absent)).toBeUndefined();
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      expect(getWorksheetCellWriteJournalStatusForTesting(raw)).toEqual({
        active: false,
        cellBeforeImages: 0,
        graph: { active: false, structureKeys: [], dirtyKeys: [] },
      });
      hooks.dispose();
      subscription.dispose();
    },
  );
});
