# Adapter Architecture Guide

> **📖 See also**: [ADAPTER_PATTERN.md](./ADAPTER_PATTERN.md) for detailed guidelines on writing thin adapters

## Overview

CyberSheet follows a **clean separation of concerns** architecture where the core engine is completely independent, and framework-specific adapters provide seamless integration.

**Key Principle**: Adapters are thin API bindings. All logic belongs in the core.

```
┌─────────────────────────────────────────────────────────────┐
│                     Framework Adapters                       │
│  (@cyber-sheet/react, vue, angular, svelte)                │
│                  [Thin - API bindings only]                  │
├─────────────────────────────────────────────────────────────┤
│                     Renderer Layer                           │
│              (@cyber-sheet/renderer-canvas)                  │
│        [Fat - Contains physics, scroll, rendering]          │
├─────────────────────────────────────────────────────────────┤
│                     Core Engine                              │
│                  (@cyber-sheet/core)                         │
│  [Fat - Workbook, Worksheet, Formula Engine, Events]       │
└─────────────────────────────────────────────────────────────┘
```

## Package Structure

### 1. **Core Package** (`@cyber-sheet/core`)
- **Purpose**: Pure JavaScript engine with zero dependencies
- **Responsibilities**:
  - Workbook and Worksheet data models
  - Formula calculation engine
  - Event system
  - Cell styling and formatting
  - Excel color system
  - I18n support
  - Collaboration engine
  - Pivot table engine
- **No Framework Dependencies**: Can be used standalone

### 2. **Renderer Package** (`@cyber-sheet/renderer-canvas`)
- **Purpose**: High-performance canvas rendering
- **Responsibilities**:
  - Multi-layer canvas rendering
  - Virtualization for large datasets
  - Accessibility (WCAG 2.1 AA)
  - Export to CSV/JSON/PNG
  - Touch and mouse interactions
  - Cell editing UI
- **Dependencies**: Only `@cyber-sheet/core` as peer dependency

### 3. **Framework Adapters**

#### React (`@cyber-sheet/react`)
```typescript
// Exports
- <CyberSheet />          // Main component
- <FormulaBar />          // Formula input component
- <FormulaSuggestions />  // Formula autocomplete
- useCyberSheet()         // Hook for programmatic access
- useFormulaController()  // Hook for formula operations
```

#### Vue (`@cyber-sheet/vue`)
```typescript
// Exports
- <CyberSheet />          // Vue component
- useCyberSheet()         // Composition API hook
```

#### Angular (`@cyber-sheet/angular`)
```typescript
// Exports
- CyberSheetModule        // Angular module
- CyberSheetComponent     // Component
- CyberSheetService       // Injectable service
```

#### Svelte (`@cyber-sheet/svelte`)
```typescript
// Exports
- <CyberSheet />          // Svelte component
- createCyberSheetStore() // Svelte store
- initializeCyberSheet()  // Initialization helper
```

## Installation Patterns

### Option 1: Framework Adapter (Recommended)
Users get the best DX with framework-specific features:

```bash
# React users
npm install @cyber-sheet/react

# Vue users
npm install @cyber-sheet/vue

# Angular users
npm install @cyber-sheet/angular

# Svelte users
npm install @cyber-sheet/svelte
```

**Peer dependencies** automatically pulled: `@cyber-sheet/core` and `@cyber-sheet/renderer-canvas`

### Option 2: Core-Only (Advanced)
For users who want full control:

```bash
npm install @cyber-sheet/core @cyber-sheet/renderer-canvas
```

Build custom integration from scratch.

### Option 3: Vanilla JS
For non-framework projects:

```bash
npm install @cyber-sheet/core @cyber-sheet/renderer-canvas
```

Use the renderer directly with vanilla JavaScript.

## Adapter Implementation Pattern

Each adapter should follow this structure:

### 1. **Component Wrapper**
- Creates container element
- Initializes renderer
- Manages lifecycle (mount/unmount)
- Handles props/reactive updates

### 2. **State Management Integration**
- React: useState/useEffect
- Vue: ref/reactive/computed
- Angular: RxJS/Signals
- Svelte: stores/reactive statements

### 3. **Event Bridging**
- Convert renderer events to framework events
- Emit as native framework events (callbacks, emitters, etc.)

### 4. **Prop Validation**
- Type-safe props using TypeScript
- Runtime validation for critical props

### 5. **Cleanup**
- Dispose renderer on unmount
- Remove event listeners
- Clear references

## Example: React Adapter Pattern

```typescript
import { useEffect, useRef } from 'react';
import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

export const CyberSheet = ({ 
  workbook, 
  sheetName,
  onCellChange,
  zoom = 1.0 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  // Initialize renderer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const sheet = sheetName 
      ? workbook.getSheet(sheetName) 
      : workbook.activeSheet;
    
    if (!sheet) return;

    const renderer = new CanvasRenderer(
      containerRef.current, 
      sheet
    );
    
    rendererRef.current = renderer;

    // Cleanup
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [workbook, sheetName]);

  // Handle zoom changes
  useEffect(() => {
    if (rendererRef.current && typeof zoom === 'number') {
      rendererRef.current.setZoom?.(zoom);
    }
  }, [zoom]);

  // Bridge events
  useEffect(() => {
    const sheet = workbook.getSheet(sheetName || '');
    if (!sheet) return;

    const unsubscribe = sheet.on((event) => {
      if (event.type === 'cell-changed') {
        onCellChange?.(event);
      }
    });

    return unsubscribe;
  }, [workbook, sheetName, onCellChange]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
```

## Testing Strategy

### 1. **Core Package Tests**
```bash
cd packages/core
npm test
```
- Unit tests for all data models
- Formula engine tests
- Event system tests
- No framework dependencies

### 2. **Renderer Package Tests**
```bash
cd packages/renderer-canvas
npm test
```
- Canvas rendering tests
- Virtualization tests
- Accessibility tests
- Mock DOM environment (jsdom)

### 3. **Adapter Integration Tests**
Each adapter should have:
- Component mounting tests
- Props update tests
- Event emission tests
- Lifecycle tests
- Framework-specific patterns

### 4. **E2E Tests**
```bash
npm run e2e
```
- Real browser tests with Playwright
- Test all framework examples
- Performance benchmarks

## Local Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start dev server
npm run dev
```

### Testing Adapters Locally

#### 1. Link packages locally
```bash
# In the monorepo root
npm link

# Link core
cd packages/core
npm link

# Link renderer
cd packages/renderer-canvas
npm link

# Link React adapter
cd packages/react
npm link
```

#### 2. Create test projects
```bash
# React test app
cd test-projects
npx create-react-app react-test
cd react-test
npm link @cyber-sheet/react @cyber-sheet/core @cyber-sheet/renderer-canvas

# Vue test app
cd test-projects
npm create vue@latest vue-test
cd vue-test
npm link @cyber-sheet/vue @cyber-sheet/core @cyber-sheet/renderer-canvas

# Angular test app
cd test-projects
npx @angular/cli new angular-test
cd angular-test
npm link @cyber-sheet/angular @cyber-sheet/core @cyber-sheet/renderer-canvas

# Svelte test app
cd test-projects
npm create vite@latest svelte-test -- --template svelte-ts
cd svelte-test
npm link @cyber-sheet/svelte @cyber-sheet/core @cyber-sheet/renderer-canvas
```

#### 3. Test in examples directory
The monorepo includes working examples:
```bash
# Start Vite dev server
npm run dev

# Opens http://localhost:5173
# Navigate to:
# - /examples/react-index.html (React examples)
# - /examples/index.html (Vanilla JS)
```

## Publishing Strategy

### NPM Organization
All packages published under `@cyber-sheet/*` scope.

### Versioning
Use semantic versioning synchronized across packages:
- Core: `1.0.0`
- Renderer: `1.0.0`
- All adapters: `1.0.0`

### Pre-release Checklist
1. ✅ All tests passing
2. ✅ Build successful for all packages
3. ✅ Examples working
4. ✅ Documentation updated
5. ✅ CHANGELOG.md updated
6. ✅ Version bumped consistently

### Release Command
```bash
# Bump versions
npm version minor --workspaces

# Build all packages
npm run build

# Publish to npm
npm publish --workspaces --access public
```

## Debugging Tips

### 1. Enable Verbose Logging
```typescript
// In core package
workbook.setDebugMode(true);

// In renderer
renderer.setDebugMode(true);
```

### 2. React DevTools
- Install React DevTools extension
- Inspect component hierarchy
- Check prop values and state

### 3. Vue DevTools
- Install Vue DevTools extension
- Monitor reactive data
- Track component lifecycle

### 4. Browser DevTools
- Canvas inspection (Chrome has canvas overlay)
- Performance profiling
- Memory snapshots

### 5. Playwright Inspector
```bash
# Run E2E tests with inspector
npm run e2e -- --debug
```

## Common Issues & Solutions

### Issue: "Module not found: @cyber-sheet/core"
**Solution**: Ensure peer dependencies are installed:
```bash
npm install @cyber-sheet/core @cyber-sheet/renderer-canvas
```

### Issue: Canvas not rendering
**Solution**: Check container has explicit dimensions:
```css
#sheet-container {
  width: 800px;
  height: 600px;
}
```

### Issue: Events not firing
**Solution**: Verify event listeners are attached after renderer initialization:
```typescript
renderer.on('cellChange', handler); // ✅
// Not: Add listener before renderer created ❌
```

### Issue: Formulas not calculating
**Solution**: Ensure FormulaEngine is set on workbook:
```typescript
import { FormulaEngine } from '@cyber-sheet/core';
workbook.setFormulaEngine(new FormulaEngine());
```

## Next Steps

1. ✅ Review this architecture document
2. 🔄 Complete adapter implementations
3. 🔄 Create comprehensive examples for each framework
4. 🔄 Set up local test projects
5. 🔄 Add integration tests
6. 🔄 Performance benchmarking
7. 🔄 Documentation for each adapter
8. 📦 Publish to NPM

## Resources

- [Core API Documentation](./api/CORE_API.md)
- [Renderer API Documentation](./api/RENDERER_API.md)
- [Formula Engine Guide](./FORMULA_ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Examples](../examples/README.md)
