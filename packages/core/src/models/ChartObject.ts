/**
 * ChartObject.ts
 * 
 * Chart metadata model for storing chart configuration
 * Part of Week 12 Day 2: Data Integration
 */

/**
 * Chart types
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'sparkline';

/**
 * Chart options (subset used by ChartObject)
 */
export interface ChartOptions {
  title?: string;
  showLegend?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  colors?: string[];
  backgroundColor?: string;
}

/**
 * Cell range for chart data source
 */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * Chart position on the sheet
 */
export interface ChartPosition {
  x: number;
  y: number;
}

/**
 * Chart size
 */
export interface ChartSize {
  width: number;
  height: number;
}

/**
 * Direction for interpreting data series
 */
export type SeriesDirection = 'rows' | 'columns';

/**
 * Complete chart object with metadata
 */
export interface ChartObject {
  /** Unique identifier for the chart */
  id: string;
  
  /** Type of chart (bar, line, pie, sparkline) */
  type: ChartType;
  
  /** Source data range from the sheet */
  dataRange: CellRange;
  
  /** Position on the sheet (in pixels) */
  position: ChartPosition;
  
  /** Size of the chart (in pixels) */
  size: ChartSize;
  
  /** Chart rendering options */
  options: Omit<ChartOptions, 'type' | 'width' | 'height'>;
  
  /** Direction to read series (rows or columns) */
  seriesDirection: SeriesDirection;
  
  /** Whether the first row contains labels */
  hasHeaderRow: boolean;
  
  /** Whether the first column contains labels */
  hasHeaderCol: boolean;
  
  /** Chart title (optional) */
  title?: string;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last modified timestamp */
  updatedAt: number;
  
  /** Z-index for layering (higher = on top) */
  zIndex: number;
  
  /** Whether the chart is currently selected */
  selected?: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Partial chart update (for modifications)
 */
export type ChartUpdate = Partial<Omit<ChartObject, 'id' | 'createdAt'>>;

/**
 * Chart creation parameters (without auto-generated fields)
 */
export type ChartCreateParams = Omit<
  ChartObject,
  'id' | 'createdAt' | 'updatedAt' | 'selected'
>;

/**
 * Helper to create a new chart object with defaults
 */
export function createChartObject(params: ChartCreateParams): ChartObject {
  const now = Date.now();
  
  return {
    ...params,
    id: generateChartId(),
    createdAt: now,
    updatedAt: now,
    selected: false
  };
}

/**
 * Generate unique chart ID
 */
export function generateChartId(): string {
  return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate chart object
 */
export function validateChartObject(chart: Partial<ChartObject>): string[] {
  const errors: string[] = [];
  
  if (!chart.type) {
    errors.push('Chart type is required');
  }
  
  if (!chart.dataRange) {
    errors.push('Data range is required');
  } else {
    const { startRow, startCol, endRow, endCol } = chart.dataRange;
    if (startRow < 0 || startCol < 0 || endRow < 0 || endCol < 0) {
      errors.push('Data range coordinates must be non-negative');
    }
    if (startRow > endRow || startCol > endCol) {
      errors.push('Data range start must be before end');
    }
  }
  
  if (!chart.position) {
    errors.push('Chart position is required');
  } else {
    const { x, y } = chart.position;
    if (x < 0 || y < 0) {
      errors.push('Chart position coordinates must be non-negative');
    }
  }
  
  if (!chart.size) {
    errors.push('Chart size is required');
  } else {
    const { width, height } = chart.size;
    if (width <= 0 || height <= 0) {
      errors.push('Chart size must be positive');
    }
  }
  
  if (!chart.seriesDirection) {
    errors.push('Series direction is required');
  } else if (chart.seriesDirection !== 'rows' && chart.seriesDirection !== 'columns') {
    errors.push('Series direction must be "rows" or "columns"');
  }
  
  if (chart.hasHeaderRow === undefined) {
    errors.push('hasHeaderRow is required');
  }
  
  if (chart.hasHeaderCol === undefined) {
    errors.push('hasHeaderCol is required');
  }
  
  if (chart.zIndex !== undefined && chart.zIndex < 0) {
    errors.push('zIndex must be non-negative');
  }
  
  return errors;
}

/**
 * Clone a chart object (for duplication)
 */
export function cloneChartObject(chart: ChartObject): ChartObject {
  return {
    ...chart,
    id: generateChartId(),
    dataRange: { ...chart.dataRange },
    position: { 
      ...chart.position,
      x: chart.position.x + 20, // Offset for visibility
      y: chart.position.y + 20
    },
    size: { ...chart.size },
    options: { ...chart.options },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    selected: false,
    metadata: chart.metadata ? { ...chart.metadata } : undefined
  };
}

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(a: CellRange, b: CellRange): boolean {
  return !(
    a.endRow < b.startRow ||
    a.startRow > b.endRow ||
    a.endCol < b.startCol ||
    a.startCol > b.endCol
  );
}

/**
 * Get range size (rows × cols)
 */
export function getRangeSize(range: CellRange): { rows: number; cols: number } {
  return {
    rows: range.endRow - range.startRow + 1,
    cols: range.endCol - range.startCol + 1
  };
}

/**
 * Check if a point (x, y) is within chart bounds
 */
export function isPointInChart(
  point: { x: number; y: number },
  chart: ChartObject
): boolean {
  const { x, y } = point;
  const { position, size } = chart;
  
  return (
    x >= position.x &&
    x <= position.x + size.width &&
    y >= position.y &&
    y <= position.y + size.height
  );
}

/**
 * Get chart bounds as a rectangle
 */
export function getChartBounds(chart: ChartObject): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  return {
    left: chart.position.x,
    top: chart.position.y,
    right: chart.position.x + chart.size.width,
    bottom: chart.position.y + chart.size.height,
    width: chart.size.width,
    height: chart.size.height
  };
}
