/**
 * chart-renderer-plugin.test.ts
 * 
 * Tests for ChartRendererPluginManager
 */

import { ChartRendererPluginManager, createPlugin } from '../src/ChartRendererPlugin';
import type { ChartRendererPluginConfig, RenderContext } from '../src/ChartRendererPlugin';
import type { ChartData } from '../src/ChartEngine';

describe('ChartRendererPluginManager', () => {
  let manager: ChartRendererPluginManager;
  let mockContext: RenderContext;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    manager = new ChartRendererPluginManager();
    
    // Mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCtx = mockCanvas.getContext('2d')!;
    
    mockContext = {
      ctx: mockCtx,
      width: 800,
      height: 600,
      data: {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Data', data: [10, 20, 30] }]
      },
      options: {
        type: 'bar',
        width: 800,
        height: 600
      },
      bounds: {
        left: 50,
        top: 50,
        right: 750,
        bottom: 550,
        width: 700,
        height: 500
      }
    };
  });

  describe('Plugin Registration', () => {
    test('should register a plugin', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin'
      };
      
      manager.registerPlugin(plugin);
      
      expect(manager.hasPlugin('test-plugin')).toBe(true);
      expect(manager.getPluginCount()).toBe(1);
    });

    test('should throw error for plugin without ID', () => {
      const plugin = {
        name: 'No ID Plugin'
      } as any;
      
      expect(() => manager.registerPlugin(plugin)).toThrow('must have an ID');
    });

    test('should throw error for duplicate plugin ID', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'duplicate',
        name: 'Plugin 1'
      };
      
      manager.registerPlugin(plugin);
      
      expect(() => manager.registerPlugin(plugin)).toThrow('already registered');
    });

    test('should unregister a plugin', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin'
      };
      
      manager.registerPlugin(plugin);
      expect(manager.hasPlugin('test-plugin')).toBe(true);
      
      manager.unregisterPlugin('test-plugin');
      expect(manager.hasPlugin('test-plugin')).toBe(false);
    });

    test('should get plugin by ID', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0'
      };
      
      manager.registerPlugin(plugin);
      
      const retrieved = manager.getPlugin('test-plugin');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Plugin');
      expect(retrieved?.version).toBe('1.0.0');
    });

    test('should return null for non-existent plugin', () => {
      const retrieved = manager.getPlugin('nonexistent');
      expect(retrieved).toBeNull();
    });

    test('should get all plugins', () => {
      manager.registerPlugin({ id: 'plugin1', name: 'Plugin 1' });
      manager.registerPlugin({ id: 'plugin2', name: 'Plugin 2' });
      
      const plugins = manager.getAllPlugins();
      expect(plugins).toHaveLength(2);
    });
  });

  describe('Plugin Enable/Disable', () => {
    test('should enable a plugin', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        enabled: false
      };
      
      manager.registerPlugin(plugin);
      expect(manager.isPluginEnabled('test-plugin')).toBe(false);
      
      manager.enablePlugin('test-plugin');
      expect(manager.isPluginEnabled('test-plugin')).toBe(true);
    });

    test('should disable a plugin', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        enabled: true
      };
      
      manager.registerPlugin(plugin);
      expect(manager.isPluginEnabled('test-plugin')).toBe(true);
      
      manager.disablePlugin('test-plugin');
      expect(manager.isPluginEnabled('test-plugin')).toBe(false);
    });

    test('should default to enabled', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin'
      };
      
      manager.registerPlugin(plugin);
      expect(manager.isPluginEnabled('test-plugin')).toBe(true);
    });
  });

  describe('Chart Plugin Attachment', () => {
    test('should attach plugins to chart', () => {
      manager.registerPlugin({ id: 'plugin1', name: 'Plugin 1' });
      manager.registerPlugin({ id: 'plugin2', name: 'Plugin 2' });
      
      manager.attachPlugins('chart1', ['plugin1', 'plugin2']);
      
      const attachedIds = manager.getChartPluginIds('chart1');
      expect(attachedIds).toEqual(['plugin1', 'plugin2']);
    });

    test('should throw error for non-existent plugin', () => {
      expect(() => {
        manager.attachPlugins('chart1', ['nonexistent']);
      }).toThrow('not registered');
    });

    test('should detach plugins from chart', () => {
      manager.registerPlugin({ id: 'plugin1', name: 'Plugin 1' });
      manager.attachPlugins('chart1', ['plugin1']);
      
      expect(manager.getChartPluginIds('chart1')).toHaveLength(1);
      
      manager.detachPlugins('chart1');
      expect(manager.getChartPluginIds('chart1')).toHaveLength(0);
    });

    test('should return empty array for chart with no plugins', () => {
      const ids = manager.getChartPluginIds('nonexistent');
      expect(ids).toEqual([]);
    });
  });

  describe('Plugin Priority', () => {
    test('should execute plugins in priority order', async () => {
      const executionOrder: string[] = [];
      
      const plugin1: ChartRendererPluginConfig = {
        id: 'plugin1',
        name: 'Low Priority',
        priority: 1,
        hooks: {
          beforeRender: () => { executionOrder.push('plugin1'); }
        }
      };
      
      const plugin2: ChartRendererPluginConfig = {
        id: 'plugin2',
        name: 'High Priority',
        priority: 10,
        hooks: {
          beforeRender: () => { executionOrder.push('plugin2'); }
        }
      };
      
      manager.registerPlugin(plugin1);
      manager.registerPlugin(plugin2);
      manager.attachPlugins('chart1', ['plugin1', 'plugin2']);
      
      await manager.executeBeforeRender('chart1', mockContext);
      
      // Higher priority should execute first
      expect(executionOrder).toEqual(['plugin2', 'plugin1']);
    });
  });

  describe('Chart Type Support', () => {
    test('should only execute plugins for supported chart types', async () => {
      const barPluginExecuted = jest.fn();
      const linePluginExecuted = jest.fn();
      
      const barPlugin: ChartRendererPluginConfig = {
        id: 'bar-plugin',
        name: 'Bar Plugin',
        supportedChartTypes: ['bar'],
        hooks: {
          beforeRender: barPluginExecuted
        }
      };
      
      const linePlugin: ChartRendererPluginConfig = {
        id: 'line-plugin',
        name: 'Line Plugin',
        supportedChartTypes: ['line'],
        hooks: {
          beforeRender: linePluginExecuted
        }
      };
      
      manager.registerPlugin(barPlugin);
      manager.registerPlugin(linePlugin);
      manager.attachPlugins('chart1', ['bar-plugin', 'line-plugin']);
      
      // Context is for 'bar' chart
      await manager.executeBeforeRender('chart1', mockContext);
      
      expect(barPluginExecuted).toHaveBeenCalled();
      expect(linePluginExecuted).not.toHaveBeenCalled();
    });

    test('should execute plugins with no chart type restriction', async () => {
      const universalExecuted = jest.fn();
      
      const universalPlugin: ChartRendererPluginConfig = {
        id: 'universal-plugin',
        name: 'Universal Plugin',
        // No supportedChartTypes - works for all
        hooks: {
          beforeRender: universalExecuted
        }
      };
      
      manager.registerPlugin(universalPlugin);
      manager.attachPlugins('chart1', ['universal-plugin']);
      
      await manager.executeBeforeRender('chart1', mockContext);
      
      expect(universalExecuted).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Hooks', () => {
    test('should execute beforeInit hook', async () => {
      const beforeInit = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { beforeInit }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      await manager.executeBeforeInit('chart1', mockContext);
      
      expect(beforeInit).toHaveBeenCalledWith(mockContext);
    });

    test('should execute afterInit hook', async () => {
      const afterInit = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { afterInit }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      await manager.executeAfterInit('chart1', mockContext);
      
      expect(afterInit).toHaveBeenCalledWith(mockContext);
    });

    test('should execute beforeRender hook', async () => {
      const beforeRender = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { beforeRender }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      const shouldRender = await manager.executeBeforeRender('chart1', mockContext);
      
      expect(beforeRender).toHaveBeenCalled();
      expect(shouldRender).toBe(true);
    });

    test('should cancel rendering if beforeRender returns false', async () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: {
          beforeRender: () => false
        }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      const shouldRender = await manager.executeBeforeRender('chart1', mockContext);
      
      expect(shouldRender).toBe(false);
    });

    test('should execute afterRender hook', async () => {
      const afterRender = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { afterRender }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      await manager.executeAfterRender('chart1', mockContext);
      
      expect(afterRender).toHaveBeenCalledWith(mockContext);
    });

    test('should execute beforeDataUpdate hook', () => {
      const beforeDataUpdate = jest.fn((ctx, newData) => ({
        ...newData,
        labels: ['Modified']
      }));
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { beforeDataUpdate }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      const newData: ChartData = {
        labels: ['Original'],
        datasets: [{ label: 'Data', data: [1] }]
      };
      
      const result = manager.executeBeforeDataUpdate('chart1', mockContext, newData);
      
      expect(beforeDataUpdate).toHaveBeenCalled();
      expect(result.labels).toEqual(['Modified']);
    });

    test('should execute afterDataUpdate hook', async () => {
      const afterDataUpdate = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { afterDataUpdate }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      await manager.executeAfterDataUpdate('chart1', mockContext);
      
      expect(afterDataUpdate).toHaveBeenCalledWith(mockContext);
    });

    test('should execute onResize hook', () => {
      const onResize = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { onResize }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      manager.executeOnResize('chart1', mockContext, 1000, 800);
      
      expect(onResize).toHaveBeenCalledWith(mockContext, 1000, 800);
    });

    test('should execute onDestroy hook', async () => {
      const onDestroy = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        hooks: { onDestroy }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      await manager.executeOnDestroy('chart1', mockContext);
      
      expect(onDestroy).toHaveBeenCalledWith(mockContext);
      
      // Should also detach plugins
      expect(manager.getChartPluginIds('chart1')).toHaveLength(0);
    });
  });

  describe('Custom Renderers', () => {
    test('should execute custom renderer', async () => {
      const customRenderer = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'custom-chart',
        name: 'Custom Chart Renderer',
        renderer: customRenderer
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['custom-chart']);
      
      const rendered = await manager.executeCustomRenderers('chart1', mockContext);
      
      expect(customRenderer).toHaveBeenCalledWith(mockContext);
      expect(rendered).toBe(true);
    });

    test('should return false when no custom renderers', async () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin'
        // No renderer
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      const rendered = await manager.executeCustomRenderers('chart1', mockContext);
      
      expect(rendered).toBe(false);
    });
  });

  describe('Data Transformation', () => {
    test('should transform data through plugin', () => {
      const plugin: ChartRendererPluginConfig = {
        id: 'transformer',
        name: 'Data Transformer',
        transformData: (data) => ({
          ...data,
          labels: data.labels.map(l => l.toUpperCase())
        })
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['transformer']);
      
      const data: ChartData = {
        labels: ['a', 'b', 'c'],
        datasets: [{ label: 'Data', data: [1, 2, 3] }]
      };
      
      const transformed = manager.transformData('chart1', data, { type: 'bar', width: 800, height: 600 });
      
      expect(transformed.labels).toEqual(['A', 'B', 'C']);
    });

    test('should chain transformations', () => {
      const plugin1: ChartRendererPluginConfig = {
        id: 'transformer1',
        name: 'Transformer 1',
        priority: 2,
        transformData: (data) => ({
          ...data,
          labels: data.labels.map(l => `[${l}]`)
        })
      };
      
      const plugin2: ChartRendererPluginConfig = {
        id: 'transformer2',
        name: 'Transformer 2',
        priority: 1,
        transformData: (data) => ({
          ...data,
          labels: data.labels.map(l => l.toUpperCase())
        })
      };
      
      manager.registerPlugin(plugin1);
      manager.registerPlugin(plugin2);
      manager.attachPlugins('chart1', ['transformer1', 'transformer2']);
      
      const data: ChartData = {
        labels: ['a', 'b'],
        datasets: [{ label: 'Data', data: [1, 2] }]
      };
      
      const transformed = manager.transformData('chart1', data, { type: 'bar', width: 800, height: 600 });
      
      // Higher priority (plugin1) executes first: a -> [a] -> [A]
      expect(transformed.labels).toEqual(['[A]', '[B]']);
    });
  });

  describe('Plugin Helper', () => {
    test('should create plugin with helper', () => {
      const plugin = createPlugin({
        id: 'my-plugin',
        name: 'My Plugin',
        version: '1.0.0'
      });
      
      expect(plugin.id).toBe('my-plugin');
      expect(plugin.name).toBe('My Plugin');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('Cleanup', () => {
    test('should clear all plugins', () => {
      manager.registerPlugin({ id: 'plugin1', name: 'Plugin 1' });
      manager.registerPlugin({ id: 'plugin2', name: 'Plugin 2' });
      manager.attachPlugins('chart1', ['plugin1']);
      
      expect(manager.getPluginCount()).toBe(2);
      expect(manager.getChartPluginIds('chart1')).toHaveLength(1);
      
      manager.clearAll();
      
      expect(manager.getPluginCount()).toBe(0);
      expect(manager.getChartPluginIds('chart1')).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle unregistering non-existent plugin', () => {
      expect(() => manager.unregisterPlugin('nonexistent')).not.toThrow();
    });

    test('should handle enabling non-existent plugin', () => {
      expect(() => manager.enablePlugin('nonexistent')).not.toThrow();
    });

    test('should handle disabling non-existent plugin', () => {
      expect(() => manager.disablePlugin('nonexistent')).not.toThrow();
    });

    test('should not execute disabled plugins', async () => {
      const hook = jest.fn();
      
      const plugin: ChartRendererPluginConfig = {
        id: 'test-plugin',
        name: 'Test Plugin',
        enabled: false,
        hooks: { beforeRender: hook }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['test-plugin']);
      
      await manager.executeBeforeRender('chart1', mockContext);
      
      expect(hook).not.toHaveBeenCalled();
    });

    test('should handle multiple plugins with same priority', async () => {
      const executionOrder: string[] = [];
      
      const plugin1: ChartRendererPluginConfig = {
        id: 'plugin1',
        name: 'Plugin 1',
        priority: 5,
        hooks: {
          beforeRender: () => { executionOrder.push('plugin1'); }
        }
      };
      
      const plugin2: ChartRendererPluginConfig = {
        id: 'plugin2',
        name: 'Plugin 2',
        priority: 5, // Same priority
        hooks: {
          beforeRender: () => { executionOrder.push('plugin2'); }
        }
      };
      
      manager.registerPlugin(plugin1);
      manager.registerPlugin(plugin2);
      manager.attachPlugins('chart1', ['plugin1', 'plugin2']);
      
      await manager.executeBeforeRender('chart1', mockContext);
      
      // Both should execute (order not guaranteed for same priority)
      expect(executionOrder).toHaveLength(2);
      expect(executionOrder).toContain('plugin1');
      expect(executionOrder).toContain('plugin2');
    });

    test('should handle async hooks', async () => {
      const hook = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      const plugin: ChartRendererPluginConfig = {
        id: 'async-plugin',
        name: 'Async Plugin',
        hooks: { beforeInit: hook }
      };
      
      manager.registerPlugin(plugin);
      manager.attachPlugins('chart1', ['async-plugin']);
      
      await manager.executeBeforeInit('chart1', mockContext);
      
      expect(hook).toHaveBeenCalled();
    });
  });
});
