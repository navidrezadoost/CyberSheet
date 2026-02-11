# ChartDataStreamManager API

Complete API reference for real-time data streaming in charts.

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The `ChartDataStreamManager` enables real-time data updates in charts with support for push/pull modes, circular buffering, data aggregation, and performance optimization.

**Key Features:**
- Push mode (manual data updates)
- Pull mode (interval-based polling)
- Circular buffer (automatic size management)
- Data aggregation (5 strategies)
- Pause/resume functionality
- Auto-start option
- Performance optimization
- Error handling

**Perfect For:**
- IoT sensor dashboards
- Live stock tickers
- Server monitoring
- Real-time analytics
- Social media feeds

---

## Installation

```typescript
import { ChartDataStreamManager } from '@cyber-sheet/renderer-canvas';

const streamManager = new ChartDataStreamManager();
```

---

## Quick Start

### Push Mode Example

```typescript
import { ChartDataStreamManager } from '@cyber-sheet/renderer-canvas';

const manager = new ChartDataStreamManager();

// Initialize push mode stream
manager.initializeStream('chart1', initialData, {
  mode: 'push',
  maxDataPoints: 50,
  onDataUpdate: (data) => {
    updateChart(data);  // Re-render chart
  }
});

// Push data manually
setInterval(() => {
  const newValue = fetchSensorReading();
  manager.pushData('chart1', newValue);
}, 1000);
```

### Pull Mode Example

```typescript
// Initialize pull mode stream
manager.initializeStream('chart1', initialData, {
  mode: 'pull',
  updateInterval: 1000,
  maxDataPoints: 100,
  pullData: async () => {
    return await fetchLatestData();
  },
  autoStart: true
});

// Stream starts automatically
// Stop when needed
manager.stopStream('chart1');
```

---

## Core Concepts

### Streaming Modes

#### Push Mode
You manually push data when available:
```typescript
{ mode: 'push' }

// Later:
manager.pushData('chart1', [10, 20, 30]);
```

**Use When:**
- Data arrives via WebSocket
- Event-driven updates
- You control timing

#### Pull Mode
Manager polls data at regular intervals:
```typescript
{
  mode: 'pull',
  updateInterval: 1000,
  pullData: async () => await fetchData()
}
```

**Use When:**
- Polling API endpoints
- Regular intervals needed
- Consistent update rhythm

### Circular Buffer

Automatically maintains maximum data points:

```typescript
{
  maxDataPoints: 50
}

// After 50 pushes, oldest data is removed
// Buffer size stays at 50 (FIFO)
```

**Benefits:**
- Prevents memory growth
- Maintains performance
- Shows recent data window

### Data Aggregation

Reduces high-frequency data:

```typescript
{
  enableAggregation: true,
  aggregationStrategy: 'average',
  aggregationWindow: 5000  // 5 seconds
}

// 1000 data points/sec → ~5 aggregated points/sec
```

**Strategies:**
- `average`: Mean of values
- `sum`: Total of values
- `min`: Minimum value
- `max`: Maximum value
- `last`: Most recent value

---

## API Reference

### Constructor

```typescript
constructor()
```

Creates a new stream manager instance.

**Example:**
```typescript
const manager = new ChartDataStreamManager();
```

---

### initializeStream()

```typescript
initializeStream(
  chartId: string,
  initialData: ChartData,
  config: StreamConfig
): void
```

Initializes a data stream for a chart.

**Parameters:**
- `chartId`: Unique chart identifier
- `initialData`: Initial chart data
- `config`: Stream configuration

**StreamConfig Interface:**
```typescript
interface StreamConfig {
  mode: 'push' | 'pull';
  maxDataPoints?: number;          // Default: 100
  updateInterval?: number;         // Pull mode only, ms
  pullData?: () => Promise<number[]> | number[];  // Pull mode
  onDataUpdate?: (data: ChartData) => void;
  onError?: (error: Error) => void;
  enableAggregation?: boolean;
  aggregationStrategy?: 'last' | 'average' | 'sum' | 'min' | 'max';
  aggregationWindow?: number;      // Milliseconds
  datasetIndex?: number;           // Target dataset, default: 0
  autoStart?: boolean;             // Pull mode, default: false
  pauseOnBlur?: boolean;           // Default: false
}
```

**Example:**
```typescript
manager.initializeStream('sensorChart', initialData, {
  mode: 'pull',
  maxDataPoints: 200,
  updateInterval: 500,
  pullData: async () => {
    const response = await fetch('/api/sensors/latest');
    return response.json();
  },
  onDataUpdate: (data) => {
    chartEngine.updateData(data);
    chartEngine.render();
  },
  onError: (error) => {
    console.error('Stream error:', error);
  },
  enableAggregation: true,
  aggregationStrategy: 'average',
  aggregationWindow: 2000,
  autoStart: true,
  pauseOnBlur: true
});
```

---

### startStream()

```typescript
startStream(chartId: string): void
```

Starts a stream (pull mode only).

**Example:**
```typescript
manager.startStream('chart1');
```

**Throws:** Error if chart doesn't exist or is already streaming

---

### stopStream()

```typescript
stopStream(chartId: string): void
```

Stops a stream and clears interval.

**Example:**
```typescript
manager.stopStream('chart1');
```

---

### pauseStream()

```typescript
pauseStream(chartId: string): void
```

Pauses streaming without stopping interval.

**Example:**
```typescript
manager.pauseStream('chart1');  // Interval continues, no data updates
```

---

### resumeStream()

```typescript
resumeStream(chartId: string): void
```

Resumes a paused stream.

**Example:**
```typescript
manager.resumeStream('chart1');
```

---

### pushData()

```typescript
pushData(
  chartId: string,
  values: number | number[],
  labels?: string | string[]
): void
```

Pushes new data points (push mode).

**Parameters:**
- `chartId`: Chart identifier
- `values`: Single value or array of values
- `labels`: Optional labels for data points

**Examples:**
```typescript
// Single value
manager.pushData('chart1', 42);

// Multiple values
manager.pushData('chart1', [10, 20, 30]);

// With labels
manager.pushData('chart1', [10, 20], ['10:00', '10:01']);

// Single with label
manager.pushData('chart1', 42, new Date().toISOString());
```

---

### getStreamStats()

```typescript
getStreamStats(chartId: string): StreamStats | null
```

Gets streaming statistics.

**Returns:**
```typescript
interface StreamStats {
  isActive: boolean;
  isPaused: boolean;
  lastUpdate: number;     // Timestamp
  updateCount: number;
}
```

**Example:**
```typescript
const stats = manager.getStreamStats('chart1');
if (stats) {
  console.log(`Active: ${stats.isActive}`);
  console.log(`Updates: ${stats.updateCount}`);
  console.log(`Last: ${new Date(stats.lastUpdate).toISOString()}`);
}
```

---

### clearBuffer()

```typescript
clearBuffer(chartId: string): void
```

Clears the data buffer without stopping stream.

**Example:**
```typescript
manager.clearBuffer('chart1');  // Reset buffer, keep streaming
```

---

### updateStreamConfig()

```typescript
updateStreamConfig(
  chartId: string,
  config: Partial<StreamConfig>
): void
```

Updates stream configuration at runtime.

**Example:**
```typescript
// Change update interval
manager.updateStreamConfig('chart1', {
  updateInterval: 2000  // Slow down to 2 seconds
});

// Change aggregation
manager.updateStreamConfig('chart1', {
  enableAggregation: true,
  aggregationStrategy: 'max'
});

// Change max points
manager.updateStreamConfig('chart1', {
  maxDataPoints: 500
});
```

---

### removeStream()

```typescript
removeStream(chartId: string): void
```

Removes stream and cleans up resources.

**Example:**
```typescript
manager.removeStream('chart1');
```

---

### clearAllStreams()

```typescript
clearAllStreams(): void
```

Removes all streams.

**Example:**
```typescript
manager.clearAllStreams();
```

---

### getActiveStreams()

```typescript
getActiveStreams(): string[]
```

Gets array of active stream IDs.

**Example:**
```typescript
const activeIds = manager.getActiveStreams();
console.log(`Active streams: ${activeIds.join(', ')}`);
```

---

## Examples

### Example 1: IoT Sensor Dashboard (Push Mode)

```typescript
const manager = new ChartDataStreamManager();

// Initialize WebSocket connection
const ws = new WebSocket('wss://iot-server.com/sensors');

manager.initializeStream('temperature', tempData, {
  mode: 'push',
  maxDataPoints: 100,
  onDataUpdate: (data) => {
    tempChart.updateData(data);
    tempChart.render();
  }
});

// Push data as it arrives
ws.onmessage = (event) => {
  const { temperature, timestamp } = JSON.parse(event.data);
  manager.pushData('temperature', temperature, timestamp);
};
```

### Example 2: Stock Ticker (Pull Mode + Aggregation)

```typescript
manager.initializeStream('stockPrice', stockData, {
  mode: 'pull',
  updateInterval: 100,  // Check every 100ms
  maxDataPoints: 300,
  pullData: async () => {
    const res = await fetch('/api/stock/AAPL/latest');
    const { price } = await res.json();
    return price;
  },
  enableAggregation: true,
  aggregationStrategy: 'average',
  aggregationWindow: 1000,  // Aggregate to 1-second intervals
  onDataUpdate: (data) => {
    stockChart.updateData(data);
  },
  autoStart: true
});
```

### Example 3: Server Monitoring (Multiple Metrics)

```typescript
// CPU Usage
manager.initializeStream('cpu', cpuData, {
  mode: 'pull',
  updateInterval: 1000,
  maxDataPoints: 60,  // 1 minute of data
  pullData: async () => {
    const res = await fetch('/api/metrics/cpu');
    return res.json();
  },
  datasetIndex: 0,
  autoStart: true
});

// Memory Usage (same chart)
manager.initializeStream('memory', cpuData, {
  mode: 'pull',
  updateInterval: 1000,
  maxDataPoints: 60,
  pullData: async () => {
    const res = await fetch('/api/metrics/memory');
    return res.json();
  },
  datasetIndex: 1,
  autoStart: true
});
```

### Example 4: Social Media Feed (Event-Driven)

```typescript
manager.initializeStream('engagement', feedData, {
  mode: 'push',
  maxDataPoints: 50,
  onDataUpdate: (data) => {
    engagementChart.updateData(data);
    updateStatistics(data);
  }
});

// Event handlers
document.addEventListener('post-liked', (e) => {
  manager.pushData('engagement', e.detail.likesCount, e.detail.timestamp);
});

document.addEventListener('post-shared', (e) => {
  manager.pushData('engagement', e.detail.sharesCount, e.detail.timestamp);
});
```

### Example 5: Pause on Window Blur

```typescript
manager.initializeStream('metrics', data, {
  mode: 'pull',
  updateInterval: 1000,
  pullData: fetchMetrics,
  pauseOnBlur: true,  // Auto-pause when window loses focus
  autoStart: true
});

// Stream pauses automatically when user switches tabs
// Resumes when user returns
```

### Example 6: Error Handling

```typescript
manager.initializeStream('api-data', data, {
  mode: 'pull',
  updateInterval: 5000,
  pullData: async () => {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  onDataUpdate: (data) => {
    chart.updateData(data);
    hideError();
  },
  onError: (error) => {
    console.error('Stream error:', error);
    showError(`Failed to fetch data: ${error.message}`);
    // Stream continues running, will retry on next interval
  },
  autoStart: true
});
```

### Example 7: Dynamic Configuration

```typescript
// Start with default config
manager.initializeStream('chart1', data, {
  mode: 'pull',
  updateInterval: 1000,
  pullData: fetchData,
  autoStart: true
});

// User changes refresh rate
document.getElementById('refreshRate').addEventListener('change', (e) => {
  const interval = parseInt(e.target.value);
  manager.updateStreamConfig('chart1', {
    updateInterval: interval
  });
});

// User toggles aggregation
document.getElementById('enableAgg').addEventListener('change', (e) => {
  manager.updateStreamConfig('chart1', {
    enableAggregation: e.target.checked,
    aggregationStrategy: 'average',
    aggregationWindow: 5000
  });
});
```

---

## Best Practices

### 1. Choose the Right Mode

```typescript
// ✅ Good: WebSocket → Push mode
ws.onmessage = (event) => {
  manager.pushData('chart1', event.data.value);
};

// ✅ Good: REST API → Pull mode
manager.initializeStream('chart1', data, {
  mode: 'pull',
  pullData: () => fetch('/api/data').then(r => r.json())
});

// ❌ Bad: Polling in push mode
setInterval(() => {
  fetch('/api/data').then(data => manager.pushData('chart1', data));
}, 1000);
// Use pull mode instead!
```

### 2. Set Appropriate Buffer Sizes

```typescript
// ✅ Good: Based on use case
maxDataPoints: 60     // 1 minute at 1 sec intervals
maxDataPoints: 300    // 5 minutes at 1 sec intervals
maxDataPoints: 1000   // High-frequency, short window

// ❌ Bad: Too large
maxDataPoints: 100000  // 100K points = memory issues + slow rendering
```

### 3. Use Aggregation for High-Frequency Data

```typescript
// ✅ Good: Aggregate 1000 points/sec to 10 points/sec
{
  enableAggregation: true,
  aggregationStrategy: 'average',
  aggregationWindow: 100  // 100ms window
}

// ❌ Bad: Render 1000 points/sec
// Browser will lag, chart will stutter
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good: Error handling
{
  onError: (error) => {
    console.error('Stream error:', error);
    showNotification('Data update failed, retrying...');
    trackError(error);
  }
}

// ❌ Bad: No error handling
// Errors silent, stream fails without notice
```

### 5. Clean Up Resources

```typescript
// ✅ Good: Clean up on unmount
function cleanup() {
  manager.stopStream('chart1');
  manager.removeStream('chart1');
}

// ❌ Bad: Leave streams running
// Memory leak, unnecessary API calls
```

### 6. Use Pause for User Control

```typescript
// ✅ Good: Let users pause
document.getElementById('pauseBtn').addEventListener('click', () => {
  if (isPaused) {
    manager.resumeStream('chart1');
  } else {
    manager.pauseStream('chart1');
  }
  isPaused = !isPaused;
});

// ✅ Good: Auto-pause on blur
{ pauseOnBlur: true }
```

---

## Troubleshooting

### Problem: Data not updating

**Symptoms:**
- Chart shows old data
- No updates visible

**Solutions:**

1. **Check if stream is started:**
```typescript
const stats = manager.getStreamStats('chart1');
console.log('Active:', stats?.isActive);

if (!stats?.isActive) {
  manager.startStream('chart1');
}
```

2. **Verify pull function:**
```typescript
pullData: async () => {
  const data = await fetchData();
  console.log('Pulled data:', data);  // Add logging
  return data;
}
```

3. **Check onDataUpdate callback:**
```typescript
onDataUpdate: (data) => {
  console.log('Data updated:', data);  // Verify callback fires
  chart.updateData(data);
  chart.render();  // Don't forget to render!
}
```

### Problem: Memory grows over time

**Symptoms:**
- Browser slows down
- High memory usage

**Solutions:**

1. **Set max data points:**
```typescript
{
  maxDataPoints: 100  // Limit buffer size
}
```

2. **Clean up old streams:**
```typescript
manager.removeStream('oldChart');
```

3. **Use aggregation:**
```typescript
{
  enableAggregation: true,
  aggregationWindow: 1000
}
```

### Problem: Chart stutters/lags

**Symptoms:**
- Choppy animation
- Delayed updates
- High CPU usage

**Solutions:**

1. **Reduce update frequency:**
```typescript
{
  updateInterval: 1000  // From 100ms to 1000ms
}
```

2. **Enable aggregation:**
```typescript
{
  enableAggregation: true,
  aggregationStrategy: 'average',
  aggregationWindow: 500
}
```

3. **Reduce buffer size:**
```typescript
{
  maxDataPoints: 50  // Show less data
}
```

4. **Throttle rendering:**
```typescript
let renderTimeout: number;
onDataUpdate: (data) => {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    chart.updateData(data);
    chart.render();
  }, 16);  // Max 60 FPS
}
```

### Problem: Aggregation not working

**Symptoms:**
- Too many data points
- No aggregation visible

**Solutions:**

1. **Verify configuration:**
```typescript
{
  enableAggregation: true,  // Must be true
  aggregationStrategy: 'average',
  aggregationWindow: 1000  // Must be set
}
```

2. **Check push frequency:**
```typescript
// Aggregation only triggers if multiple points in window
// Push at least 2 points per window for effect
```

### Problem: Pull mode not working

**Symptoms:**
- No data updates
- Errors in console

**Solutions:**

1. **Check pullData function:**
```typescript
pullData: async () => {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API Error');
    return await res.json();
  } catch (error) {
    console.error('Pull error:', error);
    return [];  // Return empty on error
  }
}
```

2. **Verify auto-start:**
```typescript
{
  autoStart: true  // Start immediately
}
// Or manually:
manager.startStream('chart1');
```

3. **Check update interval:**
```typescript
{
  updateInterval: 1000  // Must be > 0
}
```

---

## Performance Considerations

### Memory Usage
- Buffer: ~8 bytes per data point
- 100 points = 800 bytes
- 1000 points = 8 KB
- Use `maxDataPoints` to control

### CPU Usage
- Pull interval: ~0.5ms overhead per check
- Aggregation: ~5ms per 1000 points
- Update callback: Depends on your code

### Network Usage
- Pull mode: 1 request per interval
- Optimize with longer intervals
- Use aggregation to reduce server load

### Rendering Performance
- Chart rendering is your bottleneck
- Use aggregation to reduce points
- Throttle render calls
- Consider canvas caching

---

## TypeScript Types

```typescript
type StreamMode = 'push' | 'pull';
type AggregationStrategy = 'last' | 'average' | 'sum' | 'min' | 'max';

interface StreamConfig {
  mode: StreamMode;
  maxDataPoints?: number;
  updateInterval?: number;
  pullData?: () => Promise<number[]> | number[];
  onDataUpdate?: (data: ChartData) => void;
  onError?: (error: Error) => void;
  enableAggregation?: boolean;
  aggregationStrategy?: AggregationStrategy;
  aggregationWindow?: number;
  datasetIndex?: number;
  autoStart?: boolean;
  pauseOnBlur?: boolean;
}

interface StreamStats {
  isActive: boolean;
  isPaused: boolean;
  lastUpdate: number;
  updateCount: number;
}

interface TimestampedDataPoint {
  value: number;
  timestamp: number;
  label?: string;
}
```

---

## See Also

- [Dual Axes API](./DUAL_AXES_API.md) - Multi-scale charts
- [Renderer Plugins API](./RENDERER_PLUGINS_API.md) - Custom rendering
- [Data Callbacks API](./DATA_CALLBACKS_API.md) - User interactions
- [Chart Engine API](../CHART_ENGINE_API.md) - Core functionality

---

**Version:** 1.0.0  
**Last Updated:** February 4, 2026  
**License:** MIT
