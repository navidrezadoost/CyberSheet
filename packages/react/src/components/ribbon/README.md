# Excel 365 Ribbon UI Components

Production-level React components matching Microsoft Excel 365 Online exactly.

## 🎯 Implementation Status

**Phase 1, Week 1: Foundation + Undo/Redo + Font Formatting** ✅

| Component | Status | Backend | Notes |
|-----------|--------|---------|-------|
| RibbonButton | ✅ Complete | - | Reusable button with hover/active/disabled states |
| RibbonGroup | ✅ Complete | - | Container for related controls |
| RibbonSelect | ✅ Complete | - | Dropdown with Excel styling |
| RibbonRow | ✅ Complete | - | Horizontal layout helper |
| HomeTab | 🟡 In Progress | 100% | Undo/Redo + Font controls |

## 📦 Installation

```bash
# Install Fluent UI icons
npm install @fluentui/react-icons
```

## 🚀 Quick Start

```tsx
import { Ribbon } from '@cyber-sheet/react/components/ribbon';
import { Workbook } from '@cyber-sheet/core';

const App = () => {
  const workbook = new Workbook();
  const selection = workbook.getActiveSelection();

  return (
    <Ribbon 
      commandManager={workbook.commandManager} 
      selection={selection} 
    />
  );
};
```

## 🧱 Component Architecture

### RibbonButton

Core button component for all toolbar actions.

```tsx
<RibbonButton
  icon={<TextBoldRegular />}
  tooltip="Bold (Ctrl+B)"
  active={isBold}
  onClick={handleBold}
  disabled={!canApplyBold}
/>
```

**Props:**
- `icon`: React node (Fluent UI icon)
- `tooltip`: String (accessible label + keyboard shortcut)
- `active`: Boolean (pressed state)
- `disabled`: Boolean
- `onClick`: Function
- `size`: 'small' (32px, default) | 'large' (48px)

**States:**
- Hover: `#edebe9`
- Active: `#e1dfdd`
- Disabled: `#a19f9d` (60% opacity)
- Focus: `2px solid #0078d4`

### RibbonGroup

Container for related controls with title.

```tsx
<RibbonGroup title="Font">
  <RibbonRow>
    <FontFamilyDropdown />
    <FontSizeDropdown />
  </RibbonRow>
  <RibbonRow>
    <BoldButton />
    <ItalicButton />
  </RibbonRow>
</RibbonGroup>
```

**Props:**
- `title`: String (displayed below controls)
- `children`: React node

**Styling:**
- Padding: `4px 8px`
- Border-right: `1px solid #e1dfdd`
- Gap: `4px`

### RibbonSelect

Dropdown component for font, size, styles, etc.

```tsx
<RibbonSelect
  value={fontSize}
  options={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24]}
  onChange={(v) => setFontSize(Number(v))}
  width={60}
  ariaLabel="Font size"
/>
```

**Props:**
- `value`: String | number
- `options`: Array of strings or numbers
- `onChange`: Function
- `width`: Number (pixels)
- `disabled`: Boolean
- `ariaLabel`: String

### HomeTab

Complete Home tab implementation (Phase 1).

```tsx
<HomeTab 
  commandManager={workbook.commandManager} 
  selection={{
    fontFamily: 'Calibri',
    fontSize: 11,
    bold: false,
    italic: false,
    underline: false,
  }} 
/>
```

**Current Features:**
- ✅ Undo/Redo buttons (connected to CommandManager)
- ✅ Font Family dropdown (10 standard fonts)
- ✅ Font Size dropdown (16 standard sizes)
- ✅ Bold/Italic/Underline toggle buttons

**Next Features (Week 1 completion):**
- ⏳ Font Color picker
- ⏳ Grow/Shrink font buttons

## 🎨 Design System

All colors, spacing, and interactions extracted from Excel 365 Online using DevTools.

### Color Palette

```css
/* Backgrounds */
--ribbon-bg: #f3f2f1;
--ribbon-hover: #edebe9;
--ribbon-active: #e1dfdd;
--ribbon-disabled: #a19f9d;

/* Borders */
--ribbon-border: #edebe9;
--ribbon-border-dark: #e1dfdd;
--ribbon-border-darkest: #d2d0ce;

/* Text */
--ribbon-text: #201f1e;
--ribbon-text-secondary: #605e5c;
--ribbon-text-disabled: #a19f9d;

/* Focus */
--ribbon-focus: #0078d4;
```

### Spacing

- Button size: `32px × 32px` (small), `48px × 48px` (large)
- Button gap: `4px`
- Group padding: `4px 8px`
- Border radius: `2px`
- Icon size: `16px`

### Typography

- Font family: `"Segoe UI", "Segoe UI Web", sans-serif`
- Button labels: `11px`
- Dropdown text: `12px`
- Group titles: `11px` (color: `#605e5c`)

## 🔗 Backend Integration

### Command Pattern

All UI actions go through the Command Pattern for undo/redo support:

```tsx
import { SetStyleCommand, ToggleStyleCommand } from '@cyber-sheet/core';

// Font family change
commandManager.execute(
  new SetStyleCommand(selection, { fontFamily: 'Arial' })
);

// Bold toggle
commandManager.execute(
  new ToggleStyleCommand(selection, 'bold')
);
```

### Event-Driven Updates

UI listens to backend state changes:

```tsx
worksheet.events.on('cell-changed', (event) => {
  // Update selection state
  setSelection(getUpdatedSelection());
});
```

## ♿ Accessibility

WCAG 2.1 AA compliance:

- ✅ Keyboard navigation (Tab, Arrow keys, Enter, Space)
- ✅ ARIA labels and roles
- ✅ Focus indicators (2px solid #0078d4)
- ✅ Color contrast 4.5:1+
- ✅ Screen reader support (aria-label, aria-pressed)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |

## 🧪 Testing

```tsx
import { render, fireEvent } from '@testing-library/react';
import { RibbonButton } from './RibbonButton';

describe('RibbonButton', () => {
  it('applies active class when pressed', () => {
    const { getByRole } = render(
      <RibbonButton 
        icon={<span>B</span>} 
        tooltip="Bold" 
        active={true} 
        onClick={() => {}} 
      />
    );
    
    expect(getByRole('button')).toHaveClass('active');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <RibbonButton 
        icon={<span>B</span>} 
        tooltip="Bold" 
        onClick={handleClick} 
      />
    );
    
    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <RibbonButton 
        icon={<span>B</span>} 
        tooltip="Bold" 
        disabled={true} 
        onClick={handleClick} 
      />
    );
    
    fireEvent.click(getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

## 📈 Roadmap

### Week 1 (Current)
- ✅ Ribbon infrastructure
- ✅ Undo/Redo buttons
- ✅ Font family/size dropdowns
- ✅ Bold/Italic/Underline buttons
- ⏳ Font color picker

### Week 2-3 (File Operations)
- ⏳ New workbook dialog
- ⏳ Open file dialog
- ⏳ Download/Export menu

### Week 4-5 (Clipboard + Cell Operations)
- ⏳ Cut/Copy/Paste buttons
- ⏳ Paste Special dialog
- ⏳ Insert/Delete rows/columns
- ⏳ AutoSum button

## 🐛 Known Issues

None currently. Report issues at: [GitHub Issues](https://github.com/navidrezadoost/cyber-sheet-excel/issues)

## 📝 License

Same as parent project.

## 👥 Contributors

- navidrezadoost - Initial implementation
