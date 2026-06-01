/**
 * ViewCommands.ts
 *
 * Command implementations for View tab operations:
 * - Freeze Panes (top row, first column, at selection)
 * - Split Window (create panes at selection)
 * - Zoom (change zoom level)
 * - View Mode (Normal, Page Break Preview, Page Layout)
 * - Show/Hide (Gridlines, Headings, Formula Bar, Ruler)
 *
 * All commands implement the Command interface for undo/redo support.
 */

import type { Command } from '../CommandManager';
import type { Workbook } from '../workbook';
import type { Address } from '../types';
import type { Worksheet } from '../worksheet';
import type { HeaderFooterSettings } from '../headerFooter';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FreezePanesState {
  type: 'none' | 'topRow' | 'firstColumn' | 'cell';
  cell?: Address;
  frozenRows?: number;
  frozenCols?: number;
}

export interface SplitState {
  enabled: boolean;
  position?: Address;
  horizontalSplit?: number;
  verticalSplit?: number;
}

export type ViewMode = 'normal' | 'pageBreak' | 'pageLayout';

export interface ShowOptions {
  gridlines: boolean;
  headings: boolean;
  formulaBar: boolean;
  ruler: boolean;
}

// ─── Freeze Panes Commands ─────────────────────────────────────────────────

/**
 * FreezePanesCommand: Freeze rows/columns for scrolling
 *
 * Keeps specified rows/columns visible when scrolling.
 */
export class FreezePanesCommand implements Command {
  description = 'Freeze Panes';

  private previousState: FreezePanesState;

  constructor(
    private workbook: Workbook,
    private freezeType: 'topRow' | 'firstColumn' | 'cell' | 'unfreeze',
    private cell?: Address
  ) {
    // Capture current freeze state
    this.previousState = this.getCurrentFreezeState();
  }

  execute(): void {
    const state = (this.workbook as any).freezePanesState || {};

    switch (this.freezeType) {
      case 'topRow':
        state.type = 'topRow';
        state.frozenRows = 1;
        state.frozenCols = 0;
        state.cell = undefined;
        console.log('Froze top row');
        break;

      case 'firstColumn':
        state.type = 'firstColumn';
        state.frozenRows = 0;
        state.frozenCols = 1;
        state.cell = undefined;
        console.log('Froze first column');
        break;

      case 'cell':
        if (!this.cell) {
          console.warn('Freeze at cell requires cell address');
          return;
        }
        state.type = 'cell';
        state.cell = this.cell;
        state.frozenRows = this.cell.row;
        state.frozenCols = this.cell.col;
        console.log(`Froze panes at cell (${this.cell.row}, ${this.cell.col})`);
        break;

      case 'unfreeze':
        state.type = 'none';
        state.frozenRows = 0;
        state.frozenCols = 0;
        state.cell = undefined;
        console.log('Unfroze panes');
        break;
    }

    (this.workbook as any).freezePanesState = state;
  }

  undo(): void {
    (this.workbook as any).freezePanesState = this.previousState;
    console.log('Restored previous freeze panes state');
  }

  private getCurrentFreezeState(): FreezePanesState {
    const state = (this.workbook as any).freezePanesState;
    if (!state || state.type === 'none') {
      return { type: 'none', frozenRows: 0, frozenCols: 0 };
    }

    return {
      type: state.type,
      cell: state.cell,
      frozenRows: state.frozenRows,
      frozenCols: state.frozenCols,
    };
  }
}

// ─── Split Window Commands ─────────────────────────────────────────────────

/**
 * SplitWindowCommand: Split window into panes at selection
 *
 * Creates horizontal and/or vertical split for independent scrolling.
 */
export class SplitWindowCommand implements Command {
  description = 'Split Window';

  private previousState: SplitState | null;

  constructor(
    private workbook: Workbook,
    private cell?: Address
  ) {
    this.previousState = this.getCurrentSplitState();
  }

  execute(): void {
    if (!this.cell) {
      // Toggle split off if no cell specified
      (this.workbook as any).splitState = { enabled: false };
      console.log('Removed window split');
      return;
    }

    const splitState: SplitState = {
      enabled: true,
      position: this.cell,
      horizontalSplit: this.cell.row,
      verticalSplit: this.cell.col,
    };

    (this.workbook as any).splitState = splitState;
    console.log(`Split window at cell (${this.cell.row}, ${this.cell.col})`);
  }

  undo(): void {
    if (this.previousState) {
      (this.workbook as any).splitState = this.previousState;
      console.log('Restored previous split state');
    } else {
      (this.workbook as any).splitState = { enabled: false };
      console.log('Removed split');
    }
  }

  private getCurrentSplitState(): SplitState | null {
    const state = (this.workbook as any).splitState;
    if (!state || !state.enabled) {
      return null;
    }

    return {
      enabled: state.enabled,
      position: state.position,
      horizontalSplit: state.horizontalSplit,
      verticalSplit: state.verticalSplit,
    };
  }
}

// ─── Zoom Commands ─────────────────────────────────────────────────────────

/**
 * SetZoomCommand: Change zoom level (10-400%)
 *
 * Stores zoom level for active worksheet.
 */
export class SetZoomCommand implements Command {
  description = 'Set Zoom';

  private previousZoom: number;

  constructor(
    private workbook: Workbook,
    private zoom: number
  ) {
    // Clamp zoom to valid range
    this.zoom = Math.max(10, Math.min(400, zoom));
    
    // Capture current zoom
    this.previousZoom = this.getCurrentZoom();
  }

  execute(): void {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return;

    // Store zoom on worksheet
    (sheet as any).zoom = this.zoom;
    console.log(`Set zoom to ${this.zoom}%`);
  }

  undo(): void {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return;

    (sheet as any).zoom = this.previousZoom;
    console.log(`Restored zoom to ${this.previousZoom}%`);
  }

  private getCurrentZoom(): number {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return 100;

    return (sheet as any).zoom || 100;
  }
}

/**
 * ZoomToSelectionCommand: Auto-zoom to fit selection in view
 *
 * Calculates zoom level that fits the selected range in viewport.
 */
export class ZoomToSelectionCommand implements Command {
  description = 'Zoom to Selection';

  private previousZoom: number;

  constructor(
    private workbook: Workbook,
    private selectionRange: { start: Address; end: Address },
    private viewportWidth: number = 1000,
    private viewportHeight: number = 600
  ) {
    this.previousZoom = this.getCurrentZoom();
  }

  execute(): void {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return;

    // Calculate selection dimensions (approximate)
    const rowCount = this.selectionRange.end.row - this.selectionRange.start.row + 1;
    const colCount = this.selectionRange.end.col - this.selectionRange.start.col + 1;

    // Estimate cell dimensions (default Excel sizes)
    const avgRowHeight = 20; // pixels
    const avgColWidth = 80; // pixels

    const selectionHeight = rowCount * avgRowHeight;
    const selectionWidth = colCount * avgColWidth;

    // Calculate zoom to fit (with 10% padding)
    const zoomHeight = (this.viewportHeight * 0.9 / selectionHeight) * 100;
    const zoomWidth = (this.viewportWidth * 0.9 / selectionWidth) * 100;

    // Use smaller zoom to ensure entire selection fits
    const calculatedZoom = Math.min(zoomHeight, zoomWidth);

    // Clamp to valid range
    const newZoom = Math.max(10, Math.min(400, Math.round(calculatedZoom)));

    (sheet as any).zoom = newZoom;
    console.log(`Zoomed to ${newZoom}% to fit selection`);
  }

  undo(): void {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return;

    (sheet as any).zoom = this.previousZoom;
    console.log(`Restored zoom to ${this.previousZoom}%`);
  }

  private getCurrentZoom(): number {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return 100;

    return (sheet as any).zoom || 100;
  }
}

// ─── View Mode Commands ────────────────────────────────────────────────────

/**
 * SetViewModeCommand: Change worksheet view mode
 *
 * Switches between Normal, Page Break Preview, and Page Layout views.
 */
export class SetViewModeCommand implements Command {
  description = 'Set View Mode';

  private previousMode: ViewMode;

  constructor(
    private workbook: Workbook,
    private mode: ViewMode
  ) {
    this.previousMode = this.getCurrentViewMode();
  }

  execute(): void {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return;

    (sheet as any).viewMode = this.mode;
    console.log(`Changed view mode to: ${this.mode}`);
  }

  undo(): void {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return;

    (sheet as any).viewMode = this.previousMode;
    console.log(`Restored view mode to: ${this.previousMode}`);
  }

  private getCurrentViewMode(): ViewMode {
    const sheet = this.workbook.activeSheet;
    if (!sheet) return 'normal';

    return (sheet as any).viewMode || 'normal';
  }
}

/**
 * SetHeaderFooterCommand: Update worksheet header and footer text
 */
export class SetHeaderFooterCommand implements Command {
  description = 'Set Header and Footer';

  private previousSettings: HeaderFooterSettings;

  constructor(
    private worksheet: Worksheet,
    private settings: HeaderFooterSettings,
  ) {
    this.previousSettings = worksheet.getHeaderFooter();
  }

  execute(): void {
    this.worksheet.setHeaderFooter(this.settings);
  }

  undo(): void {
    this.worksheet.setHeaderFooter(this.previousSettings);
  }
}

// ─── Show/Hide Commands ────────────────────────────────────────────────────

/**
 * ToggleShowOptionCommand: Show/hide UI elements
 *
 * Controls visibility of gridlines, headings, formula bar, ruler.
 */
export class ToggleShowOptionCommand implements Command {
  description: string;

  private previousValue: boolean;

  constructor(
    private workbook: Workbook,
    private option: 'gridlines' | 'headings' | 'formulaBar' | 'ruler',
    private value: boolean
  ) {
    this.description = `Toggle ${option}: ${value ? 'ON' : 'OFF'}`;
    this.previousValue = this.getCurrentValue();
  }

  execute(): void {
    // Store show options on workbook
    if (!(this.workbook as any).showOptions) {
      (this.workbook as any).showOptions = {
        gridlines: true,
        headings: true,
        formulaBar: true,
        ruler: false,
      };
    }

    const options = (this.workbook as any).showOptions as ShowOptions;
    options[this.option] = this.value;

    console.log(`${this.option}: ${this.value ? 'ON' : 'OFF'}`);
  }

  undo(): void {
    const options = (this.workbook as any).showOptions as ShowOptions;
    if (options) {
      options[this.option] = this.previousValue;
      console.log(`Restored ${this.option} to: ${this.previousValue ? 'ON' : 'OFF'}`);
    }
  }

  private getCurrentValue(): boolean {
    const options = (this.workbook as any).showOptions as ShowOptions | undefined;
    if (!options) {
      // Default values
      return this.option === 'gridlines' || this.option === 'headings' || this.option === 'formulaBar';
    }

    return options[this.option];
  }
}

// ─── Window Commands ───────────────────────────────────────────────────────

/**
 * HideWindowCommand: Hide current workbook window
 *
 * Hides the window from view (can be unhidden later).
 */
export class HideWindowCommand implements Command {
  description = 'Hide Window';

  private wasHidden: boolean;

  constructor(private workbook: Workbook) {
    this.wasHidden = (this.workbook as any).windowHidden || false;
  }

  execute(): void {
    (this.workbook as any).windowHidden = true;
    console.log('Window hidden');
  }

  undo(): void {
    (this.workbook as any).windowHidden = this.wasHidden;
    console.log('Window visibility restored');
  }
}

/**
 * NewWindowCommand: Open new window for same workbook
 *
 * Creates a duplicate view (not a command in traditional sense, but tracked for consistency).
 */
export class NewWindowCommand implements Command {
  description = 'New Window';

  private windowId: string;

  constructor(private workbook: Workbook) {
    this.windowId = `window_${Date.now()}_${Math.random()}`;
  }

  execute(): void {
    // Track open windows
    if (!(this.workbook as any).openWindows) {
      (this.workbook as any).openWindows = [];
    }

    (this.workbook as any).openWindows.push({
      id: this.windowId,
      created: new Date(),
      workbookName: (this.workbook as any).name || 'Untitled',
    });

    console.log(`Opened new window: ${this.windowId}`);
  }

  undo(): void {
    const windows = (this.workbook as any).openWindows as Array<any>;
    if (windows) {
      const index = windows.findIndex(w => w.id === this.windowId);
      if (index >= 0) {
        windows.splice(index, 1);
        console.log(`Closed window: ${this.windowId}`);
      }
    }
  }
}

// ─── Arrange Windows Command ───────────────────────────────────────────────

/**
 * ArrangeWindowsCommand: Arrange multiple windows
 *
 * Arranges open windows in tiled, horizontal, vertical, or cascade layout.
 */
export class ArrangeWindowsCommand implements Command {
  description = 'Arrange Windows';

  private previousLayout: string | undefined;

  constructor(
    private workbook: Workbook,
    private layout: 'tiled' | 'horizontal' | 'vertical' | 'cascade'
  ) {
    this.previousLayout = (this.workbook as any).windowLayout;
  }

  execute(): void {
    (this.workbook as any).windowLayout = this.layout;
    console.log(`Arranged windows: ${this.layout}`);
  }

  undo(): void {
    if (this.previousLayout) {
      (this.workbook as any).windowLayout = this.previousLayout;
    } else {
      delete (this.workbook as any).windowLayout;
    }
    console.log('Restored previous window layout');
  }
}
