# Chart Animation Quick Reference

## 🚀 Quick Start

### Basic Animation
```typescript
import { ChartEngine } from '@cyber-sheet/renderer-canvas';

const options = {
  type: 'bar',
  width: 800,
  height: 400,
  animate: true,                    // Enable animations
  animationDuration: 800,           // 800ms duration
  animationEasing: 'easeOutCubic'   // Smooth easing
};

const engine = new ChartEngine(canvas);
engine.render(data, options);
```

### Staggered Animation
```typescript
const options = {
  animate: true,
  animationStagger: 100  // 100ms delay between elements
};
```

### With Callbacks
```typescript
const options = {
  animate: true,
  onAnimationStart: () => console.log('Started!'),
  onAnimationUpdate: (progress) => updateProgressBar(progress),
  onAnimationComplete: () => console.log('Done!')
};
```

## 🎨 Animation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `animate` | boolean | `false` | Enable/disable animations |
| `animationDuration` | number | `600` | Duration in milliseconds |
| `animationEasing` | string | `'easeOutCubic'` | Easing function name |
| `animationDelay` | number | `0` | Initial delay before animation starts |
| `animationStagger` | number | `0` | Delay between elements (for multiple) |
| `onAnimationStart` | function | - | Called when animation starts |
| `onAnimationUpdate` | function | - | Called each frame with progress (0-1) |
| `onAnimationComplete` | function | - | Called when animation finishes |

## 🎭 Easing Functions

### Linear
- `linear` - Constant speed

### Quadratic (Gentle)
- `easeInQuad` - Accelerate
- `easeOutQuad` - Decelerate
- `easeInOutQuad` - Accelerate then decelerate

### Cubic (Smooth)
- `easeInCubic` - Smooth accelerate
- `easeOutCubic` - Smooth decelerate ⭐ **Default**
- `easeInOutCubic` - Smooth both ways

### Quartic (Strong)
- `easeInQuart` - Strong accelerate
- `easeOutQuart` - Strong decelerate
- `easeInOutQuart` - Strong both ways

### Exponential (Very Strong)
- `easeInExpo` - Very strong accelerate
- `easeOutExpo` - Very strong decelerate
- `easeInOutExpo` - Very strong both ways

### Elastic (Spring)
- `easeInElastic` - Spring before start
- `easeOutElastic` - Spring at end
- `easeInOutElastic` - Spring both

### Bounce (Bouncy)
- `easeInBounce` - Bounce before start
- `easeOutBounce` - Bounce at end
- `easeInOutBounce` - Bounce both

### Back (Overshoot)
- `easeInBack` - Pull back before start
- `easeOutBack` - Overshoot at end
- `easeInOutBack` - Both

## 📊 Chart-Specific Defaults

| Chart Type | Animation | Easing | Use Case |
|------------|-----------|--------|----------|
| Bar | Grow | easeOutCubic | Bars grow from bottom |
| Line | Fade In | easeOutCubic | Lines fade into view |
| Pie | Grow | easeOutBack | Pie slices grow with slight overshoot |
| Radar | Grow | easeOutElastic | Radar expands with spring effect |
| Waterfall | Slide Bottom | easeOutCubic | Bars slide up from bottom |
| Gantt | Slide Left | easeOutCubic | Tasks slide in from left |
| Treemap | Fade In | easeOutCubic | Rectangles fade in |

## 🔧 Advanced Usage

### Animated Data Updates
```typescript
import { ChartAnimationIntegration } from '@cyber-sheet/renderer-canvas';

const integration = new ChartAnimationIntegration('my-chart');

// Morph from old values to new values
integration.animateDataUpdate(
  ['Q1', 'Q2', 'Q3', 'Q4'],
  [45, 62, 58, 73],  // from values
  [52, 71, 65, 80],  // to values
  options,
  (animatedValues) => {
    // Called each frame with interpolated values
    data.datasets[0].data = Array.from(animatedValues.values());
    engine.render(data, { ...options, animate: false });
  }
);
```

### Control Playback
```typescript
const integration = new ChartAnimationIntegration('my-chart');

// Start animation
integration.animateDataEntry(elementIds, options, onUpdate);

// Pause
integration.pause();

// Resume
integration.resume();

// Stop all
integration.stop();

// Speed control
integration.setSpeed(2);  // 2x speed
integration.setSpeed(0.5); // Half speed
```

### Track Progress
```typescript
// Get progress for specific element
const progress = integration.getElementProgress('elem1');
console.log(`Element 1: ${(progress * 100).toFixed(1)}%`);

// Get all progresses
const allProgress = integration.getAllProgresses();
allProgress.forEach((progress, id) => {
  console.log(`${id}: ${(progress * 100).toFixed(1)}%`);
});

// Check if animating
if (integration.isAnimating()) {
  console.log('Animation in progress...');
}
```

### Multiple Charts
```typescript
// Each chart gets its own integration instance
const chart1 = new ChartAnimationIntegration('sales-chart');
const chart2 = new ChartAnimationIntegration('revenue-chart');

// Coordinate animations
chart1.animateDataEntry(ids1, options, onUpdate1);

setTimeout(() => {
  chart2.animateDataEntry(ids2, options, onUpdate2);
}, 500); // Start second chart after 500ms
```

## 🎯 Common Patterns

### Progressive Data Loading
```typescript
let currentIndex = 0;
const labels: string[] = [];
const values: number[] = [];

function addNextPoint() {
  if (currentIndex < allData.length) {
    labels.push(allData[currentIndex].label);
    values.push(allData[currentIndex].value);
    
    const data = {
      labels,
      datasets: [{ label: 'Data', data: values }]
    };
    
    engine.render(data, {
      type: 'line',
      animate: true,
      animationDuration: 400
    });
    
    currentIndex++;
    setTimeout(addNextPoint, 600);
  }
}

addNextPoint();
```

### Real-time Updates
```typescript
setInterval(() => {
  const newValues = generateNewData();
  
  integration.animateDataUpdate(
    ids,
    currentValues,
    newValues,
    options,
    (animated) => updateChart(animated)
  );
  
  currentValues = newValues;
}, 3000);
```

### Synchronized Multi-Chart
```typescript
const charts = [chart1, chart2, chart3];

// Start all at once
charts.forEach(chart => {
  chart.animateDataEntry(ids, options, onUpdate);
});

// Control all together
const pauseAll = () => charts.forEach(c => c.pause());
const resumeAll = () => charts.forEach(c => c.resume());
const setSpeedAll = (speed) => charts.forEach(c => c.setSpeed(speed));
```

## ⚡ Performance Tips

1. **Disable when not needed**: Set `animate: false` for static charts
2. **Reasonable durations**: 400-800ms is usually best
3. **Avoid too many concurrent**: Limit to 3-5 animating charts
4. **Clean up**: Call `integration.destroy()` when done
5. **Use appropriate easing**: Simpler functions (linear, cubic) perform better

## 🐛 Troubleshooting

### Animation doesn't start
```typescript
// ❌ Wrong
const options = { type: 'bar' };

// ✅ Correct
const options = { type: 'bar', animate: true };
```

### Animation is too fast/slow
```typescript
// Adjust duration
const options = {
  animate: true,
  animationDuration: 1200  // Slower
};

// Or use speed control
integration.setSpeed(0.5);  // Half speed
```

### Jerky animation
```typescript
// Use smoother easing
const options = {
  animate: true,
  animationEasing: 'easeOutCubic'  // Smooth
};
```

### Memory leak
```typescript
// Always clean up
integration.destroy();
```

## 📚 Examples

See complete working examples:
- **Interactive Demo**: `examples/sprint3-animation-demo.html`
- **Code Examples**: `examples/animated-chart-example.ts`
- **Documentation**: `docs/SPRINT3_IMPLEMENTATION_SUMMARY.md`

## 🔗 API Reference

Full API documentation available in source files:
- `ChartAnimationEngine.ts` - Core animation engine
- `ChartAnimationIntegration.ts` - Chart integration layer
- `ChartEngine.ts` - Chart rendering with animation support

## 🎓 Learning Path

1. **Start Simple**: Basic animation with `animate: true`
2. **Customize**: Try different easing functions
3. **Add Callbacks**: Monitor progress
4. **Control Playback**: Pause, resume, speed
5. **Advanced**: Data updates, progressive loading
6. **Master**: Multi-chart coordination

## 💡 Best Practices

✅ **DO**:
- Use `easeOutCubic` for most cases (smooth, professional)
- Set reasonable durations (400-800ms)
- Clean up with `destroy()` when done
- Test with different chart types
- Use callbacks for user feedback

❌ **DON'T**:
- Animate static dashboards
- Use very long durations (>2000ms)
- Animate too many charts simultaneously
- Forget to set `animate: true`
- Use elastic/bounce for serious data

## 🎉 You're Ready!

Now you can create beautiful, smooth chart animations! 🚀

**Quick Start Command**:
```bash
npm test chart-animation-integration.test.ts  # Verify setup
open examples/sprint3-animation-demo.html      # See it in action
```
