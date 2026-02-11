/**
 * chart-data-callback-manager.test.ts
 * 
 * Tests for ChartDataCallbackManager
 */

import { ChartDataCallbackManager, createCallbackContext } from '../src/ChartDataCallbackManager';
import type { CallbackContext, CallbackEventType } from '../src/ChartDataCallbackManager';
import type { ChartData } from '../src/ChartEngine';

// Use fake timers for throttle/debounce testing
jest.useFakeTimers();

describe('ChartDataCallbackManager', () => {
  let manager: ChartDataCallbackManager;
  let mockChartData: ChartData;
  let mockContext: CallbackContext;

  beforeEach(() => {
    manager = new ChartDataCallbackManager();
    
    mockChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [
        { label: 'Dataset 1', data: [10, 20, 30] },
        { label: 'Dataset 2', data: [15, 25, 35] }
      ]
    };
    
    mockContext = createCallbackContext(
      'chart1',
      'bar',
      mockChartData,
      0,
      0,
      50,
      100,
      150,
      200
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should initialize callbacks for a chart', () => {
      manager.initializeCallbacks('chart1');
      
      const counts = manager.getChartCallbacks('chart1');
      expect(counts).toEqual({});
    });

    test('should not re-initialize if already initialized', () => {
      manager.initializeCallbacks('chart1');
      const id1 = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      manager.initializeCallbacks('chart1');
      const counts = manager.getChartCallbacks('chart1');
      
      expect(counts.onClick).toBe(1);
    });

    test('should handle multiple charts', () => {
      manager.initializeCallbacks('chart1');
      manager.initializeCallbacks('chart2');
      
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart2', 'onHover', jest.fn());
      
      expect(manager.getChartCallbacks('chart1')).toEqual({ onClick: 1 });
      expect(manager.getChartCallbacks('chart2')).toEqual({ onHover: 1 });
    });
  });

  describe('Callback Registration', () => {
    test('should register a callback', () => {
      const callback = jest.fn();
      const id = manager.registerCallback('chart1', 'onClick', callback);
      
      expect(id).toMatch(/^callback_\d+$/);
      expect(manager.hasCallback('chart1', id)).toBe(true);
    });

    test('should register multiple callbacks for same event', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onClick', jest.fn());
      
      const counts = manager.getChartCallbacks('chart1');
      expect(counts.onClick).toBe(3);
    });

    test('should register callbacks for different events', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onHover', jest.fn());
      manager.registerCallback('chart1', 'onDragStart', jest.fn());
      
      const counts = manager.getChartCallbacks('chart1');
      expect(counts).toEqual({
        onClick: 1,
        onHover: 1,
        onDragStart: 1
      });
    });

    test('should auto-initialize chart if needed', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      expect(manager.hasCallback('chart1', id)).toBe(true);
    });

    test('should accept callback options', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn(), {
        priority: 10,
        throttle: 100,
        debounce: 200,
        datasetFilter: [0, 1],
        enabled: false,
        metadata: { custom: 'data' }
      });
      
      const callback = manager.getCallback('chart1', id);
      expect(callback).not.toBeNull();
      expect(callback!.options.priority).toBe(10);
      expect(callback!.options.throttle).toBe(100);
      expect(callback!.options.debounce).toBe(200);
      expect(callback!.options.datasetFilter).toEqual([0, 1]);
      expect(callback!.options.enabled).toBe(false);
      expect(callback!.options.metadata).toEqual({ custom: 'data' });
    });
  });

  describe('Callback Unregistration', () => {
    test('should unregister a callback', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      expect(manager.hasCallback('chart1', id)).toBe(true);
      
      const result = manager.unregisterCallback('chart1', id);
      expect(result).toBe(true);
      expect(manager.hasCallback('chart1', id)).toBe(false);
    });

    test('should return false for non-existent callback', () => {
      const result = manager.unregisterCallback('chart1', 'nonexistent');
      expect(result).toBe(false);
    });

    test('should unregister all callbacks for an event', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onHover', jest.fn());
      
      manager.unregisterEventCallbacks('chart1', 'onClick');
      
      const counts = manager.getChartCallbacks('chart1');
      expect(counts.onClick).toBeUndefined();
      expect(counts.onHover).toBe(1);
    });
  });

  describe('Callback Enable/Disable', () => {
    test('should enable a callback', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn(), { enabled: false });
      
      expect(manager.isCallbackEnabled('chart1', id)).toBe(false);
      
      manager.enableCallback('chart1', id);
      expect(manager.isCallbackEnabled('chart1', id)).toBe(true);
    });

    test('should disable a callback', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      expect(manager.isCallbackEnabled('chart1', id)).toBe(true);
      
      manager.disableCallback('chart1', id);
      expect(manager.isCallbackEnabled('chart1', id)).toBe(false);
    });

    test('should default to enabled', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      expect(manager.isCallbackEnabled('chart1', id)).toBe(true);
    });

    test('should return false for non-existent callback', () => {
      expect(manager.isCallbackEnabled('chart1', 'nonexistent')).toBe(false);
    });
  });

  describe('Callback Execution', () => {
    test('should execute callback on event trigger', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onClick', callback);
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(callback).toHaveBeenCalledWith(mockContext);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should execute multiple callbacks in priority order', async () => {
      const executionOrder: number[] = [];
      
      const callback1 = jest.fn(() => { executionOrder.push(1); });
      const callback2 = jest.fn(() => { executionOrder.push(2); });
      const callback3 = jest.fn(() => { executionOrder.push(3); });
      
      manager.registerCallback('chart1', 'onClick', callback1, { priority: 1 });
      manager.registerCallback('chart1', 'onClick', callback2, { priority: 10 });
      manager.registerCallback('chart1', 'onClick', callback3, { priority: 5 });
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(executionOrder).toEqual([2, 3, 1]); // Priority 10, 5, 1
    });

    test('should not execute disabled callbacks', async () => {
      const callback = jest.fn();
      const id = manager.registerCallback('chart1', 'onClick', callback);
      
      manager.disableCallback('chart1', id);
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle non-existent chart', async () => {
      await expect(
        manager.triggerEvent('nonexistent', 'onClick', mockContext)
      ).resolves.not.toThrow();
    });
  });

  describe('Dataset Filtering', () => {
    test('should only execute callbacks for filtered datasets', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      manager.registerCallback('chart1', 'onClick', callback1, { datasetFilter: [0] });
      manager.registerCallback('chart1', 'onClick', callback2, { datasetFilter: [1] });
      
      // Context has dataset index 0
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('should execute all callbacks if no filter', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onClick', callback); // No filter
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Throttling', () => {
    test('should throttle callback execution', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onHover', callback, { throttle: 100 });
      
      // First call - should execute
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Second call immediately - should be throttled
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Advance time past throttle period
      jest.advanceTimersByTime(101);
      
      // Third call - should execute
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Debouncing', () => {
    test('should debounce callback execution', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onHover', callback, { debounce: 100 });
      
      // Trigger multiple times rapidly
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      
      // Should not execute yet
      expect(callback).not.toHaveBeenCalled();
      
      // Advance time past debounce period
      jest.advanceTimersByTime(101);
      
      // Should execute once
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should reset debounce timer on new events', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onHover', callback, { debounce: 100 });
      
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      jest.advanceTimersByTime(50);
      
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      jest.advanceTimersByTime(50);
      
      // Should not execute yet (timer reset)
      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(51);
      
      // Now should execute
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should clear debounce timer on disable', async () => {
      const callback = jest.fn();
      const id = manager.registerCallback('chart1', 'onHover', callback, { debounce: 100 });
      
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      
      manager.disableCallback('chart1', id);
      
      jest.advanceTimersByTime(101);
      
      // Should not execute
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Callback Queries', () => {
    test('should get callback by ID', () => {
      const callback = jest.fn();
      const id = manager.registerCallback('chart1', 'onClick', callback, {
        priority: 5,
        metadata: { test: true }
      });
      
      const retrieved = manager.getCallback('chart1', id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.callback).toBe(callback);
      expect(retrieved!.options.priority).toBe(5);
      expect(retrieved!.options.metadata).toEqual({ test: true });
    });

    test('should return null for non-existent callback', () => {
      const retrieved = manager.getCallback('chart1', 'nonexistent');
      expect(retrieved).toBeNull();
    });

    test('should get active callback count', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onClick', jest.fn(), { enabled: false });
      manager.registerCallback('chart1', 'onClick', jest.fn());
      
      const activeCount = manager.getActiveCallbacks('chart1', 'onClick');
      expect(activeCount).toBe(2);
    });

    test('should return 0 for non-existent chart', () => {
      const activeCount = manager.getActiveCallbacks('nonexistent', 'onClick');
      expect(activeCount).toBe(0);
    });

    test('should get total callback count', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onHover', jest.fn());
      manager.registerCallback('chart2', 'onDrag', jest.fn());
      
      expect(manager.getTotalCallbacks()).toBe(3);
    });
  });

  describe('Callback Options Update', () => {
    test('should update callback priority', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn(), { priority: 1 });
      
      const result = manager.updateCallbackOptions('chart1', id, { priority: 10 });
      
      expect(result).toBe(true);
      
      const callback = manager.getCallback('chart1', id);
      expect(callback!.options.priority).toBe(10);
    });

    test('should update throttle', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      manager.updateCallbackOptions('chart1', id, { throttle: 500 });
      
      const callback = manager.getCallback('chart1', id);
      expect(callback!.options.throttle).toBe(500);
    });

    test('should update debounce and clear timer', async () => {
      const callback = jest.fn();
      const id = manager.registerCallback('chart1', 'onHover', callback, { debounce: 100 });
      
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      
      // Update debounce
      manager.updateCallbackOptions('chart1', id, { debounce: 200 });
      
      // Old timer should be cleared
      jest.advanceTimersByTime(101);
      expect(callback).not.toHaveBeenCalled();
    });

    test('should update dataset filter', () => {
      const id = manager.registerCallback('chart1', 'onClick', jest.fn());
      
      manager.updateCallbackOptions('chart1', id, { datasetFilter: [0, 2, 4] });
      
      const callback = manager.getCallback('chart1', id);
      expect(callback!.options.datasetFilter).toEqual([0, 2, 4]);
    });

    test('should return false for non-existent callback', () => {
      const result = manager.updateCallbackOptions('chart1', 'nonexistent', { priority: 5 });
      expect(result).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should clear all callbacks for a chart', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart1', 'onHover', jest.fn());
      manager.registerCallback('chart2', 'onDrag', jest.fn());
      
      manager.clearChartCallbacks('chart1');
      
      expect(manager.getChartCallbacks('chart1')).toEqual({});
      expect(manager.getChartCallbacks('chart2')).toEqual({ onDrag: 1 });
    });

    test('should clear all callbacks', () => {
      manager.registerCallback('chart1', 'onClick', jest.fn());
      manager.registerCallback('chart2', 'onHover', jest.fn());
      manager.registerCallback('chart3', 'onDrag', jest.fn());
      
      manager.clearAll();
      
      expect(manager.getTotalCallbacks()).toBe(0);
    });

    test('should clear debounce timers on cleanup', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onHover', callback, { debounce: 100 });
      
      await manager.triggerEvent('chart1', 'onHover', mockContext);
      
      manager.clearChartCallbacks('chart1');
      
      jest.advanceTimersByTime(101);
      
      // Should not execute
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Context Helper', () => {
    test('should create callback context', () => {
      const context = createCallbackContext(
        'chart1',
        'line',
        mockChartData,
        0,
        1,
        100,
        200,
        300,
        400
      );
      
      expect(context.point).toEqual({ x: 100, y: 200, canvasX: 300, canvasY: 400 });
      expect(context.dataset.index).toBe(0);
      expect(context.dataset.label).toBe('Dataset 1');
      expect(context.value).toBe(20);
      expect(context.dataIndex).toBe(1);
      expect(context.chart.id).toBe('chart1');
      expect(context.chart.type).toBe('line');
    });

    test('should include original event', () => {
      const mockEvent = new MouseEvent('click');
      
      const context = createCallbackContext(
        'chart1',
        'bar',
        mockChartData,
        0,
        0,
        0,
        0,
        0,
        0,
        mockEvent
      );
      
      expect(context.originalEvent).toBe(mockEvent);
    });

    test('should include metadata', () => {
      const metadata = { custom: 'data', value: 123 };
      
      const context = createCallbackContext(
        'chart1',
        'bar',
        mockChartData,
        0,
        0,
        0,
        0,
        0,
        0,
        undefined,
        metadata
      );
      
      expect(context.metadata).toEqual(metadata);
    });
  });

  describe('Edge Cases', () => {
    test('should handle async callbacks', async () => {
      const callback = jest.fn(async () => {
        // Async operation that returns Promise<void>
        return Promise.resolve();
      });
      
      manager.registerCallback('chart1', 'onClick', callback);
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(callback).toHaveBeenCalled();
    });

    test('should handle callbacks with same priority', async () => {
      const executionOrder: number[] = [];
      
      const callback1 = jest.fn(() => { executionOrder.push(1); });
      const callback2 = jest.fn(() => { executionOrder.push(2); });
      
      manager.registerCallback('chart1', 'onClick', callback1, { priority: 5 });
      manager.registerCallback('chart1', 'onClick', callback2, { priority: 5 });
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(executionOrder).toHaveLength(2);
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
    });

    test('should handle empty dataset filter as no filter', async () => {
      const callback = jest.fn();
      manager.registerCallback('chart1', 'onClick', callback, { datasetFilter: [] });
      
      await manager.triggerEvent('chart1', 'onClick', mockContext);
      
      expect(callback).toHaveBeenCalled();
    });

    test('should not throw on unregistering from non-existent chart', () => {
      expect(() => {
        manager.unregisterCallback('nonexistent', 'callback_0');
      }).not.toThrow();
    });

    test('should handle getting callbacks from non-existent chart', () => {
      const counts = manager.getChartCallbacks('nonexistent');
      expect(counts).toEqual({});
    });
  });
});
