export type Address = { row: number; col: number }; // 1-based indices

export type Range = { start: Address; end: Address };

export type CellValue = string | number | boolean | null;

// Import Excel color types
import type { ExcelColorSpec } from './ExcelColor';

// Import entity types (Week 1: Data Types Entity Framework)
import type { EntityValue } from './types/entity-types';

// ============================================================================
// BORDER STYLES (Complete Excel parity)
// ============================================================================

/**
 * Excel border line styles - all 13 Excel border variants
 */
export type BorderLineStyle =
  | 'thin'           // Default thin line (1px)
  | 'medium'         // Medium weight (2px)
  | 'thick'          // Thick weight (3px)
  | 'hairline'       // Ultra-thin line (0.5px, Excel specialty)
  | 'dotted'         // Dotted line
  | 'dashed'         // Dashed line
  | 'dashDot'        // Dash-dot pattern
  | 'dashDotDot'     // Dash-dot-dot pattern
  | 'double'         // Double line
  | 'mediumDashed'   // Medium dashed
  | 'mediumDashDot'  // Medium dash-dot
  | 'mediumDashDotDot' // Medium dash-dot-dot
  | 'slantDashDot';  // Slanted dash-dot

/**
 * Border edge definition with color and style
 */
export interface BorderEdge {
  color?: string | ExcelColorSpec;
  style?: BorderLineStyle;
}

/**
 * Complete border specification with all edges and diagonals
 */
export interface BorderSpec {
  top?: BorderEdge | string | ExcelColorSpec;
  right?: BorderEdge | string | ExcelColorSpec;
  bottom?: BorderEdge | string | ExcelColorSpec;
  left?: BorderEdge | string | ExcelColorSpec;
  diagonalUp?: BorderEdge | string | ExcelColorSpec;
  diagonalDown?: BorderEdge | string | ExcelColorSpec;
}

// ============================================================================
// FILL PATTERNS (18 Excel patterns + gradients)
// ============================================================================

/**
 * Excel fill pattern types - all 18 Excel patterns
 */
export type FillPatternType =
  | 'solid'           // Solid fill (default)
  | 'none'            // No fill
  | 'gray125'         // 12.5% gray
  | 'gray0625'        // 6.25% gray
  | 'darkGray'        // 75% gray
  | 'mediumGray'      // 50% gray
  | 'lightGray'       // 25% gray
  | 'darkHorizontal'  // Horizontal lines (dark)
  | 'darkVertical'    // Vertical lines (dark)
  | 'darkDown'        // Diagonal down lines (dark)
  | 'darkUp'          // Diagonal up lines (dark)
  | 'darkGrid'        // Grid (dark)
  | 'darkTrellis'     // Trellis (dark)
  | 'lightHorizontal' // Horizontal lines (light)
  | 'lightVertical'   // Vertical lines (light)
  | 'lightDown'       // Diagonal down lines (light)
  | 'lightUp'         // Diagonal up lines (light)
  | 'lightGrid'       // Grid (light)
  | 'lightTrellis';   // Trellis (light)

/**
 * Pattern fill with foreground and background colors
 */
export interface PatternFill {
  type: 'pattern';
  pattern: FillPatternType;
  fgColor?: string | ExcelColorSpec;
  bgColor?: string | ExcelColorSpec;
}

/**
 * Gradient stop for gradient fills
 */
export interface GradientStop {
  position: number; // 0-1 (fraction of gradient range)
  color: string | ExcelColorSpec;
}

/**
 * Gradient fill specification (linear or path)
 */
export interface GradientFill {
  type: 'gradient';
  gradientType: 'linear' | 'path';
  /** Angle in degrees for linear gradient (0 = left-to-right) */
  degree?: number;
  /** Gradient stops (minimum 2 required) */
  stops: GradientStop[];
  /** Center coordinates for path gradient (0-1 range) */
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

/**
 * Union type for all fill specifications
 */
export type FillSpec = string | ExcelColorSpec | PatternFill | GradientFill;

// ============================================================================
// RICH TEXT (per-character formatting)
// ============================================================================

/**
 * Rich text run - a segment of text with its own formatting
 * Enables per-character formatting like "Bold normal italic"
 */
export interface RichTextRun {
  /** Text content for this run */
  text: string;
  /** Style override for this run (font properties only) */
  style?: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean | 'single' | 'double' | 'singleAccounting' | 'doubleAccounting';
    strikethrough?: boolean;
    superscript?: boolean;
    subscript?: boolean;
    color?: string | ExcelColorSpec;
  };
}

/**
 * Rich text value - text with multiple formatting runs
 */
export interface RichTextValue {
  /** Array of text runs with their styles */
  runs: RichTextRun[];
}

/**
 * Extended cell value supporting rich text and entities
 * 
 * Week 1 (Feb 2026): Added EntityValue for structured data types
 * - Entities have display value (shown in cell)
 * - Entities have named fields (accessible via dot notation in Week 2+)
 * - Backward compatible: existing code sees display value in formulas
 */
export type ExtendedCellValue = CellValue | RichTextValue | EntityValue;

// ============================================================================
// EXTENDED CELL STYLE (100% Excel parity)
// ============================================================================

export type CellStyle = {
  // === Font Properties ===
  fontFamily?: string;
  fontSize?: number; // px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean | 'single' | 'double' | 'singleAccounting' | 'doubleAccounting';
  color?: string | ExcelColorSpec;
  strikethrough?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  /** Font scheme for theme fonts */
  fontScheme?: 'major' | 'minor' | 'none';
  /** Font outline (Mac Excel) */
  outline?: boolean;
  /** Font shadow (Mac Excel) */
  shadow?: boolean;

  // === Alignment Properties ===
  align?: 'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed';
  valign?: 'top' | 'middle' | 'bottom' | 'justify' | 'distributed';
  wrap?: boolean;
  textOverflow?: 'clip' | 'ellipsis' | 'overflow';
  rotation?: number; // -90 to 90, or 255 for vertical
  shrinkToFit?: boolean;
  indent?: number; // 0-250 (Excel limit)
  /** Reading order / text direction */
  readingOrder?: 'context' | 'ltr' | 'rtl';
  /** Justify last line (for justify/distributed alignment) */
  justifyLastLine?: boolean;

  // === Fill Properties ===
  /** 
   * Cell fill/background
   * - string: CSS color (simple solid fill)
   * - ExcelColorSpec: Excel color with theme/indexed support
   * - PatternFill: Pattern fill with fg/bg colors
   * - GradientFill: Linear or path gradient
   */
  fill?: FillSpec;

  // === Border Properties ===
  /**
   * Cell borders with full style support
   * - string/ExcelColorSpec: thin border with that color
   * - BorderSpec: Full specification with style per edge
   */
  border?: BorderSpec;

  // === Number Format ===
  /**
   * Number format string (full Excel grammar supported)
   * Supports: 4-section, conditional, color tags, fractions, etc.
   */
  numberFormat?: string;

  // === Protection ===
  locked?: boolean;
  hidden?: boolean;

  // === Quote Prefix ===
  quotePrefix?: boolean;
};

/**
 * Cell comment metadata
 */
export type CellComment = {
  /** Unique identifier for the comment */
  id: string;
  /** Comment text content */
  text: string;
  /** Author name */
  author: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last edit timestamp */
  editedAt?: Date;
  /** Parent comment ID for threaded replies */
  parentId?: string;
  /** Position override (for custom positioning) */
  position?: { x: number; y: number };
  /** Rich text formatting (future support) */
  richText?: Array<{ text: string; style?: Partial<CellStyle> }>;
  /** Custom metadata for extensibility */
  metadata?: Record<string, unknown>;
};

/**
 * Cell icon configuration
 */
export type CellIcon = {
  /** Icon type: image URL, emoji, or built-in icon name */
  type: 'url' | 'emoji' | 'builtin';
  /** Icon source (URL for image, emoji character, or builtin name) */
  source: string;
  /** Icon position within cell */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** Icon size in pixels */
  size?: number;
  /** Alt text for accessibility */
  alt?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
};

export type Cell = {
  /** 
   * Cell value - supports plain values and rich text
   * - string/number/boolean/null: Plain value
   * - RichTextValue: Per-character formatted text
   */
  value: ExtendedCellValue;
  formula?: string; // e.g., "=SUM(A1:B2)"
  style?: CellStyle;
  /** Array of comments (threaded support) */
  comments?: CellComment[];
  /** Cell icon overlay */
  icon?: CellIcon;
  /** Spill metadata: if this cell is the source of a spilled array */
  spillSource?: {
    /** Dimensions of spilled array [rows, cols] */
    dimensions: [number, number];
    /** End address of spilled range */
    endAddress: Address;
  };
  /** If this cell is part of a spilled range, points to the source cell */
  spilledFrom?: Address;
};

export type ColumnFilter = {
  // simple equals/contains for MVP plus list membership
  type: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'empty' | 'notEmpty' | 'in';
  value?: string | number | [number, number] | Array<string | number | boolean>;
};

/**
 * Cell interaction events - fired by renderer
 */
export type CellEvent = {
  /** Cell address */
  address: Address;
  /** Cell bounds in viewport coordinates */
  bounds: { x: number; y: number; width: number; height: number };
  /** Original browser event */
  originalEvent: MouseEvent | PointerEvent | TouchEvent;
};

export type SheetEvents =
  | { type: 'cell-changed'; address: Address; cell: Cell }
  | { type: 'style-changed'; address: Address; style: CellStyle | undefined }
  | { type: 'filter-changed'; col: number; filter: ColumnFilter | null }
  | { type: 'sheet-mutated' }
  | { type: 'cell-click'; event: CellEvent }
  | { type: 'cell-double-click'; event: CellEvent }
  | { type: 'cell-right-click'; event: CellEvent }
  | { type: 'cell-hover'; event: CellEvent }
  | { type: 'cell-hover-end'; address: Address }
  | { type: 'comment-added'; address: Address; comment: CellComment }
  | { type: 'comment-updated'; address: Address; commentId: string; comment: CellComment }
  | { type: 'comment-deleted'; address: Address; commentId: string }
  | { type: 'icon-changed'; address: Address; icon: CellIcon | undefined };

export interface IFormulaEngine {
  // Evaluate value for a cell. Implementations should handle dependency tracking internally.
  evaluate(address: Address, getCell: (addr: Address) => Cell | undefined): CellValue;
  // Notify engine that a cell's formula or value changed.
  onCellChanged?(address: Address, cell: Cell): void;
}
