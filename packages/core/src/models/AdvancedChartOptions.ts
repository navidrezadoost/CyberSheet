/**
 * AdvancedChartOptions.ts
 * Week 12 Day 6: Advanced Chart Features
 * 
 * Extended chart options for trendlines, custom axes, and advanced features
 */

import type { ChartType } from './ChartObject';

/**
 * Trendline types
 */
export type TrendlineType = 'linear' | 'exponential' | 'polynomial' | 'moving-average';

/**
 * Axis scale type
 */
export type AxisScale = 'linear' | 'logarithmic' | 'time' | 'category';

/**
 * Trendline configuration
 */
export interface TrendlineConfig {
  /** Type of trendline */
  type: TrendlineType;
  
  /** Show trendline equation on chart */
  showEquation?: boolean;
  
  /** Show R² value */
  showRSquared?: boolean;
  
  /** Polynomial degree (for polynomial type) */
  degree?: number;
  
  /** Period for moving average */
  period?: number;
  
  /** Forecast forward periods */
  forecastForward?: number;
  
  /** Forecast backward periods */
  forecastBackward?: number;
  
  /** Line color */
  color?: string;
  
  /** Line width */
  lineWidth?: number;
  
  /** Line style */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Custom axis configuration
 */
export interface AxisConfig {
  /** Scale type */
  scale?: AxisScale;
  
  /** Minimum value (null = auto) */
  min?: number | null;
  
  /** Maximum value (null = auto) */
  max?: number | null;
  
  /** Axis title */
  title?: string;
  
  /** Number of grid lines */
  gridLines?: number;
  
  /** Tick interval */
  tickInterval?: number;
  
  /** Date format (for time scale) */
  dateFormat?: string;
  
  /** Reverse axis direction */
  reverse?: boolean;
  
  /** Show zero line */
  showZeroLine?: boolean;
}

/**
 * Data point for scatter charts
 */
export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
}

/**
 * Combo chart configuration
 */
export interface ComboChartConfig {
  /** Primary chart type */
  primaryType: 'bar' | 'line';
  
  /** Secondary chart type */
  secondaryType: 'bar' | 'line';
  
  /** Dataset indices for primary type */
  primaryDatasets: number[];
  
  /** Dataset indices for secondary type */
  secondaryDatasets: number[];
  
  /** Use secondary Y axis */
  useSecondaryAxis?: boolean;
}

/**
 * Advanced chart options (extends base ChartOptions)
 */
export interface AdvancedChartOptions {
  /** Base options */
  title?: string;
  showLegend?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  colors?: string[];
  backgroundColor?: string;
  
  /** Advanced features */
  
  /** Trendlines (array for multiple series) */
  trendlines?: (TrendlineConfig | null)[];
  
  /** X-axis configuration */
  xAxis?: AxisConfig;
  
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  
  /** Secondary Y-axis (for combo charts) */
  secondaryYAxis?: AxisConfig;
  
  /** Combo chart configuration */
  comboConfig?: ComboChartConfig;
  
  /** Enable data point labels */
  showDataLabels?: boolean;
  
  /** Data label format */
  dataLabelFormat?: string;
  
  /** Enable tooltips */
  enableTooltips?: boolean;
  
  /** Smooth lines (for line charts) */
  smoothLines?: boolean;
  
  /** Point radius (for line/scatter charts) */
  pointRadius?: number;
  
  /** Show point markers (for line charts) */
  showPoints?: boolean;
  
  /** Fill area under line */
  fillArea?: boolean;
  
  /** Area opacity (0-1) */
  areaOpacity?: number;
  
  /** Stacked bars/areas */
  stacked?: boolean;
  
  /** 3D effect depth */
  depth3D?: number;
  
  /** Animation duration (ms) */
  animationDuration?: number;
}

/**
 * Extended chart types
 */
export type ExtendedChartType = ChartType | 'scatter' | 'combo' | 'area' | 'bubble';

/**
 * Trendline calculation result
 */
export interface TrendlineResult {
  /** Trendline type */
  type: TrendlineType;
  
  /** Calculated points */
  points: { x: number; y: number }[];
  
  /** Equation string */
  equation?: string;
  
  /** R-squared value */
  rSquared?: number;
  
  /** Coefficients (for polynomial) */
  coefficients?: number[];
  
  /** Slope (for linear) */
  slope?: number;
  
  /** Intercept (for linear) */
  intercept?: number;
}

/**
 * Axis bounds
 */
export interface AxisBounds {
  min: number;
  max: number;
  range?: number;
  tickInterval?: number;
  tickCount?: number;
}
