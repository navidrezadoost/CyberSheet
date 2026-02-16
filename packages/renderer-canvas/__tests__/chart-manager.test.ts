/**
 * chart-manager.test.ts
 * 
 * Tests for ChartManager
 * Week 12 Day 2: Data Integration
 */

import { Worksheet } from '@cyber-sheet/core';
import type { ChartCreateParams, ChartObject } from '@cyber-sheet/core';
import { ChartManager } from '../src/ChartManager';

describe('ChartManager', () => {
  let worksheet: Worksheet;
  let manager: ChartManager;

  beforeEach(() => {
    worksheet = new Worksheet('TestSheet');
    manager = new ChartManager(worksheet);
  });

  const createSampleChart = (): ChartCreateParams => ({
    type: 'bar',
    dataRange: { startRow: 1, startCol: 1, endRow: 5, endCol: 3 },
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    options: { showLegend: true },
    seriesDirection: 'columns',
    hasHeaderRow: true,
    hasHeaderCol: true,
    zIndex: 0
  });

  // ============================================================================
  // CRUD Operations (4 tests)
  // ============================================================================

  describe('CRUD Operations', () => {
    test('should create chart', () => {
      const params = createSampleChart();
      const chart = manager.create(params);

      expect(chart.id).toBeDefined();
      expect(chart.type).toBe('bar');
      expect(chart.position).toEqual({ x: 100, y: 100 });
      expect(chart.createdAt).toBeDefined();
      expect(chart.updatedAt).toBeDefined();
    });

    test('should get chart by ID', () => {
      const chart = manager.create(createSampleChart());
      const retrieved = manager.get(chart.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(chart.id);
    });

    test('should update chart', async () => {
      const chart = manager.create(createSampleChart());
      
      // Wait 1ms to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const updated = manager.update(chart.id, {
        position: { x: 200, y: 200 },
        title: 'Updated Title'
      });

      expect(updated.position).toEqual({ x: 200, y: 200 });
      expect(updated.title).toBe('Updated Title');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(chart.updatedAt);
    });

    test('should delete chart', () => {
      const chart = manager.create(createSampleChart());
      const deleted = manager.delete(chart.id);

      expect(deleted).toBe(true);
      expect(manager.get(chart.id)).toBeUndefined();
    });
  });

  // ============================================================================
  // Query Operations (2 tests)
  // ============================================================================

  describe('Query Operations', () => {
    test('should get all charts sorted by z-index', () => {
      const chart1 = manager.create({ ...createSampleChart(), zIndex: 2 });
      const chart2 = manager.create({ ...createSampleChart(), zIndex: 1 });
      const chart3 = manager.create({ ...createSampleChart(), zIndex: 3 });

      const all = manager.getAll();

      expect(all).toHaveLength(3);
      expect(all[0].id).toBe(chart2.id); // z-index 1
      expect(all[1].id).toBe(chart1.id); // z-index 2
      expect(all[2].id).toBe(chart3.id); // z-index 3
    });

    test('should get charts by type', () => {
      manager.create({ ...createSampleChart(), type: 'bar' });
      manager.create({ ...createSampleChart(), type: 'line' });
      manager.create({ ...createSampleChart(), type: 'bar' });

      const barCharts = manager.getByType('bar');
      const lineCharts = manager.getByType('line');

      expect(barCharts).toHaveLength(2);
      expect(lineCharts).toHaveLength(1);
    });
  });

  // ============================================================================
  // Selection (2 tests)
  // ============================================================================

  describe('Selection', () => {
    test('should select and deselect chart', () => {
      const chart = manager.create(createSampleChart());
      
      manager.select(chart.id);
      expect(manager.getSelected()?.id).toBe(chart.id);

      manager.deselect(chart.id);
      expect(manager.getSelected()).toBeUndefined();
    });

    test('should deselect others when selecting one', () => {
      const chart1 = manager.create(createSampleChart());
      const chart2 = manager.create(createSampleChart());

      manager.select(chart1.id);
      manager.select(chart2.id);

      const selected = manager.getSelected();
      expect(selected?.id).toBe(chart2.id);
      
      const chart1Updated = manager.get(chart1.id);
      expect(chart1Updated?.selected).toBe(false);
    });
  });

  // ============================================================================
  // Positioning (2 tests)
  // ============================================================================

  describe('Positioning', () => {
    test('should get charts at position', () => {
      manager.create({
        ...createSampleChart(),
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 }
      });

      const charts = manager.getChartsAtPosition(50, 50);
      expect(charts).toHaveLength(1);

      const noCharts = manager.getChartsAtPosition(200, 200);
      expect(noCharts).toHaveLength(0);
    });

    test('should get topmost chart at position', () => {
      const chart1 = manager.create({
        ...createSampleChart(),
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1
      });

      const chart2 = manager.create({
        ...createSampleChart(),
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 2
      });

      const topmost = manager.getTopmostChartAtPosition(50, 50);
      expect(topmost?.id).toBe(chart2.id);
    });
  });

  // ============================================================================
  // Z-Index Management (2 tests)
  // ============================================================================

  describe('Z-Index Management', () => {
    test('should bring chart to front', () => {
      const chart1 = manager.create({ ...createSampleChart(), zIndex: 1 });
      const chart2 = manager.create({ ...createSampleChart(), zIndex: 2 });

      const updated = manager.bringToFront(chart1.id);

      expect(updated.zIndex).toBeGreaterThan(chart2.zIndex);
    });

    test('should send chart to back', () => {
      const chart1 = manager.create({ ...createSampleChart(), zIndex: 2 });
      const chart2 = manager.create({ ...createSampleChart(), zIndex: 3 });

      const updated = manager.sendToBack(chart2.id);

      expect(updated.zIndex).toBeLessThan(chart1.zIndex);
      expect(updated.zIndex).toBeGreaterThanOrEqual(0); // zIndex must be non-negative
    });
  });

  // ============================================================================
  // Event System (1 test)
  // ============================================================================

  describe('Event System', () => {
    test('should emit events for CRUD operations', () => {
      const events: any[] = [];
      const listener = (event: any) => events.push(event);

      manager.on(listener);

      const chart = manager.create(createSampleChart());
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('create');

      manager.update(chart.id, { title: 'Test' });
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('update');

      manager.delete(chart.id);
      expect(events).toHaveLength(3);
      expect(events[2].type).toBe('delete');

      manager.off(listener);
    });
  });

  // ============================================================================
  // Import/Export (1 test)
  // ============================================================================

  describe('Import/Export', () => {
    test('should export and import charts as JSON', () => {
      manager.create(createSampleChart());
      manager.create({ ...createSampleChart(), type: 'line' });

      const json = manager.exportToJSON();
      expect(json).toBeDefined();

      const newManager = new ChartManager(new Worksheet('NewSheet'));
      const imported = newManager.importFromJSON(json);

      expect(imported).toBe(2);
      expect(newManager.count()).toBe(2);
    });
  });
});
