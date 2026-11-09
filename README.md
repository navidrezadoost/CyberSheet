# 🚀 CyberSheet Excel

**Canvas-first spreadsheet project — current supported boundaries are documented below**

[![npm version](https://img.shields.io/npm/v/@cyber-sheet/core)](https://www.npmjs.com/package/@cyber-sheet/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@cyber-sheet/core)](https://bundlephobia.com/package/@cyber-sheet/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-project-blue)](https://www.typescriptlang.org/)

> **R1 status:** The supported React initialization path creates an empty Workbook with `Workbook.create()`. Workbook-owned sheets are read-only views. Workbook cell, style, and metadata writes are not available in this phase; XLSX Workbook restoration remains gated. The capability figures elsewhere in this README are historical project claims unless explicitly qualified and backed by linked evidence.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Why CyberSheet?](#-why-cybersheet)
- [Key Features](#-key-features)
- [Performance Benchmarks](#-performance-benchmarks)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Framework Integration](#-framework-integration)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**CyberSheet Excel** is a spreadsheet project with a canvas renderer and framework packages. Current package and feature support varies; this README distinguishes the present R1 boundary from historical project goals and unverified claims.

### **Project Mission**

To provide enterprise-grade spreadsheet functionality in web applications without the performance penalties, vendor lock-in, and accessibility gaps found in existing solutions. CyberSheet achieves this through:

- **Canvas-First Rendering**: Multi-layer architecture with hardware acceleration
- **Framework Packages**: React, Vue, Angular, Svelte, Core, and Canvas Renderer packages exist in this repository; their published compatibility and feature completeness are not established by package presence alone.
- **R1 Workbook Boundary**: `Workbook.create()` creates empty sheets; Workbook sheet views support reads. Workbook-owned writes and XLSX restoration are unavailable pending later authorized slices.
- **Export Boundary**: XLSX and CSV have bounded first-party export evidence. Other ExportPanel formats are unavailable or informational in the current implementation.

### **What Makes CyberSheet Different?**

| Comparison area | CyberSheet status |
|:---|:---|
| Rendering | Canvas renderer package is present; comparative performance is not currently qualified here. |
| Bundle size and memory | Historical estimates; no current reproducible measurement is provided here. |
| Framework support | Packages exist; framework-specific feature and compatibility claims require qualification. |
| Workbook mutation and import | Workbook-owned writes and XLSX restoration are unavailable in R1. |
| Accessibility | Accessibility-related source exists; WCAG conformance is not established by this README. |

---

## ✨ Why CyberSheet?

### **The Problem with Current Solutions**

Traditional spreadsheet libraries suffer from critical limitations:

- **Performance Issues**: 10,000+ DOM nodes cause lag, janky scrolling, and memory bloat
- **Bundle Bloat**: 200-500KB+ dependencies slow down page loads
- **Excel Incompatibility**: Missing critical features like borders, theme colors, and advanced formulas
- **Poor Mobile Support**: Touch events, pinch-zoom, and responsive layouts are afterthoughts
- **Accessibility Gaps**: Screen readers, keyboard navigation, and ARIA support incomplete
- **Vendor Lock-in**: Heavy framework dependencies prevent reuse across projects

### **The CyberSheet Solution**

**Historical feature inventory, not a current R1 verification statement:** Earlier project materials reported rendering, bundle-size, formula-count, framework, accessibility, mobile, and test-coverage figures. Those estimates have not been requalified by the current R1 review. Current Workbook writes and XLSX restoration remain unavailable; consult the API and export qualifications below before relying on any feature claim.

---

## 🎯 Key Features

### **🚀 Performance & Scalability — historical claims, not current guarantees**

- **Multi-Layer Canvas Architecture**: 4 independent layers (background/grid/content/overlay)
- **DPR-Perfect Rendering**: Crisp gridlines at 1×, 1.25×, 1.5×, 2×, 3×, 4× zoom levels
- **Hardware Acceleration**: GPU-powered compositing with zero layout thrashing
- **Virtualization**: Large-sheet behavior and infinite-scroll limits require current measurement
- **Scrolling performance**: Previously reported frame-rate figures are historical and unverified

### **🎨 Excel-Level Rendering — feature claims require current verification**

- **11 Border Styles**: All Excel border types (thin, medium, dashed, dotted, double, etc.)
- **Excel Theme Colors**: Full Office theme palette with tint/shade support
- **Subpixel Text**: ClearType/LCD optimization for razor-sharp text
- **Per-Layer Anti-Aliasing**: Granular AA control (crisp gridlines, smooth charts)
- **Conditional Formatting**: Feature coverage and completion status are not currently qualified

### **🧮 Formula Engine — completion percentage unverified**

- **Formula functions**: Math, statistical, financial, text, logical, lookup, and date/time categories are represented; supported count and parity are unverified
- **Advanced Functions**: Array formulas, LAMBDA, LET, MAKEARRAY, dynamic arrays
- **Spill Support**: Dynamic array spilling with automatic range expansion
- **Dependency Graph**: DAG-based recalculation with circular reference detection
- **Differential Testing**: Optimized vs. naive engines validated at 100/1K/10K scale
- **Formula Fuzzing**: 10K adversarial operations, 0 failures

### **📊 Charts & Visualization — completion percentage unverified**

- **10 Chart Types**: Bar, line, pie, scatter, area, combo, waterfall, treemap, radar, 3D
- **Advanced Features**: Dual Y-axes, trendlines, custom renderers, animations
- **Interactive Charts**: Pan, zoom, touch gestures, real-time data streaming
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Chart testing**: Current test count and coverage are not qualified here

### **⌨️ Keyboard Shortcuts Engine — completion percentage unverified**

- **Transformation Engine**: Insert/delete columns with 11 structural invariants
- **Differential Correctness**: Optimized vs. naive validation at scale
- **Metamorphic Properties**: 26 mathematical relationships verified
- **Adversarial Fuzzing**: Formula operations stress-tested (tokenization, DAG rebuild)
- **~40 Shortcuts Implemented**: Navigation, editing, formatting (60 more planned)

### **♿ Accessibility — WCAG conformance unverified**

- **Keyboard Navigation**: Arrow keys, Tab, Enter, Escape, Ctrl+shortcuts
- **Screen Reader Support**: ARIA live regions, cell announcements, formula readback
- **IME Support**: Japanese, Chinese, Korean input method editors
- **RTL Languages**: Full bidirectional text support (Arabic, Hebrew)
- **High Contrast**: Respects system color preferences

### **🌍 Internationalization — locale count and coverage unverified**

- Earlier project materials listed these locale identifiers; current locale coverage is unverified: en-US, es-ES, fr-FR, de-DE, ja-JP, zh-CN, ar-SA, ru-RU, pt-BR, it-IT
- **Locale-Aware Formatting**: Numbers, dates, currencies per region
- **RTL Support**: Right-to-left layout and text direction
- **Unicode Handling**: Full emoji, CJK, and symbol support

### **💾 Import/Export — current R1 qualification**

- **XLSX import**: Workbook-producing loaders are fail-closed pending R6 restoration; do not rely on Workbook restoration in this phase.
- **XLSX export**: Bounded first-party Workbook export is available; this does not imply full XLSX feature preservation.
- **CSV export**: Bounded first-party export supports the reviewed delimiter path; the header-option contract remains unresolved.
- **PDF, ODS, TXT, and HTML ExportPanel choices**: PDF is informational; ODS/TXT/HTML do not currently produce artifacts through the reviewed panel.
- **JSON and PNG export**: Availability and supported ownership paths are not established by the current R1 review.

---

## 🏆 Performance Benchmarks

### **Historical Performance Snapshot (April 2026; not reverified for this release)**

The following table records previously published estimates only. Its measurements, environment, competitor comparisons, and methodology have not been reproduced as part of the current R1 qualification and must not be read as present performance guarantees.

| Benchmark | CyberSheet | AG Grid | Handsontable | RevoGrid | Univer |
|-----------|------------|---------|--------------|----------|--------|
| **Initial Render** (10K cells) | **45ms** ⚡ | 450ms | 380ms | 120ms | 85ms |
| **Scrolling** (100px/frame) | **8ms** ⚡ | 120ms | 95ms | 25ms | 18ms |
| **Memory Usage** (10K cells) | **8MB** ⚡ | 85MB | 60MB | 25MB | 18MB |
| **Bundle Size** (min+gzip) | **85KB** ⚡ | 300KB | 280KB | 200KB | 500KB+ |
| **1M Cells** (load time) | **2.1s** ✅ | ❌ Crash | ❌ Crash | 4.8s | 5.2s |
| **FPS** (smooth scroll) | **125 FPS** ⚡ | 8 FPS | 15 FPS | 60 FPS | 60 FPS |
| **Accessibility** (WCAG 2.1 AA) | **✅ Full** | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | ⚠️ Limited |
| **RTL/i18n** | **✅ 10 locales** | ⚠️ Basic | ✅ Good | ⚠️ Limited | ⚠️ Basic |

**Test Environment**: MacBook Pro 16" (M1 Max), Chrome 120, 5K Retina (DPR=2)

### **Historical interpretation (not a current guarantee)**

- ⚡ **Instant Load** - Render 10,000 cells in under 50ms
- ⚡ **Butter-Smooth Scrolling** - 125 FPS on standard hardware
- ⚡ **Massive Scale** - Handle 1 million cells without crashing
- ⚡ **Tiny Footprint** - 85KB vs 300KB+ for competitors
- ⚡ **Low Memory** - 10× less RAM usage

📊 Historical benchmark claims require a current reproducible benchmark report before use as product guarantees. The previously linked `docs/PERFORMANCE.md` is not present in this repository.

---

## 🛠️ Technology Stack

### **Core Technologies**

- **Canvas API**: Multi-layer rendering with hardware acceleration
- **TypeScript 6.0**: Strict typing, advanced type inference
- **ES Modules**: Tree-shakeable, zero-dependency architecture
- **Web Workers**: Off-thread formula calculation is planned; the React default worker distribution contract is not currently qualified.
- **OffscreenCanvas**: Non-blocking chart/export rendering

### **Testing & Quality Assurance**

- **Jest**: Used in the repository; the previously stated 2,050+ total is a historical count and is not a current passing-test qualification.
- **Playwright**: End-to-end testing for real-world scenarios
- **Property-Based Testing**: Formula fuzzing with automatic shrinking
- **Differential Testing**: Optimized vs. naive engine validation
- **Metamorphic Testing**: 26 mathematical properties verified
- **Coverage**: 47% core coverage (targeting 80%+)

### **Build Tools**

- **TypeScript Compiler**: Incremental builds with project references
- **Vite**: Lightning-fast dev server and bundler
- **ESLint**: Code quality and consistency
- **npm Workspaces**: Monorepo package management

### **Framework Adapters**

| Framework | Package | Status |
|-----------|---------|--------|
| React | `@cyber-sheet/react` | Package exists; current supported boundary is qualified below |
| Vue | `@cyber-sheet/vue` | Package exists; populated editing and framework compatibility are not qualified |
| Angular | `@cyber-sheet/angular` | Package exists; populated editing and framework compatibility are not qualified |
| Svelte | `@cyber-sheet/svelte` | Package exists; populated editing and framework compatibility are not qualified |
| Core / standalone APIs | `@cyber-sheet/core` | Workbook-owned reads are available; standalone Worksheet APIs are a separate boundary |

---

## 📦 Installation

### **Prerequisites**

The package names below match local workspace manifests. Registry publication, the latest released versions, and compatibility of those releases have not been checked here.

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or yarn/pnpm)
- **Browser**: Modern browsers with Canvas API support (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+)

### **Install via npm**

```bash
# Core package (zero dependencies)
npm install @cyber-sheet/core

# Canvas renderer
npm install @cyber-sheet/renderer-canvas

# Framework bindings (optional)
npm install @cyber-sheet/react        # For React projects
npm install @cyber-sheet/vue          # For Vue projects
npm install @cyber-sheet/angular      # For Angular projects
npm install @cyber-sheet/svelte       # For Svelte projects

# XLSX import/export (optional)
npm install @cyber-sheet/io-xlsx
```

### **Install via yarn**

```bash
yarn add @cyber-sheet/core @cyber-sheet/renderer-canvas
```

### **Install via pnpm**

```bash
pnpm add @cyber-sheet/core @cyber-sheet/renderer-canvas
```

### **CDN (for prototyping)**

The repository contains Core and Canvas Renderer package manifests, but CDN publication, `+esm` resolution, transitive dependency loading, and browser execution have not been verified. Do not treat the former CDN snippets as a supported distribution path.

---

## ⚡ Quick Start

### **1. Vanilla JavaScript**

```javascript
import { Workbook } from '@cyber-sheet/core';

// R1 creates an empty Workbook. Initial cell data and subsequent
// Workbook-owned writes are not available in this phase.
const workbook = Workbook.create({
  sheets: [{ name: 'Sales Data', rows: 100, cols: 26 }],
});

// Workbook sheets are owner-backed read-only views.
const sheet = workbook.getSheet('Sales Data');
console.log(sheet?.getCellValue({ row: 1, col: 1 })); // null for an empty cell
console.log(workbook.getSheetNames());

// The Canvas Renderer APIs below currently accept standalone Worksheet,
// not WorkbookSheetView. No Workbook-backed vanilla renderer example is
// documented until an owner-view-compatible renderer contract is available.
```

Standalone `Worksheet` mutation remains a separate API. It does not provide a way to write to a sheet owned by a Workbook. See the API boundary below.

### **2. React**

```tsx
import { CyberSheet } from '@cyber-sheet/react';
import { Workbook } from '@cyber-sheet/core';
import { useMemo } from 'react';

function App() {
  const workbook = useMemo(
    () => Workbook.create({ sheets: [{ name: 'Sheet1', rows: 100, cols: 26 }] }),
    [],
  );

  return (
    <div style={{ width: 800, height: 600 }}>
      <CyberSheet workbook={workbook} />
    </div>
  );
}
```

This renders the client-side sheet surface with empty initial cells. Initial data population, cell editing, and Workbook-owned formatting are unavailable pending their authorized mutation slices.

### **3. Vue**

The earlier populated Workbook example is removed: the current adapter creates an empty Workbook and rejects nonempty initial data. Its write helper is unavailable pending R2. A current, populated Vue integration example is not yet qualified.

### **4. Angular**

The earlier populated Workbook example is removed: the current component initializes an empty Workbook and rejects nonempty initial data. Its Workbook-owned editing behavior is unavailable pending R2. A current, populated Angular integration example is not yet qualified.

---

## 🔧 Framework Integration

### **React Integration**

```bash
npm install @cyber-sheet/react
```

**Qualified boundary**: `<CyberSheet />` accepts a required `Workbook` and renders the client-side surface. Its current props are defined by the package declarations; this README does not claim cell-editing callbacks or workbook mutation support.

#### Server rendering and React Server Components

`@cyber-sheet/react` supports traditional React server rendering of the `CyberSheet` host shell, followed by browser hydration and client-side spreadsheet initialization. The server output is an empty renderer container: it does not include spreadsheet cells, grid content, or workbook data. This is shell SSR, not server-rendered spreadsheet content.

For React Server Components (RSC) applications, establish a client boundary in your application and create the `Workbook` inside that boundary. Do not import Cyber Sheet components directly into an RSC server component or pass a `Workbook` instance across the server/client boundary. Framework-specific RSC integration, including Next.js and React Flight, has not been verified.

Load the exported stylesheets from the stylesheet entrypoint allowed by your host framework. The Node-target bundles omit stylesheet imports, so server-side package import does not load these styles automatically. The Excel application stylesheet is available at the public `@cyber-sheet/react/styles/excel-app.css` export; ribbon applications can also load `@cyber-sheet/react/styles/ribbon.css`.

```tsx
// In the host application's global stylesheet entrypoint:
import '@cyber-sheet/react/styles/excel-app.css';
```

```tsx
'use client';

import { useMemo } from 'react';
import { Workbook } from '@cyber-sheet/core';
import { CyberSheet } from '@cyber-sheet/react';

export function SpreadsheetClient() {
  const workbook = useMemo(
    () => Workbook.create({ sheets: [{ name: 'Sheet1', rows: 100, cols: 26 }] }),
    [],
  );

  return (
    <div style={{ width: '100%', height: 600 }}>
      <CyberSheet workbook={workbook} />
    </div>
  );
}
```

### **Vue Integration**

```bash
npm install @cyber-sheet/vue
```

The package exposes Vue component/composable entrypoints. The current composable creates an empty Workbook and rejects nonempty initial data; Workbook writes are unavailable pending R2. Two-way binding, populated editing, and broader framework compatibility are not qualified here.

### **Angular Integration**

```bash
npm install @cyber-sheet/angular
```

The package exposes Angular component and service entrypoints. The current component initializes an empty Workbook and rejects nonempty initial data; Workbook writes are unavailable pending R2. Broader framework compatibility and the former event/accessibility claims are not qualified here.

### **Svelte Integration**

```bash
npm install @cyber-sheet/svelte
```

The package exposes a Svelte component and store. Nonempty initial data is rejected pending R2, and populated editing/SSR compatibility are not qualified here. Do not rely on its write helper as a supported Workbook mutation path.

---

## 🏗️ Architecture

### **Package Structure (simplified workspace view)**

```
cyber-sheet-excel/
├── packages/
│   ├── core/                 # Workbook, Worksheet, formulas, read views
│   ├── renderer-canvas/      # Canvas and chart rendering APIs
│   ├── io-xlsx/              # XLSX import/export package
│   ├── react/                # React components and Backstage panels
│   ├── vue/                  # Vue adapter package
│   ├── angular/              # Angular adapter package
│   └── svelte/               # Svelte adapter package
├── examples/                 # Repository examples (not all R1-qualified)
└── docs/                     # Project and engineering documentation
```

This is a navigation aid, not a statement that every package feature is currently supported or every example is compatible with the R1 Workbook boundary.

### **Multi-Layer Canvas Architecture**

CyberSheet uses a **4-layer canvas architecture** for maximum performance:

```
┌─────────────────────────────────────┐
│  Layer 4: Overlay (Semi-transparent) │ ← Selection, highlights, cursors
├─────────────────────────────────────┤
│  Layer 3: Content (Subpixel text)   │ ← Cell text, borders, formulas
├─────────────────────────────────────┤
│  Layer 2: Grid (Pixel-snapped)      │ ← Gridlines, row/column labels
├─────────────────────────────────────┤
│  Layer 1: Background (Anti-aliased) │ ← Sheet fills, header backgrounds
└─────────────────────────────────────┘
```

**Benefits**:
- **Granular Invalidation**: Text edits only redraw Layer 3 (not gridlines)
- **GPU Compositing**: Browsers composite layers in hardware
- **Crisp Gridlines**: Pixel-snapping at any DPR (1×, 1.5×, 2×, 4×)
- **Zero Layout Thrashing**: No DOM reflows

### **Formula Engine Architecture**

```
FormulaEngine
├── Tokenizer           → Lexical analysis (=SUM(A1:B10) → tokens)
├── Parser              → AST generation (syntax validation)
├── DependencyGraph     → DAG for incremental recalculation
├── FunctionRegistry    → formula function registry (supported count unverified)
├── EvaluationContext   → Runtime environment (locale, precision)
└── SpillManager        → Dynamic array expansion
```

### **Keyboard Shortcuts Engine**

```
CommandManager
├── TransformationEngine     → Insert/delete with 11 invariants
├── GraphValidator           → Fail-fast validation (6 invariants)
├── UndoManager              → Efficient undo/redo with checkpoints
├── DifferentialTesting      → Optimized vs. naive verification
├── MetamorphicTesting       → 26 mathematical properties
└── FuzzingEngine            → Adversarial stress testing
```

---

## 📚 API Reference

### **Core API**

#### **Workbook initialization and reads (R1)**

```typescript
import { Workbook, type WorkbookSheetView } from '@cyber-sheet/core';

const workbook = Workbook.create({
  sheets: [{ name: 'Sheet1', rows: 100, cols: 26 }],
});
const sheet: WorkbookSheetView | undefined = workbook.getSheet('Sheet1');
const value = sheet?.getCellValue({ row: 1, col: 1 }); // one-based address
```

`Workbook.create()` creates an initial directory of empty, adopted sheets. `getSheet()` and `activeSheet` return owner-backed, read-only views. Cell values that belong to formulas are not exposed as cached results. Workbook-owned cell, style, component, drawing, and other metadata writes are not available in R1. Adding, deleting, renaming, or switching sheets after publication is also unavailable. XLSX Workbook restoration remains gated pending R6.

#### **Standalone Worksheet (separate ownership boundary)**

```typescript
import { Worksheet } from '@cyber-sheet/core';

const standalone = new Worksheet('Scratch');
standalone.setCellValue({ row: 1, col: 1 }, 'Standalone data');
```

Standalone Worksheet mutation does not authorize mutation of a Workbook-owned sheet. Addresses are one-based. Do not pass a WorkbookSheetView to an API whose declaration requires a raw Worksheet. Workbook mutation, structural edits, and metadata operations remain unavailable pending their separately authorized R2/R5 slices.

### **Renderer API**

The Canvas Renderer package root exports `ExcelRenderer`, `CanvasRenderer`, `AccessibilityManager`, `VirtualizationManager`, `ExportPlugin`, and chart-related symbols. Current declarations and input types are authoritative; the former pseudo-signatures in this README were removed because they did not match those declarations. In particular, the cited raw-Worksheet renderer APIs are not a supported WorkbookSheetView rendering route. See the [renderer package entrypoint](./packages/renderer-canvas/src/index.ts), [ExcelRenderer source](./packages/renderer-canvas/src/ExcelRenderer.ts), and [ChartEngine source](./packages/renderer-canvas/src/ChartEngine.ts). These source links document names and signatures, not a broader feature-completion or performance guarantee.

For the Core public exports, see the [Core package entrypoint](./packages/core/src/index.ts) and [Workbook read-view contract](./packages/core/src/workbook-access-types.ts). The previously linked `docs/API_REFERENCE.md`, `docs/RENDERER_API.md`, and `docs/CHART_API.md` files are not present in this repository.

---

## 📖 Documentation

### **Getting Started**

- [Core package metadata](./packages/core/package.json)
- [Quick Start](#-quick-start)
- [Framework Integration](#-framework-integration)

### **Core Concepts**

- [Core architecture and performance notes](./docs/architecture/PERFORMANCE.md) — historical notes, not a current guarantee
- [Formula engine source](./packages/core/src/FormulaEngine.ts)
- [Canvas renderer source](./packages/renderer-canvas/src/index.ts)

### **Advanced Topics**

- [Accessibility Guide](./docs/ACCESSIBILITY_GUIDE.md) — does not establish WCAG conformance
- [Global Settings And User Fonts](./docs/guides/GLOBAL_SETTINGS.md)
- [Keyboard Shortcuts](./docs/KEYBOARD_SHORTCUTS.md) — implementation coverage is not fully qualified here
- [Chart engine source](./packages/renderer-canvas/src/ChartEngine.ts)
- [Conditional-formatting source](./packages/core/src/ConditionalFormattingEngine.ts)
- [Internationalization source](./packages/core/src/I18nManager.ts)

### **API References**

- [Core API entrypoint](./packages/core/src/index.ts)
- [Renderer API entrypoint](./packages/renderer-canvas/src/index.ts)
- [Chart API source](./packages/renderer-canvas/src/ChartEngine.ts)
- [Formula engine source](./packages/core/src/FormulaEngine.ts)

### **Project Status**

- [Changelog](./CHANGELOG.md)
- Historical feature-parity, roadmap, and launch-summary documents previously referenced here are not present; no parity percentage is asserted as a current guarantee.

---

## 🧪 Testing & Quality

### **Historical Test Counts — not a current passing-test total**

Earlier project notes reported the following counts. They are retained as historical figures only; they do not establish the current test inventory, passing status, feature completeness, or coverage.

- 2,050+ total tests
- 155 formula tests
- 740 chart tests
- 434 conditional-formatting tests
- 31 transformation-engine tests
- 50+ error-handling tests

### **Running Tests**

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- packages/core/test/FormulaEngine.test.ts

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run e2e

# Run with coverage
npm test -- --coverage
```

### **Testing Philosophy**

1. **Property-Based Testing**: Formula fuzzing with 10K adversarial operations
2. **Differential Testing**: Optimized vs. naive engine validation
3. **Metamorphic Testing**: 26 mathematical properties verified
4. **Invariant Testing**: 11 structural invariants + 6 graph invariants
5. **Accessibility Testing**: Accessibility tests exist; WCAG 2.1 AA conformance is not established here

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### **Development Setup**

```bash
# Clone repository
git clone https://github.com/yourusername/cyber-sheet-excel.git
cd cyber-sheet-excel

# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Start dev server
npm run dev
```

### **Project Structure**

- **`packages/core`**: Core data model and formula engine
- **`packages/renderer-canvas`**: Canvas rendering and charts
- **`packages/react`**: React bindings
- **`examples/`**: Framework examples
- **`docs/`**: Documentation
- **`tests/`**: Integration tests

### **Code Quality**

- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint**: Run `npm run lint` before submitting PRs
- **Tests**: All new features must have >80% coverage
- **Documentation**: Update docs for API changes

### **Submitting Pull Requests**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

**MIT License** - see [LICENSE](./LICENSE) file for details.

Copyright © 2025-2026 CyberSheet Contributors

---

## 🙏 Acknowledgments

- **Excel Formula Syntax**: Inspired by Microsoft Excel and Google Sheets
- **Canvas Rendering**: Techniques adapted from game engine optimizations
- **Accessibility**: WCAG 2.1 guidelines from W3C
- **Testing**: Property-based testing inspired by QuickCheck and Hypothesis

---

## 📞 Support

- 📧 **Email**: support@cybersheet.dev
- 💬 **Discord**: [Join our community](https://discord.gg/cybersheet)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/cyber-sheet-excel/issues)
- 📖 **Docs**: [Full Documentation](./docs)

---

**Made with ❤️ by the CyberSheet Team**
