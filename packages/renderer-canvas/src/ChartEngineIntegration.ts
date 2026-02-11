/**
 * ChartEngineIntegration.ts
 * Week 12 Day 6: Integration & Rendering
 * 
 * Integrates advanced chart features (trendlines, custom axes, advanced types)
 * into the main ChartEngine rendering pipeline
 */

import { ChartEngine, ChartData, ChartOptions } from './ChartEngine';
import { AdvancedChartRenderer, AdvancedChartData } from './AdvancedChartRenderer';
import { TrendlineCalculator } from './TrendlineCalculator';
import { AxisScaler } from './AxisScaler';
import type {
  ExtendedChartType,
  AdvancedChartOptions,
  TrendlineConfig,
  AxisConfig,
  ComboChartConfig
} from '@cyber-sheet/core';

/**
 * Extended chart options combining base and advanced features
 */
export interface IntegratedChartOptions {
  type: ExtendedChartType;
  width: number;
  height: number;
  title?: string;
  showLegend?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  colors?: string[];
  backgroundColor?: string;
  advanced?: AdvancedChartOptions;
}

/**
 * ChartEngineIntegrated - ChartEngine with advanced features
 */
export class ChartEngineIntegrated extends ChartEngine {
  private advancedRenderer: AdvancedChartRenderer;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    super(canvas);
    const ctx = canvas.getContext('2d')!;
    this.advancedRenderer = new AdvancedChartRenderer(ctx);
  }

  /**
   * Render chart with advanced features support
   */
  renderAdvanced(data: ChartData | AdvancedChartData, options: IntegratedChartOptions): void {
    // Handle advanced chart types
    if (this.isAdvancedType(options.type)) {
      this.renderAdvancedChart(data as AdvancedChartData, options);
      return;
    }

    // Render standard chart
    super.render(data as ChartData, options as ChartOptions);

    // Add trendlines if configured
    if (options.advanced?.trendlines && options.advanced.trendlines.length > 0) {
      this.renderTrendlines(data as ChartData, options);
    }

    // Add title and legend if needed
    if (options.title) {
      this.renderTitleOverlay(options.title, options);
    }
  }

  /**
   * Check if chart type is advanced
   */
  private isAdvancedType(type: ExtendedChartType): boolean {
    return ['scatter', 'combo', 'area', 'bubble'].includes(type);
  }

  /**
   * Render advanced chart types
   */
  private renderAdvancedChart(data: AdvancedChartData, options: IntegratedChartOptions): void {
    const ctx = (this as any).ctx as CanvasRenderingContext2D;
    
    // Clear canvas
    ctx.fillStyle = options.backgroundColor ?? '#FFFFFF';
    ctx.fillRect(0, 0, options.width, options.height);

    switch (options.type) {
      case 'scatter':
        this.advancedRenderer.renderScatter(
          data,
          options.width,
          options.height,
          options.advanced
        );
        break;

      case 'combo':
        if (options.advanced?.comboConfig) {
          this.advancedRenderer.renderCombo(
            data,
            options.width,
            options.height,
            options.advanced.comboConfig,
            options.advanced
          );
        }
        break;

      case 'area':
        this.advancedRenderer.renderArea(
          data,
          options.width,
          options.height,
          options.advanced
        );
        break;

      case 'bubble':
        // Bubble chart is similar to scatter with size dimension
        this.advancedRenderer.renderScatter(
          data,
          options.width,
          options.height,
          options.advanced
        );
        break;
    }
  }

  /**
   * Render trendlines over existing chart
   */
  private renderTrendlines(data: ChartData, options: IntegratedChartOptions): void {
    if (!options.advanced?.trendlines) return;

    const ctx = (this as any).ctx as CanvasRenderingContext2D;
    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const chartLeft = padding;
    const chartTop = padding;

    // Calculate max value for scaling
    const maxValue = Math.max(...data.datasets.flatMap(ds => ds.data));

    data.datasets.forEach((dataset, datasetIdx) => {
      const trendlineConfig = options.advanced!.trendlines![datasetIdx];
      if (!trendlineConfig) return;

      // Generate x values (0, 1, 2, ...)
      const xValues = dataset.data.map((_, idx) => idx);
      const yValues = dataset.data;

      // Calculate trendline
      const trendline = TrendlineCalculator.calculate(
        xValues,
        yValues,
        trendlineConfig.type,
        {
          degree: trendlineConfig.degree,
          period: trendlineConfig.period,
          forecastForward: trendlineConfig.forecastForward,
          forecastBackward: trendlineConfig.forecastBackward
        }
      );

      // Draw trendline
      ctx.strokeStyle = trendlineConfig.color || dataset.color || '#000000';
      ctx.lineWidth = trendlineConfig.lineWidth || 2;
      ctx.setLineDash([5, 5]); // Dashed line for trendline

      ctx.beginPath();
      trendline.points.forEach((point, idx) => {
        const x = chartLeft + (point.x / (xValues.length - 1)) * chartWidth;
        const y = chartTop + chartHeight - (point.y / maxValue) * chartHeight;

        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Show equation if requested
      if (trendlineConfig.showEquation && trendline.equation) {
        this.renderTrendlineEquation(
          trendline.equation,
          trendline.rSquared,
          chartLeft + 10,
          chartTop + 10 + datasetIdx * 30,
          ctx
        );
      }
    });
  }

  /**
   * Render trendline equation text
   */
  private renderTrendlineEquation(
    equation: string,
    rSquared: number | undefined,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';

    let text = equation;
    if (rSquared !== undefined) {
      text += ` (R² = ${rSquared.toFixed(4)})`;
    }

    // Draw background
    const metrics = ctx.measureText(text);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - 5, y - 15, metrics.width + 10, 20);

    // Draw text
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x, y);
  }

  /**
   * Render title overlay (for advanced charts)
   */
  private renderTitleOverlay(title: string, options: IntegratedChartOptions): void {
    const ctx = (this as any).ctx as CanvasRenderingContext2D;
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, options.width / 2, 30);
  }

  /**
   * Render chart with custom axis scaling
   */
  renderWithCustomAxes(
    data: ChartData,
    options: IntegratedChartOptions,
    xAxisConfig?: AxisConfig,
    yAxisConfig?: AxisConfig
  ): void {
    const ctx = (this as any).ctx as CanvasRenderingContext2D;
    
    // Clear canvas
    ctx.fillStyle = options.backgroundColor ?? '#FFFFFF';
    ctx.fillRect(0, 0, options.width, options.height);

    const padding = 60;
    const chartWidth = options.width - padding * 2;
    const chartHeight = options.height - padding * 2;
    const chartLeft = padding;
    const chartTop = padding;

    // Determine axis bounds
    const xBounds = xAxisConfig
      ? { min: xAxisConfig.min ?? 0, max: xAxisConfig.max ?? data.labels.length - 1 }
      : { min: 0, max: data.labels.length - 1 };

    const allValues = data.datasets.flatMap(ds => ds.data);
    const yBounds = yAxisConfig
      ? { min: yAxisConfig.min ?? 0, max: yAxisConfig.max ?? Math.max(...allValues) }
      : { min: 0, max: Math.max(...allValues) };

    // Draw axes with custom scales
    if (options.showAxes) {
      this.drawCustomAxes(
        chartLeft,
        chartTop,
        chartWidth,
        chartHeight,
        xAxisConfig,
        yAxisConfig,
        xBounds,
        yBounds,
        ctx
      );
    }

    // Draw grid
    if (options.showGrid) {
      this.drawCustomGrid(chartLeft, chartTop, chartWidth, chartHeight, ctx);
    }

    // Render data with custom scaling
    this.renderDataWithScaling(
      data,
      options,
      chartLeft,
      chartTop,
      chartWidth,
      chartHeight,
      xBounds,
      yBounds,
      xAxisConfig?.scale || 'linear',
      yAxisConfig?.scale || 'linear',
      ctx
    );
  }

  /**
   * Draw axes with custom configurations
   */
  private drawCustomAxes(
    left: number,
    top: number,
    width: number,
    height: number,
    xConfig: AxisConfig | undefined,
    yConfig: AxisConfig | undefined,
    xBounds: { min: number; max: number },
    yBounds: { min: number; max: number },
    ctx: CanvasRenderingContext2D
  ): void {
    const xScale = xConfig?.scale || 'linear';
    const yScale = yConfig?.scale || 'linear';

    // Generate and draw ticks
    const xTicks = AxisScaler.generateTicks(
      xScale,
      xBounds,
      [left, left + width],
      xConfig
    );

    const yTicks = AxisScaler.generateTicks(
      yScale,
      yBounds,
      [top + height, top], // Reversed for Y axis
      yConfig
    );

    // Draw X axis
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, top + height);
    ctx.lineTo(left + width, top + height);
    ctx.stroke();

    // Draw Y axis
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + height);
    ctx.stroke();

    // Draw X axis ticks and labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    xTicks.forEach(tick => {
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(tick.position, top + height);
      ctx.lineTo(tick.position, top + height + (tick.isMajor ? 8 : 4));
      ctx.stroke();

      // Label
      if (tick.isMajor) {
        ctx.fillText(tick.label, tick.position, top + height + 25);
      }
    });

    // Draw Y axis ticks and labels
    ctx.textAlign = 'right';
    yTicks.forEach(tick => {
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(left, tick.position);
      ctx.lineTo(left - (tick.isMajor ? 8 : 4), tick.position);
      ctx.stroke();

      // Label
      if (tick.isMajor) {
        ctx.fillText(tick.label, left - 10, tick.position + 5);
      }
    });

    // Draw axis titles
    if (xConfig?.title) {
      ctx.textAlign = 'center';
      ctx.fillText(xConfig.title, left + width / 2, top + height + 45);
    }

    if (yConfig?.title) {
      ctx.save();
      ctx.translate(left - 45, top + height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(yConfig.title, 0, 0);
      ctx.restore();
    }
  }

  /**
   * Draw grid
   */
  private drawCustomGrid(
    left: number,
    top: number,
    width: number,
    height: number,
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      // Horizontal
      const y = top + (height / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();

      // Vertical
      const x = left + (width / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }
  }

  /**
   * Render data with custom axis scaling
   */
  private renderDataWithScaling(
    data: ChartData,
    options: IntegratedChartOptions,
    left: number,
    top: number,
    width: number,
    height: number,
    xBounds: { min: number; max: number },
    yBounds: { min: number; max: number },
    xScale: 'linear' | 'logarithmic' | 'time' | 'category',
    yScale: 'linear' | 'logarithmic' | 'time' | 'category',
    ctx: CanvasRenderingContext2D
  ): void {
    // Render based on chart type
    if (options.type === 'line') {
      data.datasets.forEach((dataset, idx) => {
        const color = dataset.color || (this as any).defaultColors[idx % (this as any).defaultColors.length];
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        dataset.data.forEach((value, dataIdx) => {
          const xValue = dataIdx;
          const x = AxisScaler.scaleValue(xValue, xScale, xBounds, [left, left + width]);
          const y = AxisScaler.scaleValue(value, yScale, yBounds, [top + height, top]);

          if (dataIdx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();

        // Draw points
        dataset.data.forEach((value, dataIdx) => {
          const xValue = dataIdx;
          const x = AxisScaler.scaleValue(xValue, xScale, xBounds, [left, left + width]);
          const y = AxisScaler.scaleValue(value, yScale, yBounds, [top + height, top]);

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    }
  }
}
