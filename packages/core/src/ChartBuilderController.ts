/**
 * ChartBuilderController.ts
 * 
 * Framework-agnostic chart builder logic
 * Part of Week 12 Day 5: Chart Builder UI
 * 
 * This controller provides the core business logic for building charts
 * without any framework dependencies. It can be used by React, Vue, 
 * Angular, Svelte, or vanilla JS implementations.
 */

import type { Worksheet } from './worksheet';
import type { ChartManager } from '@cyber-sheet/renderer-canvas';
import type { ChartObject, ChartCreateParams, CellRange } from './models/ChartObject';

/**
 * Chart type option
 */
export interface ChartTypeOption {
  type: 'bar' | 'line' | 'pie' | 'sparkline';
  label: string;
  description: string;
  icon?: string;
}

/**
 * Range selection state
 */
export interface RangeSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  valid: boolean;
  errorMessage?: string;
}

/**
 * Chart builder state
 */
export interface ChartBuilderState {
  step: 'select-type' | 'select-range' | 'configure' | 'preview';
  selectedType: ChartTypeOption | null;
  dataRange: RangeSelection | null;
  title: string;
  seriesDirection: 'rows' | 'columns';
  hasHeaderRow: boolean;
  hasHeaderCol: boolean;
  showLegend: boolean;
  showAxes: boolean;
  showGrid: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  colors?: string[];
  backgroundColor?: string;
}

/**
 * Event types
 */
export type ChartBuilderEvent = 
  | { type: 'state-changed'; state: ChartBuilderState }
  | { type: 'chart-created'; chart: ChartObject }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

export type ChartBuilderEventListener = (event: ChartBuilderEvent) => void;

/**
 * Available chart types
 */
export const CHART_TYPES: ChartTypeOption[] = [
  {
    type: 'bar',
    label: 'Bar Chart',
    description: 'Compare values across categories',
    icon: '📊'
  },
  {
    type: 'line',
    label: 'Line Chart',
    description: 'Show trends over time',
    icon: '📈'
  },
  {
    type: 'pie',
    label: 'Pie Chart',
    description: 'Show proportions of a whole',
    icon: '🥧'
  },
  {
    type: 'sparkline',
    label: 'Sparkline',
    description: 'Compact trend visualization',
    icon: '📉'
  }
];

/**
 * ChartBuilderController - Framework-agnostic chart builder logic
 */
export class ChartBuilderController {
  private worksheet: Worksheet;
  private chartManager: ChartManager;
  private state: ChartBuilderState;
  private listeners: ChartBuilderEventListener[] = [];

  constructor(worksheet: Worksheet, chartManager: ChartManager) {
    this.worksheet = worksheet;
    this.chartManager = chartManager;
    
    // Initialize with default state
    this.state = this.getDefaultState();
  }

  /**
   * Get default state
   */
  private getDefaultState(): ChartBuilderState {
    return {
      step: 'select-type',
      selectedType: null,
      dataRange: null,
      title: '',
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      showLegend: true,
      showAxes: true,
      showGrid: true,
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 }
    };
  }

  /**
   * Get current state
   */
  getState(): Readonly<ChartBuilderState> {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  on(listener: ChartBuilderEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit event
   */
  private emit(event: ChartBuilderEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Chart builder event listener error:', error);
      }
    });
  }

  /**
   * Update state and emit event
   */
  private updateState(updates: Partial<ChartBuilderState>): void {
    this.state = { ...this.state, ...updates };
    this.emit({ type: 'state-changed', state: this.getState() });
  }

  /**
   * Select chart type
   */
  selectChartType(type: ChartTypeOption): void {
    this.updateState({
      selectedType: type,
      step: 'select-range'
    });
  }

  /**
   * Set data range
   */
  setDataRange(range: CellRange): void {
    const validation = this.validateRange(range);
    
    this.updateState({
      dataRange: {
        ...range,
        valid: validation.valid,
        errorMessage: validation.errorMessage
      }
    });

    if (validation.valid) {
      // Auto-detect headers
      const hasHeaderRow = this.detectHeaderRow(range);
      const hasHeaderCol = this.detectHeaderCol(range);
      
      this.updateState({
        hasHeaderRow,
        hasHeaderCol,
        step: 'configure'
      });
    }
  }

  /**
   * Validate data range
   */
  private validateRange(range: CellRange): { valid: boolean; errorMessage?: string } {
    // Check if range exists
    if (!range) {
      return { valid: false, errorMessage: 'No range selected' };
    }

    // Check minimum size (at least 2x2 for meaningful chart)
    const rows = range.endRow - range.startRow + 1;
    const cols = range.endCol - range.startCol + 1;

    if (rows < 2 || cols < 2) {
      return { valid: false, errorMessage: 'Range must be at least 2x2 cells' };
    }

    // Check if range contains any numeric data
    let hasNumeric = false;
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const value = this.worksheet.getCellValue({ row, col });
        if (typeof value === 'number') {
          hasNumeric = true;
          break;
        }
      }
      if (hasNumeric) break;
    }

    if (!hasNumeric) {
      return { valid: false, errorMessage: 'Range must contain numeric data' };
    }

    return { valid: true };
  }

  /**
   * Detect if first row contains headers
   */
  private detectHeaderRow(range: CellRange): boolean {
    let textCount = 0;
    let numericCount = 0;

    for (let col = range.startCol; col <= range.endCol; col++) {
      const value = this.worksheet.getCellValue({ row: range.startRow, col });
      if (typeof value === 'string') textCount++;
      if (typeof value === 'number') numericCount++;
    }

    // If mostly text, likely headers
    return textCount > numericCount;
  }

  /**
   * Detect if first column contains headers
   */
  private detectHeaderCol(range: CellRange): boolean {
    let textCount = 0;
    let numericCount = 0;

    for (let row = range.startRow; row <= range.endRow; row++) {
      const value = this.worksheet.getCellValue({ row, col: range.startCol });
      if (typeof value === 'string') textCount++;
      if (typeof value === 'number') numericCount++;
    }

    // If mostly text, likely headers
    return textCount > numericCount;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ChartBuilderState>): void {
    this.updateState(config);
  }

  /**
   * Go to preview step
   */
  goToPreview(): void {
    if (!this.state.selectedType || !this.state.dataRange?.valid) {
      this.emit({
        type: 'error',
        message: 'Please select chart type and valid data range'
      });
      return;
    }

    this.updateState({ step: 'preview' });
  }

  /**
   * Go back to previous step
   */
  goBack(): void {
    const stepOrder: ChartBuilderState['step'][] = [
      'select-type',
      'select-range',
      'configure',
      'preview'
    ];
    
    const currentIndex = stepOrder.indexOf(this.state.step);
    if (currentIndex > 0) {
      this.updateState({ step: stepOrder[currentIndex - 1] });
    }
  }

  /**
   * Create chart
   */
  createChart(): ChartObject | null {
    if (!this.state.selectedType || !this.state.dataRange?.valid) {
      this.emit({
        type: 'error',
        message: 'Cannot create chart: invalid configuration'
      });
      return null;
    }

    try {
      const params: ChartCreateParams = {
        type: this.state.selectedType.type,
        dataRange: {
          startRow: this.state.dataRange.startRow,
          startCol: this.state.dataRange.startCol,
          endRow: this.state.dataRange.endRow,
          endCol: this.state.dataRange.endCol
        },
        position: this.state.position,
        size: this.state.size,
        title: this.state.title || undefined,
        seriesDirection: this.state.seriesDirection,
        hasHeaderRow: this.state.hasHeaderRow,
        hasHeaderCol: this.state.hasHeaderCol,
        options: {
          showLegend: this.state.showLegend,
          showAxes: this.state.showAxes,
          showGrid: this.state.showGrid,
          colors: this.state.colors,
          backgroundColor: this.state.backgroundColor
        },
        zIndex: 0
      };

      const chart = this.chartManager.create(params);
      
      this.emit({ type: 'chart-created', chart });
      
      // Reset state for next chart
      this.reset();
      
      return chart;
    } catch (error) {
      this.emit({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create chart'
      });
      return null;
    }
  }

  /**
   * Cancel chart creation
   */
  cancel(): void {
    this.emit({ type: 'cancelled' });
    this.reset();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = this.getDefaultState();
    this.emit({ type: 'state-changed', state: this.getState() });
  }

  /**
   * Get available chart types
   */
  getChartTypes(): ChartTypeOption[] {
    return [...CHART_TYPES];
  }

  /**
   * Validate current state
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.state.selectedType) {
      errors.push('Chart type not selected');
    }

    if (!this.state.dataRange) {
      errors.push('Data range not selected');
    } else if (!this.state.dataRange.valid) {
      errors.push(this.state.dataRange.errorMessage || 'Invalid data range');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if can proceed to next step
   */
  canProceed(): boolean {
    switch (this.state.step) {
      case 'select-type':
        return this.state.selectedType !== null;
      case 'select-range':
        return this.state.dataRange?.valid ?? false;
      case 'configure':
        return true; // Always can proceed from configure
      case 'preview':
        return this.validate().valid;
      default:
        return false;
    }
  }

  /**
   * Get preview data for rendering
   */
  getPreviewData(): {
    type: string;
    dataRange: CellRange;
    config: Partial<ChartBuilderState>;
  } | null {
    if (!this.state.selectedType || !this.state.dataRange?.valid) {
      return null;
    }

    return {
      type: this.state.selectedType.type,
      dataRange: {
        startRow: this.state.dataRange.startRow,
        startCol: this.state.dataRange.startCol,
        endRow: this.state.dataRange.endRow,
        endCol: this.state.dataRange.endCol
      },
      config: {
        title: this.state.title,
        seriesDirection: this.state.seriesDirection,
        hasHeaderRow: this.state.hasHeaderRow,
        hasHeaderCol: this.state.hasHeaderCol,
        showLegend: this.state.showLegend,
        showAxes: this.state.showAxes,
        showGrid: this.state.showGrid,
        colors: this.state.colors,
        backgroundColor: this.state.backgroundColor
      }
    };
  }
}
