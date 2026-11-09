import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { getWorksheetCellWriteJournalStatusForTesting } from '../src/worksheet';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';
type BenchOp =
  | { kind: 'setCellValue'; sheet: 'Alpha' | 'Beta'; row: number; col: number; value: number }
  | { kind: 'setCellFormula'; sheet: 'Alpha' | 'Beta'; row: number; col: number; formula: string }
  | { kind: 'clearCellContent'; sheet: 'Alpha' | 'Beta'; row: number; col: number }
  | { kind: 'clearCellFormula'; sheet: 'Alpha' | 'Beta'; row: number; col: number }
  | { kind: 'setCellStyle'; sheet: 'Alpha' | 'Beta'; row: number; col: number; style: { bold: boolean; italic: boolean } }
  | { kind: 'setRowHeight'; sheet: 'Alpha' | 'Beta'; row: number; heightPx: number }
  | { kind: 'setColumnWidth'; sheet: 'Alpha' | 'Beta'; column: number; widthPx: number };

function seededOps(seed: number, rows: number, cols: number): BenchOp[] {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const ops: BenchOp[] = [];
  for (let index = 0; index < 70; index++) {
    const sheet = index % 2 === 0 ? 'Alpha' : 'Beta';
    const row = 1 + (next() % Math.min(rows, 40));
    const col = 1 + (next() % Math.min(cols, 12));
    switch (index % 7) {
      case 0: ops.push({ kind: 'setCellValue', sheet, row, col, value: next() % 1000 }); break;
      case 1: ops.push({ kind: 'setCellFormula', sheet, row, col, formula: `=A${Math.max(1, row - 1)}+1` }); break;
      case 2: ops.push({ kind: 'clearCellContent', sheet, row, col }); break;
      case 3: ops.push({ kind: 'clearCellFormula', sheet, row, col }); break;
      case 4: ops.push({ kind: 'setCellStyle', sheet, row, col, style: { bold: (next() & 1) === 0, italic: (next() & 1) === 0 } }); break;
      case 5: ops.push({ kind: 'setRowHeight', sheet, row: 1 + (next() % Math.min(rows, 10)), heightPx: 20 + (next() % 30) }); break;
      case 6: ops.push({ kind: 'setColumnWidth', sheet, column: 1 + (next() % Math.min(cols, 8)), widthPx: 80 + (next() % 80) }); break;
    }
  }
  return ops;
}

function makeWorkbook(strategy: Strategy, size: 'small' | 'large') {
  const rows = size === 'small' ? 20 : 1000;
  const cols = size === 'small' ? 12 : 30;
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 1, cols: 1 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', rows, cols) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', rows, cols) as Worksheet;
  const populatedRows = size === 'small' ? 4 : 80;
  const populatedCols = size === 'small' ? 4 : 25;
  for (let row = 1; row <= populatedRows; row++) {
    for (let col = 1; col <= populatedCols; col++) {
      alphaRaw.setCellValue({ row, col }, row * 100 + col);
      betaRaw.setCellValue({ row, col }, row * 200 + col);
    }
  }
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  const alpha = workbook.getSheet('Alpha')!;
  const beta = workbook.getSheet('Beta')!;
  const hook = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, alpha, beta, alphaRaw, betaRaw, hook, rows, cols };
}

async function applyOps(workbook: Workbook, alpha: WorkbookSheetView, beta: WorkbookSheetView, ops: BenchOp[]) {
  await workbook.transact((tx) => {
    for (const op of ops) {
      const sheet = op.sheet === 'Alpha' ? alpha : beta;
      switch (op.kind) {
        case 'setCellValue': tx.setCellValue(sheet, { row: op.row, col: op.col }, op.value); break;
        case 'setCellFormula': tx.setCellFormula(sheet, { row: op.row, col: op.col }, op.formula); break;
        case 'clearCellContent': tx.clearCellContent(sheet, { row: op.row, col: op.col }); break;
        case 'clearCellFormula': tx.clearCellFormula(sheet, { row: op.row, col: op.col }); break;
        case 'setCellStyle': tx.setCellStyle(sheet, { row: op.row, col: op.col }, op.style); break;
        case 'setRowHeight': tx.setRowHeight(sheet, op.row, op.heightPx); break;
        case 'setColumnWidth': tx.setColumnWidth(sheet, op.column, op.widthPx); break;
      }
    }
  });
}

describe('PKG-02C bounded seven-operation performance samples', () => {
  test('records Journal/Snapshot samples without imposing a latency threshold', async () => {
    const seed = 0x02c2026;
    const cases: Array<Record<string, unknown>> = [];
    for (const size of ['small', 'large'] as const) {
      for (const strategy of ['journal', 'snapshot'] as const) {
        const { workbook, alpha, beta, alphaRaw, betaRaw, hook, rows, cols } = makeWorkbook(strategy, size);
        const operations = seededOps(seed, rows, cols);
        const samplesMs: number[] = [];
        await applyOps(workbook, alpha, beta, operations); // one warm-up / state-settlement iteration
        for (let sample = 0; sample < 7; sample++) {
          const start = performance.now();
          await applyOps(workbook, alpha, beta, operations);
          samplesMs.push(Number((performance.now() - start).toFixed(4)));
        }
        cases.push({
          size,
          strategy,
          rowsPerSheet: rows,
          colsPerSheet: cols,
          prepopulatedCellsPerSheet: (size === 'small' ? 4 : 80) * (size === 'small' ? 4 : 25),
          sheetCountInTransaction: 2,
          operationCount: operations.length,
          seed,
          samplesMs,
          health: workbook.getMutationHealth(),
          journalSettlement: [alphaRaw, betaRaw].map(getWorksheetCellWriteJournalStatusForTesting),
        });
        hook.dispose();
      }
    }
    console.info(`PKG02C_BENCHMARK_JSON ${JSON.stringify({ node: process.version, cases })}`);
    expect(cases).toHaveLength(4);
    expect(cases.every((entry) => (entry.health as { status: string }).status === 'healthy')).toBe(true);
  });
});
