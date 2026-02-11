# Week 12 Day 7: Export & Performance - Usage Guide

Complete guide for using the chart export, performance monitoring, and caching systems.

## Table of Contents

1. [Chart Export System](#chart-export-system)
2. [Performance Monitoring](#performance-monitoring)
3. [Canvas Caching](#canvas-caching)
4. [Integration Examples](#integration-examples)
5. [Best Practices](#best-practices)

---

## Chart Export System

### Basic Exports

Export charts to various image formats:

```typescript
import { ChartExporter } from '@cyber-sheet/renderer-canvas';

// Export to PNG (supports transparency)
const pngResult = ChartExporter.exportToPNG(canvas, {
  quality: 0.95,
  backgroundColor: 'transparent',
  scale: 1.0
});

if (pngResult.success) {
  console.log('PNG exported:', pngResult.size, 'bytes');
  // Use pngResult.data (base64 data URL)
}

// Export to JPEG (smaller file size, no transparency)
const jpegResult = ChartExporter.exportToJPEG(canvas, {
  quality: 0.85,
  backgroundColor: '#ffffff'
});

// Export to WebP (modern format with better compression)
const webpResult = ChartExporter.exportToWebP(canvas, {
  quality: 0.90,
  backgroundColor: 'transparent'
});
```

### High-Resolution Exports

Create high-DPI exports for retina displays:

```typescript
// 2x resolution export
const result = ChartExporter.exportToPNG(canvas, {
  scale: 2.0,              // 2x resolution
  quality: 0.95,
  backgroundColor: 'white'
});

// 3x resolution for extremely high quality
const ultraHD = ChartExporter.exportToPNG(canvas, {
  scale: 3.0,
  quality: 1.0
});
```

### Clipboard Integration

Copy charts directly to clipboard:

```typescript
// Copy to clipboard
async function copyChart(canvas: HTMLCanvasElement) {
  try {
    const result = await ChartExporter.copyToClipboard(canvas, {
      format: 'png',
      scale: 2.0
    });
    
    if (result.success) {
      console.log('Copied to clipboard! Paste anywhere.');
    } else {
      console.error('Clipboard copy failed:', result.error);
    }
  } catch (error) {
    console.error('Clipboard not supported:', error);
  }
}

// Call when user clicks "Copy"
copyChart(myCanvas);
```

### Browser Downloads

Trigger file downloads:

```typescript
// Download PNG
ChartExporter.download(canvas, {
  format: 'png',
  filename: 'sales-chart-2024.png',
  scale: 2.0,
  backgroundColor: 'white'
});

// Download JPEG
ChartExporter.download(canvas, {
  format: 'jpeg',
  filename: 'report-chart.jpg',
  quality: 0.90
});
```

### SVG Export

Export SVG-based charts:

```typescript
const svgElement = document.querySelector('svg.chart');

const svgResult = ChartExporter.exportToSVG(svgElement, {
  prettyPrint: true,
  includeXmlDeclaration: true,
  inlineStyles: true
});

if (svgResult.success) {
  // Download SVG file
  ChartExporter.downloadSVG(svgElement, {
    filename: 'chart.svg',
    prettyPrint: true
  });
}
```

### Format Detection

Check browser support for formats:

```typescript
// Check if WebP is supported
if (ChartExporter.isFormatSupported('webp')) {
  // Use WebP for best compression
  ChartExporter.exportToWebP(canvas);
} else {
  // Fallback to PNG
  ChartExporter.exportToPNG(canvas);
}

// Get all supported formats
const formats = ChartExporter.getSupportedFormats();
console.log('Supported formats:', formats); // ['png', 'jpeg', 'webp']
```

---

## Performance Monitoring

### Basic Measurement

Track operation duration:

```typescript
import { PerformanceMonitor } from '@cyber-sheet/renderer-canvas';

// Start measurement
const id = PerformanceMonitor.start('render-chart', {
  dataPoints: 1000,
  canvasSize: '800x600'
});

// Perform operation
renderChart(data, options);

// End measurement
const metrics = PerformanceMonitor.end(id, {
  chartType: 'line'
});

if (metrics) {
  console.log(`Render took ${metrics.duration.toFixed(2)}ms`);
  console.log(`Memory delta: ${metrics.memoryDelta} bytes`);
}
```

### Automatic Measurement

Wrap functions for automatic timing:

```typescript
// Measure synchronous function
const { result, metrics } = await PerformanceMonitor.measure(
  'calculate-trendline',
  () => TrendlineCalculator.linear(data)
);

console.log('Calculation result:', result);
console.log('Took:', metrics?.duration, 'ms');

// Measure async function
const { result: exported, metrics: exportMetrics } = await PerformanceMonitor.measure(
  'export-png',
  async () => {
    const canvas = await renderChartAsync(data);
    return ChartExporter.exportToPNG(canvas);
  }
);
```

### Benchmarking

Run performance benchmarks:

```typescript
// Benchmark rendering performance
const benchmark = await PerformanceMonitor.benchmark(
  'render-1000-points',
  () => engine.render(data1000, options),
  100  // 100 iterations
);

console.log('Benchmark Results:');
console.log(`  Average: ${benchmark.averageDuration.toFixed(2)}ms`);
console.log(`  Min: ${benchmark.minDuration.toFixed(2)}ms`);
console.log(`  Max: ${benchmark.maxDuration.toFixed(2)}ms`);
console.log(`  Median: ${benchmark.medianDuration.toFixed(2)}ms`);
console.log(`  Std Dev: ${benchmark.standardDeviation.toFixed(2)}ms`);
console.log(`  Throughput: ${benchmark.operationsPerSecond.toFixed(0)} ops/sec`);
```

### Threshold Monitoring

Set performance thresholds:

```typescript
// Set thresholds for chart rendering
PerformanceMonitor.setThresholds('render-chart', {
  warning: 50,   // Warn if > 50ms
  critical: 100  // Critical if > 100ms
});

// Render will automatically check thresholds
const id = PerformanceMonitor.start('render-chart');
renderChart(data, options);
const metrics = PerformanceMonitor.end(id);

// Console warnings automatically displayed:
// ⚠️ Warning: render-chart took 75.2ms (threshold: 50ms)
// 🚨 Critical: render-chart took 125.5ms (threshold: 100ms)
```

### Performance Reports

Generate performance reports:

```typescript
// Text report
const report = PerformanceMonitor.generateReport();
console.log(report);
/* Output:
Performance Report
==================
render-chart: 12 runs, avg 45.3ms
export-png: 5 runs, avg 23.1ms
calculate-trendline: 8 runs, avg 12.5ms
*/

// Summary statistics
const summary = PerformanceMonitor.getSummary();
console.log(summary);
/* Output:
{
  'render-chart': {
    count: 12,
    average: 45.3,
    total: 543.6,
    min: 38.2,
    max: 62.1
  },
  ...
}
*/

// Export as JSON
const jsonReport = PerformanceMonitor.exportJSON();
// Save to file or send to analytics

// Export as CSV
const csvReport = PerformanceMonitor.exportCSV();
// Import into Excel or analytics tools
```

### Enable/Disable Monitoring

Control monitoring in production:

```typescript
// Disable monitoring in production
if (process.env.NODE_ENV === 'production') {
  PerformanceMonitor.disable();
}

// Enable for debugging
if (DEBUG_MODE) {
  PerformanceMonitor.enable();
}

// Check status
if (PerformanceMonitor.isEnabled()) {
  console.log('Performance monitoring active');
}
```

---

## Canvas Caching

### Basic Caching

Cache rendered canvases to avoid re-rendering:

```typescript
import { CanvasCache, globalCanvasCache } from '@cyber-sheet/renderer-canvas';

// Create custom cache
const cache = new CanvasCache({
  maxEntries: 50,
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 5 * 60 * 1000          // 5 minutes
});

// Generate cache key
const key = CanvasCache.generateKey('chart', chartType, data, options);

// Try to get from cache
let canvas = cache.get(key);

if (!canvas) {
  // Cache miss - render chart
  console.log('Cache miss - rendering...');
  canvas = renderChart(data, options);
  cache.set(key, canvas);
} else {
  console.log('Cache hit!');
}
```

### Using Global Cache

Use the pre-configured global cache:

```typescript
import { globalCanvasCache } from '@cyber-sheet/renderer-canvas';

function renderLegend(options: LegendOptions): HTMLCanvasElement {
  const key = CanvasCache.generateKey('legend', options);
  
  // Check cache first
  let canvas = globalCanvasCache.get(key);
  
  if (!canvas) {
    // Render and cache
    canvas = createLegendCanvas(options);
    globalCanvasCache.set(key, canvas);
  }
  
  return canvas;
}
```

### Cache Statistics

Monitor cache performance:

```typescript
// Get statistics
const stats = cache.getStats();

console.log('Cache Performance:');
console.log(`  Hits: ${stats.hits}`);
console.log(`  Misses: ${stats.misses}`);
console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`  Entries: ${stats.entries}`);
console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
console.log(`  Evictions: ${stats.evictions}`);

// Log periodically
setInterval(() => {
  const stats = cache.getStats();
  if (stats.hitRate < 0.7) {
    console.warn('Low cache hit rate:', stats.hitRate);
  }
}, 60000); // Every minute
```

### Cache Management

Manage cache entries:

```typescript
// Check if key exists
if (cache.has(key)) {
  console.log('Entry exists in cache');
}

// Delete specific entry
cache.delete(key);

// Clear entire cache
cache.clear();

// Get all keys
const keys = cache.keys();
console.log('Cached keys:', keys);

// Get entry details
const details = cache.getEntryDetails(key);
if (details.exists) {
  console.log(`Entry age: ${details.age}ms`);
  console.log(`Access count: ${details.accessCount}`);
  console.log(`Size: ${details.size} bytes`);
}
```

### Preloading

Preload cache with common items:

```typescript
// Preload common chart configurations
const commonKeys = [
  CanvasCache.generateKey('chart', 'line', smallData),
  CanvasCache.generateKey('chart', 'bar', smallData),
  CanvasCache.generateKey('legend', defaultOptions)
];

await cache.preload(commonKeys, (key) => {
  // Render function based on key
  return renderForKey(key);
});

console.log('Cache preloaded with common items');
```

### Clone Cached Canvas

Create independent copies:

```typescript
// Get clone (for modification)
const clone = cache.clone(key);

if (clone) {
  // Modify clone without affecting cached version
  const ctx = clone.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 10, 10);
}
```

---

## Integration Examples

### Complete Chart Workflow

Integrate export, monitoring, and caching:

```typescript
import { 
  ChartExporter, 
  PerformanceMonitor, 
  globalCanvasCache 
} from '@cyber-sheet/renderer-canvas';

class OptimizedChartRenderer {
  async renderAndExport(data: ChartData, options: ChartOptions) {
    // Generate cache key
    const cacheKey = CanvasCache.generateKey('chart', data, options);
    
    // Start performance monitoring
    const perfId = PerformanceMonitor.start('render-and-export', {
      dataPoints: data.length,
      chartType: options.type
    });
    
    // Try cache first
    let canvas = globalCanvasCache.get(cacheKey);
    
    if (!canvas) {
      console.log('Rendering chart...');
      
      // Measure render time
      const { result: renderedCanvas } = await PerformanceMonitor.measure(
        'render-chart',
        () => this.renderChart(data, options)
      );
      
      canvas = renderedCanvas;
      globalCanvasCache.set(cacheKey, canvas);
    }
    
    // Export with monitoring
    const { result: exported } = await PerformanceMonitor.measure(
      'export-png',
      () => ChartExporter.exportToPNG(canvas!, {
        scale: 2.0,
        quality: 0.95,
        backgroundColor: 'white'
      })
    );
    
    // End overall monitoring
    const metrics = PerformanceMonitor.end(perfId);
    
    // Log performance
    console.log(`Total time: ${metrics?.duration}ms`);
    console.log(`Cache hit rate: ${globalCanvasCache.getStats().hitRate}`);
    
    return exported;
  }
  
  private renderChart(data: ChartData, options: ChartOptions): HTMLCanvasElement {
    // Your chart rendering logic
    const canvas = document.createElement('canvas');
    // ... render chart ...
    return canvas;
  }
}
```

### Performance Dashboard

Monitor all chart operations:

```typescript
class PerformanceDashboard {
  private updateInterval: number;
  
  start() {
    // Set performance thresholds
    PerformanceMonitor.setThresholds('render-chart', {
      warning: 50,
      critical: 100
    });
    
    PerformanceMonitor.setThresholds('export-png', {
      warning: 30,
      critical: 60
    });
    
    // Update dashboard every 5 seconds
    this.updateInterval = window.setInterval(() => {
      this.update();
    }, 5000);
  }
  
  update() {
    // Get performance summary
    const summary = PerformanceMonitor.getSummary();
    
    // Get cache stats
    const cacheStats = globalCanvasCache.getStats();
    
    // Display in UI
    this.displayMetrics({
      performance: summary,
      cache: cacheStats
    });
  }
  
  stop() {
    clearInterval(this.updateInterval);
  }
  
  private displayMetrics(metrics: any) {
    console.log('=== Performance Dashboard ===');
    console.log(PerformanceMonitor.generateReport());
    console.log('\nCache Statistics:');
    console.log(`  Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`  Entries: ${metrics.cache.entries}`);
    console.log(`  Memory: ${(metrics.cache.size / 1024 / 1024).toFixed(2)}MB`);
  }
}

// Usage
const dashboard = new PerformanceDashboard();
dashboard.start();
```

### Export with Progress Tracking

Track export progress:

```typescript
async function exportWithProgress(
  charts: HTMLCanvasElement[], 
  onProgress: (percent: number) => void
) {
  const total = charts.length;
  const results: ExportResult[] = [];
  
  for (let i = 0; i < total; i++) {
    const canvas = charts[i];
    
    // Measure export time
    const { result, metrics } = await PerformanceMonitor.measure(
      `export-chart-${i}`,
      () => ChartExporter.exportToPNG(canvas, {
        scale: 2.0,
        quality: 0.95
      })
    );
    
    results.push(result);
    
    // Update progress
    const percent = ((i + 1) / total) * 100;
    onProgress(percent);
    
    console.log(`Exported chart ${i + 1}/${total} in ${metrics?.duration}ms`);
  }
  
  // Generate performance report
  console.log('\nExport Performance Summary:');
  console.log(PerformanceMonitor.generateReport());
  
  return results;
}

// Usage
await exportWithProgress(myCharts, (percent) => {
  console.log(`Export progress: ${percent.toFixed(1)}%`);
});
```

---

## Best Practices

### 1. Cache Strategy

```typescript
// ✅ Good: Cache static elements
const legendKey = CanvasCache.generateKey('legend', options);
const legend = globalCanvasCache.get(legendKey) || renderLegend(options);

// ❌ Bad: Don't cache dynamic data
// const chartKey = CanvasCache.generateKey('chart', liveData); // Changes frequently
```

### 2. Performance Monitoring

```typescript
// ✅ Good: Monitor critical operations
const id = PerformanceMonitor.start('complex-render');
performComplexRender();
PerformanceMonitor.end(id);

// ❌ Bad: Don't monitor trivial operations
// const id = PerformanceMonitor.start('add-numbers'); // Too granular
// const sum = a + b;
// PerformanceMonitor.end(id);
```

### 3. Export Quality

```typescript
// ✅ Good: Balance quality and file size
const result = ChartExporter.exportToPNG(canvas, {
  quality: 0.92,  // Good balance
  scale: 2.0      // Retina displays
});

// ❌ Bad: Maximum quality for everything
// const result = ChartExporter.exportToPNG(canvas, {
//   quality: 1.0,  // Unnecessarily large
//   scale: 3.0     // Overkill
// });
```

### 4. Memory Management

```typescript
// ✅ Good: Configure cache limits
const cache = new CanvasCache({
  maxEntries: 50,
  maxSize: 50 * 1024 * 1024,  // 50MB
  ttl: 5 * 60 * 1000           // 5 minutes
});

// ✅ Good: Monitor and clear when needed
if (cache.getStats().size > 40 * 1024 * 1024) {
  console.warn('Cache size high, consider clearing');
  cache.clear();
}
```

### 5. Error Handling

```typescript
// ✅ Good: Always check export results
const result = ChartExporter.exportToPNG(canvas);
if (!result.success) {
  console.error('Export failed:', result.error);
  showUserError('Failed to export chart');
  return;
}

// Use result.data...
```

### 6. Threshold Configuration

```typescript
// ✅ Good: Set realistic thresholds
PerformanceMonitor.setThresholds('render-chart', {
  warning: 50,   // Noticeable delay
  critical: 100  // User frustration
});

// ❌ Bad: Too strict thresholds
// PerformanceMonitor.setThresholds('render-chart', {
//   warning: 1,   // Unrealistic
//   critical: 5   // Will always trigger
// });
```

### 7. Production Optimization

```typescript
// Disable monitoring in production if not needed
if (process.env.NODE_ENV === 'production' && !DEBUG_MODE) {
  PerformanceMonitor.disable();
}

// Use appropriate cache sizes
const cacheConfig = process.env.NODE_ENV === 'production'
  ? { maxEntries: 100, maxSize: 100 * 1024 * 1024 }  // Production
  : { maxEntries: 10, maxSize: 10 * 1024 * 1024 };   // Development
```

---

## Summary

Week 12 Day 7 provides three powerful systems:

1. **ChartExporter**: Export charts to PNG, JPEG, WebP, SVG, clipboard, or downloads
2. **PerformanceMonitor**: Track, benchmark, and optimize chart operations
3. **CanvasCache**: LRU cache to prevent redundant rendering

These systems work together to create a high-performance charting experience with excellent export capabilities.

### Test Results
- Export System: 36 tests ✅
- Performance Monitor: 23 tests ✅
- Canvas Cache: 24 tests ✅
- **Total: 83 tests passing** 🎯

### Coverage
- ChartExporter: 89.6% statements, 70.4% branches
- PerformanceMonitor: 92.2% statements, 58.1% branches
- CanvasCache: 98.8% statements, 100% branches
