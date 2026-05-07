# Excel App Component

Complete Excel-like application shell for CyberSheet with React.

## Overview

The `ExcelApp` component provides a full-featured Excel-like interface including:

- **Title Bar**: Excel-style title bar with quick access toolbar (Save, Undo, Redo)
- **Ribbon Tabs**: Tab navigation for different ribbon sections
- **Ribbon**: Context-sensitive toolbar with formatting options
- **Formula Bar**: Input and display formulas
- **Spreadsheet Area**: Main grid canvas
- **Sheet Tabs**: Navigate between worksheets
- **Status Bar**: Display statistics and zoom controls

## Installation

```bash
npm install @cyber-sheet/react @cyber-sheet/core @cyber-sheet/renderer-canvas
```

## Basic Usage

```tsx
import React from 'react';
import { Workbook } from '@cyber-sheet/core';
import { ExcelApp } from '@cyber-sheet/react';
import '@cyber-sheet/react/dist/components/excel-app.css';

function App() {
  const workbook = React.useMemo(() => new Workbook(), []);

  return (
    <ExcelApp
      workbook={workbook}
      fileName="My Workbook"
      onSave={() => console.log('Save')}
    />
  );
}
```

## Component Structure

### ExcelApp (Main Container)

The main wrapper component that orchestrates all parts of the interface.

**Props:**
- `workbook: Workbook` - The CyberSheet workbook instance (required)
- `fileName?: string` - Display name for the file (default: "Book1")
- `onSave?: () => void` - Callback when Save button is clicked
- `onUndo?: () => void` - Callback when Undo button is clicked
- `onRedo?: () => void` - Callback when Redo button is clicked
- `style?: React.CSSProperties` - Custom styles

### TitleBar

Excel-style title bar with quick access toolbar.

**Features:**
- Excel icon
- AutoSave toggle
- Quick Access Toolbar (Save, Undo, Redo)
- File name display
- Search and Share buttons
- User avatar
- Window controls (Minimize, Maximize, Close)

### RibbonTabs

Tab navigation for switching between ribbon views.

**Available Tabs:**
- File
- Home
- Insert
- Page Layout
- Formulas
- Data
- Review
- View
- Automate
- Help

### Ribbon

Context-sensitive toolbar with formatting and editing options.

**Current Implementation:**
- Home tab: Font, alignment, number formatting, styles, cells, and editing groups
- Future tabs: Insert, Formulas, Data, etc. (coming soon)

### FormulaBar

Formula input and display bar.

**Features:**
- Cell reference display
- Formula validation
- Function suggestions
- Formula editing

### SheetTabs

Navigate between worksheets.

**Features:**
- Sheet navigation arrows
- Tab creation and deletion
- Sheet renaming (double-click)
- Visual feedback for active sheet

### StatusBar

Bottom status bar with information and controls.

**Features:**
- Status messages
- Selection statistics (Average, Count, Sum)
- View mode buttons (Normal, Page Layout, Page Break)
- Zoom controls (slider and +/- buttons)

## Advanced Usage

### Custom Save Handler

```tsx
<ExcelApp
  workbook={workbook}
  fileName="Sales Report"
  onSave={async () => {
    // Save to server
    const data = await exportWorkbook(workbook);
    await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }}
/>
```

### Undo/Redo Integration

```tsx
const handleUndo = () => {
  workbook.commandManager?.undo();
};

const handleRedo = () => {
  workbook.commandManager?.redo();
};

<ExcelApp
  workbook={workbook}
  onUndo={handleUndo}
  onRedo={handleRedo}
/>
```

### Custom Styling

```tsx
<ExcelApp
  workbook={workbook}
  style={{
    height: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0
  }}
/>
```

## Keyboard Shortcuts

The Excel app includes built-in keyboard shortcuts:

- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+S**: Save
- **Ctrl+B**: Bold
- **Ctrl+I**: Italic
- **Ctrl+U**: Underline
- And many more...

## Styling

The component uses CSS custom properties for easy theming:

```css
:root {
  --excel-green: #217346;
  --excel-green-dark: #185c37;
  --ribbon-bg: #f3f3f3;
  --ribbon-border: #d1d1d1;
  --tab-active: #ffffff;
  --tab-hover: #e5e5e5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-light: #e0e0e0;
  --border-medium: #c8c8c8;
  --accent-blue: #0078d4;
  --status-bg: #217346;
}
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

## License

MIT
