/**
 * AdvancedChartRenderer.ts
 * Week 12 Day 6: Advanced Chart Features - Advanced Chart Types
 * 
 * Extends ChartEngine with scatter, combo, and area charts
 */

import type { ExtendedChartType, AdvancedChartOptions, ComboChartConfig } from '@cyber-sheet/core';

/**
 * Extended chart data for advanced types
 */
export interface AdvancedChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[] | { x: number; y: number }[]; // Support both formats
    color?: string;
    type?: 'bar' | 'line' | 'area'; // For combo charts
    pointRadius?: number; // For scatter
    pointStyle?: 'circle' | 'square' | 'triangle';
    fillOpacity?: number; // For area charts
  }[];
}

/**
 * Point for scatter plots
 */
export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
}

/**
 * AdvancedChartRenderer - Renders scatter, combo, and area charts
 */
export class AdvancedChartRenderer {
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private defaultColors = [
    '#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC',
    '#00ACC1', '#FF7043', '#9E9D24', '#5C6BC0', '#F06292'
  ];

  constructor(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Render scatter chart
   */
  renderScatter(
    data: AdvancedChartData,
    width: number,
    height: number,
    options?: AdvancedChartOptions
  ): void {
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const chartLeft = padding;
    const chartTop = padding;

    // Extract all points and find bounds
    const allPoints: ScatterPoint[] = [];
    data.datasets.forEach(dataset => {
      if (Array.isArray(dataset.data)) {
        dataset.data.forEach((point, idx) => {
          if (typeof point === 'object' && 'x' in point && 'y' in point) {
            allPoints.push(point as ScatterPoint);
          } else if (typeof point === 'number') {
            // Convert array index to x coordinate
            allPoints.push({ x: idx, y: point });
          }
        });
      }
    });

    if (allPoints.length === 0) return;

    // Calculate bounds
    const xValues = allPoints.map(p => p.x);
    const yValues = allPoints.map(p => p.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // Add 10% padding to bounds
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const xPadding = xRange * 0.1;
    const yPadding = yRange * 0.1;

    const xBounds = { min: xMin - xPadding, max: xMax + xPadding };
    const yBounds = { min: yMin - yPadding, max: yMax + yPadding };

    // Draw axes
    if (options?.showAxes !== false) {
      this.drawAxes(chartLeft, chartTop, chartWidth, chartHeight);
      this.drawAxisLabels(xBounds, yBounds, chartLeft, chartTop, chartWidth, chartHeight);
    }

    // Draw grid
    if (options?.showGrid) {
      this.drawGrid(chartLeft, chartTop, chartWidth, chartHeight);
    }

    // Render each dataset
    data.datasets.forEach((dataset, idx) => {
      const color = dataset.color || this.defaultColors[idx % this.defaultColors.length];
      const points: ScatterPoint[] = [];

      dataset.data.forEach((point, dataIdx) => {
        if (typeof point === 'object' && 'x' in point && 'y' in point) {
          points.push(point as ScatterPoint);
        } else if (typeof point === 'number') {
          points.push({ x: dataIdx, y: point });
        }
      });

      // Draw points
      points.forEach(point => {
        const x = chartLeft + ((point.x - xBounds.min) / (xBounds.max - xBounds.min)) * chartWidth;
        const y = chartTop + chartHeight - ((point.y - yBounds.min) / (yBounds.max - yBounds.min)) * chartHeight;

        const radius = dataset.pointRadius || 4;
        const style = dataset.pointStyle || 'circle';

        this.drawPoint(x, y, radius, color, style);
      });
    });
  }

  /**
   * Render combo chart (mixed bar and line)
   */
  renderCombo(
    data: AdvancedChartData,
    width: number,
    height: number,
    comboConfig: ComboChartConfig,
    options?: AdvancedChartOptions
  ): void {
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const chartLeft = padding;
    const chartTop = padding;

    // Find max value for primary axis
    const primaryDatasets = data.datasets.filter((_, idx) => 
      comboConfig.primaryDatasets?.includes(idx)
    );
    const secondaryDatasets = data.datasets.filter((_, idx) =>
      comboConfig.secondaryDatasets?.includes(idx)
    );

    const maxPrimary = Math.max(...primaryDatasets.flatMap(ds => 
      Array.isArray(ds.data) ? ds.data.map(d => typeof d === 'number' ? d : d.y) : []
    ));

    const maxSecondary = comboConfig.useSecondaryAxis
      ? Math.max(...secondaryDatasets.flatMap(ds => 
          Array.isArray(ds.data) ? ds.data.map(d => typeof d === 'number' ? d : d.y) : []
        ))
      : maxPrimary;

    // Draw axes
    if (options?.showAxes !== false) {
      this.drawAxes(chartLeft, chartTop, chartWidth, chartHeight);
      
      // Draw secondary axis if needed
      if (comboConfig.useSecondaryAxis) {
        this.drawSecondaryAxis(chartLeft + chartWidth, chartTop, chartHeight, maxSecondary);
      }
    }

    // Draw grid
    if (options?.showGrid) {
      this.drawGrid(chartLeft, chartTop, chartWidth, chartHeight);
    }

    // Render datasets based on their type
    data.datasets.forEach((dataset, idx) => {
      const color = dataset.color || this.defaultColors[idx % this.defaultColors.length];
      const chartType = dataset.type || comboConfig.primaryType;
      const isPrimary = comboConfig.primaryDatasets?.includes(idx) ?? true;
      const maxValue = isPrimary ? maxPrimary : maxSecondary;

      const numericData: number[] = Array.isArray(dataset.data)
        ? dataset.data.map(d => typeof d === 'number' ? d : (d as any).y)
        : [];

      if (chartType === 'bar') {
        this.renderBarDataset(
          numericData,
          data.labels.length,
          idx,
          data.datasets.length,
          chartLeft,
          chartTop,
          chartWidth,
          chartHeight,
          maxValue,
          color
        );
      } else if (chartType === 'line') {
        this.renderLineDataset(
          numericData,
          chartLeft,
          chartTop,
          chartWidth,
          chartHeight,
          maxValue,
          color
        );
      } else if (chartType === 'area') {
        this.renderAreaDataset(
          numericData,
          chartLeft,
          chartTop,
          chartWidth,
          chartHeight,
          maxValue,
          color,
          dataset.fillOpacity || 0.3
        );
      }
    });
  }

  /**
   * Render area chart (filled line chart)
   */
  renderArea(
    data: AdvancedChartData,
    width: number,
    height: number,
    options?: AdvancedChartOptions
  ): void {
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const chartLeft = padding;
    const chartTop = padding;

    // Find max value
    const maxValue = Math.max(...data.datasets.flatMap(ds => 
      Array.isArray(ds.data) ? ds.data.map(d => typeof d === 'number' ? d : (d as any).y) : []
    ));

    // Draw axes
    if (options?.showAxes !== false) {
      this.drawAxes(chartLeft, chartTop, chartWidth, chartHeight);
    }

    // Draw grid
    if (options?.showGrid) {
      this.drawGrid(chartLeft, chartTop, chartWidth, chartHeight);
    }

    // Render each dataset as area
    data.datasets.forEach((dataset, idx) => {
      const color = dataset.color || this.defaultColors[idx % this.defaultColors.length];
      const fillOpacity = dataset.fillOpacity || 0.3;
      
      const numericData: number[] = Array.isArray(dataset.data)
        ? dataset.data.map(d => typeof d === 'number' ? d : (d as any).y)
        : [];

      this.renderAreaDataset(
        numericData,
        chartLeft,
        chartTop,
        chartWidth,
        chartHeight,
        maxValue,
        color,
        fillOpacity
      );
    });
  }

  /**
   * Draw a single point
   */
  private drawPoint(
    x: number,
    y: number,
    radius: number,
    color: string,
    style: 'circle' | 'square' | 'triangle'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    switch (style) {
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case 'square':
        this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        this.ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
        break;

      case 'triangle':
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - radius);
        this.ctx.lineTo(x + radius, y + radius);
        this.ctx.lineTo(x - radius, y + radius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        break;
    }
  }

  /**
   * Draw axes
   */
  private drawAxes(
    left: number,
    top: number,
    width: number,
    height: number
  ): void {
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;

    // Y axis
    this.ctx.beginPath();
    this.ctx.moveTo(left, top);
    this.ctx.lineTo(left, top + height);
    this.ctx.stroke();

    // X axis
    this.ctx.beginPath();
    this.ctx.moveTo(left, top + height);
    this.ctx.lineTo(left + width, top + height);
    this.ctx.stroke();
  }

  /**
   * Draw secondary Y axis
   */
  private drawSecondaryAxis(
    x: number,
    top: number,
    height: number,
    maxValue: number
  ): void {
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(x, top);
    this.ctx.lineTo(x, top + height);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  /**
   * Draw grid
   */
  private drawGrid(
    left: number,
    top: number,
    width: number,
    height: number
  ): void {
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 1;

    // Horizontal grid lines
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = top + (height / horizontalLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(left, y);
      this.ctx.lineTo(left + width, y);
      this.ctx.stroke();
    }

    // Vertical grid lines
    const verticalLines = 5;
    for (let i = 0; i <= verticalLines; i++) {
      const x = left + (width / verticalLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, top);
      this.ctx.lineTo(x, top + height);
      this.ctx.stroke();
    }
  }

  /**
   * Draw axis labels
   */
  private drawAxisLabels(
    xBounds: { min: number; max: number },
    yBounds: { min: number; max: number },
    left: number,
    top: number,
    width: number,
    height: number
  ): void {
    this.ctx.fillStyle = '#666';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';

    // X axis labels
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const value = xBounds.min + ((xBounds.max - xBounds.min) / xSteps) * i;
      const x = left + (width / xSteps) * i;
      const y = top + height + 20;
      this.ctx.fillText(value.toFixed(1), x, y);
    }

    // Y axis labels
    this.ctx.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = yBounds.min + ((yBounds.max - yBounds.min) / ySteps) * i;
      const x = left - 10;
      const y = top + height - (height / ySteps) * i + 5;
      this.ctx.fillText(value.toFixed(1), x, y);
    }
  }

  /**
   * Render a bar dataset
   */
  private renderBarDataset(
    data: number[],
    barCount: number,
    datasetIndex: number,
    totalDatasets: number,
    left: number,
    top: number,
    width: number,
    height: number,
    maxValue: number,
    color: string
  ): void {
    const barGroupWidth = width / barCount;
    const barWidth = barGroupWidth / totalDatasets * 0.8;

    data.forEach((value, idx) => {
      const barHeight = (value / maxValue) * height;
      const x = left + idx * barGroupWidth + datasetIndex * barWidth + barGroupWidth * 0.1;
      const y = top + height - barHeight;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  /**
   * Render a line dataset
   */
  private renderLineDataset(
    data: number[],
    left: number,
    top: number,
    width: number,
    height: number,
    maxValue: number,
    color: string
  ): void {
    if (data.length === 0) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const pointSpacing = width / (data.length - 1 || 1);

    data.forEach((value, idx) => {
      const x = left + idx * pointSpacing;
      const y = top + height - (value / maxValue) * height;

      if (idx === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();

    // Draw points
    data.forEach((value, idx) => {
      const x = left + idx * pointSpacing;
      const y = top + height - (value / maxValue) * height;
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  /**
   * Render an area dataset (filled line)
   */
  private renderAreaDataset(
    data: number[],
    left: number,
    top: number,
    width: number,
    height: number,
    maxValue: number,
    color: string,
    fillOpacity: number
  ): void {
    if (data.length === 0) return;

    const pointSpacing = width / (data.length - 1 || 1);

    // Draw filled area
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    this.ctx.fillStyle = hexToRgba(color, fillOpacity);
    this.ctx.beginPath();
    
    // Start at bottom left
    this.ctx.moveTo(left, top + height);

    // Draw line to first point
    const firstY = top + height - (data[0] / maxValue) * height;
    this.ctx.lineTo(left, firstY);

    // Draw through all points
    data.forEach((value, idx) => {
      const x = left + idx * pointSpacing;
      const y = top + height - (value / maxValue) * height;
      this.ctx.lineTo(x, y);
    });

    // Close to bottom right
    const lastX = left + (data.length - 1) * pointSpacing;
    this.ctx.lineTo(lastX, top + height);
    
    this.ctx.closePath();
    this.ctx.fill();

    // Draw line on top
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    data.forEach((value, idx) => {
      const x = left + idx * pointSpacing;
      const y = top + height - (value / maxValue) * height;

      if (idx === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();
  }
}
