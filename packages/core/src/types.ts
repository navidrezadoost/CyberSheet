export type Address = { row: number; col: number }; // 1-based indices

export type Range = { start: Address; end: Address };

export type CellValue = string | number | boolean | null;

// Import Excel color types
import type { ExcelColorSpec } from './ExcelColor';

export type CellStyle = {
  fontFamily?: string;
  fontSize?: number; // px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string | ExcelColorSpec; // CSS color or Excel color spec
  fill?: string | ExcelColorSpec; // CSS background color or Excel color spec
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  // How to handle overflow when wrap is false
  textOverflow?: 'clip' | 'ellipsis' | 'overflow';
  // Text rotation in degrees (-90 to 90 typical in Excel)
  rotation?: number;
  // Shrink text to fit within cell width without wrapping
  shrinkToFit?: boolean;
  numberFormat?: string; // e.g., "#,##0.00"
  border?: {
    top?: string | ExcelColorSpec;
    right?: string | ExcelColorSpec;
    bottom?: string | ExcelColorSpec;
    left?: string | ExcelColorSpec;
  };
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
  value: CellValue;
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
