# Insert Tab — Illustrations Group: Shapes, Pictures, and Icons

## Microsoft Excel 365 — Complete Behavioral Specification

This document is the implementation contract for **Insert → Illustrations** (Shapes, Pictures, Icons) in CyberSheet.

---

## 1. Shapes

### 1.1 Insertion

**Path**: Insert tab → Illustrations group → Shapes dropdown

**Dropdown structure**: A gallery grid of 9 categories with shape thumbnails:

| Category | Shapes |
|----------|--------|
| **Recently Used Shapes** | Dynamic list of last 8–10 shapes used |
| **Lines** | Line, Line Arrow, Line Arrow: Double, Connector: Elbow, Connector: Elbow Arrow, Connector: Elbow Double-Arrow, Connector: Curved, Connector: Curved Arrow, Connector: Curved Double-Arrow, Curve, Freeform: Shape, Freeform: Scribble |
| **Rectangles** | Rectangle, Rectangle: Rounded Corners, Rectangle: Single Corner Rounded, Rectangle: Top Corners Rounded, Rectangle: Snip Single Corner, Rectangle: Snip Same Side Corner, Rectangle: Snip Diagonal Corner |
| **Basic Shapes** | Text Box, Oval, Triangle, Right Triangle, Parallelogram, Trapezoid, Diamond, Pentagon, Hexagon, Heptagon, Octagon, Decagon, Dodecagon, Cross, Plaque, Heart, Lightning Bolt, Moon, Sun, Cloud, Bracket Pair, Double Bracket, Brace Pair |
| **Block Arrows** | Right Arrow, Left Arrow, Up Arrow, Down Arrow, Left-Right Arrow, Up-Down Arrow, Quad Arrow, Striped Right Arrow, Notched Right Arrow, Chevron, Bent Arrow, U-Turn Arrow, Circular Arrow |
| **Flowchart** | Process, Decision, Data, Predefined Process, Internal Storage, Document, Multi-Document, Terminator, Preparation, Manual Input, Manual Operation, Connector, Off-Page Connector, Card, Punched Tape, Summing Junction, Or, Merge, Extract, Sort, Collate, Delay, Stored Data, Sequential Access Storage, Magnetic Disk, Direct Access Storage, Display |
| **Stars and Banners** | 4-Point Star, 5-Point Star, 6-Point Star, 7-Point Star, 8-Point Star, 10-Point Star, 12-Point Star, 16-Point Star, 24-Point Star, 32-Point Star, Explosion 1–2, Scroll, Curved Up Ribbon, Curved Down Ribbon, Wave, Double Wave |
| **Callouts** | Rectangular Callout, Rounded Rectangular Callout, Oval Callout, Cloud Callout, Line Callout, Line Callout (Accent Bar), Line Callout (No Border), Line Callout (Border and Accent Bar), Thought Bubble: Rectangular, Thought Bubble: Rounded Rectangular, Thought Bubble: Oval, Thought Bubble: Cloud |
| **Equation Shapes** | Plus, Minus, Multiplication, Division, Equal, Not Equal |

**Insertion behavior**:
- User clicks a shape thumbnail
- Cursor changes to crosshair (+)
- User clicks and drags on the worksheet to define the shape's bounding rectangle
- Shape is inserted as a **floating object** — not attached to any cell
- Shape floats above the grid; cells exist behind it
- Default size if single-clicked without dragging: approximately 2.54 cm × 2.54 cm (1 inch × 1 inch)

### 1.2 Selection and Manipulation

**Selection**: 8 white resize handles, 1 green rotation handle, accent border. Shift/Ctrl multi-select.

**Movement**: Drag to reposition; grid snap by default; **Alt** disables snap. Arrow keys nudge; Ctrl+Arrow for larger nudge.

**Resizing**: Corner/edge handles; Shift maintains aspect ratio; Ctrl resizes from center.

**Rotation**: Green handle; Shift snaps to 15° increments.

### 1.3–1.8 Shape Formatting, Text, Connectors, Grouping, Z-Order, Default Style

See Excel 365 Shape Format contextual tab: Insert Shapes, Shape Styles (fill/outline/effects), WordArt Styles, Arrange, Size. Connectors attach to connection points. Group/Ungroup/Regroup. Bring to Front/Send to Back. Set as Default Shape (session-only).

---

## 2. Pictures

### 2.1 Insertion

**Path**: Insert tab → Illustrations group → Pictures dropdown

| Option | Description |
|--------|-------------|
| **This Device** | OS file picker (BMP, JPG, PNG, GIF, TIFF, WMF, EMF, WEBP, SVG, HEIF) |
| **Stock Images** | Microsoft stock library (online) |
| **Online Pictures** | Bing / OneDrive search (online) |

**Insertion behavior**: Floating object at native resolution (scaled to viewport if needed). Default position: viewport center. Click-drag defines bounding rectangle.

### 2.2–2.7 Picture Formatting, Crop, Corrections, Remove Background, Compress, Alt Text

Picture Format tab: Adjust, Picture Styles, Arrange, Size, Crop. Alt text sidebar with Title/Description.

---

## 3. Icons

### 3.1 Insertion

**Path**: Insert → Illustrations → Icons

Searchable SVG gallery; multi-select; insert as vector graphics.

### 3.2–3.3 Icon Formatting, Stickers

Graphics Format tab: Change, Graphics Styles, Arrange, Size. **Convert to Shape** for per-element editing.

---

## 4. Common Behaviors

### 4.1 Relationship to Cells

All three types are **floating objects** above the grid. They do not affect cell values or formulas.

### 4.2 Object Positioning Properties

Move and size with cells / Move but don't size / Don't move or size (defaults differ by type).

### 4.3 Print Behavior

Printed by default; optional **Print object** toggle.

### 4.4 Keyboard Shortcuts

Tab/Shift+Tab cycle objects; Arrow nudge; Ctrl+Arrow larger nudge; Shift+Arrow constrain; Ctrl+D duplicate; Ctrl+Drag duplicate; Delete removes; Ctrl+C/X/V; Ctrl+A all objects; Ctrl+1 format pane.

### 4.5–4.7 Context Menu, Selection Pane, Align/Distribute

Standard Excel object context menu. Selection Pane with visibility toggles and reorder. Align and distribute options.

---

## 5. Implementation Reference

### 5.1 Data Model

```typescript
interface FloatingObject {
  id: string;
  type: 'shape' | 'picture' | 'icon';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  anchor: {
    moveWithCells: boolean;
    sizeWithCells: boolean;
    printObject: boolean;
  };
  zIndex: number;
  visible: boolean;
  locked: boolean;
  name: string;
  shape?: { shapeId: string; fill: FillDefinition; outline: OutlineDefinition; effects: EffectsDefinition; text?: string };
  picture?: { source: ArrayBuffer | string; format: string; cropSettings?: CropDefinition; corrections?: object; colorSettings?: object; transparencyColor?: string };
  icon?: { iconId: string; svgData: string; fillColor?: string; outlineColor?: string };
}
```

CyberSheet maps this to `DrawingLayer` types in `packages/core/src/DrawingLayer.ts`.

### 5.2 Key Behaviors for Web Implementation

| Behavior | Implementation Note |
|----------|-------------------|
| Grid snapping | Snap x/y to column/row boundaries during drag |
| Alt override | Disable snapping when Alt is held |
| Shift constrain | Lock aspect ratio on resize; 15° rotate snap |
| Connection points | Shape edge percentages; connectors auto-route |
| SVG recoloring | `fill="currentColor"` + parent `fillColor` |
| Z-order | Ascending `zIndex` on overlay canvas |
| Selection Pane | Sidebar list with reorder, rename, visibility |
| Crop | CSS clip-path or canvas source rect |
| Print objects | Include overlay in print/PDF export |

### 5.3 Object Events (EventBus)

- `object-insert` — `{ id, type, position, size }`
- `object-delete` — `{ id }`
- `object-select` / `object-deselect`
- `object-move` — `{ id, from, to }`
- `object-resize` — `{ id, fromSize, toSize }`
- `object-rotate` — `{ id, fromAngle, toAngle }`
- `object-zorder-change` — `{ id, fromIndex, toIndex }`
- `object-format-change` — `{ id, property, oldValue, newValue }`

---

## Phase Roadmap (CyberSheet)

| Phase | Scope | Status |
|-------|--------|--------|
| **7.1** | Crosshair insert, click-drag, grid snap, Alt free-move, default 1″ click, undo, redraw | ✅ Done |
| **7.2** | Full shape gallery + recently used | ✅ Done |
| **7.3** | Shift/Ctrl constraints, multi-select, keyboard nudge | Planned |
| **7.4** | Picture viewport insert, crop basics, alt text | Planned |
| **7.5** | Icon picker + SVG recolor | Planned |
| **7.6** | Format tab, selection pane, group/align | Planned |
| **7.7** | EventBus `object-*` events + docs sync | Planned |
