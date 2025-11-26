/**
 * ChartEngine.ts
 * 
 * Zero-dependency canvas-based charting engine
 * Supports bar, line, pie charts and sparklines
 */

import type { CellValue } from '@cyber-sheet/core';

export type ChartType = 'bar' | 'line' | 'pie' | 'sparkline';

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface ChartOptions {
  type: ChartType;
  width: number;
  height: number;
  title?: string;
  showLegend?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  colors?: string[];
  backgroundColor?: string;
}

export class ChartEngine {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private defaultColors = [
    '#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC',
    '#00ACC1', '#FF7043', '#9E9D24', '#5C6BC0', '#F06292'
  ];

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Render chart
   */
  render(data: ChartData, options: ChartOptions): void {
    // Set canvas size
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    
    // Clear canvas
    this.ctx.fillStyle = options.backgroundColor ?? '#FFFFFF';
    this.ctx.fillRect(0, 0, options.width, options.height);
    
    // Render based on type
    switch (options.type) {
      case 'bar':
        this.renderBarChart(data, options);
        break;
      case 'line':
        this.renderLineChart(data, options);
        break;
      case 'pie':
        this.renderPieChart(data, options);
        break;
      case 'sparkline':
        this.renderSparkline(data, options);
        break;
    }
    
    // Render title
    if (options.title) {
      this.renderTitle(options.title, options);
    }
    
    // Render legend
    if (options.showLegend) {
      this.renderLegend(data, options);
    }
  }

  /**
   * Render bar chart
   */
  private renderBarChart(data: ChartData, options: ChartOptions): void {
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    
    // Calculate bar dimensions
    const barCount = data.labels.length;
    const barGroupWidth = chartWidth / barCount;
    const barWidth = barGroupWidth / data.datasets.length * 0.8;
    
    // Find max value for scaling
    const maxValue = Math.max(
      ...data.datasets.flatMap(ds => ds.data)
    );
    
    // Render grid
    if (options.showGrid) {
      this.renderGrid(padding, padding, chartWidth, chartHeight, maxValue);
    }
    
    // Render bars
    data.datasets.forEach((dataset, dsIndex) => {
      const color = dataset.color ?? this.defaultColors[dsIndex % this.defaultColors.length];
      
      dataset.data.forEach((value, index) => {
        const x = padding + index * barGroupWidth + dsIndex * barWidth;
        const barHeight = (value / maxValue) * chartHeight;
        const y = padding + chartHeight - barHeight;
        
        // Bar
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Border
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
      });
    });
    
    // Render axes
    if (options.showAxes) {
      this.renderAxes(padding, padding, chartWidth, chartHeight, data.labels, maxValue);
    }
  }

  /**
   * Render line chart
   */
  private renderLineChart(data: ChartData, options: ChartOptions): void {
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    
    // Find max value for scaling
    const maxValue = Math.max(
      ...data.datasets.flatMap(ds => ds.data)
    );
    
    // Render grid
    if (options.showGrid) {
      this.renderGrid(padding, padding, chartWidth, chartHeight, maxValue);
    }
    
    // Render lines
    data.datasets.forEach((dataset, dsIndex) => {
      const color = dataset.color ?? this.defaultColors[dsIndex % this.defaultColors.length];
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const x = padding + (index / (dataset.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      
      this.ctx.stroke();
      
      // Render points
      dataset.data.forEach((value, index) => {
        const x = padding + (index / (dataset.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      });
    });
    
    // Render axes
    if (options.showAxes) {
      this.renderAxes(padding, padding, chartWidth, chartHeight, data.labels, maxValue);
    }
  }

  /**
   * Render pie chart
   */
  private renderPieChart(data: ChartData, options: ChartOptions): void {
    const centerX = options.width / 2;
    const centerY = options.height / 2;
    const radius = Math.min(options.width, options.height) / 2 - 40;
    
    // Calculate total
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);
    
    // Render slices
    let currentAngle = -Math.PI / 2; // Start at top
    
    dataset.data.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      const color = this.defaultColors[index % this.defaultColors.length];
      
      // Slice
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      const percentage = ((value / total) * 100).toFixed(1);
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${percentage}%`, labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  }

  /**
   * Render sparkline (mini chart)
   */
  private renderSparkline(data: ChartData, options: ChartOptions): void {
    const dataset = data.datasets[0];
    const values = dataset.data;
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    
    const width = options.width;
    const height = options.height;
    
    // Render line
    this.ctx.strokeStyle = dataset.color ?? '#4285F4';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    
    this.ctx.stroke();
    
    // Fill area
    this.ctx.lineTo(width, height);
    this.ctx.lineTo(0, height);
    this.ctx.closePath();
    this.ctx.fillStyle = this.hexToRgba(dataset.color ?? '#4285F4', 0.2);
    this.ctx.fill();
    
    // Highlight last point
    const lastX = width;
    const lastY = height - ((values[values.length - 1] - minValue) / range) * height;
    
    this.ctx.fillStyle = dataset.color ?? '#4285F4';
    this.ctx.beginPath();
    this.ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Render grid
   */
  private renderGrid(x: number, y: number, width: number, height: number, maxValue: number): void {
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 1;
    
    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 5; i++) {
      const gridY = y + (i / 5) * height;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, gridY);
      this.ctx.lineTo(x + width, gridY);
      this.ctx.stroke();
    }
  }

  /**
   * Render axes
   */
  private renderAxes(
    x: number,
    y: number,
    width: number,
    height: number,
    labels: string[],
    maxValue: number
  ): void {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    
    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y + height);
    this.ctx.stroke();
    
    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.stroke();
    
    // Y-axis labels
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * i;
      const labelY = y + height - (i / 5) * height;
      this.ctx.fillText(value.toFixed(0), x - 10, labelY);
    }
    
    // X-axis labels
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    labels.forEach((label, index) => {
      const labelX = x + (index / (labels.length - 1)) * width;
      this.ctx.fillText(label, labelX, y + height + 10);
    });
  }

  /**
   * Render title
   */
  private renderTitle(title: string, options: ChartOptions): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(title, options.width / 2, 10);
  }

  /**
   * Render legend
   */
  private renderLegend(data: ChartData, options: ChartOptions): void {
    const legendX = options.width - 150;
    const legendY = 40;
    const itemHeight = 20;
    
    data.datasets.forEach((dataset, index) => {
      const y = legendY + index * itemHeight;
      const color = dataset.color ?? this.defaultColors[index % this.defaultColors.length];
      
      // Color box
      this.ctx.fillStyle = color;
      this.ctx.fillRect(legendX, y, 15, 15);
      
      // Label
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(dataset.label, legendX + 20, y);
    });
  }

  /**
   * Convert hex to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Export chart as image
   */
  async toBlob(): Promise<Blob | null> {
    if (this.canvas instanceof HTMLCanvasElement) {
      return new Promise(resolve => {
        (this.canvas as HTMLCanvasElement).toBlob(resolve as BlobCallback);
      });
    } else {
      return (this.canvas as OffscreenCanvas).convertToBlob();
    }
  }

  /**
   * Export chart as data URL
   */
  toDataURL(): string {
    if (this.canvas instanceof HTMLCanvasElement) {
      return this.canvas.toDataURL();
    } else {
      throw new Error('OffscreenCanvas does not support toDataURL');
    }
  }
}
