/**
 * EngineWorkerHost.ts — Phase 9: Worker Isolation + Snapshot Transfer
 *
 * Runs inside a Web Worker or Node.js worker_threads worker.
 * Owns the Worksheet instance and handles EngineRequest messages
 * dispatched from WorkerEngineProxy on the main thread.
 *
 * ==========================================================================
 * OWNERSHIP MODEL
 * ==========================================================================
 *
 *  • One EngineWorkerHost per worker thread.
 *  • One Worksheet per EngineWorkerHost.
 *  • All mutations are synchronous on the worker thread — no concurrency.
 *  • Snapshot ArrayBuffers are transferred (not copied) back to the caller
 *    via the postMessage transfer list.
 *
 * ==========================================================================
 * SUPPORTED OPERATIONS (see EngineWorkerProtocol.ts for full type map)
 * ==========================================================================
 *
 *  ping / reset / setCellValue / getCellValue / registerDeps
 *  mergeCells / hideRow / showRow / hideCol / showCol
 *  snapshot / applySnapshot
 *  applyPatch  ← Phase 10: apply a WorksheetPatch, returns inverse patch
 *
 * ==========================================================================
 * USAGE — Worker entry point (e.g., engine.worker.ts)
 * ==========================================================================
 *
 *  import { EngineWorkerHost } from './EngineWorkerHost';
 *  const host = new EngineWorkerHost();
 *  host.install(); // attaches message listener to globalThis
 *
 * ==========================================================================
 * USAGE — Testing (no real Worker required)
 * ==========================================================================
 *
 *  const host = new EngineWorkerHost('TestSheet');
 *  const { response } = host.handleMessage({ id: 1, type: 'ping', payload: {} });
 *  // response.result === 'pong'
 */

import { Worksheet } from '../worksheet';
import { snapshotCodec }  from '../persistence/SnapshotCodec';
import { recordingApplyPatch } from '../patch/PatchRecorder';
import {
  type EngineRequest,
  type EngineResponse,
  type EngineOpName,
  type RequestPayload,
  getResponseTransferList,
} from './EngineWorkerProtocol';

// ---------------------------------------------------------------------------
// SendFn — abstraction over postMessage
// ---------------------------------------------------------------------------

/**
 * A function that sends a response to the caller.
 * In a real Worker this is `self.postMessage`; in tests it's a spy function.
 * The second argument mirrors the transfer-list parameter of postMessage.
 */
export type SendFn = (response: EngineResponse, transferList: Transferable[]) => void;

// ---------------------------------------------------------------------------
// EngineWorkerHost
// ---------------------------------------------------------------------------

/**
 * Worker-side computation host.
 *
 * Holds the authoritative Worksheet instance.  All read/write operations
 * on the sheet happen synchronously on the worker thread.
 *
 * `handleMessage()` is the single dispatch entry point — pure function of
 * the request, safe to call in tests without a real Worker environment.
 */
export class EngineWorkerHost {
  private ws: Worksheet;
  private readonly sheetName: string;

  constructor(sheetName = 'Sheet1') {
    this.sheetName = sheetName;
    this.ws = new Worksheet(sheetName);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Process one EngineRequest and return the EngineResponse + transfer list.
   * Never throws — all errors are caught and returned as `ok: false` responses.
   */
  handleMessage(msg: EngineRequest): { response: EngineResponse; transferList: Transferable[] } {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = this._dispatch(msg) as any;
      const response: EngineResponse = { id: msg.id, type: msg.type as EngineOpName, ok: true, result };
      const transferList = getResponseTransferList(response);
      return { response, transferList };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const response: EngineResponse = { id: msg.id, type: msg.type as EngineOpName, ok: false, error };
      return { response, transferList: [] };
    }
  }

  /**
   * Install the host on globalThis (= `self` inside a Worker).
   * Call once from the worker entry point.
   *
   * @param sendFn  Optional override — defaults to `globalThis.postMessage`.
   */
  install(sendFn?: SendFn): void {
    const send: SendFn = sendFn ?? ((resp, tl) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).postMessage(resp, tl);
    });

    globalThis.addEventListener('message', (ev: Event | MessageEvent) => {
      const data = (ev as MessageEvent).data as EngineRequest;
      const { response, transferList } = this.handleMessage(data);
      send(response, transferList);
    });
  }

  // ── Internal dispatch ─────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _dispatch(msg: EngineRequest): any {
    switch (msg.type) {
      // ── Lifecycle ──────────────────────────────────────────────────────
      case 'ping':
        return 'pong';

      case 'reset':
        this.ws = new Worksheet(this.sheetName);
        return;

      // ── Cell read / write ──────────────────────────────────────────────
      case 'setCellValue': {
        const { row, col, value } = msg.payload as RequestPayload<'setCellValue'>;
        this.ws.setCellValue({ row, col }, value);
        return;
      }

      case 'getCellValue': {
        const { row, col } = msg.payload as RequestPayload<'getCellValue'>;
        return this.ws.getCellValue({ row, col });
      }

      // ── DAG ───────────────────────────────────────────────────────────
      case 'registerDeps': {
        const { row, col, deps } = msg.payload as RequestPayload<'registerDeps'>;
        this.ws.registerDependencies({ row, col }, deps);
        return;
      }

      // ── Merges ────────────────────────────────────────────────────────
      case 'mergeCells': {
        const { startRow, startCol, endRow, endCol } = msg.payload as RequestPayload<'mergeCells'>;
        this.ws.mergeCells({
          start: { row: startRow, col: startCol },
          end:   { row: endRow,   col: endCol   },
        });
        return;
      }

      // ── Visibility ────────────────────────────────────────────────────
      case 'hideRow':  this.ws.hideRow((msg.payload as RequestPayload<'hideRow'>).row);  return;
      case 'showRow':  this.ws.showRow((msg.payload as RequestPayload<'showRow'>).row);  return;
      case 'hideCol':  this.ws.hideCol((msg.payload as RequestPayload<'hideCol'>).col);  return;
      case 'showCol':  this.ws.showCol((msg.payload as RequestPayload<'showCol'>).col);  return;

      // ── Persistence ───────────────────────────────────────────────────
      case 'snapshot': {
        const typed = snapshotCodec.encode(this.ws.extractSnapshot());
        // Return the underlying ArrayBuffer so postMessage can transfer it.
        // Ensure the returned buffer exactly covers the Uint8Array's slice.
        return typed.byteOffset === 0 && typed.byteLength === typed.buffer.byteLength
          ? typed.buffer as ArrayBuffer
          : typed.buffer.slice(typed.byteOffset, typed.byteOffset + typed.byteLength) as ArrayBuffer;
      }

      case 'applySnapshot': {
        const { buf } = msg.payload as RequestPayload<'applySnapshot'>;
        const snap = snapshotCodec.decode(new Uint8Array(buf));
        this.ws.applySnapshot(snap);
        return;
      }

      // ── Patch ─────────────────────────────────────────────────────────
      case 'applyPatch': {
        const { patch } = msg.payload as RequestPayload<'applyPatch'>;
        // Apply the patch and compute the inverse in one pass.
        // The inverse is sent back to the main thread so the PatchUndoStack
        // can store it without requiring a separate round-trip.
        const inverse = recordingApplyPatch(this.ws, patch);
        return inverse;
      }

      default: {
        throw new Error(`EngineWorkerHost: unknown message type "${(msg as EngineRequest).type}".`);
      }
    }
  }
}
