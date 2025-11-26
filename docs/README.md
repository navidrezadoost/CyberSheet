# CyberSheet Documentation

Welcome to the comprehensive documentation for CyberSheet - the world's most advanced spreadsheet engine for the modern web.

---

## 📚 Documentation Structure

### 🚀 Getting Started

- **[Quick Start Guide](./guides/QUICK_START_COMMENTS.md)** - Get up and running in 5 minutes
- **[Installation Guide](../README.md#-installation)** - Installation for all frameworks
- **[Framework Integration](../README.md#-framework-integration)** - React, Vue, Angular, Svelte examples

### 📖 API Reference

- **[Comments & Events API](./api/COMMENTS_API.md)** - Complete guide to commenting, icons, and cell events
  - Excel comment import/export
  - Custom commenting system
  - Cell event handling (click, hover, right-click)
  - Navigation API (scrollToCell, getCellBounds)
  - Icon overlays (emoji, images, custom)

### 🏗️ Architecture

- **[Architecture Overview](./architecture/PERFORMANCE.md)** - Multi-layer canvas rendering system
- **[Rendering Pipeline](./architecture/RENDERING.md)** - Canvas-based rendering details
- **[Performance](./architecture/PERFORMANCE.md)** - Benchmarks and optimization strategies

### 🧪 Development

- **[E2E Testing Setup](./guides/E2E_SETUP.md)** - Playwright test infrastructure
- **[CI/CD Pipeline](./guides/CI_PIPELINE.md)** - Continuous integration workflow
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical deep-dive

### 📋 Project

- **[Roadmap](./ROADMAP.md)** - Upcoming features and timeline
- **[Process](./PROCESS.md)** - Development process and guidelines
- **[Changelog](../CHANGELOG.md)** - Version history and changes

---

## 🎯 Quick Links by Use Case

### I want to...

#### **Get Started**
→ [Quick Start Guide](./guides/QUICK_START_COMMENTS.md)  
→ [Installation](../README.md#-installation)

#### **Add Comments to Cells**
→ [Comments API - Basic Usage](./api/COMMENTS_API.md#worksheet-comment-api)  
→ [Excel Comment Import](./api/COMMENTS_API.md#excel-comment-importexport)

#### **Handle Cell Events (clicks, hovers)**
→ [Event System](./api/COMMENTS_API.md#renderer-event-system)  
→ [Event Examples](./api/COMMENTS_API.md#complete-examples)

#### **Navigate Programmatically**
→ [Navigation API](./api/COMMENTS_API.md#navigation-api)  
→ [scrollToCell Examples](./api/COMMENTS_API.md#scrolltocell)

#### **Add Icons to Cells**
→ [Cell Icon API](./api/COMMENTS_API.md#cell-icon-api)  
→ [Icon Examples](./api/COMMENTS_API.md#icon-examples)

#### **Import Excel Files**
→ [Excel Import Guide](./api/COMMENTS_API.md#excel-comment-importexport)  
→ [LightweightXLSXParser](./api/COMMENTS_API.md#import-comments-from-excel)

#### **Understand Performance**
→ [Performance Benchmarks](./architecture/PERFORMANCE.md)  
→ [Multi-Layer Canvas](./architecture/RENDERING.md)

#### **Integrate with React/Vue/Angular**
→ [React Integration](../README.md#react)  
→ [Vue Integration](../README.md#vue-3)  
→ [Angular Integration](../README.md#angular)

#### **Run Tests**
→ [E2E Testing Setup](./guides/E2E_SETUP.md)  
→ [CI Pipeline](./guides/CI_PIPELINE.md)

---

## 📊 API Overview

### Core Packages

```typescript
// Core data model
import { Workbook, Worksheet } from '@cyber-sheet/core';

// Canvas renderer
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

// Excel I/O
import { LightweightXLSXParser } from '@cyber-sheet/io-xlsx';

// React bindings
import { useCyberSheet } from '@cyber-sheet/react';
```

### Key Features

| Feature | API | Documentation |
|---------|-----|---------------|
| **Comments** | `sheet.addComment()` | [Comments API](./api/COMMENTS_API.md#worksheet-comment-api) |
| **Icons** | `sheet.setIcon()` | [Icon API](./api/COMMENTS_API.md#cell-icon-api) |
| **Events** | `sheet.on('cell-click')` | [Event System](./api/COMMENTS_API.md#renderer-event-system) |
| **Navigation** | `renderer.scrollToCell()` | [Navigation API](./api/COMMENTS_API.md#navigation-api) |
| **Excel Import** | `parser.parseSheet()` | [Excel Import](./api/COMMENTS_API.md#excel-comment-importexport) |
| **Formulas** | `cell.formula = '=SUM(A1:A10)'` | [README](../README.md#-core-features) |
| **Styling** | `sheet.setCellStyle()` | [README](../README.md#cell-operations) |
| **Themes** | `renderer.setTheme()` | [README](../README.md#themes) |

---

## 🔍 Detailed Documentation

### Comments & Collaboration

**11 New Worksheet Methods:**
1. `addComment(address, comment)` - Add comment to cell
2. `getComments(address)` - Get all comments for cell
3. `updateComment(address, commentId, updates)` - Update existing comment
4. `deleteComment(address, commentId)` - Delete specific comment
5. `getAllComments()` - Get all comments in sheet
6. `getNextCommentCell(address, direction)` - Navigate comments
7. `setIcon(address, icon)` - Add icon overlay to cell
8. `getIcon(address)` - Get cell icon
9. `getAllIcons()` - Get all icons in sheet

**9 New Event Types:**
- `cell-click` - Single click on cell
- `cell-double-click` - Double click on cell
- `cell-right-click` - Right click (context menu)
- `cell-hover` - Mouse enters cell
- `cell-hover-end` - Mouse leaves cell
- `comment-added` - Comment created
- `comment-updated` - Comment modified
- `comment-deleted` - Comment removed
- `icon-changed` - Cell icon changed

**3 New Navigation Methods:**
- `scrollToCell(address, align)` - Scroll to cell with alignment
- `getCellBounds(address)` - Get cell position/dimensions
- `getVisibleRange()` - Get visible row/column range

### Performance Features

- **10x Faster Rendering** - 45ms vs 450ms (AG Grid)
- **10x Less Memory** - 8MB vs 85MB (AG Grid)
- **15x Smoother Scrolling** - 125 FPS vs 8 FPS (AG Grid)
- **Multi-Layer Canvas** - Independent layer rendering
- **DPR-Perfect Gridlines** - Crisp at all zoom levels
- **Zero DOM Manipulation** - Pure canvas rendering

### Excel Compatibility

- **100+ Functions** - SUM, VLOOKUP, IF, PMT, etc.
- **All Border Styles** - 11 Excel border types
- **Theme Colors** - Full Excel color system
- **Comment Import/Export** - Legacy + threaded comments
- **Number Formats** - Excel-compatible formatting

---

## 🛠️ Development Workflow

1. **Setup**: `npm install && npm run build`
2. **Development**: `npm run dev`
3. **Testing**: `npm test` (Jest + Playwright)
4. **Build**: `npm run build:all`
5. **Lint**: `npm run lint`

---

<div align="center">

**[Main README](../README.md) • [Changelog](../CHANGELOG.md) • [Architecture](../ARCHITECTURE.md)**

</div>
