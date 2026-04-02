import { Worksheet } from './worksheet';
import { IFormulaEngine } from './types';
import { StyleCache } from './StyleCache';
import { PivotRegistry, PivotRegistryImpl } from './PivotRegistry';
import { PivotSnapshotStore } from './PivotSnapshotStore';

export class Workbook {
  private sheets = new Map<string, Worksheet>();
  private _active?: string;
  private formulaEngine?: IFormulaEngine;
  private styleCache = new StyleCache();
  private pivotRegistry: PivotRegistry = new PivotRegistryImpl();
  private pivotSnapshotStore = new PivotSnapshotStore(); // Phase 29

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

  addSheet(name: string, rows?: number, cols?: number): Worksheet {
    if (this.sheets.has(name)) throw new Error(`Sheet '${name}' already exists`);
    const ws = new Worksheet(name, rows, cols, this.formulaEngine, this);
    this.sheets.set(name, ws);
    if (!this._active) this._active = name;
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
   * Phase 28/29: Disposal safety
   * Clear registry and snapshots to prevent memory leaks
   */
  dispose(): void {
    this.pivotRegistry.clear();
    this.pivotSnapshotStore.clearAll(); // Phase 29
    // Future: Add worksheet disposal if needed
  }
}
