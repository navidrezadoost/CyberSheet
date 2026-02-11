# 🚀 Local Development & Testing Guide

This guide walks you through the complete workflow for developing and testing CyberSheet adapters locally.

## Quick Start

```bash
# 1. Build all packages
npm run workflow:build

# 2. Test vanilla JS implementation
npm run test:vanilla

# 3. Start examples server
npm run dev
```

## Project Structure

```
cyber-sheet-excel/
├── packages/
│   ├── core/                    # Core engine (independent)
│   ├── renderer-canvas/          # Canvas renderer
│   ├── react/                   # React adapter
│   ├── vue/                     # Vue adapter
│   ├── angular/                 # Angular adapter
│   ├── svelte/                  # Svelte adapter
│   └── io-xlsx/                 # XLSX I/O utilities
├── test-projects/               # Standalone test applications
│   ├── vanilla-js/              # Pure JS test
│   ├── react-app/               # React test (to be created)
│   ├── vue-app/                 # Vue test (to be created)
│   ├── angular-app/             # Angular test (to be created)
│   └── svelte-app/              # Svelte test (to be created)
├── examples/                    # Example implementations
├── docs/                        # Documentation
└── scripts/                     # Development scripts
```

## Development Workflow

### Phase 1: Build Core Packages

```bash
# Build all packages
npm run build:packages

# Or build individually
cd packages/core && npm run build
cd packages/renderer-canvas && npm run build
cd packages/react && npm run build
# etc...
```

**What gets built:**
- TypeScript compiled to JavaScript
- Type definitions (`.d.ts` files)
- Source maps for debugging

### Phase 2: Test Vanilla JS (No Framework)

This verifies core + renderer work independently:

```bash
cd test-projects/vanilla-js
npm install
npm run dev
```

**Open:** `http://localhost:3000`

**Test Checklist:**
- ✅ Canvas renders
- ✅ Data displays
- ✅ Formulas calculate
- ✅ Zoom works
- ✅ Export functions
- ✅ No console errors

### Phase 3: Test Framework Adapters

#### React

```bash
cd test-projects/react-app
npm install
npm start
```

**Test:**
- Component mounts
- Props update reactively
- Event callbacks fire
- Hot reload works
- TypeScript types recognized

#### Vue

```bash
cd test-projects/vue-app
npm install
npm run dev
```

**Test:**
- Component reactive
- v-model bindings
- Composition API hooks
- Emitted events

#### Angular

```bash
cd test-projects/angular-app
npm install
npm start
```

**Test:**
- Module imports
- Service injection
- Change detection
- RxJS integration

#### Svelte

```bash
cd test-projects/svelte-app
npm install
npm run dev
```

**Test:**
- Reactive statements
- Store integration
- Component slots
- Animations

### Phase 4: Run Monorepo Examples

```bash
# From root
npm run dev
```

**Browse examples:**
- `http://localhost:5173/examples/react-demo.html` - React demo
- `http://localhost:5173/examples/react-index.html` - React viewer
- `http://localhost:5173/examples/index.html` - Vanilla demo

### Phase 5: Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run e2e

# E2E with UI
npm run e2e:headed
```

## Making Changes

### Editing Core Package

```bash
cd packages/core

# Make your changes to src/**/*.ts

# Rebuild
npm run build

# Run tests
npm test

# Test in vanilla-js
cd ../../test-projects/vanilla-js
npm run dev  # Should reflect changes
```

### Editing Renderer Package

```bash
cd packages/renderer-canvas

# Make changes

# Rebuild
npm run build

# Test immediately
cd ../../test-projects/vanilla-js
npm run dev
```

### Editing React Adapter

```bash
cd packages/react

# Make changes

# Rebuild
npm run build

# Test
npm run dev  # Uses examples/react-demo.html
```

## Debugging Tips

### 1. Check Build Output

```bash
# Verify dist/ folder exists
ls -la packages/core/dist/
ls -la packages/renderer-canvas/dist/
ls -la packages/react/dist/
```

### 2. Check Type Definitions

```bash
# Verify .d.ts files generated
find packages -name "*.d.ts" -type f
```

### 3. Browser DevTools

- **Console**: Check for errors/warnings
- **Network**: Verify modules load
- **Performance**: Profile rendering
- **Memory**: Check for leaks

### 4. VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Vanilla JS",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/test-projects/vanilla-js"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug React Demo",
      "url": "http://localhost:5173/examples/react-demo.html",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### 5. Enable Verbose Logging

In your code:

```typescript
// Core
workbook.setDebugMode?.(true);

// Renderer
renderer.setDebugMode?.(true);

// Or set globally
window.DEBUG = true;
```

## Common Issues & Solutions

### Issue: "Cannot find module @cyber-sheet/core"

**Solution:**
```bash
# Rebuild packages
npm run build:packages

# Reinstall test project
cd test-projects/vanilla-js
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors in test project

**Solution:**
```bash
# Ensure dist/ and .d.ts files exist
ls packages/core/dist/

# Rebuild if missing
cd packages/core && npm run build
```

### Issue: Changes not reflecting

**Solution:**
```bash
# Hard rebuild
npm run clean
npm run build:packages

# Clear browser cache
# Restart dev server
```

### Issue: Canvas not rendering

**Solution:**
- Check container has explicit dimensions
- Verify renderer initialized
- Check browser console for errors
- Try different browser

## Testing Checklist

Before committing changes:

### Core Package
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors
- [ ] No breaking API changes (or documented)
- [ ] Exports properly defined

### Renderer Package
- [ ] Canvas renders correctly
- [ ] Performance acceptable (>60fps)
- [ ] Memory usage reasonable
- [ ] Touch events work on mobile

### React Adapter
- [ ] Component mounts without errors
- [ ] Props update reactively
- [ ] Events emit correctly
- [ ] No memory leaks on unmount
- [ ] TypeScript types work

### Vue Adapter
- [ ] Reactive data works
- [ ] Composition API hooks work
- [ ] v-model bindings work
- [ ] Events emit properly

### Angular Adapter
- [ ] Module imports correctly
- [ ] Service injection works
- [ ] Change detection triggers
- [ ] No circular dependencies

### Svelte Adapter
- [ ] Reactive statements work
- [ ] Stores integrate properly
- [ ] No memory leaks
- [ ] TypeScript support

## Performance Testing

### Benchmark Rendering

```typescript
// In browser console
const start = performance.now();
renderer.render();
const end = performance.now();
console.log(`Render time: ${end - start}ms`);
```

### Measure Memory

```typescript
// Before
const before = performance.memory.usedJSHeapSize;

// Do something
// ...

// After
const after = performance.memory.usedJSHeapSize;
console.log(`Memory used: ${(after - before) / 1024 / 1024}MB`);
```

### Profile in Chrome

1. Open DevTools → Performance
2. Click Record
3. Interact with sheet
4. Stop recording
5. Analyze flame graph

## Publishing Workflow

### Pre-publish Checklist

- [ ] All tests passing
- [ ] All packages build successfully
- [ ] Examples work correctly
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers bumped consistently

### Publish Commands

```bash
# 1. Bump versions
npm version minor --workspaces

# 2. Build all
npm run build:packages

# 3. Run tests
npm test
npm run e2e

# 4. Publish (dry run first)
npm publish --workspaces --access public --dry-run

# 5. Actual publish
npm publish --workspaces --access public
```

## Next Steps

1. ✅ Complete vanilla-js test project
2. 🔄 Create React test project
3. 🔄 Create Vue test project  
4. 🔄 Create Angular test project
5. 🔄 Create Svelte test project
6. 🔄 Add E2E tests for each adapter
7. 🔄 Performance benchmarks
8. 🔄 Complete documentation
9. 📦 Prepare for NPM publish

## Resources

- [Adapter Architecture](./ADAPTER_ARCHITECTURE.md)
- [Core API Docs](./api/CORE_API.md)
- [Renderer API Docs](./api/RENDERER_API.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Formula Guide](./FORMULA_ARCHITECTURE.md)

## Getting Help

- Check [GitHub Issues](https://github.com/navidrezadoost/cyber-sheet-excel/issues)
- Review [Examples](../examples/)
- Read [Documentation](./README.md)
- Join Discussions

---

**Happy coding! 🚀**
