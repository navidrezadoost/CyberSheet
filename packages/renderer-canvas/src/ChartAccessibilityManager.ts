/**
 * ChartAccessibilityManager.ts
 * 
 * Sprint 4: Comprehensive accessibility support for charts
 * Provides ARIA labels, keyboard navigation, screen reader support, and high contrast modes
 */

import type { ChartType, ChartData, ChartOptions } from './ChartEngine';

/**
 * Accessibility configuration options
 */
export interface AccessibilityOptions {
  enabled?: boolean;
  
  // ARIA options
  ariaLabel?: string;
  ariaDescription?: string;
  role?: string;
  
  // Keyboard navigation
  enableKeyboardNav?: boolean;
  keyBindings?: KeyBindings;
  
  // Screen reader
  enableScreenReader?: boolean;
  announceDataChanges?: boolean;
  dataTableFallback?: boolean;
  
  // Visual accessibility
  highContrastMode?: boolean;
  focusIndicatorColor?: string;
  focusIndicatorWidth?: number;
  
  // Callbacks
  onFocus?: (elementId: string) => void;
  onBlur?: (elementId: string) => void;
  onSelect?: (elementId: string, data: any) => void;
  onNavigate?: (direction: NavigationDirection, elementId: string) => void;
}

/**
 * Key binding configuration
 */
export interface KeyBindings {
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  select?: string;
  escape?: string;
  home?: string;
  end?: string;
}

/**
 * Navigation direction
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'end';

/**
 * Accessible element information
 */
export interface AccessibleElement {
  id: string;
  type: 'datapoint' | 'axis' | 'legend' | 'title' | 'grid';
  label: string;
  value?: number | string;
  description?: string;
  index?: number;
  datasetIndex?: number;
  focusable: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
}

/**
 * Focus state
 */
export interface FocusState {
  currentElementId: string | null;
  previousElementId: string | null;
  focusedElement: AccessibleElement | null;
}

/**
 * Accessibility context for a chart
 */
export interface AccessibilityContext {
  chartType: ChartType;
  chartId: string;
  elements: Map<string, AccessibleElement>;
  focusOrder: string[];
  focusState: FocusState;
  ariaLive: HTMLElement | null;
  dataTable: HTMLTableElement | null;
}

/**
 * ChartAccessibilityManager - Manages accessibility features for charts
 */
export class ChartAccessibilityManager {
  private contexts: Map<string, AccessibilityContext>;
  private defaultOptions: AccessibilityOptions;
  private keyboardListeners: Map<string, (e: KeyboardEvent) => void>;
  
  // Default key bindings
  private static readonly DEFAULT_KEY_BINDINGS: KeyBindings = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    select: 'Enter',
    escape: 'Escape',
    home: 'Home',
    end: 'End',
  };

  constructor() {
    this.contexts = new Map();
    this.keyboardListeners = new Map();
    this.defaultOptions = {
      enabled: true,
      enableKeyboardNav: true,
      enableScreenReader: true,
      announceDataChanges: true,
      dataTableFallback: false,
      highContrastMode: false,
      focusIndicatorColor: '#4285F4',
      focusIndicatorWidth: 3,
      keyBindings: ChartAccessibilityManager.DEFAULT_KEY_BINDINGS,
    };
  }

  /**
   * Initialize accessibility for a chart
   */
  initializeChart(
    chartId: string,
    chartType: ChartType,
    data: ChartData,
    options: AccessibilityOptions = {}
  ): void {
    const mergedOptions = { ...this.defaultOptions, ...options };

    if (!mergedOptions.enabled) return;

    // Create accessibility context
    const context: AccessibilityContext = {
      chartType,
      chartId,
      elements: new Map(),
      focusOrder: [],
      focusState: {
        currentElementId: null,
        previousElementId: null,
        focusedElement: null,
      },
      ariaLive: null,
      dataTable: null,
    };

    // Generate accessible elements
    this.generateAccessibleElements(context, data, mergedOptions);

    // Create ARIA live region for announcements
    if (mergedOptions.enableScreenReader) {
      context.ariaLive = this.createAriaLiveRegion(chartId);
    }

    // Create data table fallback
    if (mergedOptions.dataTableFallback) {
      context.dataTable = this.createDataTable(chartId, data);
    }

    // Setup keyboard navigation
    if (mergedOptions.enableKeyboardNav) {
      this.setupKeyboardNavigation(chartId, context, mergedOptions);
    }

    this.contexts.set(chartId, context);
  }

  /**
   * Generate accessible elements from chart data
   */
  private generateAccessibleElements(
    context: AccessibilityContext,
    data: ChartData,
    options: AccessibilityOptions
  ): void {
    const { chartType } = context;

    // Add title element if present
    if (options.ariaLabel) {
      context.elements.set('chart-title', {
        id: 'chart-title',
        type: 'title',
        label: options.ariaLabel,
        focusable: false,
      });
    }

    // Generate elements based on chart type
    switch (chartType) {
      case 'bar':
      case 'bar3d':
      case 'line':
      case 'line3d':
        this.generateCartesianElements(context, data);
        break;
      
      case 'pie':
      case 'pie3d':
        this.generatePieElements(context, data);
        break;
      
      case 'radar':
        this.generateRadarElements(context, data);
        break;
      
      case 'treemap':
      case 'sunburst':
        this.generateHierarchicalElements(context, data);
        break;
      
      case 'gantt':
        this.generateGanttElements(context, data);
        break;
      
      default:
        this.generateGenericElements(context, data);
    }

    // Build focus order
    context.focusOrder = Array.from(context.elements.values())
      .filter(el => el.focusable)
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map(el => el.id);
  }

  /**
   * Generate elements for cartesian charts (bar, line)
   */
  private generateCartesianElements(context: AccessibilityContext, data: ChartData): void {
    data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, pointIndex) => {
        const label = data.labels[pointIndex];
        const elementId = `datapoint-${datasetIndex}-${pointIndex}`;
        
        context.elements.set(elementId, {
          id: elementId,
          type: 'datapoint',
          label: `${dataset.label || 'Series ' + (datasetIndex + 1)}, ${label}`,
          value,
          description: this.formatDataPointDescription(label, value, dataset.label),
          index: datasetIndex * data.labels.length + pointIndex,
          datasetIndex,
          focusable: true,
        });
      });
    });
  }

  /**
   * Generate elements for pie charts
   */
  private generatePieElements(context: AccessibilityContext, data: ChartData): void {
    if (data.datasets.length === 0) return;

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);

    dataset.data.forEach((value, index) => {
      const label = data.labels[index];
      const percentage = ((value / total) * 100).toFixed(1);
      const elementId = `slice-${index}`;
      
      context.elements.set(elementId, {
        id: elementId,
        type: 'datapoint',
        label: `${label}`,
        value,
        description: `${label}: ${value} (${percentage}% of total)`,
        index,
        focusable: true,
      });
    });
  }

  /**
   * Generate elements for radar charts
   */
  private generateRadarElements(context: AccessibilityContext, data: ChartData): void {
    data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, pointIndex) => {
        const label = data.labels[pointIndex];
        const elementId = `radar-${datasetIndex}-${pointIndex}`;
        
        context.elements.set(elementId, {
          id: elementId,
          type: 'datapoint',
          label: `${dataset.label || 'Series ' + (datasetIndex + 1)}, ${label}`,
          value,
          description: `${label}: ${value} for ${dataset.label}`,
          index: datasetIndex * data.labels.length + pointIndex,
          datasetIndex,
          focusable: true,
        });
      });
    });
  }

  /**
   * Generate elements for hierarchical charts (treemap, sunburst)
   */
  private generateHierarchicalElements(context: AccessibilityContext, data: ChartData): void {
    // For treemap/sunburst, treat each data point as a node
    data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const label = data.labels[index];
        const elementId = `node-${datasetIndex}-${index}`;
        
        context.elements.set(elementId, {
          id: elementId,
          type: 'datapoint',
          label,
          value,
          description: `${label}: ${value}`,
          index: datasetIndex * data.labels.length + index,
          focusable: true,
        });
      });
    });
  }

  /**
   * Generate elements for Gantt charts
   */
  private generateGanttElements(context: AccessibilityContext, data: ChartData): void {
    if (!data.ganttTasks) return;

    data.ganttTasks.forEach((task, index) => {
      const elementId = `task-${index}`;
      const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));
      
      context.elements.set(elementId, {
        id: elementId,
        type: 'datapoint',
        label: task.name,
        value: duration,
        description: `${task.name}: ${task.start.toLocaleDateString()} to ${task.end.toLocaleDateString()} (${duration} days)${task.progress ? `, ${task.progress}% complete` : ''}`,
        index,
        focusable: true,
      });
    });
  }

  /**
   * Generate generic elements for other chart types
   */
  private generateGenericElements(context: AccessibilityContext, data: ChartData): void {
    data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const label = data.labels[index] || `Point ${index + 1}`;
        const elementId = `element-${datasetIndex}-${index}`;
        
        context.elements.set(elementId, {
          id: elementId,
          type: 'datapoint',
          label,
          value,
          description: `${label}: ${value}`,
          index: datasetIndex * data.labels.length + index,
          focusable: true,
        });
      });
    });
  }

  /**
   * Format data point description for screen readers
   */
  private formatDataPointDescription(label: string, value: number, seriesLabel?: string): string {
    const parts: string[] = [];
    
    if (seriesLabel) {
      parts.push(seriesLabel);
    }
    
    parts.push(`${label}: ${this.formatValue(value)}`);
    
    return parts.join(', ');
  }

  /**
   * Format numeric value for screen readers
   */
  private formatValue(value: number): string {
    // Format with thousands separator and 2 decimal places if needed
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Create ARIA live region for announcements
   */
  private createAriaLiveRegion(chartId: string): HTMLElement {
    let region = document.getElementById(`${chartId}-aria-live`);
    
    if (!region) {
      region = document.createElement('div');
      region.id = `${chartId}-aria-live`;
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.style.position = 'absolute';
      region.style.left = '-10000px';
      region.style.width = '1px';
      region.style.height = '1px';
      region.style.overflow = 'hidden';
      document.body.appendChild(region);
    }
    
    return region;
  }

  /**
   * Create accessible data table fallback
   */
  private createDataTable(chartId: string, data: ChartData): HTMLTableElement {
    const table = document.createElement('table');
    table.id = `${chartId}-data-table`;
    table.setAttribute('role', 'table');
    table.setAttribute('aria-label', 'Chart data table');
    table.style.position = 'absolute';
    table.style.left = '-10000px';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const labelHeader = document.createElement('th');
    labelHeader.textContent = 'Label';
    headerRow.appendChild(labelHeader);
    
    data.datasets.forEach(dataset => {
      const th = document.createElement('th');
      th.textContent = dataset.label || 'Series';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    data.labels.forEach((label, index) => {
      const row = document.createElement('tr');
      
      const labelCell = document.createElement('td');
      labelCell.textContent = label;
      row.appendChild(labelCell);
      
      data.datasets.forEach(dataset => {
        const cell = document.createElement('td');
        cell.textContent = String(dataset.data[index] || '');
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    document.body.appendChild(table);
    
    return table;
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(
    chartId: string,
    context: AccessibilityContext,
    options: AccessibilityOptions
  ): void {
    const keyBindings = options.keyBindings || ChartAccessibilityManager.DEFAULT_KEY_BINDINGS;
    
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Only handle if chart element or its children have focus
      const activeElement = document.activeElement;
      if (!activeElement || !this.isChartElement(chartId, activeElement)) {
        return;
      }

      let handled = false;
      
      if (e.key === keyBindings.up) {
        this.navigate(chartId, 'up', options);
        handled = true;
      } else if (e.key === keyBindings.down) {
        this.navigate(chartId, 'down', options);
        handled = true;
      } else if (e.key === keyBindings.left) {
        this.navigate(chartId, 'left', options);
        handled = true;
      } else if (e.key === keyBindings.right) {
        this.navigate(chartId, 'right', options);
        handled = true;
      } else if (e.key === keyBindings.home) {
        this.navigate(chartId, 'home', options);
        handled = true;
      } else if (e.key === keyBindings.end) {
        this.navigate(chartId, 'end', options);
        handled = true;
      } else if (e.key === keyBindings.select && (e.key === 'Enter' || e.key === ' ')) {
        this.selectCurrentElement(chartId, options);
        handled = true;
      } else if (e.key === keyBindings.escape) {
        this.clearFocus(chartId, options);
        handled = true;
      }
      
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    this.keyboardListeners.set(chartId, handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Check if element belongs to chart
   */
  private isChartElement(chartId: string, element: Element): boolean {
    const chartElement = document.getElementById(chartId);
    return chartElement !== null && chartElement.contains(element);
  }

  /**
   * Navigate between focusable elements
   */
  private navigate(
    chartId: string,
    direction: NavigationDirection,
    options: AccessibilityOptions
  ): void {
    const context = this.contexts.get(chartId);
    if (!context || context.focusOrder.length === 0) return;

    let newIndex = 0;
    const currentIndex = context.focusState.currentElementId
      ? context.focusOrder.indexOf(context.focusState.currentElementId)
      : -1;

    switch (direction) {
      case 'up':
      case 'left':
        newIndex = currentIndex > 0 ? currentIndex - 1 : context.focusOrder.length - 1;
        break;
      
      case 'down':
      case 'right':
        newIndex = currentIndex < context.focusOrder.length - 1 ? currentIndex + 1 : 0;
        break;
      
      case 'home':
        newIndex = 0;
        break;
      
      case 'end':
        newIndex = context.focusOrder.length - 1;
        break;
    }

    const newElementId = context.focusOrder[newIndex];
    this.setFocus(chartId, newElementId, options);

    if (options.onNavigate) {
      options.onNavigate(direction, newElementId);
    }
  }

  /**
   * Set focus to a specific element
   */
  setFocus(chartId: string, elementId: string, options: AccessibilityOptions = {}): void {
    const context = this.contexts.get(chartId);
    if (!context) return;

    const element = context.elements.get(elementId);
    if (!element || !element.focusable) return;

    // Update focus state
    context.focusState.previousElementId = context.focusState.currentElementId;
    context.focusState.currentElementId = elementId;
    context.focusState.focusedElement = element;

    // Announce to screen reader
    if (context.ariaLive && options.enableScreenReader) {
      this.announce(chartId, element.description || element.label);
    }

    // Trigger callback
    if (options.onFocus) {
      options.onFocus(elementId);
    }
  }

  /**
   * Clear focus
   */
  clearFocus(chartId: string, options: AccessibilityOptions = {}): void {
    const context = this.contexts.get(chartId);
    if (!context) return;

    const previousElementId = context.focusState.currentElementId;
    
    context.focusState.previousElementId = previousElementId;
    context.focusState.currentElementId = null;
    context.focusState.focusedElement = null;

    if (previousElementId && options.onBlur) {
      options.onBlur(previousElementId);
    }
  }

  /**
   * Select current focused element
   */
  selectCurrentElement(chartId: string, options: AccessibilityOptions = {}): void {
    const context = this.contexts.get(chartId);
    if (!context || !context.focusState.focusedElement) return;

    const element = context.focusState.focusedElement;

    if (options.onSelect) {
      options.onSelect(element.id, {
        label: element.label,
        value: element.value,
        index: element.index,
        datasetIndex: element.datasetIndex,
      });
    }

    if (context.ariaLive && options.enableScreenReader) {
      this.announce(chartId, `Selected: ${element.description || element.label}`);
    }
  }

  /**
   * Announce message to screen reader
   */
  announce(chartId: string, message: string): void {
    const context = this.contexts.get(chartId);
    if (!context || !context.ariaLive) return;

    // Clear and set message (forces announcement)
    context.ariaLive.textContent = '';
    setTimeout(() => {
      context.ariaLive!.textContent = message;
    }, 100);
  }

  /**
   * Get current focus state
   */
  getFocusState(chartId: string): FocusState | null {
    const context = this.contexts.get(chartId);
    return context ? context.focusState : null;
  }

  /**
   * Get accessible element by ID
   */
  getElement(chartId: string, elementId: string): AccessibleElement | null {
    const context = this.contexts.get(chartId);
    if (!context) return null;
    return context.elements.get(elementId) || null;
  }

  /**
   * Get all accessible elements
   */
  getAllElements(chartId: string): AccessibleElement[] {
    const context = this.contexts.get(chartId);
    if (!context) return [];
    return Array.from(context.elements.values());
  }

  /**
   * Update data and regenerate accessible elements
   */
  updateData(chartId: string, data: ChartData, options: AccessibilityOptions = {}): void {
    const context = this.contexts.get(chartId);
    if (!context) return;

    // Clear existing elements
    context.elements.clear();
    context.focusOrder = [];

    // Regenerate
    this.generateAccessibleElements(context, data, { ...this.defaultOptions, ...options });

    // Update data table if it exists
    if (context.dataTable) {
      document.body.removeChild(context.dataTable);
      context.dataTable = this.createDataTable(chartId, data);
    }

    // Announce data change
    if (context.ariaLive && options.announceDataChanges && options.enableScreenReader) {
      const elementCount = context.elements.size;
      this.announce(chartId, `Chart updated with ${elementCount} data points`);
    }
  }

  /**
   * Detect and apply high contrast mode
   */
  detectHighContrastMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for Windows high contrast mode
    if (window.matchMedia) {
      const highContrast = window.matchMedia('(-ms-high-contrast: active)');
      if (highContrast.matches) return true;
      
      // Check for prefers-contrast
      const prefersContrast = window.matchMedia('(prefers-contrast: high)');
      if (prefersContrast.matches) return true;
    }
    
    return false;
  }

  /**
   * Get high contrast color palette
   */
  getHighContrastColors(): string[] {
    return [
      '#FFFFFF', // White
      '#FFFF00', // Yellow
      '#00FFFF', // Cyan
      '#FF00FF', // Magenta
      '#00FF00', // Green
      '#0000FF', // Blue
      '#FF0000', // Red
    ];
  }

  /**
   * Cleanup chart accessibility
   */
  destroyChart(chartId: string): void {
    const context = this.contexts.get(chartId);
    if (!context) return;

    // Remove ARIA live region
    if (context.ariaLive && context.ariaLive.parentNode) {
      context.ariaLive.parentNode.removeChild(context.ariaLive);
    }

    // Remove data table
    if (context.dataTable && context.dataTable.parentNode) {
      context.dataTable.parentNode.removeChild(context.dataTable);
    }

    // Remove keyboard listener
    const listener = this.keyboardListeners.get(chartId);
    if (listener) {
      document.removeEventListener('keydown', listener);
      this.keyboardListeners.delete(chartId);
    }

    this.contexts.delete(chartId);
  }

  /**
   * Cleanup all charts
   */
  destroy(): void {
    Array.from(this.contexts.keys()).forEach(chartId => {
      this.destroyChart(chartId);
    });
  }
}
