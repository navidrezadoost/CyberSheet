# Advanced Chart Features - Quick Reference

## 🚀 Quick Start

```typescript
import { ChartEngineIntegrated } from '@cyber-sheet/renderer-canvas';

const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const engine = new ChartEngineIntegrated(canvas);
```

---

## 📈 Trendlines

### Linear Trendline
**Best for**: Steady growth, constant rate of change

```typescript
engine.renderAdvanced(data, {
  type: 'line',
  width: 800,
  height: 600,
  advanced: {
    trendlines: [{
      type: 'linear',
      showEquation: true,    // Shows: y = 2.5x + 10
      showRSquared: true     // Shows: R² = 0.95
    }]
  }
});
```

### Exponential Trendline
**Best for**: Accelerating growth, viral spread, compound interest

```typescript
trendlines: [{
  type: 'exponential',
  showEquation: true,    // Shows: y = 10e^(0.5x)
  forecast: 5            // Extrapolate 5 points beyond data
}]
```

### Polynomial Trendline
**Best for**: Curved trends, peaks and valleys

```typescript
trendlines: [{
  type: 'polynomial',
  degree: 2,             // Quadratic: y = ax² + bx + c
  showEquation: true,
  showRSquared: true
}]

// Degrees:
// 2 = Quadratic (U-shaped)
// 3 = Cubic (S-shaped)
// 4-6 = Higher order curves
```

### Moving Average
**Best for**: Smoothing noisy data, identifying trends

```typescript
trendlines: [{
  type: 'moving-average',
  period: 7              // 7-day moving average
}]

// Common periods:
// 3-5: Short-term smoothing
// 7-14: Weekly trends
// 20-30: Monthly trends
```

---

## 📊 Custom Axis Scaling

### Logarithmic Scale
**Best for**: Exponential data, orders of magnitude

```typescript
const yAxisConfig = {
  scale: 'logarithmic',
  min: 1,
  max: 1000,
  title: 'Log Scale',
  gridLines: true
};

engine.renderWithCustomAxes(data, options, undefined, yAxisConfig);
```

**Use cases**:
- Population growth
- Stock prices
- Earthquake magnitudes
- pH levels

### Time Scale
**Best for**: Time series data, date-based charts

```typescript
const xAxisConfig = {
  scale: 'time',
  min: Date.parse('2024-01-01'),
  max: Date.parse('2024-12-31'),
  dateFormat: 'YYYY-MM-DD',
  title: 'Date'
};

engine.renderWithCustomAxes(data, options, xAxisConfig);
```

**Date formats**:
- `'YYYY-MM-DD'` → 2024-03-15
- `'MM/DD/YYYY'` → 03/15/2024
- `'DD MMM YYYY'` → 15 Mar 2024

### Linear Scale with Custom Range
**Best for**: Fixed ranges, percentages

```typescript
const yAxisConfig = {
  scale: 'linear',
  min: 0,
  max: 100,
  title: 'Percentage (%)',
  gridLines: true
};
```

### Category Scale
**Best for**: Discrete categories

```typescript
const xAxisConfig = {
  scale: 'category',
  title: 'Categories'
};
```

---

## 🎨 Advanced Chart Types

### Scatter Plot
**Best for**: Correlations, distributions, outliers

```typescript
const scatterData = {
  labels: ['Data Points'],
  datasets: [{
    label: 'Measurements',
    data: [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 3 },
      { x: 4, y: 5 }
    ],
    pointStyle: 'circle',     // 'circle', 'square', 'triangle'
    pointRadius: 5
  }]
};

engine.renderAdvanced(scatterData, {
  type: 'scatter',
  width: 800,
  height: 600,
  showAxes: true,
  showGrid: true
});
```

**Options**:
- `pointStyle`: `'circle'` | `'square'` | `'triangle'`
- `pointRadius`: Size in pixels (default: 3)

### Combo Chart
**Best for**: Comparing different metrics, targets vs actuals

```typescript
const comboData = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    {
      label: 'Revenue (bars)',
      data: [100, 120, 110, 140],
      type: 'bar'
    },
    {
      label: 'Target (line)',
      data: [110, 115, 120, 125],
      type: 'line'
    }
  ]
};

const comboConfig = {
  primaryType: 'bar',
  secondaryType: 'line',
  primaryDatasets: [0],       // Revenue on primary axis
  secondaryDatasets: [1],     // Target on secondary axis
  showSecondaryAxis: true     // Show right Y-axis
};

engine.renderAdvanced(comboData, {
  type: 'combo',
  width: 800,
  height: 600,
  showAxes: true,
  showGrid: true,
  advanced: { comboConfig }
});
```

### Area Chart
**Best for**: Cumulative values, volume over time

```typescript
const areaData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Revenue',
    data: [100, 120, 110, 140, 135],
    fillOpacity: 0.5          // 0.0 to 1.0
  }]
};

engine.renderAdvanced(areaData, {
  type: 'area',
  width: 800,
  height: 600,
  showAxes: true,
  showGrid: true
});
```

**Options**:
- `fillOpacity`: 0.0 (transparent) to 1.0 (solid)
- Default: 0.3

### Bubble Chart
**Best for**: Three-dimensional data (x, y, size)

```typescript
const bubbleData = {
  labels: ['Bubbles'],
  datasets: [{
    label: 'Markets',
    data: [
      { x: 10, y: 20 },       // Size from pointRadius
      { x: 15, y: 25 },
      { x: 20, y: 30 }
    ],
    pointRadius: 8            // Bubble size
  }]
};

engine.renderAdvanced(bubbleData, {
  type: 'bubble',
  width: 800,
  height: 600
});
```

---

## 🔧 Combining Features

### Scatter + Trendline
```typescript
engine.renderAdvanced(scatterData, {
  type: 'scatter',
  width: 800,
  height: 600,
  showAxes: true,
  advanced: {
    trendlines: [{
      type: 'linear',
      showEquation: true,
      showRSquared: true
    }]
  }
});
```

### Line Chart + Log Scale + Trendline
```typescript
const yAxisConfig = {
  scale: 'logarithmic',
  min: 1,
  max: 1000
};

engine.renderWithCustomAxes(data, {
  type: 'line',
  width: 800,
  height: 600,
  showAxes: true,
  advanced: {
    trendlines: [{
      type: 'exponential',
      showEquation: true
    }]
  }
}, undefined, yAxisConfig);
```

### Area Chart + Time Scale
```typescript
const xAxisConfig = {
  scale: 'time',
  min: Date.now(),
  max: Date.now() + 30 * 24 * 60 * 60 * 1000,
  dateFormat: 'YYYY-MM-DD'
};

engine.renderWithCustomAxes(areaData, {
  type: 'area',
  width: 800,
  height: 600,
  showAxes: true
}, xAxisConfig);
```

---

## 🎯 Common Use Cases

### Financial Dashboard
```typescript
// Stock price with moving average
engine.renderAdvanced(stockData, {
  type: 'line',
  width: 800,
  height: 600,
  advanced: {
    trendlines: [{
      type: 'moving-average',
      period: 20              // 20-day MA
    }]
  }
});
```

### Scientific Data
```typescript
// Experimental results with polynomial fit
engine.renderAdvanced(experimentData, {
  type: 'scatter',
  width: 800,
  height: 600,
  showAxes: true,
  advanced: {
    trendlines: [{
      type: 'polynomial',
      degree: 2,
      showEquation: true,
      showRSquared: true
    }]
  }
});
```

### Sales Analytics
```typescript
// Revenue vs target
const comboConfig = {
  primaryType: 'bar',
  secondaryType: 'line',
  primaryDatasets: [0],
  secondaryDatasets: [1],
  showSecondaryAxis: true
};

engine.renderAdvanced(salesData, {
  type: 'combo',
  width: 800,
  height: 600,
  showAxes: true,
  advanced: { comboConfig }
});
```

### Population Growth
```typescript
// Exponential growth with log scale
const yAxisConfig = {
  scale: 'logarithmic',
  min: 1000,
  max: 10000000,
  title: 'Population (log)'
};

engine.renderWithCustomAxes(populationData, {
  type: 'line',
  width: 800,
  height: 600,
  showAxes: true,
  advanced: {
    trendlines: [{
      type: 'exponential',
      showEquation: true
    }]
  }
}, undefined, yAxisConfig);
```

---

## ⚙️ Configuration Options

### IntegratedChartOptions
```typescript
interface IntegratedChartOptions {
  type: ExtendedChartType;      // 'line' | 'bar' | 'scatter' | 'combo' | 'area' | 'bubble'
  width: number;
  height: number;
  title?: string;
  showLegend?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  colors?: string[];
  backgroundColor?: string;
  advanced?: {
    trendlines?: TrendlineConfig[];
    comboConfig?: ComboChartConfig;
    showAxes?: boolean;
    showGrid?: boolean;
  };
}
```

### TrendlineConfig
```typescript
interface TrendlineConfig {
  type: 'linear' | 'exponential' | 'polynomial' | 'moving-average';
  showEquation?: boolean;
  showRSquared?: boolean;
  degree?: number;              // For polynomial (1-6)
  period?: number;              // For moving average
  forecast?: number;            // Extra points to extrapolate
  color?: string;
}
```

### AxisConfig
```typescript
interface AxisConfig {
  scale: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
  title?: string;
  gridLines?: boolean;
  dateFormat?: string;          // For time scale
  reverse?: boolean;
}
```

---

## 🔍 Tips & Best Practices

### Choosing the Right Trendline
1. **Linear**: Use when data increases/decreases at a constant rate
2. **Exponential**: Use when data grows/decays at an increasing rate
3. **Polynomial**: Use when data has peaks and valleys
4. **Moving Average**: Use to smooth out short-term fluctuations

### R² Interpretation
- **0.9-1.0**: Excellent fit
- **0.7-0.9**: Good fit
- **0.5-0.7**: Moderate fit
- **Below 0.5**: Poor fit (consider different trendline type)

### Axis Scale Selection
- **Linear**: Default, use for most data
- **Logarithmic**: Use when data spans multiple orders of magnitude
- **Time**: Use for date/time series data
- **Category**: Use for discrete, non-numeric categories

### Performance Tips
- Limit trendline forecast points for large datasets
- Use moving averages with appropriate periods (too large = oversmoothing)
- Keep polynomial degree ≤ 4 for stability

---

## 📚 API Reference

### ChartEngineIntegrated

```typescript
class ChartEngineIntegrated extends ChartEngine {
  constructor(canvas: HTMLCanvasElement);
  
  renderAdvanced(
    data: ChartData | AdvancedChartData,
    options: IntegratedChartOptions
  ): void;
  
  renderWithCustomAxes(
    data: ChartData | AdvancedChartData,
    options: IntegratedChartOptions,
    xAxisConfig?: AxisConfig,
    yAxisConfig?: AxisConfig
  ): void;
}
```

### TrendlineCalculator

```typescript
class TrendlineCalculator {
  static calculate(
    xValues: number[],
    yValues: number[],
    type: TrendlineType,
    options?: TrendlineOptions
  ): TrendlineResult;
}
```

### AxisScaler

```typescript
class AxisScaler {
  static scaleValue(
    value: number,
    scale: AxisScale,
    bounds: AxisBounds,
    pixelRange: [number, number],
    reverse?: boolean
  ): number;
  
  static generateTicks(
    scale: AxisScale,
    bounds: AxisBounds,
    pixelRange: [number, number],
    config?: AxisConfig
  ): AxisTick[];
  
  static invertScale(
    pixelPosition: number,
    scale: AxisScale,
    bounds: AxisBounds,
    pixelRange: [number, number]
  ): number;
}
```

---

## 🐛 Troubleshooting

### Trendline not showing
- Check that dataset has at least 2 points
- Verify `advanced.trendlines` array is defined
- For exponential: all Y values must be positive
- For logarithmic: all values must be positive

### Custom axis not working
- Ensure `min` and `max` are defined
- For time scale: use timestamps (ms since epoch)
- For logarithmic: min and max must be positive
- Check that data values fall within axis range

### Scatter points not visible
- Increase `pointRadius` (default: 3)
- Check that X,Y coordinates are within axis range
- Ensure `showAxes` is true for proper scaling

---

## 📖 Examples Repository

See `/examples` directory for complete working examples:
- `formula-editing-example.tsx`: Interactive chart with trendlines
- `react-canvas-viewer.tsx`: React integration
- `phase3-integration.ts`: Advanced features demo

---

*For more information, see `/docs/DAY6_SUMMARY.md`*
