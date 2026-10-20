import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { SpreadsheetEngine } from '../src/SpreadsheetEngine';

type Measurement = {
  workload: string;
  formulaCount: number;
  evaluatedCells: number;
  durationMs: number;
  heapDeltaBytes: number;
};

async function measure(
  workload: string,
  formulaCount: number,
  setup: (engine: SpreadsheetEngine) => Promise<void>,
  edit: (engine: SpreadsheetEngine) => Promise<void>,
): Promise<Measurement> {
  const engine = new SpreadsheetEngine();
  await setup(engine);
  engine.resetMetrics();
  const beforeHeap = process.memoryUsage().heapUsed;
  const start = performance.now();
  await edit(engine);
  const durationMs = performance.now() - start;
  const heapDeltaBytes = process.memoryUsage().heapUsed - beforeHeap;
  return {
    workload,
    formulaCount,
    evaluatedCells: engine.metrics.completed,
    durationMs: Number(durationMs.toFixed(3)),
    heapDeltaBytes,
  };
}

describe('CS-002 incremental recalculation measurements', () => {
  test('measures chain, fan-out, and large-range propagation', async () => {
    const results: Measurement[] = [];

    results.push(await measure('chain-200', 200, async (engine) => {
      await engine.run((ws) => {
        ws.setCellValue({ row: 1, col: 1 }, 1);
        for (let col = 2; col <= 201; col++) {
          const previous = col === 2 ? 'A' : columnName(col - 1);
          ws.setCellFormula({ row: 1, col }, `=${previous}1+1`);
        }
      });
    }, async (engine) => {
      await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 2));
    }));

    results.push(await measure('fan-out-250', 250, async (engine) => {
      await engine.run((ws) => {
        ws.setCellValue({ row: 1, col: 1 }, 1);
        for (let col = 2; col <= 251; col++) {
          ws.setCellFormula({ row: 1, col }, '=A1*2');
        }
      });
    }, async (engine) => {
      await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 2));
    }));

    results.push(await measure('large-range-10001', 1, async (engine) => {
      await engine.run((ws) => {
        ws.setCellValue({ row: 10_001, col: 1 }, 2);
        ws.setCellFormula({ row: 1, col: 2 }, '=SUM(A1:A10001)');
      });
    }, async (engine) => {
      await engine.run((ws) => ws.setCellValue({ row: 10_001, col: 1 }, 7));
    }));

    expect(results.map((result) => result.evaluatedCells)).toEqual([200, 250, 1]);
    writeFileSync('/tmp/cs002-benchmark-results.json', JSON.stringify(results, null, 2));
  });
});

function columnName(oneBased: number): string {
  let value = oneBased;
  let name = '';
  while (value > 0) {
    value--;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}
