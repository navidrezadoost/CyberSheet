import { Worksheet } from './worksheet';
import { IFormulaEngine } from './types';
import { StyleCache } from './StyleCache';
import { PivotRegistry, PivotRegistryImpl } from './PivotRegistry';

export class Workbook {
  private sheets = new Map<string, Worksheet>();
  private _active?: string;
  private formulaEngine?: IFormulaEngine;
  private styleCache = new StyleCache();
  private pivotRegistry: PivotRegistry = new PivotRegistryImpl();

  getStyleCache(): StyleCache {
    return this.styleCache;
  }

  /**
   * Phase 28: Get pivot registry for addressable pivots
   */
  getPivotRegistry(): PivotRegistry {
    return this.pivotRegistry;
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
   * Phase 28: Disposal safety
   * Clear registry to prevent memory leaks
   */
  dispose(): void {
    this.pivotRegistry.clear();
    // Future: Add worksheet disposal if needed
  }
}
