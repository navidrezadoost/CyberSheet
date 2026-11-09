import { performance } from 'node:perf_hooks';
import { Worksheet, setStandaloneFormulaRegistrationTestHook } from '../src/worksheet';
import { DependencyGraph } from '../src/dag/DependencyGraph';

type Mode = 'current-journal' | 'no-op-journal-control';
type Workload = 'create' | 'replace' | 'repeat' | 'range' | 'callback';

const operationCount = 120;
const sampleCount = 7;
const originalBegin = DependencyGraph.prototype.beginMutationJournal;

function makeWorksheet(workload: Workload): Worksheet {
  const formulaEngine = workload === 'callback'
    ? { evaluate: () => null, onCellChanged: () => undefined }
    : undefined;
  const worksheet = new Worksheet('Bench', operationCount + 10, 8, formulaEngine);
  worksheet.setCellValue({ row: 1, col: 1 }, 2);
  worksheet.setCellValue({ row: 1, col: 2 }, 3);
  if (workload === 'replace' || workload === 'repeat') {
    worksheet.setCellFormula({ row: 2, col: 3 }, '=A1+1', 3);
  }
  return worksheet;
}

function apply(workload: Workload, worksheet: Worksheet): void {
  for (let index = 0; index < operationCount; index++) {
    const row = index + 2;
    if (workload === 'create') {
      worksheet.setCellFormula({ row, col: 3 }, '=A1+1', 3);
    } else if (workload === 'replace') {
      worksheet.setCellFormula({ row: 2, col: 3 }, index % 2 ? '=A1+1' : '=B1+1', index % 2 ? 3 : 4);
    } else if (workload === 'repeat') {
      worksheet.setCellFormula({ row: 2, col: 3 }, '=A1+1', 3);
    } else if (workload === 'range') {
      worksheet.setCellFormula({ row, col: 3 }, '=SUM(A1:A4)', 10);
    } else {
      worksheet.setCellFormula({ row, col: 3 }, '=A1+1', 3);
    }
  }
}

function measure(workload: Workload, mode: Mode): number {
  const worksheet = makeWorksheet(workload);
  if (mode === 'no-op-journal-control') {
    DependencyGraph.prototype.beginMutationJournal = function () {
      return { commit() {}, rollback() {} };
    };
  } else {
    DependencyGraph.prototype.beginMutationJournal = originalBegin;
  }
  const start = performance.now();
  apply(workload, worksheet);
  const elapsedMs = performance.now() - start;
  DependencyGraph.prototype.beginMutationJournal = originalBegin;
  return elapsedMs;
}

function measureFailureAndRestore(): number[] {
  const worksheet = makeWorksheet('create');
  const durations: number[] = [];
  for (let index = 0; index < operationCount; index++) {
    const row = index + 2;
    const failure = new Error('controlled registration cut');
    const hook = setStandaloneFormulaRegistrationTestHook(worksheet, () => { throw failure; });
    const start = performance.now();
    try {
      worksheet.setCellFormula({ row, col: 3 }, '=A1+1', 3);
      throw new Error('expected the injected registration failure');
    } catch (error) {
      if (error !== failure) throw error;
    } finally {
      hook.dispose();
    }
    if (worksheet.getCell({ row, col: 3 }) !== undefined) {
      throw new Error(`cell ${row}:3 was not restored after the injected failure`);
    }
    durations.push(performance.now() - start);
  }
  return durations;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const workloads: Workload[] = ['create', 'replace', 'repeat', 'range', 'callback'];
const results: Record<string, { currentMs: number[]; noOpControlMs: number[]; currentMedianMs: number; controlMedianMs: number }> = {};

try {
  for (const workload of workloads) {
    const currentMs: number[] = [];
    const noOpControlMs: number[] = [];
    for (let sample = 0; sample < sampleCount + 1; sample++) {
      // Warm both implementations, then alternate order to reduce drift.
      const order: Mode[] = sample % 2 ? ['no-op-journal-control', 'current-journal'] : ['current-journal', 'no-op-journal-control'];
      const measured = new Map<Mode, number>();
      for (const mode of order) measured.set(mode, measure(workload, mode));
      if (sample > 0) {
        currentMs.push(measured.get('current-journal')!);
        noOpControlMs.push(measured.get('no-op-journal-control')!);
      }
    }
    results[workload] = {
      currentMs,
      noOpControlMs,
      currentMedianMs: median(currentMs),
      controlMedianMs: median(noOpControlMs),
    };
  }
  const failureMs = measureFailureAndRestore();
  console.log(JSON.stringify({
    runtime: process.version,
    platform: `${process.platform}-${process.arch}`,
    operationCount,
    sampleCount,
    comparison: 'current local graph journal vs same current source with beginMutationJournal replaced by a no-op control; not a whole pre-PKG-01E source checkout',
    workloads: results,
    failureAndCleanRestoreMs: failureMs,
    failureAndCleanRestoreMedianMs: median(failureMs),
  }, null, 2));
} finally {
  DependencyGraph.prototype.beginMutationJournal = originalBegin;
}
