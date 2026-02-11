/**
 * Error Highlighting Module
 * 
 * Provides visual error feedback for cells containing formula errors.
 * Renders red background, border, and error icons for cells with Error values.
 * 
 * Week 9 Day 3: Error Highlighting + Interactive Tooltips
 */

/**
 * Error styling constants matching Excel's error cell appearance
 */
export const ERROR_STYLES = {
  /** Light red background for error cells */
  BACKGROUND: '#FFEBEE',
  /** Red border for error cells */
  BORDER: '#EF9A9A',
  /** Border width in pixels */
  BORDER_WIDTH: 2,
  /** Error icon color (Material Red 500) */
  ICON_COLOR: '#F44336',
  /** Error icon size in pixels */
  ICON_SIZE: 12,
  /** Icon padding from cell edge */
  ICON_PADDING: 2,
} as const;

/**
 * Error icon types
 */
export type ErrorIconType = 'warning' | 'error' | 'none';

/**
 * Configuration for error highlighting
 */
export interface ErrorHighlightOptions {
  /** Whether to show error background color */
  showBackground?: boolean;
  /** Whether to show error border */
  showBorder?: boolean;
  /** Whether to show error icon in cell corner */
  showIcon?: boolean;
  /** Type of icon to display */
  iconType?: ErrorIconType;
  /** Custom background color (overrides default) */
  backgroundColor?: string;
  /** Custom border color (overrides default) */
  borderColor?: string;
  /** Whether to animate errors (shake effect) */
  animate?: boolean;
}

/**
 * Default error highlighting options
 */
export const DEFAULT_ERROR_OPTIONS: Required<ErrorHighlightOptions> = {
  showBackground: true,
  showBorder: true,
  showIcon: true,
  iconType: 'warning',
  backgroundColor: ERROR_STYLES.BACKGROUND,
  borderColor: ERROR_STYLES.BORDER,
  animate: false,
};

/**
 * Error type detection from Error message
 * Maps Excel error types to their standard format
 */
export const ERROR_TYPES = [
  '#DIV/0!',  // Division by zero
  '#N/A',     // Value not available
  '#NAME?',   // Unrecognized function or name
  '#NULL!',   // Null intersection
  '#NUM!',    // Invalid numeric value
  '#REF!',    // Invalid cell reference
  '#VALUE!',  // Wrong type of argument
  '#SPILL!',  // Spill range is blocked
  '#CALC!',   // Calculation error
] as const;

export type ExcelErrorType = typeof ERROR_TYPES[number];

/**
 * Detects if a value is a formula error
 */
export function isFormulaError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Extracts the error type from an Error object
 * Returns the error type (e.g., "#DIV/0!") or null if not a recognized error
 */
export function getErrorType(error: Error): ExcelErrorType | null {
  const message = error.message;
  for (const errorType of ERROR_TYPES) {
    if (message.includes(errorType)) {
      return errorType;
    }
  }
  return null;
}

/**
 * Renders error cell background and border
 */
export function renderErrorCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: ErrorHighlightOptions = {}
): void {
  const opts = { ...DEFAULT_ERROR_OPTIONS, ...options };

  ctx.save();

  // Draw background
  if (opts.showBackground) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(x, y, width, height);
  }

  // Draw border
  if (opts.showBorder) {
    ctx.strokeStyle = opts.borderColor;
    ctx.lineWidth = ERROR_STYLES.BORDER_WIDTH;
    ctx.strokeRect(
      x + ERROR_STYLES.BORDER_WIDTH / 2,
      y + ERROR_STYLES.BORDER_WIDTH / 2,
      width - ERROR_STYLES.BORDER_WIDTH,
      height - ERROR_STYLES.BORDER_WIDTH
    );
  }

  ctx.restore();
}

/**
 * Renders error icon in cell corner
 */
export function renderErrorIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  iconType: ErrorIconType = 'warning',
  zoom: number = 1
): void {
  if (iconType === 'none') return;

  ctx.save();

  const size = ERROR_STYLES.ICON_SIZE * zoom;
  const padding = ERROR_STYLES.ICON_PADDING * zoom;

  // Position in top-right corner
  const iconX = x + width - size - padding;
  const iconY = y + padding;

  ctx.fillStyle = ERROR_STYLES.ICON_COLOR;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Render icon based on type
  if (iconType === 'warning') {
    ctx.fillText('⚠', iconX + size / 2, iconY);
  } else if (iconType === 'error') {
    ctx.fillText('❌', iconX + size / 2, iconY);
  }

  ctx.restore();
}

/**
 * Combined error rendering function
 * Handles both background/border and icon rendering
 */
export function renderCellError(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  error: Error,
  options: ErrorHighlightOptions = {},
  zoom: number = 1
): void {
  const opts = { ...DEFAULT_ERROR_OPTIONS, ...options };

  // Render background and border
  if (opts.showBackground || opts.showBorder) {
    renderErrorCell(ctx, x, y, width, height, opts);
  }

  // Render icon
  if (opts.showIcon) {
    renderErrorIcon(ctx, x, y, width, height, opts.iconType, zoom);
  }
}

/**
 * Gets a user-friendly error message for display
 * Used by tooltip system
 */
export function getErrorMessage(error: Error): string {
  const errorType = getErrorType(error);
  if (errorType) {
    return `${errorType}: ${error.message.replace(errorType, '').trim() || 'Formula error'}`;
  }
  return error.message || 'Unknown error';
}

/**
 * Checks if error cell should be animated
 * Used for shake effect on new errors
 */
export function shouldAnimateError(error: Error, timestamp?: number): boolean {
  // TODO: Implement animation tracking if needed
  // For now, return false (no animation)
  return false;
}

/**
 * Error highlighting plugin for CanvasRenderer
 * Integrates error visualization into the rendering pipeline
 */
export interface ErrorHighlightPlugin {
  name: 'error-highlight';
  
  /**
   * Hook called before cell rendering
   * Returns true if error rendering was applied, false otherwise
   */
  beforeCellRender?: (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; w: number; h: number },
    data: { addr: { row: number; col: number }; value: unknown; style?: any }
  ) => boolean;
  
  /**
   * Hook called after cell rendering
   * Can add overlays like error icons
   */
  afterCellRender?: (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; w: number; h: number },
    data: { addr: { row: number; col: number }; value: unknown; style?: any }
  ) => void;
}

/**
 * Creates an error highlighting plugin instance
 */
export function createErrorHighlightPlugin(
  options: ErrorHighlightOptions = {}
): ErrorHighlightPlugin {
  return {
    name: 'error-highlight',
    
    beforeCellRender(ctx, bounds, data) {
      if (isFormulaError(data.value)) {
        renderErrorCell(
          ctx,
          bounds.x,
          bounds.y,
          bounds.w,
          bounds.h,
          options
        );
        return true;
      }
      return false;
    },
    
    afterCellRender(ctx, bounds, data) {
      if (isFormulaError(data.value)) {
        const opts = { ...DEFAULT_ERROR_OPTIONS, ...options };
        if (opts.showIcon) {
          renderErrorIcon(
            ctx,
            bounds.x,
            bounds.y,
            bounds.w,
            bounds.h,
            opts.iconType,
            1  // zoom factor - TODO: get from renderer
          );
        }
      }
    },
  };
}
