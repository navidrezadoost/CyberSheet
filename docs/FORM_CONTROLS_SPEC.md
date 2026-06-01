# Form Controls — Microsoft Excel 365 Complete Specification

## Overview

Form Controls are interactive objects that can be placed on a worksheet to create user interfaces directly within Excel. They are distinct from ActiveX controls and are the recommended option for simple data-entry forms, dashboards, and printable reports.

**Location**: Insert tab → Form Controls group (Developer tab must be enabled: File → Options → Customize Ribbon → ☑ Developer)

Alternatively, form controls are also available under:
**Insert tab → Illustrations group** (some versions place them here as "Form Controls" dropdown)

---

## 1. Form Control Types

The Form Controls dropdown contains 12 control types plus a "More Controls…" option:

| # | Control | Icon | Description |
|---|---------|------|-------------|
| 1 | **Button (Form Control)** | Gray rectangle with "Button" text | Executes a macro when clicked |
| 2 | **Combo Box (Form Control)** | Dropdown with arrow | Creates a dropdown list; user selects one item |
| 3 | **Check Box (Form Control)** | ☐ with label | Toggle TRUE/FALSE; multiple can be checked independently |
| 4 | **Spin Button (Form Control)** | ▲▼ arrows | Increments/decrements a linked cell value |
| 5 | **List Box (Form Control)** | Multi-line list | Shows a scrollable list; user selects one or multiple items |
| 6 | **Option Button (Form Control)** | ○ with label | Radio button; only one in a group can be selected |
| 7 | **Group Box (Form Control)** | Labeled border rectangle | Visually groups related controls (especially Option Buttons) |
| 8 | **Label (Form Control)** | Plain text | Displays static instructional text |
| 9 | **Scroll Bar (Form Control)** | Horizontal or vertical slider | Adjusts a linked cell value within a range |
| 10 | **Text Field (Form Control)** | ⬜ Input box | **Excel note**: Not available as Form Control; use ActiveX TextBox instead |
| 11 | **Combination List-Edit** | ⬜ | **Excel note**: Not available as Form Control; use ActiveX ComboBox instead |
| 12 | **Combination Drop-Down Edit** | ⬜ | **Excel note**: Not available as Form Control |

---

## 2. Check Box (Form Control) — Full Behavioral Specification

### 2.1 Insertion

**Path**: Developer tab → Controls group → Insert → Form Controls → Check Box

**Insertion behavior**:
- Click the Check Box icon in the dropdown
- Cursor changes to crosshair (+)
- Click on the worksheet to place a default-sized checkbox (approximately 12pt height × 80pt width)
- Click and drag to define a custom bounding rectangle
- A checkbox appears with default text "Check Box 1" (increments: Check Box 2, Check Box 3, etc.)
- The checkbox is a **floating object** — it sits above the grid, not inside a cell

### 2.2 Visual States

| State | Appearance |
|-------|-----------|
| **Unchecked** | Empty square ☐, label text to the right |
| **Checked** | Square with checkmark ☑, label text to the right |
| **Mixed (tri-state enabled)** | Square with filled square inside ■ |
| **Disabled (sheet protected)** | Grayed out, non-interactive |
| **Selected (design mode)** | White resize handles (8 squares), no rotation handle |

### 2.3 Interaction

| Action | Result |
|--------|--------|
| **Click the checkbox square** | Toggles between checked (TRUE) and unchecked (FALSE) |
| **Click the label text** | Selects the control for editing (two clicks needed: first selects, second toggles) |
| **Ctrl+Click** | Selects the control without toggling its state |
| **Tab** | Cycles focus between form controls on the sheet |

### 2.4 Linked Cell

- Right-click checkbox → **Format Control…** → Control tab → **Cell link** (e.g., `$A$1`)
- When checked: linked cell displays **TRUE**; when unchecked: **FALSE**
- Updates immediately on click

### 2.5–2.9 Format Control, Label Editing, Copy/Paste, Delete

See Format Control dialog tabs: Control, Size, Protection, Properties, Alt Text. Default names increment per control type. Delete does not clear linked cell value; Ctrl+Z restores control.

---

## 3. Other Form Controls — Key Behaviors

### 3.1 Option Button (Radio Button)
Mutual exclusion within a Group Box or sheet group. Selected button writes index to linked cell.

### 3.2 Combo Box
Input range + cell link (1-based index). Drop down lines default 8.

### 3.3 List Box
Single/Multi/Extend selection types.

### 3.4 Spin Button / 3.5 Scroll Bar
Min/max/current value, incremental change, cell link. Scroll bar adds page change.

### 3.6 Button
Assign macro on click; no cell link.

### 3.7 Group Box
Visual grouping only; moves contained controls.

### 3.8 Label
Static text; no cell link.

---

## 4. Common Properties

- **Anchoring**: Move and size / Move but don't size / Don't move or size (default: move but don't size)
- **Print object**: checked by default
- **Protection**: Locked, Lock text
- **Context menu**: Cut, Copy, Paste, Edit Text, Grouping, Order, Assign Macro, Format Control

---

## 5. Implementation Data Model

```typescript
interface FormControl {
  id: string;
  type: FormControlType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  label?: string;
  cellLink?: Address;
  value?: boolean | number | string;
  initialState?: 'unchecked' | 'checked' | 'mixed';
  inputRange?: Range;
  dropDownLines?: number;
  selectionType?: 'single' | 'multi' | 'extend';
  currentValue?: number;
  minimumValue?: number;
  maximumValue?: number;
  incrementalChange?: number;
  pageChange?: number;
  threeDShading?: boolean;
  anchor: { moveWithCells: boolean; sizeWithCells: boolean; printObject: boolean };
  locked: boolean;
  visible: boolean;
  zIndex: number;
  name: string;
}

type FormControlType =
  | 'button' | 'comboBox' | 'checkBox' | 'spinButton' | 'listBox'
  | 'optionButton' | 'groupBox' | 'label' | 'scrollBar';
```

CyberSheet maps this to `FormControlObject` in `packages/core/src/DrawingLayer.ts`.

---

## 6. Key Implementation Behaviors

### 6.1 CheckBox Toggle Logic
Flip `controlProperties.checked`, write TRUE/FALSE to `linkedCell` via `worksheet.setCellValue`.

### 6.2 OptionButton Mutual Exclusion
Deselect siblings in same group; write selected index to linked cell.

### 6.3 SpinButton Auto-Repeat
400ms initial delay, 50ms repeat while held.

---

## 7. Events (EventBus)

| Event | Payload |
|-------|---------|
| `form-control-insert` | `{ id, type, position }` |
| `form-control-delete` | `{ id }` |
| `form-control-change` | `{ id, type, oldValue, newValue, cellLink? }` |
| `form-control-select` | `{ id }` |
| `form-control-deselect` | `{ id }` |

---

## 8. CyberSheet Implementation Roadmap

| Phase | Scope | Status |
|-------|--------|--------|
| **FC.1** | Crosshair insert, checkbox toggle, default labels, no rotation handle | ✅ In progress |
| **FC.2** | Format Control dialog (cell link, 3-D shading) | Planned |
| **FC.3** | Option button mutual exclusion, combo/list box | Planned |
| **FC.4** | Spin/scroll bar value + auto-repeat | Planned |
| **FC.5** | EventBus `form-control-*` events | Planned |
