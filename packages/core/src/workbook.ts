import {
  Worksheet,
  adoptWorksheetByWorkbook,
  withWorkbookWorksheetMutationCapability,
} from './worksheet';
import type {
  WorkbookCellWriteEventSink,
  WorkbookCellWriteState,
  WorkbookWorksheetMutationCapability,
  WorkbookCellWriteFailurePhase,
} from './worksheet';
import { IFormulaEngine } from './types';
import { StyleCache } from './StyleCache';
import { EventBus } from './EventBus';
import { setupWorkbookLazyBridges, type WorkbookEventBridgeManager } from './eventBridge';
import { PivotRegistry, PivotRegistryImpl } from './PivotRegistry';
import type { PivotId } from './PivotRegistry';
import { PivotSnapshotStore } from './PivotSnapshotStore';
import { PivotDependencyIndexImpl } from './PivotDependencyIndex';
import { PivotInvalidationEngineImpl } from './PivotInvalidationEngine';
import { PivotRecomputeEngineImpl } from './PivotRecomputeEngine'; // Phase 31a
import { PivotAnchorIndexImpl } from './PivotAnchorIndex'; // Phase 32
import type { SlicerId, SlicerValue, SlicerStateStorable } from './PivotEngine'; // Phase 35
import type { Range, Address, Cell, CellStyle, SheetEvents } from './types';
import type { PivotConfig } from './PivotEngine';
import { PivotEngine } from './PivotEngine';
import { toDisplayValue } from './utils/cell-value-normalizer'; // Storage→Display boundary
import { transformToPivotSnapshot } from './PivotSnapshotTransformer';
import { MAX_WORKSHEET_COLUMN, MAX_WORKSHEET_ROW } from './dag/DependencyGraph';
import { OwnerBackedWorkbookSheetView } from './WorkbookSheetView';
import type {
  WorkbookId,
  WorkbookMutationPort,
  WorkbookSheetView,
  WorkbookTransactionContext,
  WorksheetId,
} from './workbook-access-types';
import type {
  EventAPI,
  WorkbookColumnWidthChangeEvent,
  WorkbookRowHeightChangeEvent,
} from './EventBus';
import { GetPivotData, type PivotDataFilter, type GetPivotDataResult } from './GetPivotData';
import {
  runBeforeWorkbookMutationTestApply,
  runBeforeWorkbookMutationBatchSettlement,
  runBeforeWorkbookMutationTestRollback,
  hasWorkbookMutationTestTimingHooks,
  runWorkbookMutationTestWorksheetFailure,
  runWorkbookMutationTestFailure,
  reportWorkbookMutationTestApply,
  reportWorkbookMutationTestPhase,
} from './workbookMutationTestHooks';
import { getWorkbookMutationStrategy } from './workbookMutationStrategy';

let nextWorkbookIdentity = 1;

type CellWriteOperation =
  | { kind: 'setCellValue'; worksheetId: WorksheetId; address: Address; value: Cell['value'] }
  | { kind: 'setCellFormula'; worksheetId: WorksheetId; address: Address; formula: string; displayValue?: Cell['value'] }
  | { kind: 'clearCellContent'; worksheetId: WorksheetId; address: Address }
  | { kind: 'clearCellFormula'; worksheetId: WorksheetId; address: Address }
  | { kind: 'setCellStyle'; worksheetId: WorksheetId; address: Address; style: CellStyle | undefined }
  | { kind: 'setRowHeight'; worksheetId: WorksheetId; row: number; heightPx: number }
  | { kind: 'setColumnWidth'; worksheetId: WorksheetId; column: number; widthPx: number };

type WorkbookCommitEvent =
  | { kind: 'worksheet'; worksheet: Worksheet; capability: WorkbookWorksheetMutationCapability; event: SheetEvents }
  | { kind: 'workbook-dimension'; eventName: 'row-height-change'; payload: WorkbookRowHeightChangeEvent }
  | { kind: 'workbook-dimension'; eventName: 'column-width-change'; payload: WorkbookColumnWidthChangeEvent };

type QueueControl = {
  committed: boolean;
  cancelled: boolean;
  cancel(error: WorkbookOperationCancelledError): void;
  markCommitted(): void;
};

type QueuedOperation<T = unknown> = {
  run(control: QueueControl): T | Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
};

function cloneWriteData<T>(
  value: T,
  copies = new WeakMap<object, object>(),
  ancestors = new WeakSet<object>(),
): T {
  if (value === null || typeof value !== 'object') return value;
  if (ancestors.has(value)) throw new TypeError('Workbook cell-write values and styles cannot contain cycles');
  const existing = copies.get(value);
  if (existing) return existing as T;
  if (Array.isArray(value)) {
    const copy: unknown[] = new Array(value.length);
    copies.set(value, copy);
    ancestors.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') continue;
      const index = Number(key);
      if (typeof key !== 'string' || !Number.isInteger(index) || index < 0 || String(index) !== key || index >= value.length) {
        throw new TypeError('Workbook cell-write arrays must be dense and have no custom properties');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError('Workbook cell-write arrays must contain enumerable data entries');
      }
      copy[index] = cloneWriteData(descriptor.value, copies, ancestors);
    }
    for (let index = 0; index < copy.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(copy, index)) throw new TypeError('Workbook cell-write arrays must be dense');
    }
    ancestors.delete(value);
    return Object.freeze(copy) as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Workbook cell-write values and styles require plain configuration objects');
  }
  const copy: Record<PropertyKey, unknown> = Object.create(prototype);
  copies.set(value, copy);
  ancestors.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    // Interned styles carry a non-enumerable marker that is cache metadata,
    // not part of the public style value. Drop it before cloning the config.
    if (typeof key === 'symbol' && !descriptor.enumerable) continue;
    if (!descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError('Workbook cell-write objects require enumerable data properties');
    }
    Object.defineProperty(copy, key, {
      value: cloneWriteData(descriptor.value, copies, ancestors),
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  ancestors.delete(value);
  return Object.freeze(copy) as T;
}

export class WorkbookOperationCancelledError extends Error {
  readonly code = 'WORKBOOK_OPERATION_CANCELLED';

  constructor(message = 'Workbook mutation was cancelled because the Workbook was disposed') {
    super(message);
    this.name = 'WorkbookOperationCancelledError';
  }
}

export class WorkbookMutationRollbackError extends Error {
  constructor(
    readonly operationError: unknown,
    readonly rollbackErrors: readonly unknown[],
  ) {
    super('Workbook mutation failed and rollback could not restore a verified healthy state');
    this.name = 'WorkbookMutationRollbackError';
  }
}

export class WorkbookRecoveryRequiredError extends Error {
  constructor(readonly failure: WorkbookMutationRollbackError) {
    super('Workbook is recovery-required and rejects mutations or refresh operations');
    this.name = 'WorkbookRecoveryRequiredError';
  }
}

export type WorkbookMutationHealth =
  | { readonly status: 'healthy' }
  | { readonly status: 'recovery-required'; readonly failure: WorkbookMutationRollbackError }
  | { readonly status: 'disposed' };

function detachReadonly<T>(value: T): T {
  if (typeof value === 'function') return undefined as T;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return Object.freeze(value.map(detachReadonly)) as T;
  if (value instanceof Map) return Object.freeze(Array.from(value, ([k, v]) => [detachReadonly(k), detachReadonly(v)])) as T;
  if (value instanceof Set) return Object.freeze(Array.from(value, detachReadonly)) as T;
  const copy: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) copy[key] = detachReadonly(entry);
  return Object.freeze(copy) as T;
}

export class Workbook {
  static #issuedSheetViews = new WeakSet<object>();

  /** @internal Read-only provenance check; it cannot grant view authority. */
  static isWorkbookIssuedSheetView(value: unknown): value is WorkbookSheetView {
    return value !== null
      && (typeof value === 'object' || typeof value === 'function')
      && Workbook.#issuedSheetViews.has(value as object);
  }

  #workbookId = `wb-${nextWorkbookIdentity++}` as WorkbookId;
  get workbookId(): WorkbookId { return this.#workbookId; }
  #sheets = new Map<string, Worksheet>();
  #sheetsById = new Map<WorksheetId, Worksheet>();
  #sheetMutationCapabilities = new Map<WorksheetId, WorkbookWorksheetMutationCapability>();
  #viewsById = new Map<WorksheetId, WorkbookSheetView>();
  #active?: string;
  #formulaEngine?: IFormulaEngine;
  #styleCache = new StyleCache();
  #pivotRegistry: PivotRegistry = new PivotRegistryImpl();
  #pivotSnapshotStore = new PivotSnapshotStore(); // Phase 29
  #pivotDependencyIndex = new PivotDependencyIndexImpl(); // Phase 30b
  #pivotInvalidationEngine = new PivotInvalidationEngineImpl( // Phase 30b
    this.#pivotDependencyIndex,
    this.#pivotRegistry as import('./PivotRegistry').PivotRegistryImpl
  );
  #pivotRecomputeEngine = new PivotRecomputeEngineImpl( // Phase 31a + 36a
    this.#pivotRegistry,
    this.#pivotSnapshotStore,
    this.#buildPivot.bind(this),
    // Phase 36a: Inject source data extractor for partial recompute
    (worksheetId: string, range: Range) => {
      const worksheet = this.#getWorksheetInternal(worksheetId);
      if (!worksheet) return null;
      return this.#extractSourceData(worksheet, range);
    }
  );
  #pivotAnchorIndex = new PivotAnchorIndexImpl(); // Phase 32
  #internalEventBus = new EventBus(undefined, () => !this.#disposed, true);
  readonly eventBus: EventAPI = Object.freeze({
    on: <Event extends string>(
      event: Event,
      handler: (payload: Event extends 'row-height-change'
        ? WorkbookRowHeightChangeEvent
        : Event extends 'column-width-change'
          ? WorkbookColumnWidthChangeEvent
          : unknown) => void,
    ) => {
      this.#assertMutationAllowed();
      return this.#internalEventBus.on(event, handler as (payload: unknown) => void);
    },
    once: <Event extends string>(
      event: Event,
      handler: (payload: Event extends 'row-height-change'
        ? WorkbookRowHeightChangeEvent
        : Event extends 'column-width-change'
          ? WorkbookColumnWidthChangeEvent
          : unknown) => void,
    ) => {
      this.#assertMutationAllowed();
      this.#internalEventBus.once(event, handler as (payload: unknown) => void);
    },
    off: <Event extends string>(
      event: Event,
      handler: (payload: Event extends 'row-height-change'
        ? WorkbookRowHeightChangeEvent
        : Event extends 'column-width-change'
          ? WorkbookColumnWidthChangeEvent
          : unknown) => void,
    ) => this.#internalEventBus.off(event, handler as (payload: unknown) => void),
  });
  /** Authorized cell and dimension writes; every call enters the Workbook FIFO queue. */
  readonly mutationPort: WorkbookMutationPort = Object.freeze({
    setCellValue: (sheet: WorksheetId | WorkbookSheetView, address: Address, value: Cell['value']) => this.transact((transaction) => transaction.setCellValue(sheet, address, value)),
    setCellFormula: (sheet: WorksheetId | WorkbookSheetView, address: Address, formula: string, displayValue?: Cell['value']) => this.transact((transaction) => transaction.setCellFormula(sheet, address, formula, displayValue)),
    clearCellContent: (sheet: WorksheetId | WorkbookSheetView, address: Address) => this.transact((transaction) => transaction.clearCellContent(sheet, address)),
    clearCellFormula: (sheet: WorksheetId | WorkbookSheetView, address: Address) => this.transact((transaction) => transaction.clearCellFormula(sheet, address)),
    setCellStyle: (sheet: WorksheetId | WorkbookSheetView, address: Address, style: CellStyle | undefined) => this.transact((transaction) => transaction.setCellStyle(sheet, address, style)),
    setRowHeight: (sheet: WorksheetId | WorkbookSheetView, row: number, heightPx: number) => this.transact((transaction) => transaction.setRowHeight(sheet, row, heightPx)),
    setColumnWidth: (sheet: WorksheetId | WorkbookSheetView, column: number, widthPx: number) => this.transact((transaction) => transaction.setColumnWidth(sheet, column, widthPx)),
  });
  #eventBridgeManager?: WorkbookEventBridgeManager;
  #mutationQueue: QueuedOperation[] = [];
  #queueRunning = false;
  #activeQueueControl?: QueueControl;
  #activeTransactionRevoke?: () => void;
  #recoveryFailure?: WorkbookMutationRollbackError;
  #disposed = false;
  #disposeFinalized = false;

  #ensureLazyEventBridgeRegistration(): void {
    if (this.#eventBridgeManager) return;
    this.#eventBridgeManager = setupWorkbookLazyBridges(() => Array.from(this.#sheets.values()), this.#internalEventBus);
  }

  /** Atomically create a published workbook and its initial, empty directory. */
  static create(options: { sheets: Array<{ name: string; rows?: number; cols?: number }> }): Workbook {
    if (!options || !Array.isArray(options.sheets) || options.sheets.length === 0) {
      throw new Error('Workbook.create requires at least one initial sheet');
    }
    const names = new Set<string>();
    for (const spec of options.sheets) {
      const trimmed = spec.name.trim();
      if (!trimmed || trimmed.length > 31 || /[\\/?*\[\]:]/.test(trimmed)) throw new Error(`Invalid sheet name '${spec.name}'`);
      if (names.has(trimmed)) throw new Error(`Sheet '${trimmed}' already exists`);
      if ((spec.rows !== undefined && (!Number.isInteger(spec.rows) || spec.rows <= 0 || spec.rows > MAX_WORKSHEET_ROW)) ||
          (spec.cols !== undefined && (!Number.isInteger(spec.cols) || spec.cols <= 0 || spec.cols > MAX_WORKSHEET_COLUMN))) {
        throw new Error('Initial sheet dimensions must be positive integers within worksheet limits');
      }
      names.add(trimmed);
    }
    const workbook = new Workbook();
    const ownerAccess = Object.freeze({
      internStyle: (style: import('./types').CellStyle) => workbook.#styleCache.intern(style),
      queryPivotDataAt: (address: Address, sheetName: string, valueField: string, filters: PivotDataFilter[]) =>
        workbook.queryPivotDataAt(address, sheetName, valueField, filters),
    });
    const candidates = options.sheets.map((spec) => new Worksheet(spec.name.trim(), spec.rows, spec.cols, workbook.#formulaEngine, ownerAccess));
    for (const sheet of candidates) {
      const capability = adoptWorksheetByWorkbook(sheet, workbook.workbookId);
      workbook.#sheetMutationCapabilities.set(sheet.getWorksheetId() as WorksheetId, capability);
    }
    for (const sheet of candidates) {
      workbook.#sheets.set(sheet.name, sheet);
      workbook.#sheetsById.set(sheet.getWorksheetId() as WorksheetId, sheet);
      workbook.#pivotInvalidationEngine.observeWorksheet(
        sheet.name,
        (listener) => { const d = sheet.on(listener); return () => d.dispose(); },
      );
    }
    workbook.#active = candidates[0].name;
    workbook.#ensureLazyEventBridgeRegistration();
    for (const sheet of candidates) workbook.#eventBridgeManager?.wireSheet(sheet);
    return workbook;
  }

  #resolveView(workbookId: WorkbookId, worksheetId: WorksheetId): Worksheet | undefined {
    return workbookId === this.workbookId ? this.#sheetsById.get(worksheetId) : undefined;
  }

  #viewFor(sheet: Worksheet): WorkbookSheetView {
    const id = sheet.getWorksheetId() as WorksheetId;
    let view = this.#viewsById.get(id);
    if (!view) {
      view = new OwnerBackedWorkbookSheetView(this.workbookId, id, (wb, ws) => this.#resolveView(wb, ws));
      Workbook.#issuedSheetViews.add(view as object);
      this.#viewsById.set(id, view);
    }
    return view;
  }

  #getWorksheetInternal(name: string): Worksheet | undefined { return this.#sheets.get(name); }

  #rejectUnavailable(operation: string): never {
    throw new Error(`Workbook-owned ${operation} is unavailable until its journal slice is authorized`);
  }

  /** Current state of Workbook mutation authority and rollback safety. */
  getMutationHealth(): WorkbookMutationHealth {
    if (this.#disposed) return Object.freeze({ status: 'disposed' });
    if (this.#recoveryFailure) {
      return Object.freeze({ status: 'recovery-required', failure: this.#recoveryFailure });
    }
    return Object.freeze({ status: 'healthy' });
  }

  /**
   * Run staged cell writes as one FIFO-serialized transaction.
   *
   * The callback runs inside the FIFO slot. Use only the supplied transaction
   * context for nested writes. Calls to `mutationPort` from the callback are
   * independent queued operations and must not be awaited from this callback:
   * they execute only after the active transaction settles. To schedule
   * independent work from a callback, retain its Promise without awaiting it,
   * await this `transact()` call, then await the retained Promise. JavaScript
   * does not expose a reliable way for this API to detect direct or indirect
   * awaits of an independent Promise, so violating this rule can self-await.
   */
  transact<T>(callback: (transaction: WorkbookTransactionContext) => T | Promise<T>): Promise<T> {
    if (typeof callback !== 'function') return Promise.reject(new TypeError('Workbook.transact requires a callback'));
    return this.#enqueueMutation(async (control) => {
      this.#assertMutationAllowed();
      const operations: CellWriteOperation[] = [];
      let contextActive = true;
      const revoke = () => { contextActive = false; };
      this.#activeTransactionRevoke = revoke;
      const stage = (operation: CellWriteOperation) => {
        if (!contextActive || this.#disposed) throw new WorkbookOperationCancelledError('Workbook transaction context is no longer active');
        operations.push(operation);
      };
      const resolveTargetId = (target: WorksheetId | WorkbookSheetView): WorksheetId => {
        this.#assertMutationAllowed();
        if (typeof target === 'string') {
          const worksheet = this.#sheetsById.get(target);
          if (!worksheet) throw new Error(`Worksheet '${target}' is not part of this Workbook`);
          return target;
        }
        if (!Workbook.isWorkbookIssuedSheetView(target) || target.workbookId !== this.workbookId) {
          throw new Error('Workbook transaction requires a sheet view issued by this Workbook');
        }
        if (!this.#sheetsById.has(target.worksheetId)) {
          throw new Error(`Worksheet '${target.worksheetId}' is no longer available in this Workbook`);
        }
        return target.worksheetId;
      };
      const copyAddress = (address: Address): Address => ({ row: address.row, col: address.col });
      const transaction: WorkbookTransactionContext = Object.freeze({
        setCellValue: (target: WorksheetId | WorkbookSheetView, address: Address, value: Cell['value']) => stage({
          kind: 'setCellValue', worksheetId: resolveTargetId(target), address: copyAddress(address), value: cloneWriteData(value),
        }),
        setCellFormula: (target: WorksheetId | WorkbookSheetView, address: Address, formula: string, displayValue?: Cell['value']) => stage({
          kind: 'setCellFormula', worksheetId: resolveTargetId(target), address: copyAddress(address), formula,
          ...(displayValue === undefined ? {} : { displayValue: cloneWriteData(displayValue) }),
        }),
        clearCellContent: (target: WorksheetId | WorkbookSheetView, address: Address) => stage({
          kind: 'clearCellContent', worksheetId: resolveTargetId(target), address: copyAddress(address),
        }),
        clearCellFormula: (target: WorksheetId | WorkbookSheetView, address: Address) => stage({
          kind: 'clearCellFormula', worksheetId: resolveTargetId(target), address: copyAddress(address),
        }),
        setCellStyle: (target: WorksheetId | WorkbookSheetView, address: Address, style: CellStyle | undefined) => stage({
          kind: 'setCellStyle', worksheetId: resolveTargetId(target), address: copyAddress(address),
          style: style === undefined ? undefined : cloneWriteData(style),
        }),
        setRowHeight: (target: WorksheetId | WorkbookSheetView, row: number, heightPx: number) => stage({
          kind: 'setRowHeight', worksheetId: resolveTargetId(target), row, heightPx,
        }),
        setColumnWidth: (target: WorksheetId | WorkbookSheetView, column: number, widthPx: number) => stage({
          kind: 'setColumnWidth', worksheetId: resolveTargetId(target), column, widthPx,
        }),
      });

      let result: T;
      try {
        result = await callback(transaction);
      } finally {
        revoke();
        if (this.#activeTransactionRevoke === revoke) this.#activeTransactionRevoke = undefined;
      }
      this.#assertMutationAllowed();
      this.#applyCellWriteBatch(operations, control);
      return result;
    });
  }

  #assertMutationAllowed(): void {
    if (this.#disposed) throw new WorkbookOperationCancelledError();
    if (this.#recoveryFailure) throw new WorkbookRecoveryRequiredError(this.#recoveryFailure);
  }

  #resolveWorksheetForWrite(worksheetId: WorksheetId): Worksheet {
    this.#assertMutationAllowed();
    const worksheet = this.#sheetsById.get(worksheetId);
    if (!worksheet) throw new Error(`Worksheet '${worksheetId}' is not part of this Workbook`);
    return worksheet;
  }

  #enqueueMutation<T>(run: (control: QueueControl) => T | Promise<T>): Promise<T> {
    try {
      this.#assertMutationAllowed();
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise<T>((resolve, reject) => {
      this.#mutationQueue.push({
        run,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      void this.#drainMutationQueue();
    });
  }

  async #drainMutationQueue(): Promise<void> {
    if (this.#queueRunning) return;
    this.#queueRunning = true;
    try {
      while (this.#mutationQueue.length > 0) {
        const entry = this.#mutationQueue.shift()!;
        if (this.#disposed) {
          entry.reject(new WorkbookOperationCancelledError());
          continue;
        }
        if (this.#recoveryFailure) {
          entry.reject(new WorkbookRecoveryRequiredError(this.#recoveryFailure));
          continue;
        }
        let cancel!: (error: WorkbookOperationCancelledError) => void;
        const cancellation = new Promise<never>((_resolve, reject) => { cancel = reject; });
        const control: QueueControl = {
          committed: false,
          cancelled: false,
          cancel: (error) => {
            if (control.committed || control.cancelled) return;
            control.cancelled = true;
            cancel(error);
          },
          markCommitted: () => { control.committed = true; },
        };
        this.#activeQueueControl = control;
        const operation = Promise.resolve().then(() => entry.run(control));
        // The cancellation race may win while an async callback is still pending.
        // Its late resolution/rejection is consumed; the revoked context prevents commit.
        void operation.catch(() => undefined);
        try {
          const result = await Promise.race([operation, cancellation]);
          entry.resolve(result);
        } catch (error) {
          entry.reject(error);
        } finally {
          if (this.#activeQueueControl === control) this.#activeQueueControl = undefined;
        }
      }
    } finally {
      this.#queueRunning = false;
      if (this.#disposed) this.#finalizeDispose();
    }
  }

  #applyCellWriteBatch(operations: CellWriteOperation[], control: QueueControl): void {
    this.#assertMutationAllowed();
    if (operations.length === 0) {
      control.markCommitted();
      return;
    }

    const sheets = new Map<WorksheetId, {
      worksheet: Worksheet;
      capability: WorkbookWorksheetMutationCapability;
      state?: WorkbookCellWriteState;
      journalStarted: boolean;
      started: boolean;
    }>();
    for (const operation of operations) {
      const worksheet = this.#resolveWorksheetForWrite(operation.worksheetId);
      const capability = this.#sheetMutationCapabilities.get(operation.worksheetId);
      if (!capability) throw new Error(`Workbook mutation authority is unavailable for '${operation.worksheetId}'`);
      sheets.set(operation.worksheetId, sheets.get(operation.worksheetId) ?? { worksheet, capability, journalStarted: false, started: false });
      if (operation.kind === 'setRowHeight') {
        if (!Number.isFinite(operation.row) || !Number.isInteger(operation.row)
          || operation.row < 1 || operation.row > worksheet.rowCount) {
          throw new RangeError(`Row index out of bounds: ${operation.row}`);
        }
        if (!Number.isFinite(operation.heightPx) || operation.heightPx <= 0) {
          throw new RangeError(`Row height must be a finite positive number: ${operation.heightPx}`);
        }
      } else if (operation.kind === 'setColumnWidth') {
        if (!Number.isInteger(operation.column) || operation.column < 1 || operation.column > worksheet.colCount) {
          throw new RangeError(`Column index out of bounds: ${operation.column}`);
        }
        if (typeof operation.widthPx !== 'number' || !Number.isFinite(operation.widthPx) || operation.widthPx <= 0) {
          throw new RangeError(`Column width must be a finite positive number: ${operation.widthPx}`);
        }
      } else {
        // Validate coordinates before changing any sheet. The Worksheet read path
        // performs the same one-based/range validation as its public mutators.
        worksheet.getCellValue(operation.address);
      }
    }

    // Canonicalize styles before touching Worksheets. Record every reference so
    // a clean rollback can release provisional StyleCache ownership exactly.
    const preparedStyles: CellStyle[] = [];
    try {
      for (const operation of operations) {
        if (operation.kind !== 'setCellStyle' || operation.style === undefined) continue;
        const canonical = this.#styleCache.intern(operation.style);
        operation.style = canonical;
        preparedStyles.push(canonical);
        runWorkbookMutationTestFailure(this, 'after-style-allocation');
      }
    } catch (operationError) {
      const rollbackErrors: unknown[] = [];
      for (const style of preparedStyles.reverse()) {
        try { this.#styleCache.release(style); } catch (error) { rollbackErrors.push(error); }
      }
      if (rollbackErrors.length > 0) {
        this.#recoveryFailure = new WorkbookMutationRollbackError(operationError, Object.freeze(rollbackErrors));
        throw this.#recoveryFailure;
      }
      throw operationError;
    }

    const commitEvents: WorkbookCommitEvent[] = [];
    const eventSink: WorkbookCellWriteEventSink = (worksheet, event) => {
      const worksheetId = worksheet.getWorksheetId() as WorksheetId;
      const entry = sheets.get(worksheetId);
      if (entry) commitEvents.push({ kind: 'worksheet', worksheet, capability: entry.capability, event });
    };
    let mutationAttempted = false;
    let commitPointReached = false;
    let commitCleanupStartedAt = 0;
    const measureTestPhases = hasWorkbookMutationTestTimingHooks(this);
    const strategy = getWorkbookMutationStrategy(this);
    const failureInjector = (phase: WorkbookCellWriteFailurePhase) =>
      runWorkbookMutationTestWorksheetFailure(this, phase);
    try {
      const snapshotStartedAt = measureTestPhases ? performance.now() : 0;
      for (const entry of sheets.values()) {
        withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () => {
          if (strategy === 'journal') {
            entry.worksheet.beginWorkbookCellWriteJournal(entry.capability, failureInjector);
            entry.journalStarted = true;
          } else {
            entry.state = entry.worksheet.captureWorkbookCellWriteState(entry.capability);
          }
        });
      }
      if (measureTestPhases) {
        reportWorkbookMutationTestPhase(
          this,
          strategy === 'journal' ? 'journal' : 'snapshot',
          performance.now() - snapshotStartedAt,
        );
      }
      for (const entry of sheets.values()) {
        withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () =>
          entry.worksheet.beginWorkbookCellWriteBatch(entry.capability, eventSink, failureInjector));
        entry.started = true;
      }
      for (let index = 0; index < operations.length; index++) {
        this.#assertMutationAllowed();
        runBeforeWorkbookMutationTestApply(this, index);
        const operation = operations[index];
        const entry = sheets.get(operation.worksheetId)!;
        mutationAttempted = true;
        const applyStartedAt = measureTestPhases ? performance.now() : 0;
        withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () => {
          switch (operation.kind) {
            case 'setCellValue': entry.worksheet.setCellValue(operation.address, operation.value); break;
            case 'setCellFormula': entry.worksheet.setCellFormula(operation.address, operation.formula, operation.displayValue); break;
            case 'clearCellContent': entry.worksheet.clearCellContent(operation.address); break;
            case 'clearCellFormula': entry.worksheet.clearCellFormula(operation.address); break;
            case 'setCellStyle': entry.worksheet.setCellStyle(operation.address, operation.style); break;
            case 'setRowHeight':
              entry.worksheet.setRowHeight(operation.row, operation.heightPx);
              commitEvents.push({
                kind: 'workbook-dimension',
                eventName: 'row-height-change',
                payload: {
                  worksheetId: operation.worksheetId,
                  row: operation.row,
                  heightPx: operation.heightPx,
                },
              });
              break;
            case 'setColumnWidth':
              entry.worksheet.setColumnWidth(operation.column, operation.widthPx);
              commitEvents.push({
                kind: 'workbook-dimension',
                eventName: 'column-width-change',
                payload: {
                  worksheetId: operation.worksheetId,
                  column: operation.column,
                  widthPx: operation.widthPx,
                },
              });
              break;
          }
        });
        if (measureTestPhases) {
          reportWorkbookMutationTestApply(this, index, performance.now() - applyStartedAt);
        }
      }
      this.#assertMutationAllowed();
      commitCleanupStartedAt = measureTestPhases ? performance.now() : 0;
      let settlementIndex = 0;
      for (const entry of sheets.values()) {
        runBeforeWorkbookMutationBatchSettlement(this, settlementIndex++);
        withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () =>
          entry.worksheet.finishWorkbookCellWriteBatch(entry.capability));
      }
      if (strategy === 'journal') {
        for (const entry of sheets.values()) {
          withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () =>
            entry.worksheet.commitWorkbookCellWriteJournal(entry.capability));
        }
      }
      commitPointReached = true;
      control.markCommitted();
    } catch (operationError) {
      if (!mutationAttempted) {
        const rollbackErrors: unknown[] = [];
        for (const entry of sheets.values()) {
          if (entry.started || entry.journalStarted) {
            try {
              withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () =>
                entry.worksheet.discardWorkbookCellWriteBatch(entry.capability));
            } catch (error) { rollbackErrors.push(error); }
          }
        }
        if (rollbackErrors.length === 0) {
          for (const style of preparedStyles.slice().reverse()) {
            try { this.#styleCache.release(style); } catch (error) { rollbackErrors.push(error); }
          }
        }
        if (rollbackErrors.length > 0) {
          this.#recoveryFailure = new WorkbookMutationRollbackError(operationError, Object.freeze(rollbackErrors));
          throw this.#recoveryFailure;
        }
        throw operationError;
      }

      const rollbackStartedAt = measureTestPhases ? performance.now() : 0;
      const rollbackErrors: unknown[] = [];
      try {
        runBeforeWorkbookMutationTestRollback(this);
      } catch (error) {
        rollbackErrors.push(error);
      }
      if (rollbackErrors.length === 0) {
        for (const entry of Array.from(sheets.values()).reverse()) {
          if (!entry.state && !entry.journalStarted) continue;
          try {
            withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () =>
              entry.state
                ? entry.worksheet.restoreWorkbookCellWriteState(entry.capability, entry.state)
                : entry.worksheet.restoreWorkbookCellWriteJournal(entry.capability));
          } catch (error) {
            rollbackErrors.push(error);
          }
        }
      }
      if (rollbackErrors.length === 0) {
        try {
          runWorkbookMutationTestWorksheetFailure(this, 'after-row-height-restore-before-discard');
        } catch (error) {
          rollbackErrors.push(error);
        }
      }
      for (const entry of sheets.values()) {
        if (!entry.started) continue;
        try {
          withWorkbookWorksheetMutationCapability(entry.worksheet, entry.capability, () =>
            entry.worksheet.discardWorkbookCellWriteBatch(entry.capability));
        } catch (error) {
          rollbackErrors.push(error);
        }
      }
      if (rollbackErrors.length === 0) {
        for (const style of preparedStyles.slice().reverse()) {
          try { this.#styleCache.release(style); } catch (error) { rollbackErrors.push(error); }
        }
      }
      if (measureTestPhases) {
        reportWorkbookMutationTestPhase(this, 'rollback', performance.now() - rollbackStartedAt);
      }
      if (rollbackErrors.length > 0) {
        this.#recoveryFailure = new WorkbookMutationRollbackError(operationError, Object.freeze(rollbackErrors.slice()));
        throw this.#recoveryFailure;
      }
      throw operationError;
    }

    if (!commitPointReached) throw new Error('Workbook transaction ended without a commit point');
    // Each successful style assignment transfers one cache reference to the
    // cell. Release the reference that assignment displaced; rollback keeps
    // the original references and releases only the provisional assignments.
    for (const publication of commitEvents) {
      if (publication.kind === 'worksheet' && publication.event.type === 'style-changed' && publication.event.previousStyle) {
        this.#styleCache.release(publication.event.previousStyle);
      }
    }
    if (measureTestPhases) {
      reportWorkbookMutationTestPhase(this, 'commit', performance.now() - commitCleanupStartedAt);
    }
    for (const publication of commitEvents) {
      if (this.#disposed) break;
      try {
        if (publication.kind === 'worksheet') {
          const { worksheet, capability, event } = publication;
          withWorkbookWorksheetMutationCapability(worksheet, capability, () =>
            worksheet.publishWorkbookCellWriteEvent(capability, event, (error) => {
              console.error('Workbook cell-write observer failed after commit', error);
            }, () => !this.#disposed));
        } else {
          this.#internalEventBus.emit(publication.eventName, publication.payload);
        }
      } catch (error) {
        // State is committed. Publication failures are diagnostics and cannot
        // roll the operation back or block later listeners/queue entries.
        try { console.error('Workbook committed event publication failed', error); } catch { /* no-op */ }
      }
    }
  }

  #finalizeDispose(): void {
    if (this.#disposeFinalized) return;
    this.#disposeFinalized = true;
    this.#pivotInvalidationEngine.dispose();
    this.#pivotDependencyIndex.clear();
    this.#pivotAnchorIndex.clear();
    this.#pivotRegistry.clear();
    this.#pivotSnapshotStore.clearAll();
  }

  /**
   * Phase 28: Get pivot registry for addressable pivots
   */
  /**
   * Phase 29: Get pivot snapshot store for computed results
   */
  /**
   * Phase 30b: Register a pivot's source range for automatic invalidation.
   * Call this after registry.register() to enable auto-dirty tracking.
   */
  registerPivotDependency(pivotId: PivotId, sourceRange: Range): void {
    void pivotId; void sourceRange;
    this.#rejectUnavailable('pivot dependency mutation');
  }

  /**
   * Phase 30b: Unregister pivot dependency (call on pivot deletion).
   */
  unregisterPivotDependency(pivotId: PivotId): void {
    void pivotId;
    this.#rejectUnavailable('pivot dependency mutation');
  }

  /**
   * Phase 30b: Get the dependency index (for testing and inspection).
   */
  /**
   * Phase 30b: Get the invalidation engine (for testing and inspection).
   */
  /**
   * Phase 31a: Get the recompute engine (for testing and inspection).
   */
  /** Read-only formula query; pivot services and mutation authority stay owner-private. */
  queryPivotData(pivotId: PivotId, valueField: string, filters: PivotDataFilter[] = []): GetPivotDataResult {
    const pivot = this.#pivotRegistry.get(pivotId);
    if (pivot?.dirty) this.#assertMutationAllowed();
    return new GetPivotData(this.#pivotRegistry, this.#pivotSnapshotStore, this.#pivotRecomputeEngine)
      .query(pivotId, valueField, filters);
  }

  queryPivotDataAt(address: Address, sheetName: string, valueField: string, filters: PivotDataFilter[] = []): GetPivotDataResult {
    const pivotId = this.#pivotAnchorIndex.get(address, sheetName);
    return pivotId ? this.queryPivotData(pivotId, valueField, filters) : '#REF!';
  }

  /**
   * Phase 31a: Pivot builder function (deterministic, side-effect-free).
   * Used by PivotRecomputeEngine to rebuild dirty pivots.
   *
   * @param pivotId - Pivot identifier
   * @param config - Pivot configuration
   * @param worksheetId - Worksheet containing source data
   * @returns PivotSnapshot
   */
  #buildPivot(pivotId: PivotId, config: PivotConfig, worksheetId: string): import('./PivotSnapshotStore').PivotSnapshot {
    const worksheet = this.#getWorksheetInternal(worksheetId);
    if (!worksheet) {
      throw new Error(`Worksheet '${worksheetId}' not found`);
    }

    // Build pivot table using PivotEngine
    const engine = new PivotEngine(worksheet);
    const pivotTable = engine.generate(config);

    // Phase 36a: Populate group state for partial recompute
    // This must happen after full rebuild to capture correct state
    engine.populateGroupState(pivotId, config, this.#extractSourceData(worksheet, config.sourceRange));

    // Transform to snapshot format
    const snapshot = transformToPivotSnapshot(
      pivotId,
      pivotTable,
      config
    );

    return snapshot;
  }

  /**
   * Phase 36a: Extract source data from worksheet
   * Helper for group state population
   */
  #extractSourceData(worksheet: Worksheet, range: { start: import('./types').Address; end: import('./types').Address }): import('./types').ExtendedCellValue[][] {
    const data: import('./types').ExtendedCellValue[][] = [];

    for (let row = range.start.row; row <= range.end.row; row++) {
      const rowData: import('./types').ExtendedCellValue[] = [];
      for (let col = range.start.col; col <= range.end.col; col++) {
        const cell = worksheet.getCell({ row, col });
        rowData.push(cell?.value ?? null);
      }
      data.push(rowData);
    }

    return data;
  }

  /**
   * Phase 32: Resolve pivot ID from anchor cell address on specific sheet.
   * Phase 32 patch: Sheet-aware to prevent cross-sheet collisions.
   * Used by GETPIVOTDATA formula function to find pivot at given cell.
   *
   * @param address - Cell address (1-based)
   * @param sheetId - Worksheet identifier
   * @returns PivotId if pivot exists at address, null otherwise
   */
  resolvePivotAt(address: Address, sheetId: string): PivotId | null {
    return this.#pivotAnchorIndex.get(address, sheetId);
  }

  /**
   * Phase 32: Register pivot anchor for formula resolution.
   * Phase 32 patch: Sheet-aware to prevent cross-sheet collisions.
   * Called after pivot registration to enable GETPIVOTDATA lookups.
   *
   * @param pivotId - Pivot identifier
   * @param anchor - Top-left cell of pivot (1-based)
   * @param sheetId - Worksheet identifier
   */
  setPivotAnchor(pivotId: PivotId, anchor: Address, sheetId: string): void {
    void pivotId; void anchor; void sheetId;
    this.#rejectUnavailable('pivot anchor mutation');
  }

  /**
   * Phase 32: Get anchor address for a pivot.
   *
   * @param pivotId - Pivot identifier
   * @returns Anchor address or null if not anchored
   */
  getPivotAnchor(pivotId: PivotId): Address | null {
    return detachReadonly(this.#pivotAnchorIndex.getAnchor(pivotId));
  }

  /**
   * Phase 35: Set slicer state for a pivot.
   *
   * Validates field exists in pivot configuration, then updates slicer state
   * and marks pivot dirty to trigger rebuild.
   *
   * @param pivotId - Pivot identifier
   * @param slicerId - Unique slicer identifier
   * @param field - Field label to filter on (e.g., "Region")
   * @param selectedValues - Values to include/exclude (empty = no filter)
   * @param mode - 'include' or 'exclude' (default: 'include')
   * @throws Error if pivot not found or field invalid
   */
  setSlicer(
    pivotId: PivotId, slicerId: SlicerId, field: string, selectedValues: SlicerValue[], mode: 'include' | 'exclude' = 'include'
  ): void {
    void pivotId; void slicerId; void field; void selectedValues; void mode;
    this.#rejectUnavailable('pivot metadata mutation');
  }

  /**
   * Phase 35: Clear/remove a slicer from a pivot.
   *
   * @param pivotId - Pivot identifier
   * @param slicerId - Slicer to remove
   * @throws Error if pivot not found
   */
  clearSlicer(pivotId: PivotId, slicerId: SlicerId): void {
    void pivotId; void slicerId;
    this.#rejectUnavailable('pivot metadata mutation');
  }

  /**
   * Phase 35: Get slicer state.
   *
   * @param pivotId - Pivot identifier
   * @param slicerId - Slicer identifier
   * @returns Slicer state or undefined if not found
   */
  getSlicer(pivotId: PivotId, slicerId: SlicerId): SlicerStateStorable | undefined {
    const pivot = this.#pivotRegistry.get(pivotId);
    if (!pivot) return undefined;

    return detachReadonly(pivot.config.slicers?.[slicerId]);
  }

  /**
   * Phase 35: Get all slicers for a pivot.
   *
   * @param pivotId - Pivot identifier
   * @returns Record of all slicers (empty if none)
   */
  getSlicers(pivotId: PivotId): Record<SlicerId, SlicerStateStorable> {
    const pivot = this.#pivotRegistry.get(pivotId);
    if (!pivot) return {};

    return detachReadonly(pivot.config.slicers || {});
  }

  /**
   * Phase 35: Get distinct values for a field (for slicer UI).
   *
   * Returns all distinct values from the source range for the specified field.
   * Does NOT respect other slicers (independent slicer model).
   *
   * @param pivotId - Pivot identifier
   * @param field - Field label
   * @returns Array of distinct values
   * @throws Error if pivot not found or field invalid
   */
  getSlicerDistinctValues(pivotId: PivotId, field: string): SlicerValue[] {
    const pivot = this.#pivotRegistry.get(pivotId);
    if (!pivot) {
      throw new Error(`Pivot '${pivotId}' not found`);
    }

    // Find field column
    const fieldDef = [...pivot.config.rows, ...pivot.config.columns]
      .find(f => f.label === field);

    if (!fieldDef) {
      throw new Error(`Field '${field}' not found in pivot`);
    }

    // Get source worksheet
    const worksheet = this.#getWorksheetInternal(pivot.worksheetId);
    if (!worksheet) {
      throw new Error(`Worksheet '${pivot.worksheetId}' not found`);
    }

    // Extract distinct values from source range
    const distinctValues = new Set<SlicerValue>();
    const range = pivot.config.sourceRange;

    // Skip header row (row 0)
    for (let row = range.start.row + 1; row <= range.end.row; row++) {
      const cell = worksheet.getCell({ row, col: fieldDef.column });
      // Normalize storage value (ExtendedCellValue) to display primitive (SlicerValue)
      // Boundary: EntityValue → display field, RichText → concatenated text
      const value = toDisplayValue(cell?.value ?? null);
      distinctValues.add(value);
    }

    return Array.from(distinctValues);
  }

  /**
   * Phase 36a: Create and register a pivot.
   * Convenience method for tests and API consumers.
   *
   * @param name - Pivot name
   * @param worksheetId - Worksheet identifier
   * @param config - Pivot configuration
   * @returns Pivot identifier
   */
  createPivot(name: string, worksheetId: string, config: PivotConfig): PivotId {
    void name; void worksheetId; void config;
    return this.#rejectUnavailable('pivot creation');
  }

  /**
   * Phase 36a: Get pivot snapshot (triggers lazy rebuild if dirty).
   *
   * @param pivotId - Pivot identifier
   * @returns Pivot snapshot or undefined if not found
   */
  getPivotSnapshot(pivotId: PivotId): import('./PivotSnapshotStore').PivotSnapshot | undefined {
    const pivot = this.#pivotRegistry.get(pivotId);
    if (!pivot) return undefined;

    // Trigger rebuild if dirty (Phase 31a lazy evaluation)
    if (pivot.dirty) {
      this.#assertMutationAllowed();
      this.#pivotRecomputeEngine.ensureFresh(pivotId);
    }

    return detachReadonly(this.#pivotSnapshotStore.get(pivotId));
  }

  /**
   * Phase 32 patch: Authoritative pivot deletion.
   * Cleans up ALL subsystems to prevent stale state.
   *
   * Invariant: "A pivot cannot exist in any subsystem after deletion"
   *
   * @param pivotId - Pivot to delete
   * @returns true if pivot was deleted, false if not found
   */
  deletePivot(pivotId: PivotId): boolean {
    void pivotId;
    return this.#rejectUnavailable('pivot deletion');
  }

  addSheet(name: string, rows?: number, cols?: number): WorkbookSheetView {
    void name; void rows; void cols;
    throw new Error('Post-publication sheet creation is unavailable until the sheet-lifecycle journal slice is authorized');
  }

  /**
   * @internal Mutable worksheet wired to this workbook's StyleCache (dev XLSX import).
   * Not workbook-adopted so import can write cells before R6 journal restore.
   */
  createDevImportWorksheet(name: string, rows?: number, cols?: number): Worksheet {
    const ownerAccess = Object.freeze({
      internStyle: (style: import('./types').CellStyle) => this.#styleCache.intern(style),
      queryPivotDataAt: (address: Address, sheetName: string, valueField: string, filters: PivotDataFilter[]) =>
        this.queryPivotDataAt(address, sheetName, valueField, filters),
    });
    return new Worksheet(name, rows, cols, this.#formulaEngine, ownerAccess);
  }

  /**
   * @internal Attaches a pre-populated worksheet for dev-time XLSX import.
   * Cell data must be populated before attachment; published sheets use the normal
   * Workbook ownership guards even while XLSX restoration remains unavailable.
   */
  attachDevImportSheet(sheet: Worksheet): void {
    if (this.#sheets.has(sheet.name)) {
      throw new Error(`Sheet '${sheet.name}' already exists`);
    }
    // Adoption performs its cloning and validation before committing owner state.
    // Do it before either registry exposes the candidate through getSheet().
    const capability = adoptWorksheetByWorkbook(sheet, this.workbookId);
    this.#sheetMutationCapabilities.set(sheet.getWorksheetId() as WorksheetId, capability);
    this.#sheets.set(sheet.name, sheet);
    this.#sheetsById.set(sheet.getWorksheetId() as WorksheetId, sheet);
    this.#pivotInvalidationEngine.observeWorksheet(
      sheet.name,
      (listener) => {
        const d = sheet.on(listener);
        return () => d.dispose();
      },
    );
    if (!this.#active) this.#active = sheet.name;
    this.#ensureLazyEventBridgeRegistration();
    this.#eventBridgeManager?.wireSheet(sheet);
  }

  /**
   * Remove a worksheet from the workbook.
   * Excel parity: at least one sheet must remain.
   */
  deleteSheet(name: string): boolean {
    void name;
    throw new Error('Sheet deletion is unavailable until the sheet-lifecycle journal slice is authorized');
  }

  /**
   * Rename a worksheet (Excel rules: max 31 chars, no \\ / ? * [ ] :).
   */
  renameSheet(oldName: string, newName: string): boolean {
    void oldName; void newName;
    throw new Error('Sheet rename is unavailable until the sheet-lifecycle journal slice is authorized');
  }

  getSheet(name: string): WorkbookSheetView | undefined {
    const sheet = this.#sheets.get(name);
    return sheet ? this.#viewFor(sheet) : undefined;
  }
  getSheetNames(): string[] { return Array.from(this.#sheets.keys()); }

  get activeSheet(): WorkbookSheetView | undefined { return this.#active ? this.getSheet(this.#active) : undefined; }
  set activeSheetName(name: string) { void name; throw new Error('Active sheet changes are unavailable until the sheet-lifecycle journal slice is authorized'); }

  setFormulaEngine(engine?: IFormulaEngine) {
    void engine;
    throw new Error('Formula engine replacement is unavailable for a published workbook');
  }

  /**
   * Phase 28/29/30b/32: Disposal safety
   * Phase 32 patch: Authoritative cleanup path
   * Clear registry, snapshots, dependency index, anchor index, and event subscriptions
   */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#internalEventBus.removeAll();
    const cancellation = new WorkbookOperationCancelledError();
    this.#activeTransactionRevoke?.();
    for (const queued of this.#mutationQueue.splice(0)) queued.reject(cancellation);
    this.#activeQueueControl?.cancel(cancellation);
    if (!this.#queueRunning) this.#finalizeDispose();
  }
}

// ClipboardService uses this read-only query to validate view identity. Keep
// the predicate itself from being replaced through the public Workbook class.
Object.defineProperty(Workbook, 'isWorkbookIssuedSheetView', {
  writable: false,
  configurable: false,
});
