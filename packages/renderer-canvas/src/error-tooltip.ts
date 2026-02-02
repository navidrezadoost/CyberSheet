/**
 * Error Tooltip Module
 * 
 * Provides interactive tooltips for error cells with error details and fix suggestions.
 * Includes smart positioning to avoid viewport edges and debounced hover detection.
 * 
 * Week 9 Day 3: Error Highlighting + Interactive Tooltips
 */

import { getErrorSolution, formatErrorSolutionHTML, getErrorSolutionCSS, ErrorSolution } from './error-solutions';
import { getErrorType, isFormulaError } from './error-highlighter';

/**
 * Tooltip configuration options
 */
export interface TooltipOptions {
  /** Delay in milliseconds before showing tooltip (debounce) */
  hoverDelay?: number;
  /** Whether to show documentation links in tooltip */
  showDocLinks?: boolean;
  /** Custom CSS class for tooltip */
  customClass?: string;
  /** Maximum width of tooltip in pixels */
  maxWidth?: number;
  /** Fade animation duration in milliseconds */
  fadeDuration?: number;
  /** Z-index for tooltip positioning */
  zIndex?: number;
}

/**
 * Default tooltip options
 */
export const DEFAULT_TOOLTIP_OPTIONS: Required<TooltipOptions> = {
  hoverDelay: 200,
  showDocLinks: true,
  customClass: '',
  maxWidth: 320,
  fadeDuration: 200,
  zIndex: 10000,
};

/**
 * Tooltip position relative to cell
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Calculated tooltip positioning
 */
export interface TooltipPositioning {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
  /** Position relative to cell */
  position: TooltipPosition;
  /** Whether arrow should be shown */
  showArrow: boolean;
}

/**
 * Error tooltip manager
 * Handles tooltip creation, positioning, and lifecycle
 */
export class ErrorTooltipManager {
  private container: HTMLElement;
  private tooltip: HTMLElement | null = null;
  private currentCell: { row: number; col: number } | null = null;
  private hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  private options: Required<TooltipOptions>;
  private isVisible = false;

  constructor(container: HTMLElement, options: TooltipOptions = {}) {
    this.container = container;
    this.options = { ...DEFAULT_TOOLTIP_OPTIONS, ...options };
    this.createTooltipElement();
    this.injectStyles();
  }

  /**
   * Creates the tooltip DOM element
   */
  private createTooltipElement(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = `error-tooltip ${this.options.customClass}`;
    this.tooltip.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #E0E0E0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: ${this.options.zIndex};
      max-width: ${this.options.maxWidth}px;
      opacity: 0;
      transition: opacity ${this.options.fadeDuration}ms ease-in-out;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.tooltip);
  }

  /**
   * Injects CSS styles for tooltip content
   */
  private injectStyles(): void {
    const styleId = 'error-tooltip-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = getErrorSolutionCSS();
    document.head.appendChild(style);
  }

  /**
   * Calculates optimal tooltip position to avoid viewport edges
   */
  private calculatePosition(cellRect: DOMRect): TooltipPositioning {
    if (!this.tooltip) {
      return { x: 0, y: 0, position: 'bottom', showArrow: true };
    }

    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spacing = 8; // pixels between cell and tooltip
    const arrowSize = 6;

    let position: TooltipPosition = 'bottom';
    let x = cellRect.left;
    let y = cellRect.bottom + spacing;

    // Try bottom first (default)
    if (y + tooltipRect.height > viewportHeight) {
      // Not enough space below, try above
      position = 'top';
      y = cellRect.top - tooltipRect.height - spacing;

      if (y < 0) {
        // Not enough space above either, try right
        position = 'right';
        x = cellRect.right + spacing;
        y = cellRect.top + (cellRect.height - tooltipRect.height) / 2;

        if (x + tooltipRect.width > viewportWidth) {
          // Not enough space on right, try left
          position = 'left';
          x = cellRect.left - tooltipRect.width - spacing;
          y = cellRect.top + (cellRect.height - tooltipRect.height) / 2;

          if (x < 0) {
            // Fallback to bottom with horizontal adjustment
            position = 'bottom';
            x = cellRect.left;
            y = cellRect.bottom + spacing;
          }
        }
      }
    }

    // Adjust horizontal position to keep tooltip in viewport
    if (position === 'top' || position === 'bottom') {
      x = Math.max(spacing, Math.min(x, viewportWidth - tooltipRect.width - spacing));
    }

    // Adjust vertical position to keep tooltip in viewport
    if (position === 'left' || position === 'right') {
      y = Math.max(spacing, Math.min(y, viewportHeight - tooltipRect.height - spacing));
    }

    return { x, y, position, showArrow: true };
  }

  /**
   * Shows tooltip for an error cell
   */
  public show(
    error: Error,
    cellRect: DOMRect,
    cellAddress: { row: number; col: number }
  ): void {
    if (!this.tooltip) return;

    this.currentCell = cellAddress;
    
    // Get error solution
    const solution = getErrorSolution(error);
    
    // Set tooltip content
    this.tooltip.innerHTML = formatErrorSolutionHTML(solution);
    
    // Make tooltip visible for measurement
    this.tooltip.style.display = 'block';
    this.tooltip.style.opacity = '0';
    
    // Calculate position
    const positioning = this.calculatePosition(cellRect);
    
    // Apply position
    this.tooltip.style.left = `${positioning.x}px`;
    this.tooltip.style.top = `${positioning.y}px`;
    
    // Fade in
    requestAnimationFrame(() => {
      if (this.tooltip) {
        this.tooltip.style.opacity = '1';
        this.isVisible = true;
      }
    });
  }

  /**
   * Hides the tooltip
   */
  public hide(): void {
    if (!this.tooltip || !this.isVisible) return;

    this.tooltip.style.opacity = '0';
    this.isVisible = false;
    this.currentCell = null;

    setTimeout(() => {
      if (this.tooltip && !this.isVisible) {
        this.tooltip.style.display = 'none';
      }
    }, this.options.fadeDuration);
  }

  /**
   * Handles mouse move over canvas
   * Implements debounced hover detection
   */
  public handleMouseMove(
    event: MouseEvent,
    getCellAtPosition: (x: number, y: number) => { row: number; col: number; value: unknown; rect: DOMRect } | null
  ): void {
    // Clear existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    // Get cell at mouse position
    const cellInfo = getCellAtPosition(event.clientX, event.clientY);

    if (!cellInfo || !isFormulaError(cellInfo.value)) {
      // Not hovering over error cell, hide tooltip
      this.hide();
      return;
    }

    // Check if we're already showing tooltip for this cell
    if (this.currentCell && 
        this.currentCell.row === cellInfo.row && 
        this.currentCell.col === cellInfo.col &&
        this.isVisible) {
      return; // Already showing, do nothing
    }

    // Set timeout to show tooltip after hover delay
    this.hoverTimeout = setTimeout(() => {
      if (cellInfo && isFormulaError(cellInfo.value)) {
        this.show(cellInfo.value, cellInfo.rect, { row: cellInfo.row, col: cellInfo.col });
      }
    }, this.options.hoverDelay);
  }

  /**
   * Handles mouse leave from canvas
   */
  public handleMouseLeave(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.hide();
  }

  /**
   * Gets current tooltip visibility state
   */
  public isTooltipVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Gets current cell being displayed
   */
  public getCurrentCell(): { row: number; col: number } | null {
    return this.currentCell;
  }

  /**
   * Updates tooltip options
   */
  public setOptions(options: Partial<TooltipOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (this.tooltip) {
      this.tooltip.style.maxWidth = `${this.options.maxWidth}px`;
      this.tooltip.style.zIndex = `${this.options.zIndex}`;
      this.tooltip.style.transition = `opacity ${this.options.fadeDuration}ms ease-in-out`;
    }
  }

  /**
   * Cleans up tooltip element and event listeners
   */
  public destroy(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }

    this.currentCell = null;
    this.isVisible = false;
  }
}

/**
 * Helper function to get cell bounding rect from canvas coordinates
 */
export function getCellRectFromCanvas(
  canvas: HTMLCanvasElement,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number
): DOMRect {
  const canvasRect = canvas.getBoundingClientRect();
  
  return new DOMRect(
    canvasRect.left + cellX,
    canvasRect.top + cellY,
    cellWidth,
    cellHeight
  );
}

/**
 * Creates a tooltip manager instance for a canvas renderer
 */
export function createErrorTooltipManager(
  container: HTMLElement,
  options?: TooltipOptions
): ErrorTooltipManager {
  return new ErrorTooltipManager(container, options);
}
