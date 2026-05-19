/**
 * chart-creation.test.ts
 * 
 * Tests for chart creation, data binding, and rendering
 */

import { describe, it, expect } from '@jest/globals';
import { DrawingLayer } from '../src/DrawingLayer';
import { createChartObject } from '../src/models/ChartObject';
import type { ChartCreateParams } from '../src/models/ChartObject';

describe('Chart Creation', () => {
  it('should create a valid chart object with defaults', () => {
    const params: ChartCreateParams = {
      type: 'bar',
      dataRange: {
        startRow: 0,
        startCol: 0,
        endRow: 10,
        endCol: 2,
      },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 1,
    };

    const chart = createChartObject(params);

    expect(chart.id).toBeTruthy();
    expect(chart.type).toBe('bar');
    expect(chart.dataRange).toEqual(params.dataRange);
    expect(chart.position).toEqual(params.position);
    expect(chart.size).toEqual(params.size);
    expect(chart.seriesDirection).toBe('columns');
    expect(chart.hasHeaderRow).toBe(true);
    expect(chart.hasHeaderCol).toBe(false);
    expect(chart.zIndex).toBe(1);
  });

  it('should create charts with different types', () => {
    const types: ('bar' | 'line' | 'pie' | 'sparkline')[] = ['bar', 'line', 'pie', 'sparkline'];

    types.forEach(type => {
      const params: ChartCreateParams = {
        type,
        dataRange: { startRow: 0, startCol: 0, endRow: 5, endCol: 2 },
        position: { x: 0, y: 0 },
        size: { width: 300, height: 200 },
        options: {},
        seriesDirection: 'columns',
        hasHeaderRow: true,
        hasHeaderCol: false,
        zIndex: 1,
      };

      const chart = createChartObject(params);
      expect(chart.type).toBe(type);
    });
  });

  it('should validate chart object structure', () => {
    const validChart = createChartObject({
      type: 'line',
      dataRange: { startRow: 0, startCol: 0, endRow: 10, endCol: 3 },
      position: { x: 50, y: 50 },
      size: { width: 500, height: 400 },
      options: {
        title: 'Test Chart',
        showLegend: true,
        showAxes: true,
        showGrid: true,
      },
      seriesDirection: 'rows',
      hasHeaderRow: true,
      hasHeaderCol: true,
      zIndex: 2,
    });

    expect(validChart.type).toBe('line');
    expect(validChart.options.title).toBe('Test Chart');
    expect(validChart.options.showLegend).toBe(true);
    expect(validChart.options.showAxes).toBe(true);
    expect(validChart.options.showGrid).toBe(true);
    expect(validChart.seriesDirection).toBe('rows');
    expect(validChart.zIndex).toBe(2);
  });

  it('should handle chart with custom colors', () => {
    const chart = createChartObject({
      type: 'pie',
      dataRange: { startRow: 0, startCol: 0, endRow: 5, endCol: 1 },
      position: { x: 100, y: 100 },
      size: { width: 300, height: 300 },
      options: {
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
        backgroundColor: '#FFFFFF',
      },
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 1,
    });

    expect(chart.options.colors).toHaveLength(4);
    expect(chart.options.colors?.[0]).toBe('#FF6384');
    expect(chart.options.backgroundColor).toBe('#FFFFFF');
  });
});

describe('Chart Integration with DrawingLayer', () => {
  it('should add chart to drawing layer', () => {
    const drawingLayer = new DrawingLayer();
    const params: ChartCreateParams = {
      type: 'bar',
      dataRange: { startRow: 0, startCol: 0, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 1,
    };

    const chart = createChartObject(params);

    // Convert to DrawingLayer ChartObject format
    const chartObject: any = {
      id: chart.id,
      type: 'chart' as const,
      name: chart.title || 'Chart',
      chartType: 'column',
      dataRange: `${params.dataRange.startRow}:${params.dataRange.startCol}-${params.dataRange.endRow}:${params.dataRange.endCol}`,
      position: chart.position,
      size: chart.size,
      rotation: 0,
      zIndex: chart.zIndex,
      locked: false,
      visible: true,
      altText: '',
      chartData: params,
    };

    drawingLayer.addObject(chartObject);

    const allObjects = drawingLayer.getAllObjects();
    expect(allObjects).toHaveLength(1);
    expect(allObjects[0].type).toBe('chart');
    expect(allObjects[0].id).toBe(chart.id);
  });

  it('should retrieve chart from drawing layer', () => {
    const drawingLayer = new DrawingLayer();
    const chartId = 'test-chart-123';

    const chartObject: any = {
      id: chartId,
      type: 'chart' as const,
      name: 'Test Chart',
      chartType: 'line',
      dataRange: '0:0-10:2',
      position: { x: 50, y: 50 },
      size: { width: 300, height: 200 },
      rotation: 0,
      zIndex: 1,
      locked: false,
      visible: true,
      altText: '',
    };

    drawingLayer.addObject(chartObject);

    const retrieved = drawingLayer.getObject(chartId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe('chart');
    expect((retrieved as any).chartType).toBe('line');
  });

  it('should remove chart from drawing layer', () => {
    const drawingLayer = new DrawingLayer();
    const chartObject: any = {
      id: 'chart-to-remove',
      type: 'chart' as const,
      name: 'Remove Me',
      chartType: 'pie',
      dataRange: '0:0-5:1',
      position: { x: 0, y: 0 },
      size: { width: 250, height: 250 },
      rotation: 0,
      zIndex: 1,
      locked: false,
      visible: true,
      altText: '',
    };

    drawingLayer.addObject(chartObject);
    expect(drawingLayer.getAllObjects()).toHaveLength(1);

    const removed = drawingLayer.removeObject('chart-to-remove');
    expect(removed).toBeDefined();
    expect(drawingLayer.getAllObjects()).toHaveLength(0);
  });

  it('should handle multiple charts with z-ordering', () => {
    const drawingLayer = new DrawingLayer();

    // Add three charts with different z-indices
    const chart1: any = {
      id: 'chart1',
      type: 'chart' as const,
      name: 'Chart 1',
      chartType: 'bar',
      dataRange: '0:0-5:2',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 150 },
      rotation: 0,
      zIndex: 1,
      locked: false,
      visible: true,
      altText: '',
    };

    const chart2: any = {
      id: 'chart2',
      type: 'chart' as const,
      name: 'Chart 2',
      chartType: 'line',
      dataRange: '0:0-10:3',
      position: { x: 50, y: 50 },
      size: { width: 250, height: 200 },
      rotation: 0,
      zIndex: 2,
      locked: false,
      visible: true,
      altText: '',
    };

    const chart3: any = {
      id: 'chart3',
      type: 'chart' as const,
      name: 'Chart 3',
      chartType: 'pie',
      dataRange: '0:0-7:1',
      position: { x: 100, y: 100 },
      size: { width: 300, height: 300 },
      rotation: 0,
      zIndex: 3,
      locked: false,
      visible: true,
      altText: '',
    };

    drawingLayer.addObject(chart1);
    drawingLayer.addObject(chart2);
    drawingLayer.addObject(chart3);

    const allCharts = drawingLayer.getAllObjects();
    expect(allCharts).toHaveLength(3);

    // Bring chart1 to front
    drawingLayer.bringToFront('chart1');
    const reordered = drawingLayer.getAllObjects();
    expect(reordered[reordered.length - 1].id).toBe('chart1');
  });
});

describe('Chart Data Range Parsing', () => {
  it('should parse Excel-style range (A1:C10)', () => {
    const rangeText = 'A1:C10';
    const colToNum = (col: string) => {
      let num = 0;
      for (let i = 0; i < col.length; i++) {
        num = num * 26 + (col.charCodeAt(i) - 64);
      }
      return num;
    };

    const match = rangeText.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    expect(match).not.toBeNull();

    if (match) {
      const dataRange = {
        startRow: parseInt(match[2]) - 1,
        startCol: colToNum(match[1]) - 1,
        endRow: parseInt(match[4]) - 1,
        endCol: colToNum(match[3]) - 1,
      };

      expect(dataRange.startRow).toBe(0);
      expect(dataRange.startCol).toBe(0);
      expect(dataRange.endRow).toBe(9);
      expect(dataRange.endCol).toBe(2);
    }
  });

  it('should parse numeric range (1:1-10:3)', () => {
    const rangeText = '1:1-10:3';
    const match = rangeText.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
    expect(match).not.toBeNull();

    if (match) {
      const dataRange = {
        startRow: parseInt(match[1]),
        startCol: parseInt(match[2]),
        endRow: parseInt(match[3]),
        endCol: parseInt(match[4]),
      };

      expect(dataRange.startRow).toBe(1);
      expect(dataRange.startCol).toBe(1);
      expect(dataRange.endRow).toBe(10);
      expect(dataRange.endCol).toBe(3);
    }
  });
});
