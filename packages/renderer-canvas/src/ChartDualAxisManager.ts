/**
 * ChartDualAxisManager.ts
 * 
 * Manages charts with dual Y-axes (left and right), supporting independent scales,
 * data series assignment, and synchronized rendering.
 * 
 * Features:
 * - Independent left and right Y-axis scales
 * - Automatic scale calculation for each axis
 * - Data series assignment to specific axes
 * - Synchronized zero baselines (optional)
 * - Custom axis labels and formatting
 * - Support for different data ranges
 */

import type { ChartData, ChartOptions } from './ChartEngine';

/**
 * Configuration for a single axis
 */
export interface AxisConfig {
  /** Minimum value for the axis (auto-calculated if not provided) */
  min?: number;
  
  /** Maximum value for the axis (auto-calculated if not provided) */
  max?: number;
  
  /** Axis label */
  label?: string;
  
  /** Tick count */
  tickCount?: number;
  
  /** Number formatting function */
  formatValue?: (value: number) => string;
  
  /** Axis color (for labels and ticks) */
  color?: string;
  
  /** Grid line visibility */
  showGrid?: boolean;
  
  /** Grid line color */
  gridColor?: string;
  
  /** Grid line style */
  gridStyle?: 'solid' | 'dashed' | 'dotted';
  
  /** Position */
  position?: 'left' | 'right';
}

/**
 * Dual axis configuration
 */
export interface DualAxisConfig {
  /** Left Y-axis configuration */
  leftAxis: AxisConfig;
  
  /** Right Y-axis configuration */
  rightAxis: AxisConfig;
  
  /** Indices of datasets to display on left axis (defaults to first dataset) */
  leftAxisDatasets?: number[];
  
  /** Indices of datasets to display on right axis (defaults to remaining datasets) */
  rightAxisDatasets?: number[];
  
  /** Whether to synchronize zero baselines */
  syncZero?: boolean;
  
  /** Whether to use same scale for both axes */
  sameScale?: boolean;
}

/**
 * Scale information for an axis
 */
export interface AxisScale {
  min: number;
  max: number;
  range: number;
  tickInterval: number;
  ticks: number[];
}

/**
 * Complete dual axis information
 */
export interface DualAxisInfo {
  leftScale: AxisScale;
  rightScale: AxisScale;
  leftAxisDatasets: number[];
  rightAxisDatasets: number[];
  config: DualAxisConfig;
}

export class ChartDualAxisManager {
  private dualAxisConfigs: Map<string, DualAxisInfo> = new Map();
  
  /**
   * Initialize dual axes for a chart
   */
  initializeDualAxes(
    chartId: string,
    data: ChartData,
    config: DualAxisConfig
  ): DualAxisInfo {
    // Determine which datasets go to which axis
    const leftDatasets = config.leftAxisDatasets ?? [0];
    const rightDatasets = config.rightAxisDatasets ?? 
      Array.from({ length: data.datasets.length }, (_, i) => i).filter(i => !leftDatasets.includes(i));
    
    // Calculate scales for each axis
    const leftScale = this.calculateAxisScale(data, leftDatasets, config.leftAxis);
    const rightScale = this.calculateAxisScale(data, rightDatasets, config.rightAxis);
    
    // Apply synchronization if requested
    if (config.syncZero) {
      this.synchronizeZeroBaselines(leftScale, rightScale);
    }
    
    if (config.sameScale) {
      this.applySameScale(leftScale, rightScale);
    }
    
    const dualAxisInfo: DualAxisInfo = {
      leftScale,
      rightScale,
      leftAxisDatasets: leftDatasets,
      rightAxisDatasets: rightDatasets,
      config
    };
    
    this.dualAxisConfigs.set(chartId, dualAxisInfo);
    return dualAxisInfo;
  }
  
  /**
   * Calculate scale for an axis based on its datasets
   */
  private calculateAxisScale(
    data: ChartData,
    datasetIndices: number[],
    axisConfig: AxisConfig
  ): AxisScale {
    // Extract all values from the specified datasets
    const allValues: number[] = [];
    for (const index of datasetIndices) {
      if (index >= 0 && index < data.datasets.length) {
        const dataset = data.datasets[index];
        allValues.push(...dataset.data.filter(v => typeof v === 'number') as number[]);
      }
    }
    
    if (allValues.length === 0) {
      // No data, return default scale
      return {
        min: axisConfig.min ?? 0,
        max: axisConfig.max ?? 100,
        range: 100,
        tickInterval: 20,
        ticks: [0, 20, 40, 60, 80, 100]
      };
    }
    
    // Calculate min and max
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    
    // Use config values or auto-calculate with padding
    // If all values are the same, use a fixed padding
    const padding = dataMax === dataMin ? Math.abs(dataMax * 0.1) || 10 : (dataMax - dataMin) * 0.1;
    const min = axisConfig.min ?? Math.floor(dataMin - padding);
    const max = axisConfig.max ?? Math.ceil(dataMax + padding);
    const range = max - min;
    
    // Calculate tick interval
    const tickCount = axisConfig.tickCount ?? 5;
    const tickInterval = range / (tickCount - 1);
    
    // Generate ticks
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      ticks.push(min + tickInterval * i);
    }
    
    return {
      min,
      max,
      range,
      tickInterval,
      ticks
    };
  }
  
  /**
   * Synchronize zero baselines across both axes
   * Ensures that zero appears at the same vertical position on both axes
   */
  private synchronizeZeroBaselines(leftScale: AxisScale, rightScale: AxisScale): void {
    // Calculate zero position as percentage of range for each axis
    const leftZeroPos = leftScale.max / leftScale.range;
    const rightZeroPos = rightScale.max / rightScale.range;
    
    // If both scales already include zero, adjust them to align
    if (leftScale.min <= 0 && leftScale.max >= 0 && rightScale.min <= 0 && rightScale.max >= 0) {
      // Use the larger zero position ratio
      const targetZeroPos = Math.max(leftZeroPos, rightZeroPos);
      
      // Adjust left scale
      const leftNewMax = leftScale.range * targetZeroPos;
      const leftNewMin = leftNewMax - leftScale.range;
      leftScale.max = leftNewMax;
      leftScale.min = leftNewMin;
      
      // Adjust right scale
      const rightNewMax = rightScale.range * targetZeroPos;
      const rightNewMin = rightNewMax - rightScale.range;
      rightScale.max = rightNewMax;
      rightScale.min = rightNewMin;
      
      // Recalculate ticks
      this.recalculateTicks(leftScale);
      this.recalculateTicks(rightScale);
    }
  }
  
  /**
   * Apply the same scale to both axes
   */
  private applySameScale(leftScale: AxisScale, rightScale: AxisScale): void {
    const min = Math.min(leftScale.min, rightScale.min);
    const max = Math.max(leftScale.max, rightScale.max);
    const range = max - min;
    
    leftScale.min = min;
    leftScale.max = max;
    leftScale.range = range;
    
    rightScale.min = min;
    rightScale.max = max;
    rightScale.range = range;
    
    this.recalculateTicks(leftScale);
    this.recalculateTicks(rightScale);
  }
  
  /**
   * Recalculate ticks for a scale
   */
  private recalculateTicks(scale: AxisScale): void {
    const tickCount = scale.ticks.length;
    scale.tickInterval = scale.range / (tickCount - 1);
    scale.ticks = [];
    for (let i = 0; i < tickCount; i++) {
      scale.ticks.push(scale.min + scale.tickInterval * i);
    }
  }
  
  /**
   * Convert a data value to pixel position for left axis
   */
  valueToPixelLeft(
    chartId: string,
    value: number,
    chartHeight: number,
    padding: { top: number; bottom: number }
  ): number {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      throw new Error(`No dual axis configuration found for chart: ${chartId}`);
    }
    
    const availableHeight = chartHeight - padding.top - padding.bottom;
    const scale = info.leftScale;
    const ratio = (value - scale.min) / scale.range;
    
    // Invert Y-axis (canvas coordinates increase downward)
    return chartHeight - padding.bottom - ratio * availableHeight;
  }
  
  /**
   * Convert a data value to pixel position for right axis
   */
  valueToPixelRight(
    chartId: string,
    value: number,
    chartHeight: number,
    padding: { top: number; bottom: number }
  ): number {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      throw new Error(`No dual axis configuration found for chart: ${chartId}`);
    }
    
    const availableHeight = chartHeight - padding.top - padding.bottom;
    const scale = info.rightScale;
    const ratio = (value - scale.min) / scale.range;
    
    // Invert Y-axis (canvas coordinates increase downward)
    return chartHeight - padding.bottom - ratio * availableHeight;
  }
  
  /**
   * Get the axis (left or right) for a specific dataset
   */
  getDatasetAxis(chartId: string, datasetIndex: number): 'left' | 'right' {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      return 'left'; // Default to left if not configured
    }
    
    if (info.leftAxisDatasets.includes(datasetIndex)) {
      return 'left';
    }
    return 'right';
  }
  
  /**
   * Get dual axis information for a chart
   */
  getDualAxisInfo(chartId: string): DualAxisInfo | null {
    return this.dualAxisConfigs.get(chartId) ?? null;
  }
  
  /**
   * Update dual axis configuration
   */
  updateDualAxes(
    chartId: string,
    data: ChartData,
    config: Partial<DualAxisConfig>
  ): DualAxisInfo {
    const existing = this.dualAxisConfigs.get(chartId);
    const mergedConfig: DualAxisConfig = {
      leftAxis: { ...existing?.config.leftAxis, ...config.leftAxis },
      rightAxis: { ...existing?.config.rightAxis, ...config.rightAxis },
      leftAxisDatasets: config.leftAxisDatasets ?? existing?.config.leftAxisDatasets,
      rightAxisDatasets: config.rightAxisDatasets ?? existing?.config.rightAxisDatasets,
      syncZero: config.syncZero ?? existing?.config.syncZero,
      sameScale: config.sameScale ?? existing?.config.sameScale
    };
    
    return this.initializeDualAxes(chartId, data, mergedConfig);
  }
  
  /**
   * Check if a chart has dual axes configured
   */
  hasDualAxes(chartId: string): boolean {
    return this.dualAxisConfigs.has(chartId);
  }
  
  /**
   * Remove dual axis configuration for a chart
   */
  removeDualAxes(chartId: string): void {
    this.dualAxisConfigs.delete(chartId);
  }
  
  /**
   * Clear all dual axis configurations
   */
  clear(): void {
    this.dualAxisConfigs.clear();
  }
  
  /**
   * Get formatted tick labels for left axis
   */
  getLeftAxisTickLabels(chartId: string): string[] {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      return [];
    }
    
    const formatter = info.config.leftAxis.formatValue ?? ((v: number) => v.toLocaleString());
    return info.leftScale.ticks.map(formatter);
  }
  
  /**
   * Get formatted tick labels for right axis
   */
  getRightAxisTickLabels(chartId: string): string[] {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      return [];
    }
    
    const formatter = info.config.rightAxis.formatValue ?? ((v: number) => v.toLocaleString());
    return info.rightScale.ticks.map(formatter);
  }
  
  /**
   * Get pixel positions for left axis ticks
   */
  getLeftAxisTickPositions(
    chartId: string,
    chartHeight: number,
    padding: { top: number; bottom: number }
  ): number[] {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      return [];
    }
    
    return info.leftScale.ticks.map(value =>
      this.valueToPixelLeft(chartId, value, chartHeight, padding)
    );
  }
  
  /**
   * Get pixel positions for right axis ticks
   */
  getRightAxisTickPositions(
    chartId: string,
    chartHeight: number,
    padding: { top: number; bottom: number }
  ): number[] {
    const info = this.dualAxisConfigs.get(chartId);
    if (!info) {
      return [];
    }
    
    return info.rightScale.ticks.map(value =>
      this.valueToPixelRight(chartId, value, chartHeight, padding)
    );
  }
}
