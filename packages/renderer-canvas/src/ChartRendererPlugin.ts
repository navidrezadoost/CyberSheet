/**
 * ChartRendererPlugin.ts
 * 
 * Plugin architecture for custom chart renderers, allowing developers to extend
 * the chart system with custom chart types and rendering logic.
 * 
 * Features:
 * - Plugin registration and lifecycle management
 * - Custom chart type support
 * - Rendering hooks (before/after)
 * - Data transformation pipeline
 * - Context injection
 * - Priority-based execution order
 */

import type { ChartData, ChartOptions } from './ChartEngine';

/**
 * Rendering context passed to plugins
 */
export interface RenderContext {
  /** Canvas 2D context */
  ctx: CanvasRenderingContext2D;
  
  /** Canvas width */
  width: number;
  
  /** Canvas height */
  height: number;
  
  /** Chart data */
  data: ChartData;
  
  /** Chart options */
  options: ChartOptions;
  
  /** Chart bounds */
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  
  /** Scale information */
  scales?: {
    x?: { min: number; max: number; range: number };
    y?: { min: number; max: number; range: number };
  };
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycleHooks {
  /** Called before chart initialization */
  beforeInit?: (context: RenderContext) => void | Promise<void>;
  
  /** Called after chart initialization */
  afterInit?: (context: RenderContext) => void | Promise<void>;
  
  /** Called before rendering starts */
  beforeRender?: (context: RenderContext) => boolean | void | Promise<boolean | void>;
  
  /** Called after rendering completes */
  afterRender?: (context: RenderContext) => void | Promise<void>;
  
  /** Called before data update */
  beforeDataUpdate?: (context: RenderContext, newData: ChartData) => ChartData | void;
  
  /** Called after data update */
  afterDataUpdate?: (context: RenderContext) => void | Promise<void>;
  
  /** Called on chart resize */
  onResize?: (context: RenderContext, width: number, height: number) => void;
  
  /** Called on chart destroy */
  onDestroy?: (context: RenderContext) => void | Promise<void>;
}

/**
 * Custom chart renderer function
 */
export type CustomRenderer = (context: RenderContext) => void | Promise<void>;

/**
 * Plugin configuration
 */
export interface ChartRendererPluginConfig {
  /** Unique plugin ID */
  id: string;
  
  /** Plugin name */
  name: string;
  
  /** Plugin version */
  version?: string;
  
  /** Plugin description */
  description?: string;
  
  /** Chart types this plugin supports (empty = all types) */
  supportedChartTypes?: string[];
  
  /** Execution priority (higher = earlier execution) */
  priority?: number;
  
  /** Whether plugin is enabled by default */
  enabled?: boolean;
  
  /** Plugin lifecycle hooks */
  hooks?: PluginLifecycleHooks;
  
  /** Custom renderer function (for custom chart types) */
  renderer?: CustomRenderer;
  
  /** Data transformation function */
  transformData?: (data: ChartData, options: ChartOptions) => ChartData;
  
  /** Plugin-specific options */
  options?: Record<string, any>;
}

/**
 * Registered plugin information
 */
interface RegisteredPlugin {
  config: ChartRendererPluginConfig;
  isEnabled: boolean;
}

export class ChartRendererPluginManager {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private chartPlugins: Map<string, string[]> = new Map(); // chartId -> plugin IDs
  
  /**
   * Register a plugin
   */
  registerPlugin(config: ChartRendererPluginConfig): void {
    if (!config.id) {
      throw new Error('Plugin must have an ID');
    }
    
    if (this.plugins.has(config.id)) {
      throw new Error(`Plugin with ID '${config.id}' is already registered`);
    }
    
    const plugin: RegisteredPlugin = {
      config: {
        priority: 0,
        enabled: true,
        supportedChartTypes: [],
        ...config
      },
      isEnabled: config.enabled ?? true
    };
    
    this.plugins.set(config.id, plugin);
  }
  
  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    
    // Remove from all charts
    for (const [chartId, pluginIds] of this.chartPlugins.entries()) {
      const index = pluginIds.indexOf(pluginId);
      if (index !== -1) {
        pluginIds.splice(index, 1);
      }
    }
  }
  
  /**
   * Enable a plugin globally
   */
  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.isEnabled = true;
    }
  }
  
  /**
   * Disable a plugin globally
   */
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.isEnabled = false;
    }
  }
  
  /**
   * Attach plugins to a chart
   */
  attachPlugins(chartId: string, pluginIds: string[]): void {
    // Validate all plugins exist
    for (const id of pluginIds) {
      if (!this.plugins.has(id)) {
        throw new Error(`Plugin '${id}' is not registered`);
      }
    }
    
    this.chartPlugins.set(chartId, [...pluginIds]);
  }
  
  /**
   * Detach all plugins from a chart
   */
  detachPlugins(chartId: string): void {
    this.chartPlugins.delete(chartId);
  }
  
  /**
   * Get plugins for a chart, sorted by priority
   */
  private getChartPlugins(chartId: string, chartType?: string): RegisteredPlugin[] {
    const pluginIds = this.chartPlugins.get(chartId) || [];
    
    const plugins = pluginIds
      .map(id => this.plugins.get(id))
      .filter((p): p is RegisteredPlugin => {
        if (!p || !p.isEnabled) return false;
        
        // Check if plugin supports this chart type
        const supportedTypes = p.config.supportedChartTypes || [];
        if (supportedTypes.length === 0) return true; // Supports all types
        
        return chartType ? supportedTypes.includes(chartType) : true;
      });
    
    // Sort by priority (descending)
    return plugins.sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));
  }
  
  /**
   * Execute beforeInit hooks
   */
  async executeBeforeInit(chartId: string, context: RenderContext): Promise<void> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.beforeInit) {
        await plugin.config.hooks.beforeInit(context);
      }
    }
  }
  
  /**
   * Execute afterInit hooks
   */
  async executeAfterInit(chartId: string, context: RenderContext): Promise<void> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.afterInit) {
        await plugin.config.hooks.afterInit(context);
      }
    }
  }
  
  /**
   * Execute beforeRender hooks
   * Returns false if rendering should be cancelled
   */
  async executeBeforeRender(chartId: string, context: RenderContext): Promise<boolean> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.beforeRender) {
        const result = await plugin.config.hooks.beforeRender(context);
        if (result === false) {
          return false; // Cancel rendering
        }
      }
    }
    
    return true;
  }
  
  /**
   * Execute custom renderers
   */
  async executeCustomRenderers(chartId: string, context: RenderContext): Promise<boolean> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    let rendered = false;
    
    for (const plugin of plugins) {
      if (plugin.config.renderer) {
        await plugin.config.renderer(context);
        rendered = true;
      }
    }
    
    return rendered;
  }
  
  /**
   * Execute afterRender hooks
   */
  async executeAfterRender(chartId: string, context: RenderContext): Promise<void> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.afterRender) {
        await plugin.config.hooks.afterRender(context);
      }
    }
  }
  
  /**
   * Execute beforeDataUpdate hooks
   */
  executeBeforeDataUpdate(chartId: string, context: RenderContext, newData: ChartData): ChartData {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    let transformedData = newData;
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.beforeDataUpdate) {
        const result = plugin.config.hooks.beforeDataUpdate(context, transformedData);
        if (result) {
          transformedData = result;
        }
      }
    }
    
    return transformedData;
  }
  
  /**
   * Execute afterDataUpdate hooks
   */
  async executeAfterDataUpdate(chartId: string, context: RenderContext): Promise<void> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.afterDataUpdate) {
        await plugin.config.hooks.afterDataUpdate(context);
      }
    }
  }
  
  /**
   * Execute onResize hooks
   */
  executeOnResize(chartId: string, context: RenderContext, width: number, height: number): void {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.onResize) {
        plugin.config.hooks.onResize(context, width, height);
      }
    }
  }
  
  /**
   * Execute onDestroy hooks
   */
  async executeOnDestroy(chartId: string, context: RenderContext): Promise<void> {
    const plugins = this.getChartPlugins(chartId, context.options.type);
    
    for (const plugin of plugins) {
      if (plugin.config.hooks?.onDestroy) {
        await plugin.config.hooks.onDestroy(context);
      }
    }
    
    // Clean up chart plugin associations
    this.detachPlugins(chartId);
  }
  
  /**
   * Transform data through all registered transformers
   */
  transformData(chartId: string, data: ChartData, options: ChartOptions): ChartData {
    const plugins = this.getChartPlugins(chartId, options.type);
    let transformedData = data;
    
    for (const plugin of plugins) {
      if (plugin.config.transformData) {
        transformedData = plugin.config.transformData(transformedData, options);
      }
    }
    
    return transformedData;
  }
  
  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): ChartRendererPluginConfig | null {
    return this.plugins.get(pluginId)?.config ?? null;
  }
  
  /**
   * Get all registered plugins
   */
  getAllPlugins(): ChartRendererPluginConfig[] {
    return Array.from(this.plugins.values()).map(p => p.config);
  }
  
  /**
   * Get plugins attached to a chart
   */
  getChartPluginIds(chartId: string): string[] {
    return this.chartPlugins.get(chartId) || [];
  }
  
  /**
   * Check if a plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }
  
  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.isEnabled ?? false;
  }
  
  /**
   * Clear all plugins
   */
  clearAll(): void {
    this.plugins.clear();
    this.chartPlugins.clear();
  }
  
  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }
}

/**
 * Create a simple plugin helper
 */
export function createPlugin(config: ChartRendererPluginConfig): ChartRendererPluginConfig {
  return config;
}
