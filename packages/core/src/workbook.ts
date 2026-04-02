import { Worksheet } from './worksheet';
import { IFormulaEngine } from './types';
import { StyleCache } from './StyleCache';
import { PivotRegistry, PivotRegistryImpl } from './PivotRegistry';
import type { PivotId } from './PivotRegistry';
import { PivotSnapshotStore } from './PivotSnapshotStore';
import { PivotDependencyIndexImpl } from './PivotDependencyIndex';
import { PivotInvalidationEngineImpl } from './PivotInvalidationEngine';
import type { Range } from './types';

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
   * Phase 28/29/30b: Disposal safety
   * Clear registry, snapshots, dependency index, and event subscriptions
   */
  dispose(): void {
    this.pivotInvalidationEngine.dispose(); // Phase 30b: Clean up event subscriptions
    this.pivotDependencyIndex.clear();      // Phase 30b: Clear dependency index
    this.pivotRegistry.clear();
    this.pivotSnapshotStore.clearAll();     // Phase 29
  }
}
