/**
 * storage-benchmark.test.ts
 *
 * Storage Layer Audit — Structural Hardening Sprint
 *
 * Runs as a regular Jest suite. All benchmark tests are in
 * describe('Storage Benchmark') so the output is clearly titled.
 *
 * Results are printed via console.log (visible with --verbose or --no-silent).
 * The tests do not "assert" values — they assert only that the system
 * doesn't OOM or take impossibly long. Real data is in the console output.
 *
 * Run: npx jest packages/core/__tests__/storage-benchmark.test.ts --no-coverage --verbose
 */

import { Worksheet } from '../src/worksheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function heapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function rssMB(): number {
  return process.memoryUsage().rss / 1024 / 1024;
}

// Burn ~50ms so V8 has time to finish any lazy work before we read the heap.
function settle(): void {
  const t = Date.now();
  while (Date.now() - t < 50) { /* spin */ }
}

interface BenchResult {
  cells: number;
  insertMs: number;
  heapDeltaMB: number;
  bytesPerCell: number;
  rssDeltaMB: number;
  findFirstMs: number;
  findAllMs: number;
  insertRateCellsPerSec: number;
}

function buildResults(label: string, results: BenchResult[]): string {
  const rows = results.map(r => [
    String(r.cells).padStart(8),
    String(r.insertMs).padStart(10),
    r.heapDeltaMB.toFixed(1).padStart(10),
    String(r.bytesPerCell).padStart(12),
    String(r.findFirstMs).padStart(10),
    String(r.findAllMs).padStart(10),
    r.rssDeltaMB.toFixed(1).padStart(9),
    Math.round(r.insertRateCellsPerSec / 1_000).toFixed(0).concat('k').padStart(12),
  ].join('  ')).join('\n');

  const header = [
    '   Cells',
    'Insert(ms)',
    'Heap ΔMB',
    'Bytes/cell',
    'find(ms)',
    'findAll(ms)',
    'RSS ΔMB',
    'Insert rate',
  ].map((h, i) => h.padStart([8,10,10,12,10,10,9,12][i])).join('  ');

  return `\n${label}\n${'─'.repeat(100)}\n${header}\n${'─'.repeat(100)}\n${rows}\n${'─'.repeat(100)}`;
}

// ---------------------------------------------------------------------------
// Single benchmark run
// ---------------------------------------------------------------------------

function runBench(
  cellCount: number,
  valueFactory: (i: number) => string | number | boolean,
): BenchResult {
  // Baseline: allocate the sheet but no cells yet.
  settle();
  const h0 = heapMB();
  const r0 = rssMB();

  const sheet = new Worksheet('bench', 999999, 1000);

  // Insert
  const t0 = performance.now();
  for (let i = 0; i < cellCount; i++) {
    const row = (i % 99999) + 1;
    const col = Math.floor(i / 99999) + 1;
    sheet.setCellValue({ row, col }, valueFactory(i));
  }
  const insertMs = Math.round(performance.now() - t0);

  // Ensure we have a known needle to find
  sheet.setCellValue({ row: 99999, col: 10 }, '__NEEDLE__');

  settle();
  const h1 = heapMB();
  const r1 = rssMB();

  // find() — single match, worst case scan
  const tf0 = performance.now();
  sheet.find({ what: '__NEEDLE__', lookAt: 'whole' });
  const findFirstMs = Math.round(performance.now() - tf0);

  // findAll() — collect all matches
  const tfa0 = performance.now();
  sheet.findAll({ what: '__NEEDLE__', lookAt: 'whole' });
  const findAllMs = Math.round(performance.now() - tfa0);

  const heapDelta = h1 - h0;
  return {
    cells: cellCount,
    insertMs,
    heapDeltaMB: heapDelta,
    bytesPerCell: heapDelta > 0 ? Math.round((heapDelta * 1024 * 1024) / cellCount) : 0,
    rssDeltaMB: r1 - r0,
    findFirstMs,
    findAllMs,
    insertRateCellsPerSec: insertMs > 0 ? Math.round((cellCount / insertMs) * 1000) : Infinity,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const BATCHES = [10_000, 50_000, 100_000, 200_000];

describe('Storage Benchmark — Structural Hardening Sprint', () => {

  // ── String values (worst case) ────────────────────────────────────────────

  test('String values: throughput + memory @ 10k → 200k cells', () => {
    const results: BenchResult[] = [];
    for (const n of BATCHES) {
      results.push(runBench(n, i => `val_${i}`));
    }

    console.log(buildResults('STRING VALUES (worst case — unique string per cell)', results));

    // Scaling analysis
    const last = results[results.length - 1];
    const proj1M = last.bytesPerCell * 1_000_000 / 1024 / 1024;
    console.log(`\n  Projected heap @ 1M string cells:  ~${proj1M.toFixed(0)} MB`);
    console.log(`  Projected heap @ 500k string cells: ~${(proj1M / 2).toFixed(0)} MB`);
    console.log(
      `  Assessment: ${proj1M > 512
        ? '🔴 EXCEEDS 512 MB target — data-oriented refactor REQUIRED'
        : proj1M > 256
          ? '🟡 256-512 MB range — refactor RECOMMENDED before 1M scale'
          : '🟢 Within 256 MB — acceptable, monitor at 1M'
      }\n`,
    );

    // Soft limit: 200k cells must insert in < 5 seconds
    expect(last.insertMs).toBeLessThan(5_000);
    // Search over 200k cells must be < 2 seconds
    expect(last.findAllMs).toBeLessThan(2_000);
  }, 60_000);

  // ── Numeric values (best case — V8 SMI / HeapNumber) ─────────────────────

  test('Numeric values: throughput + memory @ 10k → 200k cells', () => {
    const results: BenchResult[] = [];
    for (const n of BATCHES) {
      results.push(runBench(n, i => i));
    }

    console.log(buildResults('NUMERIC VALUES (numbers < 2^30 stored as V8 SMI — no heap alloc)', results));

    const last = results[results.length - 1];
    const proj1M = last.bytesPerCell * 1_000_000 / 1024 / 1024;
    console.log(`\n  Projected heap @ 1M numeric cells: ~${proj1M.toFixed(0)} MB\n`);

    expect(last.insertMs).toBeLessThan(5_000);
    // Heap delta can be negative (GC ran); we don't assert on it — pure observation.
  }, 60_000);

  // ── Key string overhead analysis (static) ────────────────────────────────

  test('Key string overhead — theoretical analysis', () => {
    // V8 SeqTwoByteString: 32-byte header + 2 bytes per char
    const keyExamples = [
      { addr: '1:1',        chars: 3  },
      { addr: '100:26',     chars: 6  },
      { addr: '1000:256',   chars: 8  },
      { addr: '10000:1000', chars: 10 },
    ];

    console.log('\n  String Key Overhead (V8 heap, theoretical)');
    console.log('  ' + '─'.repeat(60));
    for (const k of keyExamples) {
      const bytes = 32 + k.chars * 2;
      console.log(`  "${k.addr.padEnd(14)}" → ${k.chars} chars → ~${bytes} bytes heap`);
    }
    console.log();
    console.log('  Packed-int alternative: row << 18 | col');
    console.log('  → Stored as V8 SMI (< 2^30) → 0 bytes heap allocation');
    console.log('  → Supports: rows up to 262144, cols up to 262144');
    console.log('  → Excel limits: 1,048,576 rows × 16,384 cols');
    console.log('  → For Excel full range: need row << 15 | col (30-bit key fits SMI)');
    console.log('  → Saving at 1M cells: ~44 bytes × 1M = ~44 MB recovered\n');

    // Sanity check: the packed int fits in a safe JS integer
    const maxRow = 1_048_576;
    const maxCol = 16_384;
    const maxKey = (maxRow << 15) | maxCol;  // needs 35 bits — over 30-bit SMI
    const safeKey = maxRow * 20_000 + maxCol; // use multiply instead of shift
    console.log(`  MAX Excel address packed: row*20000+col = ${safeKey}`);
    console.log(`  Number.isSafeInteger: ${Number.isSafeInteger(safeKey)} ✓\n`);

    expect(Number.isSafeInteger(safeKey)).toBe(true);
  });

  // ── Cell object shape analysis (static) ───────────────────────────────────

  test('Cell object shape — V8 hidden class analysis', () => {
    // When all Cell objects have the same shape (same property set in same order),
    // V8 reuses a single Hidden Class → faster property access + less memory.
    // Our current Cell has optional fields: formula?, style?, comments?, icon?
    // Objects created with different subsets get different hidden classes.

    const sheet = new Worksheet('shape', 10, 10);

    // Shape A: value only (most common)
    sheet.setCellValue({ row: 1, col: 1 }, 'hello');

    // Shape B: value + formula
    sheet.setCellFormula({ row: 2, col: 1 }, '=A1', 'hello');

    // Shape C: value + style (via setCellStyle which mutates the same object)
    sheet.setCellValue({ row: 3, col: 1 }, 'styled');
    sheet.setCellStyle({ row: 3, col: 1 }, { bold: true });

    const cellA = sheet.getCell({ row: 1, col: 1 })!;
    const cellB = sheet.getCell({ row: 2, col: 1 })!;
    const cellC = sheet.getCell({ row: 3, col: 1 })!;

    console.log('\n  Cell object own-property inventory:');
    console.log(`  Shape A (value-only):     ${Object.keys(cellA).join(', ')}`);
    console.log(`  Shape B (value+formula):  ${Object.keys(cellB).join(', ')}`);
    console.log(`  Shape C (value+style):    ${Object.keys(cellC).join(', ')}`);

    console.log('\n  Problem: Optional properties create multiple hidden classes.');
    console.log('  V8 de-optimizes when Map.get() returns cells of different shapes.');
    console.log('  Mitigation: Always initialise all fields to null in ensureCell().');
    console.log('  Effect: Single hidden class → monomorphic IC → ~2× faster get.\n');

    expect(Object.keys(cellA).length).toBeGreaterThan(0);
  });

  // ── Map<string, Cell> vs Map<number, Cell> micro-benchmark ────────────────

  test('String key vs numeric key Map lookup overhead', () => {
    const N = 100_000;

    // Build a plain Map<string, number> with string keys
    const strMap = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      strMap.set(`${(i % 10000) + 1}:${Math.floor(i / 10000) + 1}`, i);
    }

    // Build a plain Map<number, number> with packed integer keys
    const intMap = new Map<number, number>();
    for (let i = 0; i < N; i++) {
      intMap.set(((i % 10000) + 1) * 20000 + (Math.floor(i / 10000) + 1), i);
    }

    const LOOKUPS = 1_000_000;

    // Warm-up
    for (let i = 0; i < 10000; i++) { strMap.get('1:1'); intMap.get(20001); }

    // String key lookup
    const t0 = performance.now();
    for (let i = 0; i < LOOKUPS; i++) {
      const r = (i % 10000) + 1;
      const c = Math.floor(i / 10000) % 10 + 1;
      strMap.get(`${r}:${c}`);
    }
    const strMs = performance.now() - t0;

    // Numeric key lookup
    const t1 = performance.now();
    for (let i = 0; i < LOOKUPS; i++) {
      const r = (i % 10000) + 1;
      const c = Math.floor(i / 10000) % 10 + 1;
      intMap.get(r * 20000 + c);
    }
    const intMs = performance.now() - t1;

    const speedup = strMs / intMs;
    console.log(`\n  ${LOOKUPS.toLocaleString()} lookups:`);
    console.log(`  Map<string, T>:  ${strMs.toFixed(1)}ms`);
    console.log(`  Map<number, T>:  ${intMs.toFixed(1)}ms`);
    console.log(`  Speedup:         ${speedup.toFixed(2)}×  ${speedup > 1.5 ? '🟢 numeric is faster' : '🟡 marginal difference'}`);
    console.log(
      `  Note: string keys also allocate a new string object per lookup call.\n`,
    );

    // Just assert it doesn't regress catastrophically (string shouldn't be >5× slower)
    // In practice numeric is 1.5–3× faster
    expect(strMs / intMs).toBeLessThan(10);
  }, 30_000);

  // ── CellStoreV1 vs CellStoreLegacy — direct delta measurement ─────────────
  //
  // PM Directive requirement:
  //   "Benchmark Before/After — re-run 200k insert + 200k findAll + memory"
  //   "If savings < 35 MB/1M → revisit."
  //
  // This test directly benchmarks both store implementations at 200k cells
  // and prints the absolute delta. The "before" (Legacy) and "after" (V1)
  // are measured in the same process to eliminate warm-up variance.

  test('CellStoreV1 vs CellStoreLegacy — before/after delta @ 200k cells', () => {
    const { CellStoreV1, CellStoreLegacy } = require('../src/storage/CellStoreV1');
    const N = 200_000;

    interface StoreResult {
      label: string;
      insertMs: number;
      lookupMs: number;
      forEachMs: number;
      heapDeltaMB: number;
      bytesPerCell: number;
    }

    function benchStore(label: string, store: any): StoreResult {
      // Warm GC
      settle();
      const h0 = heapMB();

      const t0 = performance.now();
      for (let i = 0; i < N; i++) {
        const row = (i % 99999) + 1;
        const col = Math.floor(i / 99999) + 1;
        store.getOrCreate(row, col).value = `val_${i}`;
      }
      const insertMs = Math.round(performance.now() - t0);

      settle();
      const h1 = heapMB();
      const heapDelta = h1 - h0;

      // 1M random lookups
      const t1 = performance.now();
      for (let i = 0; i < 1_000_000; i++) {
        const row = (i % 99999) + 1;
        const col = Math.floor(i / 99999) + 1;
        store.get(row, col);
      }
      const lookupMs = Math.round(performance.now() - t1);

      // Full forEach scan (equivalent to findAll)
      const t2 = performance.now();
      let count = 0;
      store.forEach((_r: number, _c: number, _cell: any) => { count++; });
      const forEachMs = Math.round(performance.now() - t2);

      return {
        label,
        insertMs,
        lookupMs,
        forEachMs,
        heapDeltaMB: heapDelta,
        bytesPerCell: heapDelta > 0 ? Math.round((heapDelta * 1024 * 1024) / N) : 0,
      };
    }

    const legacy = benchStore('CellStoreLegacy (Map<string,Cell>)', new CellStoreLegacy());
    const v1     = benchStore('CellStoreV1     (Map<number,Cell>)', new CellStoreV1());

    const table = (r: StoreResult) =>
      `  ${r.label.padEnd(42)}  ` +
      `insert:${String(r.insertMs).padStart(5)}ms  ` +
      `lookup:${String(r.lookupMs).padStart(5)}ms  ` +
      `forEach:${String(r.forEachMs).padStart(4)}ms  ` +
      `heap Δ:${r.heapDeltaMB > 0 ? r.heapDeltaMB.toFixed(1) : '(GC)'}MB  ` +
      `bytes/cell:${String(r.bytesPerCell).padStart(4)}`;

    const savings1M = (legacy.bytesPerCell - v1.bytesPerCell) * 1_000_000 / 1024 / 1024;
    const insertSpeedup = legacy.insertMs / Math.max(v1.insertMs, 1);
    const lookupSpeedup = legacy.lookupMs / Math.max(v1.lookupMs, 1);

    console.log(`\n${'─'.repeat(100)}`);
    console.log('  CellStoreV1 Migration — Before/After Delta @ 200k cells');
    console.log(`${'─'.repeat(100)}`);
    console.log(table(legacy));
    console.log(table(v1));
    console.log(`${'─'.repeat(100)}`);
    console.log(`  Insert speedup:           ${insertSpeedup.toFixed(2)}×`);
    console.log(`  Lookup speedup:           ${lookupSpeedup.toFixed(2)}×`);
    if (legacy.bytesPerCell > 0 && v1.bytesPerCell > 0) {
      console.log(`  Memory saving @ 200k:     ${(legacy.heapDeltaMB - v1.heapDeltaMB).toFixed(1)} MB`);
      console.log(`  Projected saving @ 1M:    ~${savings1M.toFixed(0)} MB`);
      const assessment = savings1M >= 35
        ? `✅ PM threshold met (≥35 MB / 1M cells) — V1 migration approved`
        : `⚠️  PM threshold NOT met (<35 MB / 1M cells) — investigate`;
      console.log(`  Assessment:               ${assessment}`);
    } else {
      console.log(`  Heap delta unreliable (GC ran mid-test) — rerun in isolation.`);
    }
    console.log(`${'─'.repeat(100)}\n`);

    // Correctness checks
    expect(legacy.insertMs).toBeLessThan(5_000);
    expect(v1.insertMs).toBeLessThan(5_000);
    // V1 should not regress significantly vs legacy
    expect(v1.insertMs).toBeLessThan(legacy.insertMs * 2);
    expect(v1.lookupMs).toBeLessThan(legacy.lookupMs * 2);
  }, 120_000);
});
