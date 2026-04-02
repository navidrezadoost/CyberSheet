import { Worksheet } from './worksheet';
import { IFormulaEngine } from './types';
import { StyleCache } from './StyleCache';
import { PivotRegistry, PivotRegistryImpl } from './PivotRegistry';
import type { PivotId } from './PivotRegistry';
import { PivotSnapshotStore } from './PivotSnapshotStore';
import { PivotDependencyIndexImpl } from './PivotDependencyIndex';
import { PivotInvalidationEngineImpl } from './PivotInvalidationEngine';
import { PivotRecomputeEngineImpl } from './PivotRecomputeEngine'; // Phase 31a
import { PivotAnchorIndexImpl } from './PivotAnchorIndex'; // Phase 32
import type { Range, Address } from './types';
import type { PivotConfig } from './PivotEngine';
import { PivotEngine } from './PivotEngine';
import { transformToPivotSnapshot } from './PivotSnapshotTransformer';

export class Workbook {
  private sheets = new Map<string, Worksheet>();
  private _active?: string;
  private formulaEngine?: IFormulaEngine;
  private styleCache = new StyleCache();
  private pivotRegistry: PivotRegistry = new PivotRegistryImpl();
  private pivotSnapshotStore = new PivotSnapshotStore(); // Phase 29
  private pivotDependencyIndex = new PivotDependencyIndexImpl(); // Phase 30b
  private pivotInvalidationEngine = new PivotInvalidationEngineImpl( // Phase 30b
    this.pivotDependencyIndex,
    this.pivotRegistry as import('./PivotRegistry').PivotRegistryImpl
  );
  private pivotRecomputeEngine = new PivotRecomputeEngineImpl( // Phase 31a
    this.pivotRegistry,
    this.pivotSnapshotStore,
    this.buildPivot.bind(this)
  );
  private pivotAnchorIndex = new PivotAnchorIndexImpl(); // Phase 32

  getStyleCache(): StyleCache {
    return this.styleCache;
  }

  /**
   * Phase 28: Get pivot registry for addressable pivots
   */
  getPivotRegistry(): PivotRegistry {
    return this.pivotRegistry;
  }

  /**
   * Phase 29: Get pivot snapshot store for computed results
   */
  getPivotSnapshotStore(): PivotSnapshotStore {
    return this.pivotSnapshotStore;
  }

  /**
   * Phase 30b: Register a pivot's source range for automatic invalidation.
   * Call this after registry.register() to enable auto-dirty tracking.
   */
  registerPivotDependency(pivotId: PivotId, sourceRange: Range): void {
    this.pivotDependencyIndex.register(pivotId, sourceRange);
  }

  /**
   * Phase 30b: Unregister pivot dependency (call on pivot deletion).
   */
  unregisterPivotDependency(pivotId: PivotId): void {
    this.pivotDependencyIndex.unregister(pivotId);
  }

  /**
   * Phase 30b: Get the dependency index (for testing and inspection).
   */
  getPivotDependencyIndex(): PivotDependencyIndexImpl {
    return this.pivotDependencyIndex;
  }

  /**
   * Phase 30b: Get the invalidation engine (for testing and inspection).
   */
  getPivotInvalidationEngine(): PivotInvalidationEngineImpl {
    return this.pivotInvalidationEngine;
  }

  /**
   * Phase 31a: Get the recompute engine (for testing and inspection).
   */
  getPivotRecomputeEngine(): PivotRecomputeEngineImpl {
    return this.pivotRecomputeEngine;
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
  private buildPivot(pivotId: PivotId, config: PivotConfig, worksheetId: string): import('./PivotSnapshotStore').PivotSnapshot {
    const worksheet = this.getSheet(worksheetId);
    if (!worksheet) {
      throw new Error(`Worksheet '${worksheetId}' not found`);
    }

    // Build pivot table using PivotEngine
    const engine = new PivotEngine(worksheet);
    const pivotTable = engine.generate(config);

    // Transform to snapshot format
    const snapshot = transformToPivotSnapshot(
      pivotId,
      pivotTable,
      config
    );

    return snapshot;
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
    return this.pivotAnchorIndex.get(address, sheetId);
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
    this.pivotAnchorIndex.set(anchor, pivotId, sheetId);
  }

  /**
   * Phase 32: Get anchor address for a pivot.
   * 
   * @param pivotId - Pivot identifier
   * @returns Anchor address or null if not anchored
   */
  getPivotAnchor(pivotId: PivotId): Address | null {
    return this.pivotAnchorIndex.getAnchor(pivotId);
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
    // Unregister from registry (identity)
    const deleted = this.pivotRegistry.unregister(pivotId);
    
    if (!deleted) return false; // Pivot doesn't exist

    // Clean up all subsystems
    this.pivotAnchorIndex.delete(pivotId);       // Phase 32: Remove anchor
    this.pivotDependencyIndex.delete(pivotId);  // Phase 30b: Remove dependency tracking
    this.pivotSnapshotStore.delete(pivotId);    // Phase 29a: Remove cached snapshot

    return true;
  }

  addSheet(name: string, rows?: number, cols?: number): Worksheet {
    if (this.sheets.has(name)) throw new Error(`Sheet '${name}' already exists`);
    const ws = new Worksheet(name, rows, cols, this.formulaEngine, this);
    this.sheets.set(name, ws);
    if (!this._active) this._active = name;

    // Phase 30b: Subscribe invalidation engine to this worksheet's events
    this.pivotInvalidationEngine.observeWorksheet(
      ws.name,
      (listener) => ws.on(listener)
    );

    return ws;
  }

  getSheet(name: string): Worksheet | undefined { return this.sheets.get(name); }
  getSheetNames(): string[] { return Array.from(this.sheets.keys()); }

  get activeSheet(): Worksheet | undefined { return this._active ? this.sheets.get(this._active) : undefined; }
  set activeSheetName(name: string) { if (!this.sheets.has(name)) throw new Error('No such sheet'); this._active = name; }

  setFormulaEngine(engine?: IFormulaEngine) {
    this.formulaEngine = engine;
    for (const ws of this.sheets.values()) ws.setFormulaEngine(engine);
  }

  /**
   * Phase 28/29/30b/32: Disposal safety
   * Phase 32 patch: Authoritative cleanup path
   * Clear registry, snapshots, dependency index, anchor index, and event subscriptions
   */
  dispose(): void {
    this.pivotInvalidationEngine.dispose(); // Phase 30b: Clean up event subscriptions
    this.pivotDependencyIndex.clear();      // Phase 30b: Clear dependency index
    this.pivotAnchorIndex.clear();          // Phase 32: Clear anchor index
    this.pivotRegistry.clear();             // Phase 28: Clear registry
    this.pivotSnapshotStore.clearAll();     // Phase 29: Clear snapshots
  }
}
