/**
 * WorkerEngineProxy.ts — Phase 9: Worker Isolation + Snapshot Transfer
 *
 * Main-thread proxy for a computation worker running EngineWorkerHost.
 * Exposes a Promise-based API matching the Worksheet operations and handles
 * the correlation of async request/response pairs over postMessage.
 *
 * ==========================================================================
 * USAGE
 * ==========================================================================
 *
 *  import { WorkerEngineProxy } from './WorkerEngineProxy';
 *
 *  const worker = new Worker(new URL('./engine.worker.ts', import.meta.url));
 *  const engine = new WorkerEngineProxy(worker);
 *
 *  await engine.setCellValue(1, 1, 42);
 *  const v = await engine.getCellValue(1, 1);  // 42
 *
 *  // Zero-copy snapshot transfer
 *  const buf = await engine.snapshot();        // ArrayBuffer transferred from worker
 *  await engine.applySnapshot(buf);            // ArrayBuffer transferred back
 *
 *  engine.terminate();
 *
 * ==========================================================================
 * TESTABILITY
 * ==========================================================================
 *
 * WorkerEngineProxy accepts any object implementing IWorkerLike — you can
 * inject a MockWorker that synchronously dispatches to EngineWorkerHost
 * without spawning a real thread.
 *
 * ==========================================================================
 * MEMORY MODEL
 * ==========================================================================
 *
 *  • snapshot() returns an ArrayBuffer transferred FROM the worker.
 *    After this call the worker no longer owns the memory.
 *
 *  • applySnapshot(buf) transfers the ArrayBuffer TO the worker.
 *    After this call the caller must not access `buf` — it is detached.
 *
 *  This is the canonical zero-copy snapshot exchange pattern.
 */

import type { ExtendedCellValue } from '../types';
import {
  type EngineOpName,
  type EngineRequest,
  type EngineResponse,
  type ResponseResult,
  type RC,
  getRequestTransferList,
} from './EngineWorkerProtocol';

// ---------------------------------------------------------------------------
// IWorkerLike — testable worker abstraction
// ---------------------------------------------------------------------------

/**
 * The minimal interface that WorkerEngineProxy requires of a Worker.
 * Both the real Web Worker and test mocks implement this.
 */
export interface IWorkerLike {
  /** Send a message to the worker, optionally transferring Transferables. */
  postMessage(data: unknown, transferList?: Transferable[]): void;
  /** Attach a handler for messages received from the worker. */
  addEventListener(event: 'message', handler: (ev: MessageEvent) => void): void;
  /** Remove a previously attached message handler. */
  removeEventListener(event: 'message', handler: (ev: MessageEvent) => void): void;
  /** Terminate the worker and release resources. */
  terminate(): void;
}

// ---------------------------------------------------------------------------
// Pending request record
// ---------------------------------------------------------------------------

type Pending<K extends EngineOpName = EngineOpName> = {
  resolve: (value: ResponseResult<K>) => void;
  reject:  (error: Error)             => void;
};

// ---------------------------------------------------------------------------
// WorkerEngineProxy
// ---------------------------------------------------------------------------

/**
 * Main-thread proxy for EngineWorkerHost.
 *
 * All methods return Promises that resolve/reject when the worker replies.
 * Concurrent requests are safe — each is keyed by a unique id.
 */
export class WorkerEngineProxy {
  private readonly worker:  IWorkerLike;
  private readonly pending: Map<number, Pending> = new Map();
  private nextId = 1;
  private terminated = false;

  constructor(worker: IWorkerLike) {
    this.worker = worker;
    this.worker.addEventListener('message', this._onMessage);
  }

  // ── Core send / receive ───────────────────────────────────────────────────

  private _send<K extends EngineOpName>(
    type:     K,
    payload:  EngineRequest<K>['payload'],
    transfer: Transferable[] = [],
  ): Promise<ResponseResult<K>> {
    if (this.terminated) {
      return Promise.reject(new Error('WorkerEngineProxy: worker has been terminated.'));
    }

    const id = this.nextId++;
    const req: EngineRequest<K> = { id, type, payload };

    return new Promise<ResponseResult<K>>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as Pending['resolve'], reject });
      this.worker.postMessage(req, [...transfer, ...getRequestTransferList(req as EngineRequest)]);
    });
  }

  private readonly _onMessage = (ev: MessageEvent): void => {
    const resp = ev.data as EngineResponse;
    const pending = this.pending.get(resp.id);
    if (!pending) return; // stale or unknown id — ignore
    this.pending.delete(resp.id);

    if (resp.ok) {
      pending.resolve(resp.result as ResponseResult<EngineOpName>);
    } else {
      pending.reject(new Error(`[Worker:${resp.type}] ${resp.error}`));
    }
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Health check. Resolves with 'pong' when the worker responds. */
  ping(): Promise<'pong'> {
    return this._send('ping', {});
  }

  /**
   * Terminate the underlying Worker and reject all pending Promises.
   * After this call the proxy is unusable.
   */
  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.worker.removeEventListener('message', this._onMessage);
    this.worker.terminate();
    for (const [, { reject }] of this.pending) {
      reject(new Error('WorkerEngineProxy: worker terminated before response.'));
    }
    this.pending.clear();
  }

  /**
   * Reset the worker's worksheet to a fresh empty state.
   * Equivalent to creating a new Worksheet on the worker thread.
   */
  reset(): Promise<void> {
    return this._send('reset', {});
  }

  // ── Cell operations ───────────────────────────────────────────────────────

  /** Set a cell value on the worker's worksheet. */
  setCellValue(row: number, col: number, value: ExtendedCellValue): Promise<void> {
    return this._send('setCellValue', { row, col, value });
  }

  /** Get a cell value from the worker's worksheet. Null if empty. */
  getCellValue(row: number, col: number): Promise<ExtendedCellValue> {
    return this._send('getCellValue', { row, col });
  }

  // ── DAG ───────────────────────────────────────────────────────────────────

  /**
   * Register formula dependency edges in the worker's DAG.
   * @param row   Formula cell row (1-based).
   * @param col   Formula cell col (1-based).
   * @param deps  Predecessor cells whose values this formula reads.
   */
  registerDeps(row: number, col: number, deps: RC[]): Promise<void> {
    return this._send('registerDeps', { row, col, deps });
  }

  // ── Merges ────────────────────────────────────────────────────────────────

  /** Merge a rectangular range on the worker's worksheet. */
  mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): Promise<void> {
    return this._send('mergeCells', { startRow, startCol, endRow, endCol });
  }

  // ── Visibility ────────────────────────────────────────────────────────────

  hideRow(row: number):  Promise<void> { return this._send('hideRow',  { row }); }
  showRow(row: number):  Promise<void> { return this._send('showRow',  { row }); }
  hideCol(col: number):  Promise<void> { return this._send('hideCol',  { col }); }
  showCol(col: number):  Promise<void> { return this._send('showCol',  { col }); }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Encode and transfer the worker's current snapshot.
   *
   * The returned ArrayBuffer is **transferred** from the worker — the worker
   * no longer owns that memory.  Callers may store it in IndexedDB, send it
   * over the network, or pass it back via `applySnapshot()`.
   */
  snapshot(): Promise<ArrayBuffer> {
    return this._send('snapshot', {});
  }

  /**
   * Apply a snapshot to the worker's worksheet.
   *
   * The `buf` ArrayBuffer is **transferred** to the worker — the caller must
   * not access `buf` after this call (it is detached in the caller's context).
   *
   * @param buf  An ArrayBuffer previously returned by `snapshot()` or decoded
   *             from a stored CSEX v2 file.
   */
  applySnapshot(buf: ArrayBuffer): Promise<void> {
    return this._send('applySnapshot', { buf }, [buf]);
  }
}
