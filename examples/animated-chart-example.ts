/**
 * animated-chart-example.ts
 * 
 * Example demonstrating animated chart rendering
 * Sprint 3: Animation Integration
 */

import { ChartEngine } from '../packages/renderer-canvas/src/ChartEngine';
import { ChartAnimationIntegration } from '../packages/renderer-canvas/src/ChartAnimationIntegration';
import type { ChartData, ChartOptions } from '../packages/renderer-canvas/src/ChartEngine';

/**
 * Example 1: Simple animated bar chart
 */
export function createAnimatedBarChart(canvas: HTMLCanvasElement): void {
  const data: ChartData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{
      label: 'Sales 2024',
      data: [45, 62, 58, 73],
      color: '#4285F4'
    }]
  };

  const options: ChartOptions = {
    type: 'bar',
    width: canvas.width,
    height: canvas.height,
    title: 'Quarterly Sales (Animated)',
    showLegend: true,
    showAxes: true,
    showGrid: true,
    // Animation settings
    animate: true,
    animationDuration: 800,
    animationEasing: 'easeOutCubic',
    animationStagger: 100, // Stagger bars by 100ms
    onAnimationStart: () => console.log('Animation started!'),
    onAnimationUpdate: (progress) => console.log(`Progress: ${(progress * 100).toFixed(1)}%`),
    onAnimationComplete: () => console.log('Animation complete!')
  };

  const engine = new ChartEngine(canvas);
  engine.render(data, options);
}

/**
 * Example 2: Animated data update
 */
export function createUpdatingChart(canvas: HTMLCanvasElement): void {
  const integration = new ChartAnimationIntegration('sales-chart');
  const engine = new ChartEngine(canvas);

  let currentData = [45, 62, 58, 73];
  
  const data: ChartData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{
      label: 'Sales',
      data: currentData,
      color: '#4285F4'
    }]
  };

  const options: ChartOptions = {
    type: 'bar',
    width: canvas.width,
    height: canvas.height,
    title: 'Real-time Sales Data',
    showLegend: true,
    showAxes: true,
    animate: true,
    animationDuration: 600,
  };

  // Initial render
  engine.render(data, options);

  // Update data every 3 seconds with animation
  setInterval(() => {
    const newData = currentData.map(val => Math.max(20, Math.min(100, val + (Math.random() - 0.5) * 30)));
    
    integration.animateDataUpdate(
      ['Q1', 'Q2', 'Q3', 'Q4'],
      currentData,
      newData,
      options,
      (animatedValues) => {
        // Update chart with interpolated values
        data.datasets[0].data = Array.from(animatedValues.values());
        engine.render(data, { ...options, animate: false }); // Render without animation during update
      }
    );

    currentData = newData;
  }, 3000);
}

/**
 * Example 3: Different animations for different chart types
 */
export function createMultiTypeAnimatedCharts(container: HTMLElement): void {
  const chartTypes: Array<{ type: 'bar' | 'line' | 'pie' | 'radar'; title: string }> = [
    { type: 'bar', title: 'Bar Chart (Grow)' },
    { type: 'line', title: 'Line Chart (Fade In)' },
    { type: 'pie', title: 'Pie Chart (Grow with Back Easing)' },
    { type: 'radar', title: 'Radar Chart (Elastic)' }
  ];

  chartTypes.forEach(({ type, title }, index) => {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 350;
    canvas.height = 300;
    canvas.style.margin = '10px';
    canvas.style.border = '2px solid #e0e0e0';
    canvas.style.borderRadius = '8px';
    container.appendChild(canvas);

    // Prepare data
    const data: ChartData = {
      labels: ['A', 'B', 'C', 'D', 'E'],
      datasets: [{
        label: 'Dataset 1',
        data: [30, 50, 40, 60, 45]
      }]
    };

    const options: ChartOptions = {
      type,
      width: canvas.width,
      height: canvas.height,
      title,
      showLegend: true,
      showAxes: type !== 'pie',
      animate: true,
      animationDuration: 1000,
      animationDelay: index * 300, // Stagger chart animations
    };

    const engine = new ChartEngine(canvas);
    
    // Delay rendering to show sequential animations
    setTimeout(() => {
      engine.render(data, options);
    }, index * 300);
  });
}

/**
 * Example 4: Interactive animation controls
 */
export function createInteractiveAnimatedChart(
  canvas: HTMLCanvasElement,
  controls: {
    playButton: HTMLButtonElement;
    pauseButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    speedSlider: HTMLInputElement;
  }
): void {
  const integration = new ChartAnimationIntegration('interactive-chart');
  const engine = new ChartEngine(canvas);

  const data: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Revenue',
      data: [45, 52, 48, 65, 59, 73],
      color: '#10b981'
    }]
  };

  const options: ChartOptions = {
    type: 'bar',
    width: canvas.width,
    height: canvas.height,
    title: 'Monthly Revenue (Interactive)',
    showLegend: true,
    showAxes: true,
    showGrid: true,
    animate: true,
    animationDuration: 2000, // Long animation for control demo
    animationStagger: 150,
  };

  function startAnimation() {
    // Clear canvas
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Restart animation
    integration.stop();
    engine.render(data, options);
  }

  // Control handlers
  controls.playButton.onclick = () => {
    if (!integration.isAnimating()) {
      startAnimation();
    } else {
      integration.resume();
    }
  };

  controls.pauseButton.onclick = () => {
    integration.pause();
  };

  controls.resetButton.onclick = () => {
    integration.stop();
    startAnimation();
  };

  controls.speedSlider.oninput = () => {
    const speed = parseFloat(controls.speedSlider.value);
    integration.setSpeed(speed);
  };

  // Initial render
  engine.render(data, options);
}

/**
 * Example 5: Custom easing comparison
 */
export function createEasingComparisonDemo(container: HTMLElement): void {
  const easingFunctions = [
    'linear',
    'easeInQuad',
    'easeOutQuad',
    'easeInOutCubic',
    'easeOutExpo',
    'easeOutElastic',
    'easeOutBounce',
    'easeOutBack'
  ];

  easingFunctions.forEach((easing, index) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '10px';
    wrapper.style.textAlign = 'center';

    const label = document.createElement('div');
    label.textContent = easing;
    label.style.marginBottom = '5px';
    label.style.fontWeight = 'bold';
    label.style.fontSize = '12px';
    wrapper.appendChild(label);

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    canvas.style.border = '1px solid #ddd';
    canvas.style.borderRadius = '4px';
    wrapper.appendChild(canvas);

    container.appendChild(wrapper);

    const data: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [{
        label: 'Data',
        data: [30, 50, 40]
      }]
    };

    const options: ChartOptions = {
      type: 'bar',
      width: canvas.width,
      height: canvas.height,
      showLegend: false,
      showAxes: false,
      animate: true,
      animationDuration: 1500,
      animationEasing: easing,
      animationDelay: index * 100,
    };

    const engine = new ChartEngine(canvas);
    
    setTimeout(() => {
      engine.render(data, options);
    }, index * 100);
  });
}

/**
 * Example 6: Progressive data loading with animation
 */
export function createProgressiveLoadingChart(canvas: HTMLCanvasElement): void {
  const integration = new ChartAnimationIntegration('progressive-chart');
  const engine = new ChartEngine(canvas);

  const allData = [
    { label: 'Week 1', value: 45 },
    { label: 'Week 2', value: 52 },
    { label: 'Week 3', value: 48 },
    { label: 'Week 4', value: 65 },
    { label: 'Week 5', value: 59 },
    { label: 'Week 6', value: 73 },
  ];

  let currentIndex = 0;
  const labels: string[] = [];
  const values: number[] = [];

  const options: ChartOptions = {
    type: 'line',
    width: canvas.width,
    height: canvas.height,
    title: 'Weekly Data (Progressive Loading)',
    showLegend: true,
    showAxes: true,
    showGrid: true,
    animate: true,
    animationDuration: 400,
    animationEasing: 'easeOutCubic',
  };

  function addNextDataPoint() {
    if (currentIndex < allData.length) {
      const point = allData[currentIndex];
      labels.push(point.label);
      values.push(point.value);

      const data: ChartData = {
        labels,
        datasets: [{
          label: 'Performance',
          data: values,
          color: '#8b5cf6'
        }]
      };

      engine.render(data, options);
      currentIndex++;

      setTimeout(addNextDataPoint, 800);
    }
  }

  addNextDataPoint();
}

/**
 * HTML example for browser usage
 */
export const htmlExample = `
<!DOCTYPE html>
<html>
<head>
  <title>Animated Charts Example</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .chart-container {
      background: white;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .controls {
      margin: 20px 0;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      background: #4285F4;
      color: white;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #357ABD;
    }
    input[type="range"] {
      width: 200px;
    }
    h2 {
      color: #333;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>📊 Animated Chart Examples</h1>

  <div class="chart-container">
    <h2>Example 1: Simple Animated Bar Chart</h2>
    <canvas id="simpleChart" width="800" height="400"></canvas>
  </div>

  <div class="chart-container">
    <h2>Example 2: Interactive Controls</h2>
    <div class="controls">
      <button id="playBtn">▶ Play</button>
      <button id="pauseBtn">⏸ Pause</button>
      <button id="resetBtn">🔄 Reset</button>
      <label>
        Speed:
        <input type="range" id="speedSlider" min="0.5" max="3" step="0.1" value="1">
        <span id="speedValue">1x</span>
      </label>
    </div>
    <canvas id="interactiveChart" width="800" height="400"></canvas>
  </div>

  <div class="chart-container">
    <h2>Example 3: Easing Function Comparison</h2>
    <div id="easingContainer"></div>
  </div>

  <script type="module">
    import {
      createAnimatedBarChart,
      createInteractiveAnimatedChart,
      createEasingComparisonDemo
    } from './animated-chart-example.js';

    // Example 1
    createAnimatedBarChart(document.getElementById('simpleChart'));

    // Example 2
    createInteractiveAnimatedChart(
      document.getElementById('interactiveChart'),
      {
        playButton: document.getElementById('playBtn'),
        pauseButton: document.getElementById('pauseBtn'),
        resetButton: document.getElementById('resetBtn'),
        speedSlider: document.getElementById('speedSlider')
      }
    );

    // Update speed display
    document.getElementById('speedSlider').oninput = function() {
      document.getElementById('speedValue').textContent = this.value + 'x';
    };

    // Example 3
    createEasingComparisonDemo(document.getElementById('easingContainer'));
  </script>
</body>
</html>
`;

// Export for documentation
export const readme = `
# Animated Charts Examples

This module demonstrates the integration of ChartAnimationEngine with ChartEngine
to create smooth, professional chart animations.

## Features

- ✅ Automatic animations based on chart type
- ✅ Customizable duration, easing, and delays
- ✅ Staggered animations for multiple elements
- ✅ Animated data updates (morphing)
- ✅ Interactive controls (play, pause, speed)
- ✅ 22 built-in easing functions
- ✅ Progressive data loading
- ✅ Multi-chart coordination

## Usage

### Basic Animated Chart

\`\`\`typescript
const options: ChartOptions = {
  type: 'bar',
  width: 800,
  height: 400,
  animate: true,
  animationDuration: 800,
  animationEasing: 'easeOutCubic',
  animationStagger: 100
};

const engine = new ChartEngine(canvas);
engine.render(data, options);
\`\`\`

### Animated Data Updates

\`\`\`typescript
const integration = new ChartAnimationIntegration('my-chart');

integration.animateDataUpdate(
  ['Q1', 'Q2', 'Q3', 'Q4'],
  [45, 62, 58, 73],  // from values
  [52, 71, 65, 80],  // to values
  options,
  (animatedValues) => {
    // Update chart with interpolated values
    data.datasets[0].data = Array.from(animatedValues.values());
    engine.render(data, { ...options, animate: false });
  }
);
\`\`\`

### Interactive Controls

\`\`\`typescript
const integration = new ChartAnimationIntegration('my-chart');

// Pause
integration.pause();

// Resume
integration.resume();

// Speed control
integration.setSpeed(2); // 2x speed

// Stop all
integration.stop();
\`\`\`

## Animation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`animate\` | boolean | false | Enable animations |
| \`animationDuration\` | number | 600 | Duration in milliseconds |
| \`animationEasing\` | string | 'easeOutCubic' | Easing function name |
| \`animationDelay\` | number | 0 | Initial delay |
| \`animationStagger\` | number | 0 | Delay between elements |
| \`onAnimationStart\` | function | - | Callback when animation starts |
| \`onAnimationUpdate\` | function | - | Callback with progress (0-1) |
| \`onAnimationComplete\` | function | - | Callback when animation completes |

## Chart-Specific Animations

| Chart Type | Default Animation | Easing |
|------------|------------------|---------|
| Bar | Grow from bottom | easeOutCubic |
| Line | Fade in | easeOutCubic |
| Pie | Grow with bounce | easeOutBack |
| Radar | Elastic grow | easeOutElastic |
| Waterfall | Slide in from bottom | easeOutCubic |
| Gantt | Slide in from left | easeOutCubic |
| Treemap | Fade in | easeOutCubic |

## Available Easing Functions

- Linear: \`linear\`
- Quadratic: \`easeInQuad\`, \`easeOutQuad\`, \`easeInOutQuad\`
- Cubic: \`easeInCubic\`, \`easeOutCubic\`, \`easeInOutCubic\`
- Quartic: \`easeInQuart\`, \`easeOutQuart\`, \`easeInOutQuart\`
- Exponential: \`easeInExpo\`, \`easeOutExpo\`, \`easeInOutExpo\`
- Elastic: \`easeInElastic\`, \`easeOutElastic\`, \`easeInOutElastic\`
- Bounce: \`easeInBounce\`, \`easeOutBounce\`, \`easeInOutBounce\`
- Back: \`easeInBack\`, \`easeOutBack\`, \`easeInOutBack\`

## Examples

See the functions above for complete working examples of:
- Simple animated charts
- Real-time data updates
- Multi-type comparisons
- Interactive controls
- Easing function demos
- Progressive data loading

## Testing

Run tests with:
\`\`\`bash
npm test chart-animation-integration.test.ts
\`\`\`

All 28 integration tests passing ✅
`;
