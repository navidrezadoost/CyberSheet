import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';
import type { WorkbookSheetView, WorkbookTransactionContext } from '../src/workbook-access-types';
import { cpus } from 'node:os';
import { getHeapStatistics } from 'node:v8';

type Strategy = 'snapshot' | 'journal';
type Sample = {
  workload: string;
  strategy: Strategy;
  storedCells: number;
  formulaNodes: number;
  dependencyEdges: number;
  worksheets: number;
  batchSize: number;
  trial: number;
  transactionMs?: number;
  captureMs?: number;
  applyMs?: number;
  commitCleanupMs?: number;
  rollbackMs?: number;
  standaloneMs?: number;
  heapDeltaBytes?: number;
  error?: string;
};

type Setup = { workbook: Workbook; views: WorkbookSheetView[]; raw: Worksheet[]; formulaNodes: number; dependencyEdges: number };
type AdversarialGraph = 'high-fanout' | 'long-chain' | 'overlapping-ranges';

function seed(sheet: Worksheet, count: number, formulaHeavy = false): void {
  for (let index = 0; index < count; index++) {
    const row = index + 1;
    if (formulaHeavy && row % 2 === 0) sheet.setCellFormula({ row, col: 1 }, `=A${row - 1}+1`, index);
    else sheet.setCellValue({ row, col: 1 }, index);
  }
}

function setup(storedCells: number, worksheets = 1, formulaHeavy = false): Setup {
  const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: Math.max(10, storedCells * 2 + 100), cols: 4 }] });
  const raw: Worksheet[] = [];
  const views: WorkbookSheetView[] = [];
  let formulaNodes = 0;
  let dependencyEdges = 0;
  for (let index = 0; index < worksheets; index++) {
    const sheet = workbook.createDevImportWorksheet(`Data${index}`, Math.max(10, storedCells * 2 + 100), 4);
    seed(sheet, storedCells, formulaHeavy);
    const formulaAddresses = sheet.getFormulaAddresses();
    formulaNodes += formulaAddresses.length;
    dependencyEdges += formulaAddresses.reduce((total, address) => total + sheet.getPrecedents(address).length, 0);
    workbook.attachDevImportSheet(sheet);
    raw.push(sheet);
    views.push(workbook.getSheet(`Data${index}`)!);
  }
  return { workbook, views, raw, formulaNodes, dependencyEdges };
}

function setupAdversarial(size: number, kind: AdversarialGraph): Setup {
  const workbook = Workbook.create({ sheets: [{ name: 'Main', rows: size + 10, cols: 4 }] });
  const raw = workbook.createDevImportWorksheet('Adversarial', size + 10, 4);
  raw.setCellValue({ row: 1, col: 1 }, 1);
  for (let index = 2; index <= size + 1; index++) {
    if (kind === 'high-fanout') raw.setCellFormula({ row: index, col: 2 }, '=A1+1', index);
    else if (kind === 'long-chain') raw.setCellFormula({ row: index, col: 1 }, `=A${index - 1}+1`, index);
    else raw.setCellFormula({ row: index, col: 2 }, `=SUM(A1:A${size})`, index);
  }
  const formulaNodes = raw.getFormulaAddresses().length;
  const dependencyEdges = raw.getFormulaAddresses().reduce((total, address) => total + raw.getPrecedents(address).length, 0);
  workbook.attachDevImportSheet(raw);
  return { workbook, views: [workbook.getSheet('Adversarial')!], raw: [raw], formulaNodes, dependencyEdges };
}

function addresses(storedCells: number, count: number, trial: number): Array<{ row: number; col: number }> {
  return Array.from({ length: count }, (_, index) => ({ row: storedCells + 10 + trial * 200 + index, col: 3 }));
}

async function runTransaction(
  setupData: Setup,
  strategy: Strategy,
  workload: string,
  storedCells: number,
  batchSize: number,
  trial: number,
  options: { repeatCell?: boolean; multiSheet?: boolean } = {},
): Promise<Sample> {
  let captureMs = 0;
  let applyMs = 0;
  let commitCleanupMs = 0;
  const hook = setWorkbookMutationTestHooks(setupData.workbook, {
    strategy,
    afterSnapshotCapture: (duration) => { captureMs = duration; },
    afterJournalCreation: (duration) => { captureMs = duration; },
    afterApplyOperation: (_index, duration) => { applyMs += duration; },
    afterCommitCleanup: (duration) => { commitCleanupMs = duration; },
  });
  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  await setupData.workbook.transact((transaction: WorkbookTransactionContext) => {
    for (let index = 0; index < batchSize; index++) {
      const targetIndex = options.multiSheet ? index % setupData.views.length : 0;
      const address = options.repeatCell
        ? { row: storedCells + 10, col: 3 }
        : workload.startsWith('adversarial-')
          ? { row: 1, col: 1 }
        : workload === 'formula-heavy'
          ? { row: index * 2 + 1, col: 1 }
        : addresses(storedCells, batchSize, trial)[options.multiSheet ? Math.floor(index / setupData.views.length) : index];
      transaction.setCellValue(setupData.views[targetIndex], address, `${strategy}-${workload}-${trial}-${index}`);
    }
  });
  const transactionMs = performance.now() - started;
  const heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore;
  hook.dispose();
  return {
    workload, strategy, storedCells, formulaNodes: setupData.formulaNodes,
    dependencyEdges: setupData.dependencyEdges, worksheets: setupData.views.length, batchSize, trial,
    transactionMs, captureMs, applyMs, commitCleanupMs, heapDeltaBytes,
  };
}

async function runRollback(storedCells: number, strategy: Strategy, trial: number): Promise<Sample> {
  const data = setup(storedCells);
  let captureMs = 0;
  let applyMs = 0;
  let rollbackMs = 0;
  let commitCleanupMs = 0;
  const injected = new Error('PKG-01C benchmark rollback injection');
  const hook = setWorkbookMutationTestHooks(data.workbook, {
    strategy,
    beforeApplyOperation: (index) => { if (index === 50) throw injected; },
    afterSnapshotCapture: (duration) => { captureMs = duration; },
    afterJournalCreation: (duration) => { captureMs = duration; },
    afterApplyOperation: (_index, duration) => { applyMs += duration; },
    afterRollback: (duration) => { rollbackMs = duration; },
    afterCommitCleanup: (duration) => { commitCleanupMs = duration; },
  });
  const started = performance.now();
  try {
    await data.workbook.transact((transaction) => {
      for (const address of addresses(storedCells, 100, trial)) {
        transaction.setCellValue(data.views[0], address, `rollback-${trial}`);
      }
    });
    throw new Error('Rollback benchmark unexpectedly committed');
  } catch (error) {
    if (error !== injected) throw error;
  }
  const transactionMs = performance.now() - started;
  hook.dispose();
  data.workbook.dispose();
  return {
    workload: 'sparse-rollback', strategy, storedCells, formulaNodes: data.formulaNodes,
    dependencyEdges: data.dependencyEdges, worksheets: 1, batchSize: 100, trial,
    transactionMs, captureMs, applyMs, rollbackMs, commitCleanupMs,
  };
}

function runStandalone(storedCells: number, batchSize: number, trial: number, repeatCell = false): number {
  const sheet = new Worksheet('Standalone', storedCells * 2 + 100, 4);
  seed(sheet, storedCells);
  const started = performance.now();
  for (let index = 0; index < batchSize; index++) {
    const address = repeatCell ? { row: storedCells + 10, col: 3 } : addresses(storedCells, batchSize, trial)[index];
    sheet.setCellValue(address, `standalone-${trial}-${index}`);
  }
  return performance.now() - started;
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summarize(samples: Sample[]) {
  const numericKeys = ['transactionMs', 'captureMs', 'applyMs', 'commitCleanupMs', 'rollbackMs', 'standaloneMs', 'heapDeltaBytes'] as const;
  return Object.fromEntries(numericKeys.map((key) => {
    const values = samples.map((sample) => sample[key]).filter((value): value is number => value !== undefined);
    return [key, values.length ? { median: median(values), min: Math.min(...values), max: Math.max(...values) } : undefined];
  }).filter(([, value]) => value !== undefined));
}

async function main(): Promise<void> {
  const samples: Sample[] = [];
  const strategies: Strategy[] = ['snapshot', 'journal'];
  for (const size of [1_000, 10_000, 50_000, 100_000]) {
    for (const batchSize of [1, 10, 100]) {
      for (let trial = 1; trial <= 5; trial++) {
        for (const strategy of strategies) {
          const data = setup(size);
          samples.push(await runTransaction(data, strategy, 'sparse', size, batchSize, trial));
          data.workbook.dispose();
        }
      }
    }
  }
  for (const size of [1_000, 10_000, 50_000, 100_000]) {
    for (let trial = 1; trial <= 5; trial++) {
      for (const strategy of strategies) samples.push(await runRollback(size, strategy, trial));
    }
  }
  for (let trial = 1; trial <= 5; trial++) {
    for (const strategy of strategies) {
      const formula = setup(10_000, 1, true);
      samples.push(await runTransaction(formula, strategy, 'formula-heavy', 10_000, 100, trial));
      formula.workbook.dispose();
      const repeated = setup(10_000);
      const repeatedSample = await runTransaction(repeated, strategy, 'same-cell-overwrite', 10_000, 100, trial, { repeatCell: true });
      repeatedSample.standaloneMs = runStandalone(10_000, 100, trial, true);
      samples.push(repeatedSample);
      repeated.workbook.dispose();
      const multi = setup(10_000, 2);
      samples.push(await runTransaction(multi, strategy, 'two-worksheet', 10_000, 100, trial, { multiSheet: true }));
      multi.workbook.dispose();
    }
  }
  // Deliberate dependency closures complement the sparse PKG-01C workloads.
  // The generated graphs are deterministic; each strategy receives the same
  // size, formula layout, write count, and trial ordering.
  for (const kind of ['high-fanout', 'long-chain', 'overlapping-ranges'] as const) {
    for (const batchSize of [1, 10, 100]) {
      for (let trial = 1; trial <= 3; trial++) {
        for (const strategy of strategies) {
          const data = setupAdversarial(500, kind);
          samples.push(await runTransaction(data, strategy, `adversarial-${kind}`, 500, batchSize, trial));
          data.workbook.dispose();
        }
      }
    }
  }

  const groups = new Map<string, Sample[]>();
  for (const sample of samples) {
    const key = `${sample.workload}:${sample.strategy}:${sample.storedCells}:${sample.worksheets}:${sample.batchSize}`;
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }
  const summaries = Object.fromEntries([...groups].map(([key, values]) => [key, summarize(values)]));
  process.stdout.write(`${JSON.stringify({
    runtime: process.version, platform: process.platform, arch: process.arch,
    cpus: cpus().map((cpu) => cpu.model), heapLimitBytes: getHeapStatistics().heap_size_limit,
    trialsPerWorkload: 5, gcPolicy: 'No forced collection; heap delta is observational, not peak/retained memory.',
    samples, summaries,
  }, null, 2)}\n`);
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
