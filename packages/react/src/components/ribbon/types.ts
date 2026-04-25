/**
 * Type definitions for Excel-like Ribbon UI
 * 
 * These types support mixed-state selections (critical for multi-cell ranges)
 * and Command Pattern integration with @cyber-sheet/core
 */

/**
 * Color value in hex format
 * @example "#FF0000", "#000000"
 */
export type ColorValue = string;

/**
 * Style state that supports mixed values in multi-cell selections
 * 
 * - `T`: Single value (e.g., true for bold, "#FF0000" for color)
 * - `"mixed"`: Multiple different values in selection (show indeterminate state)
 * - `undefined`: No value set (use default)
 * 
 * @example
 * // Single cell selected, bold
 * StyleState<boolean> = true
 * 
 * // Multiple cells: some bold, some not
 * StyleState<boolean> = "mixed"
 * 
 * // Single cell, red text
 * StyleState<ColorValue> = "#FF0000"
 * 
 * // Multiple cells: different colors
 * StyleState<ColorValue> = "mixed"
 */
export type StyleState<T> = T | "mixed" | undefined;

/**
 * Command interface for font color operations
 * 
 * Implementations must:
 * 1. Apply color to all cells in current selection
 * 2. Support undo/redo through CommandManager
 * 3. Emit events for UI updates
 */
export interface FontColorCommand {
  execute(color: ColorValue): void;
}

/**
 * Command interface for fill (background) color operations
 * 
 * Same contract as FontColorCommand but applies to cell background
 */
export interface FillColorCommand {
  execute(color: ColorValue): void;
}

/**
 * Selection state from @cyber-sheet/core
 * 
 * This interface must be implemented by the real backend.
 * Current implementation in HomeTab uses simplified mock.
 */
export interface SelectionState {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  
  // Color support (TODO: update HomeTab to use StyleState)
  fontColor?: StyleState<ColorValue>;
  fillColor?: StyleState<ColorValue>;
  
  /**
   * Get style state with mixed-value support
   * 
   * @param property - Style property name
   * @returns true | false | "mixed" for multi-cell selections
   * 
   * @example
   * // Single cell, bold
   * selection.getStyleState("bold") // → true
   * 
   * // Multiple cells: some bold, some not
   * selection.getStyleState("bold") // → "mixed"
   * 
   * // Single cell, not bold
   * selection.getStyleState("bold") // → false
   */
  getStyleState?(property: string): StyleState<boolean | ColorValue>;
}

/**
 * Command manager interface from @cyber-sheet/core
 * 
 * All UI actions must go through this to enable undo/redo
 */
export interface CommandManager {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  execute(command: any): void;
}
