# Adapter Pattern & Architecture Guidelines

## Core Principle

**Adapters are thin API bindings. All logic belongs in the core.**

```
┌─────────────────────────────────────────────────────────────┐
│                        END DEVELOPER                        │
│                  (Uses framework adapter)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER (Thin)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  React   │   Vue    │ Angular  │  Svelte  │ Vanilla  │  │
│  │ Binding  │ Binding  │ Binding  │ Binding  │    JS    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                                                             │
│  Purpose: Framework integration only                        │
│  - Component/directive wrappers                             │
│  - Props/events mapping                                     │
│  - Lifecycle hooks                                          │
│  - NO business logic                                        │
│  - NO physics/animation                                     │
│  - NO data manipulation                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CORE LAYER (Fat)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         @cyber-sheet/renderer-canvas                 │  │
│  │  - Scroll physics & boundaries                       │  │
│  │  - RAF batching & optimization                       │  │
│  │  - Selection logic                                   │  │
│  │  - Cell coordinate conversion                        │  │
│  │  - Canvas rendering                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              @cyber-sheet/core                       │  │
│  │  - Workbook/Worksheet models                         │  │
│  │  - Formula engine                                    │  │
│  │  - Data structures                                   │  │
│  │  - Event system                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Good Adapter (React Example)

```tsx
// packages/react/src/CyberSheet.tsx
export const CyberSheet = ({ workbook, sheetName, options }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    // 1. Create core instances
    const sheet = workbook.getSheet(sheetName);
    const renderer = new CanvasRenderer(containerRef.current, sheet, options);
    rendererRef.current = renderer;

    // 2. Setup event forwarding (adapter's only job)
    const onWheel = (e) => {
      e.preventDefault();
      renderer.scrollBy(e.deltaX, e.deltaY); // Simple passthrough
    };

    containerRef.current.addEventListener('wheel', onWheel);
    return () => containerRef.current.removeEventListener('wheel', onWheel);
  }, []);

  return <div ref={containerRef} style={style} />;
};
```

**Why this is good:**
- ✅ Adapter only handles React-specific concerns (refs, effects, JSX)
- ✅ All logic delegated to `renderer.scrollBy()`
- ✅ Simple event forwarding
- ✅ No physics, no math, no business logic
- ✅ Easy to maintain and debug

---

## ❌ Bad Adapter (Anti-pattern)

```tsx
// DON'T DO THIS
export const CyberSheet = ({ workbook, sheetName }) => {
  const [velocity, setVelocity] = useState({ vx: 0, vy: 0 });

  useEffect(() => {
    const onWheel = (e) => {
      // ❌ BAD: Adapter implementing physics
      const friction = 0.92;
      const newVx = velocity.vx + e.deltaX;
      const newVy = velocity.vy + e.deltaY;
      
      // ❌ BAD: Complex boundary logic in adapter
      const max = renderer.getMaxScroll();
      const clampedX = Math.min(Math.max(0, newVx), max.x);
      
      // ❌ BAD: RAF animation in adapter
      requestAnimationFrame(() => {
        renderer.setScroll(clampedX * friction, clampedY * friction);
      });
    };
  }, [velocity]);
};
```

**Why this is bad:**
- ❌ Physics logic duplicated across adapters
- ❌ Hard to maintain (change needs to be replicated in Vue, Angular, Svelte)
- ❌ Adapter fighting with core over state
- ❌ Performance issues (multiple RAF loops)
- ❌ Inconsistent behavior across frameworks

---

## Adapter Responsibilities

### ✅ Adapter SHOULD:
1. **Create core instances** - Instantiate Workbook, Worksheet, CanvasRenderer
2. **Manage lifecycle** - Initialize on mount, cleanup on unmount
3. **Forward events** - Pass DOM events to core methods
4. **Expose props/state** - Map framework props to core API
5. **Handle framework specifics** - Refs, lifecycle hooks, state management

### ❌ Adapter SHOULD NOT:
1. **Implement business logic** - Formula calculations, data validation
2. **Handle physics** - Scrolling, animation, momentum
3. **Manage coordinates** - Cell position calculations
4. **Duplicate core logic** - Boundaries, clamping, transformations
5. **Create animation loops** - RAF, timers, intervals (unless exposing core features)

---

## Core Responsibilities

### ✅ Core SHOULD:
1. **All business logic** - Formulas, validation, data structures
2. **Physics & animation** - Scroll momentum, kinetic effects, easing
3. **Coordinate systems** - Mouse to cell conversion, zoom, DPR
4. **State management** - Scroll position, selections, viewport
5. **Optimization** - RAF batching, dirty rect tracking, caching
6. **Boundaries & constraints** - Max scroll, clamping, bounds checking

---

## Migration Checklist

When refactoring an adapter, ensure:

- [ ] Remove all math/calculations from adapter
- [ ] Remove RAF/animation loops from adapter
- [ ] Remove boundary/clamping logic from adapter
- [ ] Replace with simple core API calls
- [ ] Move logic to core/renderer if not already there
- [ ] Test that behavior is identical
- [ ] Verify other adapters still work

---

## Example Refactor: Scroll Physics

### Before (Bad)
```tsx
// React adapter with 200 lines of physics
const stepScroll = (dx, dy) => {
  const max = renderer.getMaxScroll();
  const overshoot = pos + dx > max ? pos + dx - max : 0;
  const resistance = 1 / Math.sqrt(1 + overshoot / 40);
  const newPos = pos + dx * resistance;
  renderer.setScroll(newPos, ...);
};
```

### After (Good)
```tsx
// React adapter: 1 line
const onWheel = (e) => renderer.scrollBy(e.deltaX, e.deltaY);

// Renderer core: Handles everything
class CanvasRenderer {
  scrollBy(dx, dy) {
    const max = this.getMaxScroll();
    const newX = Math.min(Math.max(0, this.scrollX + dx), max.x);
    const newY = Math.min(Math.max(0, this.scrollY + dy), max.y);
    this.setScroll(newX, newY);
  }
}
```

---

## API Design Principles

### For Core Packages
- **Rich API**: Provide high-level methods that do the right thing
- **Smart defaults**: Sensible behavior out of the box
- **Complete**: Handle all edge cases internally
- **Documented**: Clear docs on what each method does

Example:
```ts
// Good core API
renderer.scrollBy(dx, dy)           // Handles clamping, batching, RAF
renderer.scrollToCell(addr, align)  // Smart positioning
renderer.setZoom(factor)            // Handles invalidation
```

### For Adapters
- **Thin API**: Simple props and events
- **Familiar**: Match framework conventions
- **Minimal**: Only expose what's needed
- **Typed**: Full TypeScript support

Example:
```tsx
// Good adapter API
<CyberSheet
  workbook={workbook}
  sheetName="Sheet1"
  onCellChange={(row, col, value) => {}}
  style={{ width: '100%', height: 600 }}
/>
```

---

## Testing Strategy

### Core Tests
- Unit tests for all logic
- Integration tests for complex flows
- Performance benchmarks
- Cross-browser testing

### Adapter Tests
- Mounting/unmounting
- Props/events forwarding
- Framework integration
- Memory leaks

---

## Benefits of This Architecture

1. **Consistency**: All frameworks behave identically
2. **Maintainability**: Fix once, works everywhere
3. **Performance**: Single optimized path
4. **Simplicity**: Adapters are easy to understand
5. **Testability**: Logic centralized and testable
6. **Extensibility**: Add features to core, adapters inherit

---

## Summary

**Golden Rule**: If you're writing physics, math, or complex logic in an adapter, you're doing it wrong. Move it to core.

**Good adapter**: "Hey core, the user scrolled. Here's deltaX and deltaY. You handle it."

**Bad adapter**: "Let me calculate the velocity, apply friction, check boundaries, do easing, then tell core what to do."
