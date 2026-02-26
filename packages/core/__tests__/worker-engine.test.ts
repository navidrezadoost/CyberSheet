/**
 * worker-engine.test.ts — Phase 9: Worker Isolation + Snapshot Transfer
 *
 * Tests for the three components of the worker isolation layer:
 *
 *  1. EngineWorkerProtocol  — helper utilities (getRequestTransferList, etc.)
 *  2. EngineWorkerHost      — synchronous handleMessage() dispatch
 *  3. WorkerEngineProxy     — async Promise-based API via MockWorker
 *
 * No real Worker is spawned.  MockWorker synchronously routes proxy
 * postMessage calls to EngineWorkerHost.handleMessage() and immediately
 * fires the response back — making all proxy Promises tick-safe.
 */

import { EngineWorkerHost } from '../src/worker/EngineWorkerHost';
import {
  WorkerEngineProxy,
  type IWorkerLike,
} from '../src/worker/WorkerEngineProxy';
import {
  getRequestTransferList,
  getResponseTransferList,
  type EngineRequest,
  type EngineResponse,
} from '../src/worker/EngineWorkerProtocol';
import { snapshotCodec } from '../src/persistence/SnapshotCodec';
import type { Address } from '../src/types';

// ---------------------------------------------------------------------------
// MockWorker — synchronously bridges proxy ↔ host
// ---------------------------------------------------------------------------

/**
 * A synchronous in-process Worker mock.
 *
 * When `postMessage()` is called (by WorkerEngineProxy), it immediately
 * dispatches the message to an EngineWorkerHost and fires the response back
 * to all registered 'message' listeners — simulating the worker's message
 * round-trip without threads, tasks, or timers.
 */
class MockWorker implements IWorkerLike {
  private readonly host: EngineWorkerHost;
  private handlers: Array<(ev: MessageEvent) => void> = [];
  public terminated = false;

  constructor(host: EngineWorkerHost) {
    this.host = host;
  }

  postMessage(data: unknown, _transferList?: Transferable[]): void {
    if (this.terminated) return;
    const req = data as EngineRequest;
    const { response } = this.host.handleMessage(req);
    // Deliver the response synchronously to all registered listeners.
    const event = new MessageEvent('message', { data: response });
    for (const h of this.handlers) h(event);
  }

  addEventListener(_event: 'message', handler: (ev: MessageEvent) => void): void {
    this.handlers.push(handler);
  }

  removeEventListener(_event: 'message', handler: (ev: MessageEvent) => void): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  terminate(): void {
    this.terminated = true;
    this.handlers = [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addr(row: number, col: number): Address { return { row, col }; }

/** Create a paired (host, proxy) for easy test setup. */
function makeEngine(sheetName = 'Sheet1'): { host: EngineWorkerHost; proxy: WorkerEngineProxy } {
  const host = new EngineWorkerHost(sheetName);
  const mock  = new MockWorker(host);
  const proxy = new WorkerEngineProxy(mock);
  return { host, proxy };
}

// ---------------------------------------------------------------------------
// 1. EngineWorkerProtocol helpers
// ---------------------------------------------------------------------------

describe('EngineWorkerProtocol — helper utilities', () => {

  it('getRequestTransferList returns [] for non-transfer requests', () => {
    const req: EngineRequest = { id: 1, type: 'ping', payload: {} };
    expect(getRequestTransferList(req)).toHaveLength(0);
  });

  it('getRequestTransferList returns [buf] for applySnapshot', () => {
    const buf = new ArrayBuffer(64);
    const req: EngineRequest = { id: 1, type: 'applySnapshot', payload: { buf } };
    const list = getRequestTransferList(req);
    expect(list).toHaveLength(1);
    expect(list[0]).toBe(buf);
  });

  it('getResponseTransferList returns [] for non-transfer responses', () => {
    const resp: EngineResponse = { id: 1, type: 'ping', ok: true, result: 'pong' };
    expect(getResponseTransferList(resp)).toHaveLength(0);
  });

  it('getResponseTransferList returns [buf] for snapshot response', () => {
    const buf = new ArrayBuffer(32);
    const resp: EngineResponse = { id: 1, type: 'snapshot', ok: true, result: buf };
    const list = getResponseTransferList(resp);
    expect(list).toHaveLength(1);
    expect(list[0]).toBe(buf);
  });

  it('getResponseTransferList returns [] for failed snapshot response', () => {
    const resp: EngineResponse = { id: 1, type: 'snapshot', ok: false, error: 'oops' };
    expect(getResponseTransferList(resp)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. EngineWorkerHost — handleMessage dispatch
// ---------------------------------------------------------------------------

describe('EngineWorkerHost — handleMessage dispatch', () => {

  it('ping returns pong', () => {
    const host = new EngineWorkerHost();
    const { response } = host.handleMessage({ id: 1, type: 'ping', payload: {} });
    expect(response.ok).toBe(true);
    expect((response as { result: unknown }).result).toBe('pong');
  });

  it('setCellValue then getCellValue round-trips a string', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 1, col: 1, value: 'hello' } });
    const { response } = host.handleMessage({ id: 2, type: 'getCellValue', payload: { row: 1, col: 1 } });
    expect(response.ok).toBe(true);
    expect((response as { result: unknown }).result).toBe('hello');
  });

  it('setCellValue then getCellValue round-trips a number', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 3, col: 5, value: 99.9 } });
    const { response } = host.handleMessage({ id: 2, type: 'getCellValue', payload: { row: 3, col: 5 } });
    expect((response as { result: unknown }).result).toBe(99.9);
  });

  it('getCellValue returns null for empty cell', () => {
    const host = new EngineWorkerHost();
    const { response } = host.handleMessage({ id: 1, type: 'getCellValue', payload: { row: 99, col: 99 } });
    expect((response as { result: unknown }).result).toBeNull();
  });

  it('reset clears cells', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 1, col: 1, value: 42 } });
    host.handleMessage({ id: 2, type: 'reset', payload: {} });
    const { response } = host.handleMessage({ id: 3, type: 'getCellValue', payload: { row: 1, col: 1 } });
    expect((response as { result: unknown }).result).toBeNull();
  });

  it('hideRow / showRow reflected in snapshot', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'hideRow', payload: { row: 5 } });
    const { response: snapResp } = host.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    expect(snapResp.ok).toBe(true);
    const buf  = (snapResp as { result: unknown }).result as ArrayBuffer;
    const snap = snapshotCodec.decode(new Uint8Array(buf));
    expect(snap.hiddenRows).toContain(5);
    // showRow clears it
    host.handleMessage({ id: 3, type: 'showRow', payload: { row: 5 } });
    const { response: snapResp2 } = host.handleMessage({ id: 4, type: 'snapshot', payload: {} });
    const snap2 = snapshotCodec.decode(new Uint8Array((snapResp2 as { result: unknown }).result as ArrayBuffer));
    expect(snap2.hiddenRows).not.toContain(5);
  });

  it('hideCol / showCol reflected in snapshot', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'hideCol', payload: { col: 3 } });
    const { response } = host.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    const snap = snapshotCodec.decode(new Uint8Array((response as { result: unknown }).result as ArrayBuffer));
    expect(snap.hiddenCols).toContain(3);
  });

  it('mergeCells reflected in snapshot', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'mergeCells', payload: { startRow: 1, startCol: 1, endRow: 2, endCol: 3 } });
    const { response } = host.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    const snap = snapshotCodec.decode(new Uint8Array((response as { result: unknown }).result as ArrayBuffer));
    expect(snap.merges).toHaveLength(1);
    expect(snap.merges[0]).toEqual({ startRow: 1, startCol: 1, endRow: 2, endCol: 3 });
  });

  it('registerDeps reflected in DAG snapshot section', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'registerDeps', payload: { row: 3, col: 1, deps: [{ row: 1, col: 1 }, { row: 2, col: 1 }] } });
    const { response } = host.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    const snap = snapshotCodec.decode(new Uint8Array((response as { result: unknown }).result as ArrayBuffer));
    const edge = snap.dagEdges.find(e => e.row === 3 && e.col === 1);
    expect(edge).toBeDefined();
    expect(edge?.deps).toHaveLength(2);
  });

  it('snapshot returns an ArrayBuffer', () => {
    const host = new EngineWorkerHost();
    const { response } = host.handleMessage({ id: 1, type: 'snapshot', payload: {} });
    expect(response.ok).toBe(true);
    expect((response as { result: unknown }).result).toBeInstanceOf(ArrayBuffer);
  });

  it('applySnapshot restores cells from encoded buffer', () => {
    const host1 = new EngineWorkerHost();
    host1.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 1, col: 1, value: 'transfer' } });
    const { response: snapResp } = host1.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    const buf = (snapResp as { result: unknown }).result as ArrayBuffer;

    const host2 = new EngineWorkerHost();
    host2.handleMessage({ id: 1, type: 'applySnapshot', payload: { buf } });
    const { response } = host2.handleMessage({ id: 2, type: 'getCellValue', payload: { row: 1, col: 1 } });
    expect((response as { result: unknown }).result).toBe('transfer');
  });

  it('handleMessage catches errors and returns ok:false', () => {
    const host = new EngineWorkerHost();
    // Force a MergeConflictError by merging the same region twice.
    host.handleMessage({ id: 1, type: 'mergeCells', payload: { startRow: 1, startCol: 1, endRow: 3, endCol: 3 } });
    const { response } = host.handleMessage({ id: 2, type: 'mergeCells', payload: { startRow: 1, startCol: 1, endRow: 3, endCol: 3 } });
    expect(response.ok).toBe(false);
    expect((response as { error: string }).error).toBeTruthy();
  });

  it('response id echoes the request id', () => {
    const host = new EngineWorkerHost();
    const { response } = host.handleMessage({ id: 42, type: 'ping', payload: {} });
    expect(response.id).toBe(42);
  });

  it('response type echoes the request type', () => {
    const host = new EngineWorkerHost();
    const { response } = host.handleMessage({ id: 1, type: 'ping', payload: {} });
    expect(response.type).toBe('ping');
  });
});

// ---------------------------------------------------------------------------
// 3. WorkerEngineProxy — async API via MockWorker
// ---------------------------------------------------------------------------

describe('WorkerEngineProxy — async API (MockWorker)', () => {

  it('ping resolves to pong', async () => {
    const { proxy } = makeEngine();
    await expect(proxy.ping()).resolves.toBe('pong');
  });

  it('setCellValue / getCellValue round-trips', async () => {
    const { proxy } = makeEngine();
    await proxy.setCellValue(1, 1, 'world');
    await expect(proxy.getCellValue(1, 1)).resolves.toBe('world');
  });

  it('getCellValue returns null for unset cell', async () => {
    const { proxy } = makeEngine();
    await expect(proxy.getCellValue(99, 99)).resolves.toBeNull();
  });

  it('reset clears all cells', async () => {
    const { proxy } = makeEngine();
    await proxy.setCellValue(1, 1, 100);
    await proxy.reset();
    await expect(proxy.getCellValue(1, 1)).resolves.toBeNull();
  });

  it('hideRow / showRow reflected in snapshot', async () => {
    const { proxy } = makeEngine();
    await proxy.hideRow(7);
    const buf  = await proxy.snapshot();
    const snap = snapshotCodec.decode(new Uint8Array(buf));
    expect(snap.hiddenRows).toContain(7);
    await proxy.showRow(7);
    const buf2  = await proxy.snapshot();
    const snap2 = snapshotCodec.decode(new Uint8Array(buf2));
    expect(snap2.hiddenRows).not.toContain(7);
  });

  it('hideCol / showCol reflected in snapshot', async () => {
    const { proxy } = makeEngine();
    await proxy.hideCol(4);
    const buf  = await proxy.snapshot();
    const snap = snapshotCodec.decode(new Uint8Array(buf));
    expect(snap.hiddenCols).toContain(4);
    await proxy.showCol(4);
    const buf2  = await proxy.snapshot();
    const snap2 = snapshotCodec.decode(new Uint8Array(buf2));
    expect(snap2.hiddenCols).not.toContain(4);
  });

  it('mergeCells reflected in snapshot merges', async () => {
    const { proxy } = makeEngine();
    await proxy.mergeCells(2, 2, 4, 5);
    const buf  = await proxy.snapshot();
    const snap = snapshotCodec.decode(new Uint8Array(buf));
    expect(snap.merges).toHaveLength(1);
    expect(snap.merges[0]).toEqual({ startRow: 2, startCol: 2, endRow: 4, endCol: 5 });
  });

  it('registerDeps reflected in snapshot DAG section', async () => {
    const { proxy } = makeEngine();
    await proxy.registerDeps(5, 1, [{ row: 1, col: 1 }, { row: 2, col: 1 }]);
    const buf = await proxy.snapshot();
    const snap = snapshotCodec.decode(new Uint8Array(buf));
    const edge = snap.dagEdges.find(e => e.row === 5 && e.col === 1);
    expect(edge).toBeDefined();
    expect(edge?.deps).toHaveLength(2);
  });

  it('snapshot() returns an ArrayBuffer', async () => {
    const { proxy } = makeEngine();
    const buf = await proxy.snapshot();
    expect(buf).toBeInstanceOf(ArrayBuffer);
  });

  it('applySnapshot restores cells from a foreign worksheet snapshot', async () => {
    // Build state in engine A.
    const { proxy: proxyA } = makeEngine('A');
    await proxyA.setCellValue(1, 1, 'persisted');
    await proxyA.setCellValue(2, 2, 777);
    const buf = await proxyA.snapshot();

    // Restore into engine B.
    const { proxy: proxyB } = makeEngine('B');
    await proxyB.applySnapshot(buf);

    await expect(proxyB.getCellValue(1, 1)).resolves.toBe('persisted');
    await expect(proxyB.getCellValue(2, 2)).resolves.toBe(777);
  });

  it('applySnapshot clears previous state on target engine', async () => {
    const { proxy: proxyA } = makeEngine('A');
    await proxyA.setCellValue(1, 1, 'from-A');
    const buf = await proxyA.snapshot();

    const { proxy: proxyB } = makeEngine('B');
    await proxyB.setCellValue(5, 5, 'old-B-data');
    await proxyB.applySnapshot(buf);

    await expect(proxyB.getCellValue(1, 1)).resolves.toBe('from-A');
    await expect(proxyB.getCellValue(5, 5)).resolves.toBeNull(); // old data gone
  });

  it('concurrent requests resolve in order', async () => {
    const { proxy } = makeEngine();
    // Fire 5 setCellValue requests and 5 getCellValue requests concurrently.
    await Promise.all([
      proxy.setCellValue(1, 1, 10),
      proxy.setCellValue(1, 2, 20),
      proxy.setCellValue(1, 3, 30),
      proxy.setCellValue(1, 4, 40),
      proxy.setCellValue(1, 5, 50),
    ]);
    const results = await Promise.all([
      proxy.getCellValue(1, 1),
      proxy.getCellValue(1, 2),
      proxy.getCellValue(1, 3),
      proxy.getCellValue(1, 4),
      proxy.getCellValue(1, 5),
    ]);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it('worker errors propagate as rejected Promises', async () => {
    const { proxy } = makeEngine();
    await proxy.mergeCells(1, 1, 3, 3);
    await expect(proxy.mergeCells(1, 1, 3, 3)).rejects.toThrow(/Worker:mergeCells/);
  });

  it('terminate() causes subsequent calls to reject', async () => {
    const { proxy } = makeEngine();
    proxy.terminate();
    await expect(proxy.ping()).rejects.toThrow(/terminated/);
  });

  it('terminate() rejects pending Promises', async () => {
    // Use a MockWorker that does NOT immediately dispatch (holds message)
    // to test pending-reject path.
    const host = new EngineWorkerHost();
    /** A mock that queues messages instead of dispatching immediately. */
    class LazyMockWorker implements IWorkerLike {
      private handlers: Array<(ev: MessageEvent) => void> = [];
      readonly messages: Array<{ data: unknown }> = [];

      postMessage(data: unknown): void { this.messages.push({ data }); }

      addEventListener(_: 'message', h: (ev: MessageEvent) => void): void { this.handlers.push(h); }

      removeEventListener(_: 'message', h: (ev: MessageEvent) => void): void {
        this.handlers = this.handlers.filter(x => x !== h);
      }

      terminate(): void { this.handlers = []; }
    }

    const lazy = new LazyMockWorker();
    const proxy = new WorkerEngineProxy(lazy);
    const pingPromise = proxy.ping(); // pending — worker hasn't replied
    proxy.terminate();
    await expect(pingPromise).rejects.toThrow(/terminated/);
  });

  it('multiple snapshots return independent ArrayBuffers', async () => {
    const { proxy } = makeEngine();
    await proxy.setCellValue(1, 1, 1);
    const buf1 = await proxy.snapshot();
    await proxy.setCellValue(1, 1, 2);
    const buf2 = await proxy.snapshot();
    // They should be different objects
    expect(buf1).not.toBe(buf2);
    // And encode different state
    const v1 = snapshotCodec.decode(new Uint8Array(buf1)).cells[0]?.cell.value;
    const v2 = snapshotCodec.decode(new Uint8Array(buf2)).cells[0]?.cell.value;
    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. End-to-end: proxy → host pipeline with CRC validation
// ---------------------------------------------------------------------------

describe('End-to-end pipeline — CRC integrity across Worker boundary', () => {

  it('snapshot transferred via proxy decodes with valid CRC', async () => {
    const { proxy } = makeEngine();
    await proxy.setCellValue(1, 1, 'integrity-check');
    const buf = await proxy.snapshot();
    // snapshotCodec.decode performs CRC validation internally
    expect(() => snapshotCodec.decode(new Uint8Array(buf))).not.toThrow();
  });

  it('mutating the snapshot ArrayBuffer after transfer causes CRC error on next decode', () => {
    const host = new EngineWorkerHost();
    host.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 1, col: 1, value: 'abc' } });
    const { response } = host.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    const buf = (response as { result: ArrayBuffer }).result;

    // Corrupt the last byte.
    const view = new DataView(buf);
    view.setUint8(buf.byteLength - 1, view.getUint8(buf.byteLength - 1) ^ 0xFF);
    expect(() => snapshotCodec.decode(new Uint8Array(buf))).toThrow(/checksum mismatch/i);
  });
});
