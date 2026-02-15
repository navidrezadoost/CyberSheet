/**
 * CellLayout: Pure text layout computation exploiting StyleCache identity
 *
 * Phase 2 Discipline:
 * - Pure functions only
 * - No cache until profiler demands it
 * - Leverage: styleA === styleB is O(1) canonical truth
 *
 * Design Principle:
 * Phase 1 earned simplicity. Phase 2 spends it.
 *
 * If this feels boring, that's correct. That's leverage working.
 */

import type { CellStyle } from './types';

/**
 * Layout output: dimensions and text metrics
 * Immutable by design.
 */
export interface CellLayout {
  /** Measured text width in pixels */
  readonly textWidth: number;
  /** Measured text height in pixels */
  readonly textHeight: number;
  /** Number of lines after wrap/overflow handling */
  readonly lineCount: number;
  /** Actual rendered lines (after wrap) */
  readonly lines: readonly string[];
  /** Whether text was truncated/ellipsized */
  readonly truncated: boolean;
  /** Vertical offset from cell top (computed from valign) */
  readonly verticalOffset: number;
}

/**
 * Layout input: everything needed to compute layout
 * Style must be interned (frozen, canonical reference)
 */
export interface LayoutInput {
  readonly value: string;
  readonly style: CellStyle;
  readonly width: number;   // Cell width constraint
  readonly height: number;  // Cell height for vertical alignment
}

/**
 * Text measurer abstraction
 * Allows testing without canvas and future optimization
 */
export interface TextMeasurer {
  measure(text: string, fontSize: number, bold: boolean, italic: boolean): {
    width: number;
    height: number;
  };
}

/**
 * Simple canvas-based text measurer
 * This is the "obvious" implementation - no cleverness
 */
export class CanvasTextMeasurer implements TextMeasurer {
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(ctx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    if (ctx) {
      this.ctx = ctx;
    } else if (typeof OffscreenCanvas !== 'undefined') {
      this.ctx = new OffscreenCanvas(1, 1).getContext('2d')!;
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      this.ctx = canvas.getContext('2d')!;
    } else {
      throw new Error('No canvas context available');
    }
  }

  measure(text: string, fontSize: number, bold: boolean, italic: boolean) {
    const weight = bold ? 'bold' : 'normal';
    const style = italic ? 'italic' : 'normal';
    this.ctx.font = `${style} ${weight} ${fontSize}px Arial`;
    
    const metrics = this.ctx.measureText(text);
    
    return {
      width: metrics.width,
      height: fontSize * 1.2, // Line height approximation
    };
  }
}

/**
 * Mock measurer for testing
 * Rough but deterministic
 */
export class MockTextMeasurer implements TextMeasurer {
  measure(text: string, fontSize: number, bold: boolean, italic: boolean) {
    // Rough estimate: 0.6 * fontSize per character
    let charWidth = fontSize * 0.6;
    if (bold) charWidth *= 1.1; // Bold slightly wider
    
    return {
      width: text.length * charWidth,
      height: fontSize * 1.2,
    };
  }
}

/**
 * Compute vertical text offset based on vertical alignment
 * 
 * Pure function: No side effects, no mutations
 * 
 * @param valign - Vertical alignment ('top' | 'middle' | 'bottom')
 * @param cellHeight - Cell height in pixels
 * @param contentHeight - Content height in pixels (after wrap/rotation)
 * @param fontSize - Font size for baseline adjustment
 * @param paddingTop - Top padding (default: 2)
 * @param paddingBottom - Bottom padding (default: 4)
 * @returns Vertical offset from cell top in pixels
 */
export function computeVerticalOffset(
  valign: 'top' | 'middle' | 'bottom' | undefined,
  cellHeight: number,
  contentHeight: number,
  fontSize: number,
  paddingTop: number = 2,
  paddingBottom: number = 4
): number {
  // Default to 'bottom' (Excel convention)
  const align = valign ?? 'bottom';
  
  // Available height after padding
  const availableHeight = cellHeight - paddingTop - paddingBottom;
  
  let offset: number;
  
  switch (align) {
    case 'top':
      offset = paddingTop + fontSize;
      break;
    case 'middle':
      offset = paddingTop + (availableHeight + contentHeight) / 2;
      break;
    case 'bottom':
      offset = cellHeight - paddingBottom;
      break;
    default:
      offset = cellHeight - paddingBottom;
  }
  
  // Clamp to ensure text stays within padding bounds
  offset = Math.max(paddingTop + fontSize, offset);
  
  return offset;
}

/**
 * Pure layout computation
 * No cache, no observers, no graph
 * Just: compute layout from inputs
 *
 * This is the "boring" version. Measure it first.
 */
export function computeLayout(
  input: LayoutInput,
  measurer: TextMeasurer
): CellLayout {
  const { value, style, width, height } = input;
  
  // Extract style properties (frozen, safe to read)
  const fontSize = style.fontSize ?? 12;
  const bold = style.bold ?? false;
  const italic = style.italic ?? false;
  const valign = style.valign;
  
  // Measure the full text
  const metrics = measurer.measure(value, fontSize, bold, italic);
  
  // Single line for now (no wrap, no shrink)
  // This is the baseline. Add complexity only if profiler demands it.
  const lines = Object.freeze([value]);
  const truncated = metrics.width > width;
  
  // Compute vertical offset (pure layout concern)
  const verticalOffset = computeVerticalOffset(
    valign,
    height,
    metrics.height,
    fontSize
  );
  
  const layout: CellLayout = {
    textWidth: metrics.width,
    textHeight: metrics.height,
    lineCount: 1,
    lines,
    truncated,
    verticalOffset,
  };
  
  // Freeze output (immutability guarantee)
  return Object.freeze(layout) as CellLayout;
}
