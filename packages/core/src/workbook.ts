import { Worksheet, adoptWorksheetByWorkbook } from './worksheet';
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
import type { Range, Address } from './types';
import type { PivotConfig } from './PivotEngine';
import { PivotEngine } from './PivotEngine';
import { toDisplayValue } from './utils/cell-value-normalizer'; // Storage→Display boundary
import { transformToPivotSnapshot } from './PivotSnapshotTransformer';
import { MAX_WORKSHEET_COLUMN, MAX_WORKSHEET_ROW } from './dag/DependencyGraph';
import { OwnerBackedWorkbookSheetView } from './WorkbookSheetView';
import type { WorkbookId, WorkbookMutationPort, WorkbookSheetView, WorksheetId } from './workbook-access-types';
import type { EventAPI } from './EventBus';
import { GetPivotData, type PivotDataFilter, type GetPivotDataResult } from './GetPivotData';

let nextWorkbookIdentity = 1;

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
  #workbookId = `wb-${nextWorkbookIdentity++}` as WorkbookId;
  get workbookId(): WorkbookId { return this.#workbookId; }
  #sheets = new Map<string, Worksheet>();
  #sheetsById = new Map<WorksheetId, Worksheet>();
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
  #internalEventBus = new EventBus();
  readonly eventBus: EventAPI = Object.freeze({
    on: this.#internalEventBus.on.bind(this.#internalEventBus),
    once: this.#internalEventBus.once.bind(this.#internalEventBus),
    off: this.#internalEventBus.off.bind(this.#internalEventBus),
  });
  /** R1 migration boundary. No operation is writable before R2. */
  readonly mutationPort: WorkbookMutationPort = Object.freeze({
    setCellValue: () => this.#rejectUnavailable('cell value mutation'),
    setCellFormula: () => this.#rejectUnavailable('cell formula mutation'),
    clearCellContent: () => this.#rejectUnavailable('cell content clear'),
    clearCellFormula: () => this.#rejectUnavailable('cell formula clear'),
    setCellStyle: () => this.#rejectUnavailable('cell style mutation'),
  });
  #eventBridgeManager?: WorkbookEventBridgeManager;

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
    for (const sheet of candidates) adoptWorksheetByWorkbook(sheet, workbook.workbookId);
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
      this.#viewsById.set(id, view);
    }
    return view;
  }

  #getWorksheetInternal(name: string): Worksheet | undefined { return this.#sheets.get(name); }

  #rejectUnavailable(operation: string): never {
    throw new Error(`Workbook-owned ${operation} is unavailable until its journal slice is authorized`);
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
    this.#pivotInvalidationEngine.dispose(); // Phase 30b: Clean up event subscriptions
    this.#pivotDependencyIndex.clear();      // Phase 30b: Clear dependency index
    this.#pivotAnchorIndex.clear();          // Phase 32: Clear anchor index
    this.#pivotRegistry.clear();             // Phase 28: Clear registry
    this.#pivotSnapshotStore.clearAll();     // Phase 29: Clear snapshots
  }
}
