# Chart Data Callbacks API

Complete API reference for the Chart Data Callback system.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Performance](#performance)
- [TypeScript Types](#typescript-types)

## Overview

The Chart Data Callback system provides a comprehensive event handling mechanism for user interactions with chart data points. It supports multiple event types, throttling, debouncing, and priority-based execution.

### Key Features

- **9 Event Types**: onHover, onHoverEnd, onClick, onDoubleClick, onRightClick, onDragStart, onDrag, onDragEnd, onContextMenu
- **Full Data Context**: Access point coordinates, dataset info, chart data, and original events
- **Throttling**: Limit callback execution frequency
- **Debouncing**: Delay execution until events stop
- **Priority Execution**: Control callback order with priorities
- **Dataset Filtering**: Only trigger for specific datasets
- **Enable/Disable**: Control callbacks without unregistering

### Perfect For

- Interactive tooltips and data inspection
- Click-to-drill-down functionality
- Drag-to-reorder or drag-to-edit
- Context menus on data points
- Custom hover effects
- Analytics and user behavior tracking
- A/B testing interactions

## Installation

```typescript
import { ChartDataCallbackManager } from '@cyber-sheet/renderer-canvas';

const callbackManager = new ChartDataCallbackManager();
```

## Quick Start

### Basic Click Handler

```typescript
// Initialize callbacks for a chart
callbackManager.initializeCallbacks('chart-1');

// Register a click callback
const callbackId = callbackManager.registerCallback(
  'chart-1',
  'onClick',
  (context) => {
    console.log(`Clicked ${context.dataset.label} at index ${context.dataIndex}`);
    console.log(`Value: ${context.value}`);
  }
);
```

### Hover with Throttling

```typescript
// Limit hover events to once per 100ms
callbackManager.registerCallback(
  'chart-1',
  'onHover',
  (context) => {
    // Update tooltip
    updateTooltip(context.point, context.value);
  },
  {
    throttle: 100 // Max once per 100ms
  }
);
```

### Dataset-Specific Callbacks

```typescript
// Only trigger for first two datasets
callbackManager.registerCallback(
  'chart-1',
  'onClick',
  (context) => {
    alert(`Selected: ${context.dataset.label}`);
  },
  {
    datasetFilter: [0, 1] // Only datasets 0 and 1
  }
);
```

## Core Concepts

### 1. Event Types

Nine event types are supported:

```typescript
type CallbackEventType = 
  | 'onHover'        // Mouse moves over data point
  | 'onHoverEnd'     // Mouse leaves data point
  | 'onClick'        // Single click on data point
  | 'onDoubleClick'  // Double click on data point
  | 'onRightClick'   // Right click on data point
  | 'onDragStart'    // Drag starts on data point
  | 'onDrag'         // Dragging over data point
  | 'onDragEnd'      // Drag ends on data point
  | 'onContextMenu'; // Context menu requested
```

### 2. Callback Context

Each callback receives rich context about the interaction:

```typescript
interface CallbackContext {
  // Point information
  point: {
    x: number;           // Data X value
    y: number;           // Data Y value
    canvasX: number;     // Canvas X coordinate
    canvasY: number;     // Canvas Y coordinate
  };
  
  // Dataset information
  dataset: {
    index: number;       // Dataset index
    label: string;       // Dataset label
    data: any[];         // Full dataset data
  };
  
  // Value information
  value: number;         // Data point value
  dataIndex: number;     // Index in dataset
  
  // Chart information
  chart: {
    id: string;          // Chart ID
    type: string;        // Chart type
    data: ChartData;     // Full chart data
  };
  
  // Event information
  originalEvent?: MouseEvent | TouchEvent;
  metadata?: Record<string, any>;
}
```

### 3. Throttling

Throttling limits how often a callback can execute:

```typescript
// Callback executes at most once per 200ms
callbackManager.registerCallback('chart-1', 'onHover', callback, {
  throttle: 200
});
```

**Use Cases**:
- Hover events (prevent excessive tooltip updates)
- Drag events (smooth dragging without lag)
- Continuous animations

### 4. Debouncing

Debouncing delays execution until events stop:

```typescript
// Callback executes 300ms after last event
callbackManager.registerCallback('chart-1', 'onHover', callback, {
  debounce: 300
});
```

**Use Cases**:
- Search-as-you-type
- Window resize handling
- Auto-save functionality

### 5. Priority Execution

Higher priority callbacks execute first:

```typescript
// High priority - runs first
callbackManager.registerCallback('chart-1', 'onClick', logCallback, {
  priority: 100
});

// Low priority - runs last
callbackManager.registerCallback('chart-1', 'onClick', analyticsCallback, {
  priority: 1
});
```

**Default Priority**: 50

### 6. Dataset Filtering

Only trigger callbacks for specific datasets:

```typescript
// Only trigger for dataset 0 and 2
callbackManager.registerCallback('chart-1', 'onClick', callback, {
  datasetFilter: [0, 2]
});
```

## API Reference

### Constructor

```typescript
new ChartDataCallbackManager()
```

Creates a new callback manager instance.

### initializeCallbacks()

```typescript
initializeCallbacks(chartId: string): void
```

Initializes the callback system for a chart.

**Parameters**:
- `chartId` (string): Unique chart identifier

**Example**:
```typescript
callbackManager.initializeCallbacks('my-chart');
```

### registerCallback()

```typescript
registerCallback(
  chartId: string,
  eventType: CallbackEventType,
  callback: DataCallback,
  options?: CallbackOptions
): string
```

Registers a callback for a specific event type.

**Parameters**:
- `chartId` (string): Chart ID
- `eventType` (CallbackEventType): Event type to listen for
- `callback` (DataCallback): Function to execute `(context: CallbackContext) => void | Promise<void>`
- `options` (CallbackOptions, optional):
  - `priority` (number): Execution priority (default: 50, higher runs first)
  - `throttle` (number): Minimum ms between executions
  - `debounce` (number): Delay ms after last event
  - `datasetFilter` (number[]): Only trigger for these dataset indices
  - `enabled` (boolean): Initial enabled state (default: true)
  - `metadata` (object): Custom metadata

**Returns**: Callback ID (string)

**Example**:
```typescript
const callbackId = callbackManager.registerCallback(
  'chart-1',
  'onClick',
  async (context) => {
    console.log('Clicked:', context.value);
  },
  {
    priority: 75,
    throttle: 100,
    datasetFilter: [0, 1],
    metadata: { source: 'user-click' }
  }
);
```

### unregisterCallback()

```typescript
unregisterCallback(chartId: string, callbackId: string): boolean
```

Removes a callback.

**Returns**: true if removed, false if not found

**Example**:
```typescript
const removed = callbackManager.unregisterCallback('chart-1', callbackId);
```

### enableCallback()

```typescript
enableCallback(chartId: string, callbackId: string): boolean
```

Enables a disabled callback.

**Example**:
```typescript
callbackManager.enableCallback('chart-1', callbackId);
```

### disableCallback()

```typescript
disableCallback(chartId: string, callbackId: string): boolean
```

Disables a callback without unregistering.

**Example**:
```typescript
callbackManager.disableCallback('chart-1', callbackId);
```

### triggerEvent()

```typescript
triggerEvent(
  chartId: string,
  eventType: CallbackEventType,
  context: CallbackContext
): Promise<void>
```

Manually triggers callbacks for an event type.

**Example**:
```typescript
await callbackManager.triggerEvent('chart-1', 'onClick', {
  point: { x: 10, y: 50, canvasX: 200, canvasY: 150 },
  dataset: { index: 0, label: 'Sales', data: [...] },
  value: 50,
  dataIndex: 10,
  chart: { id: 'chart-1', type: 'line', data: {...} }
});
```

### getCallbacksForEvent()

```typescript
getCallbacksForEvent(
  chartId: string,
  eventType: CallbackEventType
): RegisteredCallback[]
```

Returns all callbacks for a specific event type.

**Example**:
```typescript
const clickCallbacks = callbackManager.getCallbacksForEvent('chart-1', 'onClick');
console.log(`Click callbacks: ${clickCallbacks.length}`);
```

### getCallback()

```typescript
getCallback(chartId: string, callbackId: string): RegisteredCallback | undefined
```

Retrieves a specific callback by ID.

**Example**:
```typescript
const callback = callbackManager.getCallback('chart-1', callbackId);
if (callback) {
  console.log('Priority:', callback.options.priority);
}
```

### updateCallbackOptions()

```typescript
updateCallbackOptions(
  chartId: string,
  callbackId: string,
  options: Partial<CallbackOptions>
): boolean
```

Updates callback options at runtime.

**Example**:
```typescript
// Change throttle value
callbackManager.updateCallbackOptions('chart-1', callbackId, {
  throttle: 200
});
```

### clearChartCallbacks()

```typescript
clearChartCallbacks(chartId: string): void
```

Removes all callbacks for a chart.

**Example**:
```typescript
callbackManager.clearChartCallbacks('chart-1');
```

### clearAll()

```typescript
clearAll(): void
```

Removes all callbacks for all charts.

**Example**:
```typescript
callbackManager.clearAll();
```

### createContext()

```typescript
createContext(
  chartId: string,
  chartType: string,
  chartData: ChartData,
  point: { x: number; y: number; canvasX: number; canvasY: number },
  datasetIndex: number,
  dataIndex: number,
  originalEvent?: MouseEvent | TouchEvent,
  metadata?: Record<string, any>
): CallbackContext
```

Helper to create a callback context object.

**Example**:
```typescript
const context = callbackManager.createContext(
  'chart-1',
  'line',
  chartData,
  { x: 10, y: 50, canvasX: 200, canvasY: 150 },
  0,
  10,
  mouseEvent
);
```

## Examples

### Example 1: Interactive Tooltip

```typescript
let tooltip: HTMLDivElement | null = null;

// Create tooltip element
function createTooltip() {
  tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
  `;
  document.body.appendChild(tooltip);
}

createTooltip();

// Show tooltip on hover
callbackManager.registerCallback('chart-1', 'onHover', (context) => {
  if (tooltip) {
    tooltip.textContent = `${context.dataset.label}: ${context.value}`;
    tooltip.style.left = context.point.canvasX + 10 + 'px';
    tooltip.style.top = context.point.canvasY - 30 + 'px';
    tooltip.style.opacity = '1';
  }
}, { throttle: 50 });

// Hide tooltip when hover ends
callbackManager.registerCallback('chart-1', 'onHoverEnd', () => {
  if (tooltip) {
    tooltip.style.opacity = '0';
  }
});
```

### Example 2: Click-to-Drill-Down

```typescript
callbackManager.registerCallback('chart-1', 'onClick', async (context) => {
  const { dataset, dataIndex, value } = context;
  
  // Show loading state
  showLoading();
  
  try {
    // Fetch detailed data
    const detailData = await fetchDetailedData(
      dataset.label,
      dataIndex
    );
    
    // Show detail modal
    showDetailModal({
      title: `${dataset.label} - ${context.chart.data.labels[dataIndex]}`,
      value: value,
      details: detailData
    });
  } catch (error) {
    console.error('Failed to load details:', error);
    showError('Could not load details');
  } finally {
    hideLoading();
  }
});
```

### Example 3: Drag-to-Edit

```typescript
let dragStartValue: number | null = null;

// Start drag
callbackManager.registerCallback('chart-1', 'onDragStart', (context) => {
  dragStartValue = context.value;
  
  // Visual feedback
  context.originalEvent?.preventDefault();
  document.body.style.cursor = 'grabbing';
});

// Update during drag
callbackManager.registerCallback('chart-1', 'onDrag', (context) => {
  if (dragStartValue === null) return;
  
  const delta = context.point.y - dragStartValue;
  
  // Update data in real-time
  updateChartData(
    context.chart.id,
    context.dataset.index,
    context.dataIndex,
    context.value + delta
  );
}, { throttle: 50 });

// Finish drag
callbackManager.registerCallback('chart-1', 'onDragEnd', async (context) => {
  if (dragStartValue === null) return;
  
  // Save changes
  await saveChartData(context.chart.id, context.chart.data);
  
  dragStartValue = null;
  document.body.style.cursor = 'default';
});
```

### Example 4: Context Menu

```typescript
callbackManager.registerCallback('chart-1', 'onRightClick', (context) => {
  // Prevent default context menu
  context.originalEvent?.preventDefault();
  
  // Show custom context menu
  showContextMenu(context.point.canvasX, context.point.canvasY, [
    {
      label: 'Copy Value',
      action: () => navigator.clipboard.writeText(context.value.toString())
    },
    {
      label: 'Export Data Point',
      action: () => exportDataPoint(context)
    },
    {
      label: 'Remove Point',
      action: () => removeDataPoint(
        context.chart.id,
        context.dataset.index,
        context.dataIndex
      )
    }
  ]);
});
```

### Example 5: Analytics Tracking

```typescript
// Track clicks with low priority (runs after other handlers)
callbackManager.registerCallback('chart-1', 'onClick', (context) => {
  analytics.track('chart_data_point_clicked', {
    chart_id: context.chart.id,
    chart_type: context.chart.type,
    dataset: context.dataset.label,
    value: context.value,
    timestamp: Date.now()
  });
}, { priority: 1 }); // Low priority

// Track hover patterns with debouncing
callbackManager.registerCallback('chart-1', 'onHover', (context) => {
  analytics.track('chart_data_point_hovered', {
    chart_id: context.chart.id,
    dataset: context.dataset.label,
    duration: 300 // Debounce time
  });
}, { debounce: 300 });
```

### Example 6: Multi-Chart Sync

```typescript
const charts = ['chart-1', 'chart-2', 'chart-3'];

// Sync hover across all charts
charts.forEach(chartId => {
  callbackManager.registerCallback(chartId, 'onHover', (context) => {
    // Highlight same data point in all charts
    charts.forEach(otherChartId => {
      if (otherChartId !== chartId) {
        highlightDataPoint(otherChartId, context.dataIndex);
      }
    });
  }, { throttle: 50 });
  
  callbackManager.registerCallback(chartId, 'onHoverEnd', () => {
    // Clear highlights from all charts
    charts.forEach(otherChartId => {
      clearHighlight(otherChartId);
    });
  });
});
```

### Example 7: Dataset-Specific Actions

```typescript
// Action for dataset 0 (Sales)
callbackManager.registerCallback('chart-1', 'onClick', (context) => {
  showSalesDetails(context.value, context.dataIndex);
}, {
  datasetFilter: [0],
  metadata: { action: 'sales-details' }
});

// Different action for dataset 1 (Targets)
callbackManager.registerCallback('chart-1', 'onClick', (context) => {
  editTarget(context.value, context.dataIndex);
}, {
  datasetFilter: [1],
  metadata: { action: 'edit-target' }
});

// Action for all other datasets
callbackManager.registerCallback('chart-1', 'onClick', (context) => {
  showGenericInfo(context);
}, {
  priority: 1 // Lower priority (runs if others don't handle it)
});
```

## Best Practices

### 1. Use Appropriate Event Types

Choose the right event for your interaction:
- **onHover**: Real-time feedback (tooltips, highlights)
- **onClick**: Primary actions (drill-down, selection)
- **onDoubleClick**: Secondary actions (edit, zoom)
- **onRightClick/onContextMenu**: Context menus
- **onDrag**: Continuous updates (editing, reordering)

### 2. Apply Throttling and Debouncing

```typescript
// Throttle for continuous events
callbackManager.registerCallback('chart-1', 'onHover', callback, {
  throttle: 100 // Update at most 10 times per second
});

// Debounce for delayed actions
callbackManager.registerCallback('chart-1', 'onHover', callback, {
  debounce: 300 // Wait 300ms after user stops hovering
});
```

### 3. Set Appropriate Priorities

```typescript
// High priority (90-100): Validation, security
callbackManager.registerCallback('chart-1', 'onClick', validateClick, {
  priority: 100
});

// Medium priority (40-60): Main functionality
callbackManager.registerCallback('chart-1', 'onClick', handleClick, {
  priority: 50
});

// Low priority (10-30): Analytics, logging
callbackManager.registerCallback('chart-1', 'onClick', trackClick, {
  priority: 10
});
```

### 4. Handle Errors Gracefully

```typescript
callbackManager.registerCallback('chart-1', 'onClick', async (context) => {
  try {
    await performAction(context);
  } catch (error) {
    console.error('Callback error:', error);
    showUserFriendlyError();
    // Don't throw - let other callbacks run
  }
});
```

### 5. Clean Up Resources

```typescript
// Store callback IDs
const callbackIds: string[] = [];

// Register callbacks
callbackIds.push(
  callbackManager.registerCallback('chart-1', 'onClick', callback)
);

// Clean up when component unmounts
function cleanup() {
  callbackIds.forEach(id => {
    callbackManager.unregisterCallback('chart-1', id);
  });
}
```

### 6. Use Dataset Filtering

```typescript
// Different behavior for different datasets
callbackManager.registerCallback('chart-1', 'onClick', editableCallback, {
  datasetFilter: [0, 1] // Only first two datasets are editable
});

callbackManager.registerCallback('chart-1', 'onClick', readOnlyCallback, {
  datasetFilter: [2, 3, 4] // Others are read-only
});
```

## Troubleshooting

### Callbacks Not Firing

**Problem**: Registered callbacks are not executing.

**Solutions**:
1. Check if callbacks initialized: `callbackManager.initializeCallbacks('chart-id')`
2. Verify callback is enabled: `callbackManager.getCallback('chart-id', callbackId)?.options.enabled`
3. Ensure `triggerEvent()` is being called from your chart interaction code
4. Check dataset filter: Callback may be filtered out
5. Verify event type spelling: Must match `CallbackEventType` exactly

### Callbacks Fire Too Often

**Problem**: Callbacks execute excessively (e.g., hover events).

**Solutions**:
1. Add throttling: `{ throttle: 100 }`
2. Add debouncing: `{ debounce: 300 }`
3. Combine throttle + debounce for complex cases
4. Check if multiple callbacks are registered for same event

### Wrong Execution Order

**Problem**: Callbacks run in unexpected order.

**Solutions**:
1. Set explicit priorities: Higher values run first
2. Check all callbacks: `getCallbacksForEvent()` to see current order
3. Remember default priority is 50
4. Consider if order dependencies exist

### Memory Leaks

**Problem**: Memory usage grows over time.

**Solutions**:
1. Unregister callbacks when done: `unregisterCallback()`
2. Clear chart callbacks on destroy: `clearChartCallbacks()`
3. Avoid circular references in metadata
4. Clean up external resources (DOM elements, timers) in callbacks

### Performance Issues

**Problem**: Callbacks slow down interactions.

**Solutions**:
1. Profile callback code: Measure execution time
2. Move heavy operations outside callback (use async + queuing)
3. Increase throttle/debounce values
4. Use dataset filtering to reduce executions
5. Disable analytics callbacks in development

## Performance

### Overhead

Callback system overhead:
- **Registration**: <0.1ms per callback
- **Event triggering**: ~0.05ms per callback
- **Throttling check**: <0.01ms
- **Debouncing setup**: ~0.02ms
- **Priority sorting**: <1ms for 100 callbacks

### Optimization Tips

1. **Use Throttling**: Limit execution frequency for continuous events
2. **Use Debouncing**: Delay execution for delayed actions
3. **Filter by Dataset**: Reduce unnecessary callback executions
4. **Disable When Not Needed**: Use `disableCallback()` instead of unregistering
5. **Batch Operations**: Update multiple data points in one callback
6. **Async Operations**: Don't block main thread with heavy operations

### Benchmarks

With 10 callbacks registered:
- Click handler: <1ms total execution
- Hover handler (throttled 100ms): ~2ms per second
- Drag handler (throttled 50ms): ~4ms per second

## TypeScript Types

```typescript
type CallbackEventType = 
  | 'onHover'
  | 'onHoverEnd'
  | 'onClick'
  | 'onDoubleClick'
  | 'onRightClick'
  | 'onDragStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onContextMenu';

interface CallbackContext {
  point: {
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
  };
  dataset: {
    index: number;
    label: string;
    data: any[];
  };
  value: number;
  dataIndex: number;
  chart: {
    id: string;
    type: string;
    data: ChartData;
  };
  originalEvent?: MouseEvent | TouchEvent;
  metadata?: Record<string, any>;
}

interface CallbackOptions {
  priority?: number;
  throttle?: number;
  debounce?: number;
  datasetFilter?: number[];
  enabled?: boolean;
  metadata?: Record<string, any>;
}

type DataCallback = (context: CallbackContext) => void | Promise<void>;

interface RegisteredCallback {
  id: string;
  eventType: CallbackEventType;
  callback: DataCallback;
  options: Required<CallbackOptions>;
  lastExecution: number;
  debounceTimer?: NodeJS.Timeout;
}
```

---

**Next Steps**:
- See [RENDERER_PLUGINS_API.md](./RENDERER_PLUGINS_API.md) for custom rendering
- See [DUAL_AXES_API.md](./DUAL_AXES_API.md) for dual Y-axis support
- See [DATA_STREAMING_API.md](./DATA_STREAMING_API.md) for real-time data
