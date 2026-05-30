/**
 * Type definitions for Excel-like Ribbon UI
 * 
 * These types support mixed-state selections (critical for multi-cell ranges)
 * and Command Pattern integration with @cyber-sheet/core
 */

/**
 * Fill type for cell backgrounds (solid/pattern/gradient)
 * Imported from fillTypes to avoid circular dependencies
 */
import type { Fill } from './fillTypes';

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
 * 1. Apply color to entire selection range (respecting merged cells, protected cells)
 * 2. Support undo/redo through CommandManager
 * 3. Emit events for UI updates
 * 
 * CRITICAL: Must be range-aware. Selection may be:
 * - Single cell (A1)
 * - Range (A1:B10)
 * - Non-contiguous (A1,C3,E5)
 * - Merged cells (respect merge boundaries)
 * - Protected cells (skip or fail based on policy)
 */
export interface FontColorCommand {
  /**
   * Apply color to selection
   * @param color - Hex color value or AUTOMATIC_COLOR
   * @param selection - Current selection range(s)
   */
  execute(color: ColorValue, selection: SelectionState): void;
}

/**
 * Command interface for fill (background) color operations
 * 
 * Works with Fill type (solid/pattern/gradient) instead of simple color string.
 * This is the key difference from FontColorCommand - accepts structured Fill objects.
 */
export interface FillColorCommand {
  /**
   * Apply fill to selection
   * @param fill - Fill object (solid/pattern/gradient)
   * @param selection - Current selection range(s)
   */
  execute(fill: Fill, selection: SelectionState): void;
}

/**
 * Command interface for border operations
 * 
 * Handles border style, color, and position. Unlike Font/Fill Color,
 * borders can affect multiple edges of cells simultaneously (top, bottom, left, right, all, outer, etc.)
 * 
 * CRITICAL: Border operations must be range-aware:
 * - Single cell: Apply to specified edges
 * - Multi-cell: Apply outer/inner borders correctly (e.g., "outer" only affects perimeter)
 * - Merged cells: Respect merge boundaries
 */
export interface BorderCommand {
  /**
   * Apply border to selection
   * @param payloads - Array of border operations (style + color + position)
   * @param selection - Current selection range(s)
   * 
   * Example: "All Borders" = multiple payloads (top, bottom, left, right)
   * Example: "Thick Box Border" = outer edges with thick style
   */
  execute(payloads: Array<{
    style: string;
    color: string;
    position: string;
  }>, selection: SelectionState): void;
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
  
  // Color support
  fontColor?: StyleState<ColorValue>;
  
  // Fill support (solid/pattern/gradient)
  fillColor?: StyleState<Fill>;
  
  // Border support (style + color)
  border?: StyleState<{ style: string; color: string }>;
  
  // Number format support (semantic state)
  // ⚠️ formatString is source of truth, type is optional hint
  numberFormat?: StyleState<{ formatString: string; type?: string }>;
  
  // Alignment support (compound state)
  horizontalAlign?: StyleState<"left" | "center" | "right" | "justify">;
  verticalAlign?: StyleState<"top" | "middle" | "bottom">;
  wrapText?: StyleState<boolean>;
  
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
  undo(): boolean | void;
  redo(): boolean | void;
  canUndo(): boolean;
  canRedo(): boolean;
  execute(command: any): void;
  subscribe?(listener: () => void): () => void;
}
