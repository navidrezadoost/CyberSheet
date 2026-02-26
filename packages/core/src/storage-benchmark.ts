/**
 * storage-benchmark.ts
 *
 * Storage Layer Audit — Structural Hardening Sprint
 *
 * Measures:
 *  1. Heap allocation per cell at 10k / 50k / 100k / 200k density
 *  2. Insertion throughput (cells/sec)
 *  3. Search throughput (cells/sec)
 *  4. GC pressure (delta GC count / GC pause time when --expose-gc is available)
 *  5. String-key overhead analysis
 *
 * Run: node --expose-gc -r ts-node/register packages/core/src/storage-benchmark.ts
 */

import { Worksheet } from './worksheet';

// ---------------------------------------------------------------------------
// 0.  GC helpers
// ---------------------------------------------------------------------------

declare const gc: (() => void) | undefined;

function forceGC(): void {
  if (typeof gc === 'function') gc();
}

function heapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function rss(): number {
  return process.memoryUsage().rss / 1024 / 1024;
}

// ---------------------------------------------------------------------------
// 1.  String key overhead analysis (theoretical)
// ---------------------------------------------------------------------------

/**
 * V8 string layout (UTF-16, SeqTwoByteString):
 *   32 bytes header
 *   + 2 bytes per char
 *
 * For key "99999:999" (9 chars):
 *   32 + 18 = 50 bytes
 *
 * For key "1:1" (3 chars):
 *   32 + 6 = 38 bytes
 *
 * Packed-int alternative (row << 18 | col, stored as Map integer key):
 *   0 bytes heap allocation — V8 SMI stored inline in Map slot
 *
 * This table shows key string sizes for representative addresses:
 */
const KEY_ANALYSIS = [
  { addr: '1:1',       len: 3,  bytes: 32 + 6  },
  { addr: '100:26',    len: 6,  bytes: 32 + 12 },
  { addr: '1000:100',  len: 8,  bytes: 32 + 16 },
  { addr: '10000:256', len: 9,  bytes: 32 + 18 },
];

// ---------------------------------------------------------------------------
// 2.  Cell object overhead analysis (theoretical)
// ---------------------------------------------------------------------------

/**
 * V8 JS object layout:
 *   - Object header:  32 bytes (map pointer + hash + properties pointer)
 *   - In-object slots: 8 bytes each (first 4-8 properties fit in-object)
 *   - Properties beyond in-object: stored in side array (8 bytes/slot + array hdr)
 *
 * Minimal Cell { value: null }:
 *   32 (header) + 1 × 8 (value slot) = ~40 bytes  [V8 optimised shape]
 *
 * Typical Cell { value: "Hello", formula: undefined, style: undefined }:
 *   32 + 8 = ~40 bytes (string pointer stored in slot)
 *   + String "Hello": 32 + 10 = 42 bytes
 *   = ~82 bytes total
 *
 * Full Cell { value, formula, style, comments, icon }:
 *   32 header + up to 7 slots × 8 = 32 + 56 = ~88 bytes (all in-object if ≤4)
 *   In practice V8 allocates 4 in-object slots then overflows; ≈ 88-112 bytes
 *
 * Map<string, Cell> entry overhead: ~56 bytes (hash slot + key ptr + value ptr)
 *
 * Per-cell total (value-only, string value):
 *   56 (Map slot) + 50 (key string) + 40 (Cell obj) + 42 (value string) = 188 bytes
 *
 * Per-cell total (numeric value — stored as SMI or HeapNumber):
 *   SMI (30-bit int): stored inline in Cell slot, 0 extra heap
 *   HeapNumber (float64 > 30 bit): 32 bytes extra
 *   = 56 + 50 + 40 + {0 | 32} = 146 – 178 bytes
 */

// ---------------------------------------------------------------------------
// 3.  Live benchmark
// ---------------------------------------------------------------------------

interface BenchResult {
  cells: number;
  insertMs: number;
  heapMBDelta: number;
  bytesPerCell: number;
  findMs: number;
  findAllMs: number;
  rssMBDelta: number;
}

function runBatch(cellCount: number, valueType: 'string' | 'number'): BenchResult {
  forceGC();
  const h0 = heapMB();
  const r0 = rss();

  const sheet = new Worksheet('bench', 999999, 999);
  const t0 = Date.now();

  for (let i = 0; i < cellCount; i++) {
    const row = (i % 10000) + 1;
    const col = Math.floor(i / 10000) + 1;
    const value: string | number =
      valueType === 'string'
        ? `v${i}`            // short string: ~36 bytes in V8
        : i;                 // SMI if i < 2^30
    sheet.setCellValue({ row, col }, value);
  }

  const insertMs = Date.now() - t0;
  forceGC();
  const h1 = heapMB();
  const r1 = rss();

  // Search: single find (first-match, has to scan all)
  sheet.setCellValue({ row: 9999, col: (Math.floor(cellCount / 10000)) + 1 }, 'NEEDLE');
  const tfind0 = Date.now();
  sheet.find({ what: 'NEEDLE' });
  const findMs = Date.now() - tfind0;

  // Search: findAll across full population
  const tfa0 = Date.now();
  sheet.findAll({ what: 'NEEDLE' });
  const findAllMs = Date.now() - tfa0;

  const heapDelta = h1 - h0;
  return {
    cells: cellCount,
    insertMs,
    heapMBDelta: heapDelta,
    bytesPerCell: Math.round((heapDelta * 1024 * 1024) / cellCount),
    findMs,
    findAllMs,
    rssMBDelta: r1 - r0,
  };
}

function printTable(results: BenchResult[]): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Storage Benchmark Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    ' Cells'.padEnd(10),
    'Insert(ms)'.padEnd(12),
    'Heap ΔMB'.padEnd(12),
    'Bytes/cell'.padEnd(12),
    'find(ms)'.padEnd(10),
    'findAll(ms)'.padEnd(12),
    'RSS ΔMB',
  );
  console.log('─'.repeat(81));
  for (const r of results) {
    console.log(
      String(r.cells).padEnd(10),
      String(r.insertMs).padEnd(12),
      r.heapMBDelta.toFixed(1).padEnd(12),
      String(r.bytesPerCell).padEnd(12),
      String(r.findMs).padEnd(10),
      String(r.findAllMs).padEnd(12),
      r.rssMBDelta.toFixed(1),
    );
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function printKeyAnalysis(): void {
  console.log('\n━━━━  String Key Overhead Analysis (V8 heap, theoretical)  ━━━━');
  for (const k of KEY_ANALYSIS) {
    console.log(`  key "${k.addr.padEnd(12)}" → ${k.len} chars → ~${k.bytes} bytes heap`);
  }
  console.log();
  console.log('  Packed-int key (row << 18 | col): 0 bytes heap (V8 SMI inline)');
  console.log('  Saving at 1M cells: ~50 bytes × 1M = ~50 MB\n');
}

function printScalingProjection(results: BenchResult[]): void {
  // Use last two data points to compute scaling factor
  const a = results[results.length - 2];
  const b = results[results.length - 1];
  const factor = b.cells / a.cells;
  const heapFactor = b.heapMBDelta / a.heapMBDelta;
  console.log('━━━━  Scaling Projection  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${a.cells} → ${b.cells} cells: heap factor = ${heapFactor.toFixed(2)}x (ideal: ${factor}x)`);
  const proj1M = b.heapMBDelta * (1_000_000 / b.cells);
  const proj500k = b.heapMBDelta * (500_000 / b.cells);
  console.log(`  Projected heap @ 500k cells : ~${proj500k.toFixed(0)} MB`);
  console.log(`  Projected heap @ 1M cells   : ~${proj1M.toFixed(0)} MB`);
  console.log(
    `  Assessment: ${proj1M > 512 ? '🔴 EXCEEDS 512MB target — refactor required' : '🟡 Within range — monitor closely'}`,
  );
  console.log();
}

// ---------------------------------------------------------------------------
// 4.  Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n  cyber-sheet-excel — Storage Layer Audit');
  console.log(`  Node ${process.version}   ${new Date().toISOString()}\n`);

  printKeyAnalysis();

  console.log('Running string-value batches (worst case: each cell has a unique string)...');
  const batches = [10_000, 50_000, 100_000, 200_000];
  const strResults: BenchResult[] = [];
  for (const n of batches) {
    process.stdout.write(`  inserting ${n.toLocaleString()} cells...`);
    const r = runBatch(n, 'string');
    strResults.push(r);
    console.log(` done (${r.insertMs}ms, +${r.heapMBDelta.toFixed(1)}MB)`);
  }
  printTable(strResults);

  console.log('Running numeric-value batches (best case: V8 SMI inlining)...');
  const numResults: BenchResult[] = [];
  for (const n of batches) {
    process.stdout.write(`  inserting ${n.toLocaleString()} cells...`);
    const r = runBatch(n, 'number');
    numResults.push(r);
    console.log(` done (${r.insertMs}ms, +${r.heapMBDelta.toFixed(1)}MB)`);
  }
  console.log('\nNumeric values:');
  printTable(numResults);

  printScalingProjection(strResults);
}

main().catch(err => { console.error(err); process.exit(1); });
