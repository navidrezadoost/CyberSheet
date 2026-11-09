import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';
import type { WorkbookTransactionContext } from '../src/workbook-access-types';
import { cpus } from 'node:os';
import { getHeapStatistics } from 'node:v8';

type Sample = {
  workload: string;
  storedCells: number;
  formulaNodes: number;
  dependencyEdges: number;
  batchSize: number;
  trial: number;
  transactionMs?: number;
  snapshotMs?: number;
  applyMs?: number;
  rollbackMs?: number;
  standaloneMs?: number;
  heapDeltaBytes?: number;
  error?: string;
};

const addresses = (offset: number, count: number) => Array.from({ length: count }, (_, index) => ({
  row: 2 * (offset + index + 1),
  col: 2,
}));

function seedSparseWorksheet(sheet: Worksheet, storedCells: number): void {
  for (let index = 0; index < storedCells; index++) {
    sheet.setCellValue({ row: index * 2 + 1, col: 1 }, index);
  }
}

function createWorkbook(storedCells: number, formulaHeavy = false) {
  const rows = Math.max(10, storedCells * 2 + 2_000);
  const workbook = Workbook.create({ sheets: [{ name: 'Main', rows, cols: 2 }] });
  const raw = workbook.createDevImportWorksheet('Data', rows, 2);
  if (formulaHeavy) {
    for (let index = 0; index < storedCells; index++) {
      const row = index + 1;
      if (row % 2 === 0) raw.setCellFormula({ row, col: 1 }, `=A${row - 1}+1`, index);
      else raw.setCellValue({ row, col: 1 }, index);
    }
  } else {
    seedSparseWorksheet(raw, storedCells);
  }
  workbook.attachDevImportSheet(raw);
  const view = workbook.getSheet('Data')!;
  const formulas = raw.getFormulaAddresses();
  const dependencyEdges = formulas.reduce((sum, address) => sum + raw.getPrecedents(address).length, 0);
  return { workbook, raw, view, formulas: formulas.length, dependencyEdges };
}

function summarize(samples: Sample[]) {
  const sorted = samples.slice().sort((a, b) => (a.transactionMs ?? a.rollbackMs ?? a.standaloneMs ?? 0)
    - (b.transactionMs ?? b.rollbackMs ?? b.standaloneMs ?? 0));
  const values = sorted.map((sample) => sample.transactionMs ?? sample.rollbackMs ?? sample.standaloneMs ?? 0);
  const at = (fraction: number) => values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];
  return {
    medianMs: at(0.5),
    minMs: values[0],
    maxMs: values[values.length - 1],
  };
}

async function measureTransaction(
  workbook: Workbook,
  view: ReturnType<typeof createWorkbook>['view'],
  storedCells: number,
  batchSize: number,
  trial: number,
  workload: string,
): Promise<Sample> {
  let snapshotMs = 0;
  let applyMs = 0;
  const hook = setWorkbookMutationTestHooks(workbook, {
    afterSnapshotCapture: (duration) => { snapshotMs = duration; },
    afterApplyOperation: (_index, duration) => { applyMs += duration; },
  });
  const heapBefore = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  await workbook.transact((transaction: WorkbookTransactionContext) => {
    for (const [index, address] of addresses(storedCells + trial * 200 + batchSize, batchSize).entries()) {
      transaction.setCellValue(view, address, `${workload}-${trial}-${batchSize}-${index}`);
    }
  });
  const transactionMs = performance.now() - startedAt;
  const heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore;
  hook.dispose();
  return { workload, storedCells, formulaNodes: 0, dependencyEdges: 0, batchSize, trial, transactionMs, snapshotMs, applyMs, heapDeltaBytes };
}

function measureStandalone(sheet: Worksheet, storedCells: number, batchSize: number, trial: number): Sample {
  const startedAt = performance.now();
  for (const [index, address] of addresses(storedCells + trial * 200 + batchSize, batchSize).entries()) {
    sheet.setCellValue(address, `standalone-${trial}-${batchSize}-${index}`);
  }
  return {
    workload: 'standalone-sparse', storedCells, formulaNodes: 0, dependencyEdges: 0, batchSize, trial,
    standaloneMs: performance.now() - startedAt,
  };
}

async function measureRollback(storedCells: number, trial: number): Promise<Sample> {
  const { workbook, view, formulas, dependencyEdges } = createWorkbook(storedCells);
  let snapshotMs = 0;
  let applyMs = 0;
  let rollbackMs = 0;
  const injected = new Error('PKG-01B rollback benchmark injection');
  const hook = setWorkbookMutationTestHooks(workbook, {
    beforeApplyOperation: (index) => { if (index === 50) throw injected; },
    afterSnapshotCapture: (duration) => { snapshotMs = duration; },
    afterApplyOperation: (_index, duration) => { applyMs += duration; },
    afterRollback: (duration) => { rollbackMs = duration; },
  });
  const startedAt = performance.now();
  try {
    await workbook.transact((transaction) => {
      for (const [index, address] of addresses(storedCells + 1, 100).entries()) {
        transaction.setCellValue(view, address, `rollback-${trial}-${index}`);
      }
    });
  } catch (error) {
    if (error !== injected) throw error;
  }
  hook.dispose();
  return {
    workload: 'sparse-rollback', storedCells, formulaNodes: formulas, dependencyEdges,
    batchSize: 100, trial, transactionMs: performance.now() - startedAt, snapshotMs, applyMs, rollbackMs,
  };
}

async function main(): Promise<void> {
  const samples: Sample[] = [];
  const sizes = [1_000, 10_000, 50_000, 100_000];
  for (const size of sizes) {
    for (let trial = 1; trial <= 3; trial++) {
      for (const batchSize of [1, 10, 100]) {
        // Each batch size starts from exactly the requested initial cell count.
        const { workbook, view, formulas, dependencyEdges } = createWorkbook(size);
        const standalone = new Worksheet('Standalone', size * 2 + 2_000, 2);
        seedSparseWorksheet(standalone, size);
        const transactionSample = await measureTransaction(workbook, view, size, batchSize, trial, 'sparse');
        transactionSample.formulaNodes = formulas;
        transactionSample.dependencyEdges = dependencyEdges;
        samples.push(transactionSample, measureStandalone(standalone, size, batchSize, trial));
        workbook.dispose();
      }
    }
  }
  for (const size of sizes) {
    for (let trial = 1; trial <= 3; trial++) samples.push(await measureRollback(size, trial));
  }
  for (let trial = 1; trial <= 3; trial++) {
    const size = 10_000;
    const { workbook, view, formulas, dependencyEdges } = createWorkbook(size, true);
    const sample = await measureTransaction(workbook, view, size, 100, trial, 'formula-heavy');
    sample.formulaNodes = formulas;
    sample.dependencyEdges = dependencyEdges;
    samples.push(sample);
    workbook.dispose();
  }

  const groups = new Map<string, Sample[]>();
  for (const sample of samples) {
    const key = `${sample.workload}:${sample.storedCells}:${sample.batchSize}`;
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  const summaries = Object.fromEntries([...groups].map(([key, entries]) => [key, summarize(entries)]));
  process.stdout.write(`${JSON.stringify({
    runtime: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: cpus().map((cpu) => cpu.model),
    heapLimitBytes: getHeapStatistics().heap_size_limit,
    samples,
    summaries,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
