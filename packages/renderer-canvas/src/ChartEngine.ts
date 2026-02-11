/**
 * ChartEngine.ts
 * 
 * Zero-dependency canvas-based charting engine
 * Supports bar, line, pie charts and sparklines
 */

import type { CellValue } from '@cyber-sheet/core';

export type ChartType = 'bar' | 'line' | 'pie' | 'sparkline' | 'treemap' | 'waterfall' | 
                        'candlestick' | 'funnel' | 'sunburst' | 
                        'bar3d' | 'pie3d' | 'line3d' | 'gantt' | 'radar';

export interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
  color?: string;
}

export interface GanttTask {
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  dependencies?: number[];
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
    // For candlestick charts
    ohlcData?: OHLCData[];
  }[];
  // For sunburst chart
  sunburstRoot?: SunburstNode;
  // For Gantt chart
  ganttTasks?: GanttTask[];
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
  // Additional options for specific chart types
  treemapPadding?: number;
  waterfallGap?: number;
  candlestickWidth?: number;
  candlestickGap?: number;
  showVolume?: boolean;
  funnelNeckHeight?: number;
  funnelNeckWidth?: number;
  sunburstInnerRadius?: number;
  // 3D options
  depth3d?: number;
  angle3d?: number;
  // Gantt options
  ganttRowHeight?: number;
  ganttShowProgress?: boolean;
  ganttShowDependencies?: boolean;
  // Radar options
  radarFilled?: boolean;
  radarPointRadius?: number;
  // Animation options
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number;
  animationStagger?: number;
  onAnimationStart?: () => void;
  onAnimationUpdate?: (progress: number) => void;
  onAnimationComplete?: () => void;
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
      case 'treemap':
        this.renderTreemap(data, options);
        break;
      case 'waterfall':
        this.renderWaterfall(data, options);
        break;
      case 'candlestick':
        this.renderCandlestick(data, options);
        break;
      case 'funnel':
        this.renderFunnel(data, options);
        break;
      case 'sunburst':
        this.renderSunburst(data, options);
        break;
      case 'bar3d':
        this.renderBar3D(data, options);
        break;
      case 'pie3d':
        this.renderPie3D(data, options);
        break;
      case 'line3d':
        this.renderLine3D(data, options);
        break;
      case 'gantt':
        this.renderGantt(data, options);
        break;
      case 'radar':
        this.renderRadar(data, options);
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
   * Render a simple treemap using slice-and-dice layout (single dataset supported)
   */
  private renderTreemap(data: ChartData, options: ChartOptions): void {
    const padding = options.treemapPadding ?? 20;
    const x = padding;
    const y = padding;
    const width = options.width - padding * 2;
    const height = options.height - padding * 2;

    const dataset = data.datasets[0];
    const values = dataset.data;
    const total = values.reduce((s, v) => s + Math.max(0, v), 0);
    if (total <= 0) {
      // Nothing to draw
      return;
    }

    // Simple slice-and-dice horizontally
    let offset = 0;
    values.forEach((val, i) => {
      const size = Math.max(0, val);
      const w = (size / total) * width;
      const color = (data.datasets[i]?.color) ?? this.defaultColors[i % this.defaultColors.length];

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x + offset, y, w, height);

      // Label
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const cx = x + offset + w / 2;
      const cy = y + height / 2;
      const label = data.labels[i] ?? '';
      this.ctx.fillText(label, cx, cy);

      offset += w;
    });
  }

  /**
   * Render a basic waterfall chart (single dataset with positive/negative steps)
   */
  private renderWaterfall(data: ChartData, options: ChartOptions): void {
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const dataset = data.datasets[0];
    const gap = options.waterfallGap ?? 10;

    // Calculate cumulative values to determine baseline
    let cumulative = 0;
    const cumulatives: number[] = [];
    dataset.data.forEach(v => {
      cumulatives.push(cumulative);
      cumulative += v;
    });

    const maxVal = Math.max(...cumulatives, cumulative, 0);
    const minVal = Math.min(...cumulatives, cumulative, 0);
    const range = maxVal - minVal || 1;

    const barWidth = (chartWidth - (dataset.data.length - 1) * gap) / dataset.data.length;

    dataset.data.forEach((val, i) => {
      const base = cumulatives[i];
      const x = padding + i * (barWidth + gap);
      const y0 = padding + chartHeight - ((base - minVal) / range) * chartHeight;
      const y1 = padding + chartHeight - ((base + val - minVal) / range) * chartHeight;

      const top = Math.min(y0, y1);
      const height = Math.abs(y1 - y0);

      const color = val >= 0 ? (dataset.color ?? '#0F9D58') : '#DB4437';
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, top, barWidth, height);

      // Stroke
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, top, barWidth, height);
    });

    // Render axes
    if (options.showAxes) {
      this.renderAxes(padding, padding, chartWidth, chartHeight, data.labels, Math.max(Math.abs(maxVal), Math.abs(minVal)));
    }
  }

  /**
   * Render candlestick (OHLC) chart for financial data
   */
  private renderCandlestick(data: ChartData, options: ChartOptions): void {
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const dataset = data.datasets[0];
    
    if (!dataset.ohlcData || dataset.ohlcData.length === 0) {
      return;
    }

    const ohlcData = dataset.ohlcData;
    const candleWidth = options.candlestickWidth ?? 10;
    const gap = options.candlestickGap ?? 5;
    
    // Find price range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    ohlcData.forEach(d => {
      minPrice = Math.min(minPrice, d.low);
      maxPrice = Math.max(maxPrice, d.high);
    });
    const priceRange = maxPrice - minPrice || 1;

    // Determine chart area (with or without volume)
    const showVolume = options.showVolume ?? false;
    const volumeHeight = showVolume ? chartHeight * 0.2 : 0;
    const priceHeight = chartHeight - volumeHeight;

    const totalWidth = ohlcData.length * (candleWidth + gap) - gap;
    const startX = padding + (chartWidth - totalWidth) / 2;

    // Render candlesticks
    ohlcData.forEach((d, i) => {
      const x = startX + i * (candleWidth + gap);
      const wickX = x + candleWidth / 2;

      // Calculate y positions (price axis)
      const openY = padding + priceHeight - ((d.open - minPrice) / priceRange) * priceHeight;
      const closeY = padding + priceHeight - ((d.close - minPrice) / priceRange) * priceHeight;
      const highY = padding + priceHeight - ((d.high - minPrice) / priceRange) * priceHeight;
      const lowY = padding + priceHeight - ((d.low - minPrice) / priceRange) * priceHeight;

      const isUp = d.close >= d.open;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;

      // Wick (high-low line)
      this.ctx.strokeStyle = isUp ? '#0F9D58' : '#DB4437';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(wickX, highY);
      this.ctx.lineTo(wickX, lowY);
      this.ctx.stroke();

      // Body (open-close rectangle)
      this.ctx.fillStyle = isUp ? '#0F9D58' : '#DB4437';
      this.ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Render volume bars if enabled
    if (showVolume && ohlcData.some(d => d.volume !== undefined)) {
      const maxVolume = Math.max(...ohlcData.map(d => d.volume ?? 0));
      const volumeY = padding + priceHeight + 10;
      const volumeBarHeight = volumeHeight - 10;

      ohlcData.forEach((d, i) => {
        if (d.volume === undefined) return;
        const x = startX + i * (candleWidth + gap);
        const barHeight = (d.volume / maxVolume) * volumeBarHeight;
        const isUp = d.close >= d.open;
        
        this.ctx.fillStyle = isUp ? 'rgba(15, 157, 88, 0.5)' : 'rgba(219, 68, 55, 0.5)';
        this.ctx.fillRect(x, volumeY + volumeBarHeight - barHeight, candleWidth, barHeight);
      });
    }

    // Render axes
    if (options.showAxes) {
      this.renderAxes(padding, padding, chartWidth, priceHeight, data.labels, maxPrice);
    }
  }

  /**
   * Render funnel chart for conversion/pipeline visualization
   */
  private renderFunnel(data: ChartData, options: ChartOptions): void {
    const padding = 40;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const dataset = data.datasets[0];
    const values = dataset.data;

    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const neckHeight = options.funnelNeckHeight ?? chartHeight * 0.2;
    const neckWidth = options.funnelNeckWidth ?? chartWidth * 0.3;

    let currentY = padding;
    const segmentHeight = chartHeight / values.length;

    values.forEach((value, i) => {
      const ratio = value / maxValue;
      const topWidth = i === 0 ? chartWidth : (chartWidth - neckWidth) * (values[i - 1] / maxValue) + neckWidth;
      const bottomWidth = (chartWidth - neckWidth) * ratio + neckWidth;

      const topLeft = padding + (chartWidth - topWidth) / 2;
      const topRight = topLeft + topWidth;
      const bottomLeft = padding + (chartWidth - bottomWidth) / 2;
      const bottomRight = bottomLeft + bottomWidth;

      const color = (dataset.color) ?? this.defaultColors[i % this.defaultColors.length];
      this.ctx.fillStyle = color;

      // Draw trapezoid
      this.ctx.beginPath();
      this.ctx.moveTo(topLeft, currentY);
      this.ctx.lineTo(topRight, currentY);
      this.ctx.lineTo(bottomRight, currentY + segmentHeight);
      this.ctx.lineTo(bottomLeft, currentY + segmentHeight);
      this.ctx.closePath();
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Label
      const label = data.labels[i] ?? '';
      const percentage = ((value / values[0]) * 100).toFixed(1);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${label} (${percentage}%)`, padding + chartWidth / 2, currentY + segmentHeight / 2);

      currentY += segmentHeight;
    });
  }

  /**
   * Render sunburst chart for hierarchical data visualization
   */
  private renderSunburst(data: ChartData, options: ChartOptions): void {
    if (!data.sunburstRoot) {
      return;
    }

    const centerX = options.width / 2;
    const centerY = options.height / 2;
    const maxRadius = Math.min(options.width, options.height) / 2 - 20;
    const innerRadius = options.sunburstInnerRadius ?? maxRadius * 0.3;

    // Calculate total value of root
    const calculateTotal = (node: SunburstNode): number => {
      if (node.children && node.children.length > 0) {
        return node.children.reduce((sum, child) => sum + calculateTotal(child), 0);
      }
      return node.value ?? 0;
    };

    const total = calculateTotal(data.sunburstRoot);

    // Recursive rendering
    const renderNode = (
      node: SunburstNode,
      startAngle: number,
      endAngle: number,
      innerR: number,
      outerR: number,
      colorIndex: number
    ): number => {
      const nodeValue = node.children && node.children.length > 0
        ? node.children.reduce((sum, child) => sum + calculateTotal(child), 0)
        : (node.value ?? 0);

      if (nodeValue === 0) return colorIndex;

      // Draw arc segment
      const color = node.color ?? this.defaultColors[colorIndex % this.defaultColors.length];
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerR, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerR, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Label (if segment is large enough)
      const midAngle = (startAngle + endAngle) / 2;
      const midRadius = (innerR + outerR) / 2;
      const labelX = centerX + Math.cos(midAngle) * midRadius;
      const labelY = centerY + Math.sin(midAngle) * midRadius;
      
      if ((endAngle - startAngle) > 0.2) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.name, labelX, labelY);
      }

      let currentColorIndex = colorIndex + 1;

      // Render children
      if (node.children && node.children.length > 0) {
        const childInnerR = outerR;
        const childOuterR = Math.min(outerR + (maxRadius - innerRadius) / 4, maxRadius);
        let currentAngle = startAngle;

        node.children.forEach(child => {
          const childValue = calculateTotal(child);
          const childAngle = ((endAngle - startAngle) * childValue) / nodeValue;
          currentColorIndex = renderNode(child, currentAngle, currentAngle + childAngle, childInnerR, childOuterR, currentColorIndex);
          currentAngle += childAngle;
        });
      }

      return currentColorIndex;
    };

    // Start rendering from root
    renderNode(data.sunburstRoot, -Math.PI / 2, Math.PI * 1.5, innerRadius, maxRadius, 0);
  }

  /**
   * Render 3D bar chart
   */
  private renderBar3D(data: ChartData, options: ChartOptions): void {
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const depth = options.depth3d ?? 20;
    const angle = options.angle3d ?? 0.7;
    
    const maxValue = Math.max(
      ...data.datasets.flatMap(d => d.data)
    );
    
    const barWidth = chartWidth / (data.labels.length * data.datasets.length + data.labels.length);
    const groupGap = barWidth;
    
    // Render grid
    if (options.showGrid) {
      this.renderGrid(padding, padding, chartWidth, chartHeight, maxValue);
    }
    
    data.labels.forEach((label, labelIndex) => {
      data.datasets.forEach((dataset, datasetIndex) => {
        const value = dataset.data[labelIndex];
        const barHeight = (value / maxValue) * chartHeight;
        
        const x = padding + labelIndex * (barWidth * data.datasets.length + groupGap) + 
                  datasetIndex * barWidth;
        const y = padding + chartHeight - barHeight;
        
        const color = dataset.color ?? this.defaultColors[datasetIndex % this.defaultColors.length];
        
        // Draw front face
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw top face (3D effect)
        this.ctx.fillStyle = this.lightenColor(color, 30);
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + barWidth, y);
        this.ctx.lineTo(x + barWidth + depth * angle, y - depth);
        this.ctx.lineTo(x + depth * angle, y - depth);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw right face (3D effect)
        this.ctx.fillStyle = this.darkenColor(color, 20);
        this.ctx.beginPath();
        this.ctx.moveTo(x + barWidth, y);
        this.ctx.lineTo(x + barWidth, y + barHeight);
        this.ctx.lineTo(x + barWidth + depth * angle, y + barHeight - depth);
        this.ctx.lineTo(x + barWidth + depth * angle, y - depth);
        this.ctx.closePath();
        this.ctx.fill();
        
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
   * Render 3D pie chart
   */
  private renderPie3D(data: ChartData, options: ChartOptions): void {
    const centerX = options.width / 2;
    const centerY = options.height / 2;
    const radius = Math.min(options.width, options.height) / 3;
    const depth = options.depth3d ?? 30;
    
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);
    
    let currentAngle = -Math.PI / 2;
    
    // Draw depth layers (bottom to top for proper 3D effect)
    for (let d = depth; d >= 0; d -= 2) {
      let layerAngle = -Math.PI / 2;
      
      dataset.data.forEach((value, index) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        const color = options.colors?.[index] ?? this.defaultColors[index % this.defaultColors.length];
        const darkenedColor = this.darkenColor(color, Math.floor((depth - d) * 1.5));
        
        this.ctx.fillStyle = darkenedColor;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY + d, radius, layerAngle, layerAngle + sliceAngle);
        this.ctx.lineTo(centerX, centerY + d);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        layerAngle += sliceAngle;
      });
    }
    
    // Draw top surface
    currentAngle = -Math.PI / 2;
    dataset.data.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      const color = options.colors?.[index] ?? this.defaultColors[index % this.defaultColors.length];
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.closePath();
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Labels
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(data.labels[index], labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  }

  /**
   * Render 3D line chart
   */
  private renderLine3D(data: ChartData, options: ChartOptions): void {
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const depth = options.depth3d ?? 20;
    const angle = options.angle3d ?? 0.7;
    
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    
    // Render grid with depth
    if (options.showGrid) {
      this.renderGrid(padding, padding, chartWidth, chartHeight, maxValue);
    }
    
    data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color ?? this.defaultColors[datasetIndex % this.defaultColors.length];
      const zOffset = datasetIndex * depth;
      
      // Draw back line (depth effect)
      this.ctx.strokeStyle = this.darkenColor(color, 30);
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const x = padding + (index / (dataset.data.length - 1)) * chartWidth + zOffset * angle;
        const y = padding + chartHeight - (value / maxValue) * chartHeight - zOffset;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.stroke();
      
      // Draw connecting lines between front and back
      dataset.data.forEach((value, index) => {
        const xFront = padding + (index / (dataset.data.length - 1)) * chartWidth;
        const yFront = padding + chartHeight - (value / maxValue) * chartHeight;
        const xBack = xFront + zOffset * angle;
        const yBack = yFront - zOffset;
        
        this.ctx.strokeStyle = this.darkenColor(color, 50);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(xFront, yFront);
        this.ctx.lineTo(xBack, yBack);
        this.ctx.stroke();
      });
      
      // Draw front line
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
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
      
      // Draw data points
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
   * Render Gantt chart
   */
  private renderGantt(data: ChartData, options: ChartOptions): void {
    if (!data.ganttTasks || data.ganttTasks.length === 0) {
      return;
    }
    
    const padding = 80;
    const rowHeight = options.ganttRowHeight ?? 40;
    const chartWidth = options.width - padding * 2;
    const chartHeight = data.ganttTasks.length * rowHeight;
    
    // Find date range
    let minDate = new Date(Math.min(...data.ganttTasks.map(t => t.start.getTime())));
    let maxDate = new Date(Math.max(...data.ganttTasks.map(t => t.end.getTime())));
    const dateRange = maxDate.getTime() - minDate.getTime();
    
    // Render task bars
    data.ganttTasks.forEach((task, index) => {
      const y = padding + index * rowHeight;
      
      // Task bar background
      const startX = padding + ((task.start.getTime() - minDate.getTime()) / dateRange) * chartWidth;
      const endX = padding + ((task.end.getTime() - minDate.getTime()) / dateRange) * chartWidth;
      const barWidth = endX - startX;
      
      const color = task.color ?? this.defaultColors[index % this.defaultColors.length];
      
      // Draw task bar
      this.ctx.fillStyle = this.hexToRgba(color, 0.3);
      this.ctx.fillRect(startX, y + 5, barWidth, rowHeight - 10);
      
      // Draw progress bar if enabled
      if (options.ganttShowProgress && task.progress !== undefined) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(startX, y + 5, barWidth * (task.progress / 100), rowHeight - 10);
      }
      
      // Border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(startX, y + 5, barWidth, rowHeight - 10);
      
      // Task name
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(task.name, 10, y + rowHeight / 2);
      
      // Draw dependencies if enabled
      if (options.ganttShowDependencies && task.dependencies) {
        task.dependencies.forEach(depIndex => {
          if (depIndex < data.ganttTasks!.length) {
            const depTask = data.ganttTasks![depIndex];
            const depY = padding + depIndex * rowHeight;
            const depEndX = padding + ((depTask.end.getTime() - minDate.getTime()) / dateRange) * chartWidth;
            
            this.ctx.strokeStyle = '#999999';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(depEndX, depY + rowHeight / 2);
            this.ctx.lineTo(startX, y + rowHeight / 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Arrow
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y + rowHeight / 2);
            this.ctx.lineTo(startX - 5, y + rowHeight / 2 - 5);
            this.ctx.moveTo(startX, y + rowHeight / 2);
            this.ctx.lineTo(startX - 5, y + rowHeight / 2 + 5);
            this.ctx.stroke();
          }
        });
      }
    });
    
    // Draw timeline grid
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * chartWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding);
      this.ctx.lineTo(x, padding + chartHeight);
      this.ctx.stroke();
      
      // Date labels
      const date = new Date(minDate.getTime() + (i / 5) * dateRange);
      this.ctx.fillStyle = '#666666';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(date.toLocaleDateString(), x, padding - 10);
    }
  }

  /**
   * Render radar/spider chart
   */
  private renderRadar(data: ChartData, options: ChartOptions): void {
    const centerX = options.width / 2;
    const centerY = options.height / 2;
    const radius = Math.min(options.width, options.height) / 3;
    const numAxes = data.labels.length;
    
    if (numAxes === 0) return;
    
    // Find max value across all datasets
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    
    // Draw background grid circles
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 1;
    
    for (let i = 1; i <= 5; i++) {
      const r = (i / 5) * radius;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    // Draw axes
    this.ctx.strokeStyle = '#CCCCCC';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < numAxes; i++) {
      const angle = (i / numAxes) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      // Axis labels
      const labelX = centerX + Math.cos(angle) * (radius + 20);
      const labelY = centerY + Math.sin(angle) * (radius + 20);
      
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(data.labels[i], labelX, labelY);
    }
    
    // Draw data for each dataset
    data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color ?? this.defaultColors[datasetIndex % this.defaultColors.length];
      
      // Draw filled area if enabled
      if (options.radarFilled !== false) {
        this.ctx.fillStyle = this.hexToRgba(color, 0.2);
        this.ctx.beginPath();
        
        dataset.data.forEach((value, index) => {
          const angle = (index / numAxes) * Math.PI * 2 - Math.PI / 2;
          const r = (value / maxValue) * radius;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          
          if (index === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        });
        
        this.ctx.closePath();
        this.ctx.fill();
      }
      
      // Draw outline
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const angle = (index / numAxes) * Math.PI * 2 - Math.PI / 2;
        const r = (value / maxValue) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      
      this.ctx.closePath();
      this.ctx.stroke();
      
      // Draw data points
      const pointRadius = options.radarPointRadius ?? 4;
      dataset.data.forEach((value, index) => {
        const angle = (index / numAxes) * Math.PI * 2 - Math.PI / 2;
        const r = (value / maxValue) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      });
    });
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + percent);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + percent);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + percent);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Darken a color by a percentage
   */
  private darkenColor(hex: string, percent: number): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - percent);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - percent);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - percent);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
