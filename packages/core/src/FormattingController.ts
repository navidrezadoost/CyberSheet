/**
 * FormattingController.ts
 *
 * High-level controller for cell formatting operations.
 * Provides methods for applying styles to selections with undo/redo support.
 *
 * Architecture: Formatting Command Layer
 * - Integrates with CommandManager for undo/redo
 * - Handles batch formatting across multiple cells
 * - Provides format painter functionality
 * - Manages style cache for performance
 *
 * Phase: UI Toolkit V1 - Formatting Operations
 */

import type { Address, AddressRange, Range, CellStyle } from "./types";
import type { Worksheet } from "./worksheet";
import type { Command, CommandManager } from "./CommandManager";
import { BatchCommand } from "./CommandManager";
import type { ClipboardService, ClipboardPayload } from "./ClipboardService";

/**
 * Format painter state
 * Stores copied formatting to apply to target cells
 */
interface FormatPainterState {
  sourceStyles: Map<string, CellStyle>;
  isActive: boolean;
  isPersistent: boolean; // true if double-clicked (multi-apply mode)
}

/**
 * SetStyleCommand - Apply style to single cell with undo support
 */
class SetStyleCommand implements Command {
  description = "Set cell style";
  readonly skipGraphValidation = true;

  private worksheet: Worksheet;
  private address: Address;
  private previousStyle: CellStyle | undefined;
  private newStyle: CellStyle | undefined;

  constructor(
    worksheet: Worksheet,
    address: Address,
    newStyle: CellStyle | undefined,
  ) {
    this.worksheet = worksheet;
    this.address = address;
    this.previousStyle = worksheet.getDirectCellStyle(address);
    this.newStyle = newStyle;
  }

  execute(): void {
    if (this.newStyle) {
      this.worksheet.setCellStyle(this.address, this.newStyle);
    }
  }

  undo(): void {
    if (this.previousStyle) {
      this.worksheet.setCellStyle(this.address, this.previousStyle);
    } else {
      this.worksheet.setCellStyle(this.address, undefined);
    }
  }
}

/**
 * BatchSetStyleCommand - Apply style to multiple cells atomically
 */
type StyleUpdater =
  | CellStyle
  | ((prevStyle: CellStyle | undefined, addr: Address) => CellStyle);
type AddressTarget = Address[] | AddressRange[];

function isAddressRange(value: Address | AddressRange): value is AddressRange {
  return "startRow" in value;
}

function normalizeAddressRange(range: AddressRange): AddressRange {
  const startRow = Math.min(range.startRow, range.endRow);
  const endRow = Math.max(range.startRow, range.endRow);
  const startCol = Math.min(range.startCol, range.endCol);
  const endCol = Math.max(range.startCol, range.endCol);
  return { startRow, endRow, startCol, endCol };
}

function firstAddressInTarget(targets: AddressTarget): Address | undefined {
  if (targets.length === 0) return undefined;
  const first = targets[0] as Address | AddressRange;
  if (isAddressRange(first)) {
    const normalized = normalizeAddressRange(first);
    return { row: normalized.startRow, col: normalized.startCol };
  }
  return first as Address;
}

interface BatchStyleEntry {
  addr: Address;
  prev: CellStyle | undefined;
  next: CellStyle | undefined;
}

class BatchSetStyleCommand implements Command {
  description = "Set style for multiple cells";
  readonly skipGraphValidation = true;

  private worksheet: Worksheet;
  private entries: BatchStyleEntry[] = [];
  private grownRows = new Map<number, [number, number]>();

  constructor(
    worksheet: Worksheet,
    targets: AddressTarget,
    styleOrFn: StyleUpdater,
    options?: { minRowHeight?: number },
  ) {
    this.worksheet = worksheet;

    const isFn = typeof styleOrFn === "function";
    const memoizable =
      isFn && (styleOrFn as (...args: unknown[]) => unknown).length < 2;
    const memo = new Map<CellStyle | undefined, CellStyle | undefined>();
    const canonical = (style: CellStyle | undefined) =>
      worksheet.canonicalStyle(style);

    const processAddress = (addr: Address) => {
      const prev = worksheet.getDirectCellStyle(addr);
      let next: CellStyle | undefined;

      if (!isFn) {
        next = canonical(styleOrFn as CellStyle);
      } else if (memoizable) {
        if (memo.has(prev)) {
          next = memo.get(prev);
        } else {
          next = canonical(
            (styleOrFn as (p: CellStyle | undefined, a: Address) => CellStyle)(
              prev,
              addr,
            ),
          );
          memo.set(prev, next);
        }
      } else {
        next = canonical(
          (styleOrFn as (p: CellStyle | undefined, a: Address) => CellStyle)(
            prev,
            addr,
          ),
        );
      }

      this.entries.push({ addr, prev, next });
    };

    if (targets.length > 0) {
      const first = targets[0] as Address | AddressRange;
      if (isAddressRange(first)) {
        for (const target of targets as AddressRange[]) {
          const range = normalizeAddressRange(target);
          for (let row = range.startRow; row <= range.endRow; row++) {
            for (let col = range.startCol; col <= range.endCol; col++) {
              processAddress({ row, col });
            }
          }
        }
      } else {
        for (const addr of targets as Address[]) {
          processAddress(addr);
        }
      }
    }

    const minRowHeight = options?.minRowHeight;
    if (minRowHeight !== undefined) {
      for (const { addr } of this.entries) {
        if (this.grownRows.has(addr.row)) continue;
        const current = worksheet.getRowHeight(addr.row);
        if (current < minRowHeight)
          this.grownRows.set(addr.row, [current, minRowHeight]);
      }
    }
  }

  execute(): void {
    this.worksheet.runTransaction(() => {
      for (const { addr, next } of this.entries) {
        if (next) this.worksheet.setCellStyle(addr, next);
      }
    });
    if (this.grownRows.size > 0) {
      this.worksheet.setRowHeights(
        Array.from(
          this.grownRows,
          ([row, [, after]]) => [row, after] as [number, number],
        ),
      );
    }
  }

  undo(): void {
    this.worksheet.runTransaction(() => {
      for (let i = this.entries.length - 1; i >= 0; i--) {
        const { addr, prev } = this.entries[i];
        this.worksheet.setCellStyle(addr, prev);
      }
    });
    if (this.grownRows.size > 0) {
      this.worksheet.setRowHeights(
        Array.from(
          this.grownRows,
          ([row, [before]]) => [row, before] as [number, number],
        ),
      );
    }
  }
}

/**
 * MergeCellsCommand - Merge a rectangular range of cells
 */
class MergeCellsCommand implements Command {
  description = "Merge cells";

  private worksheet: Worksheet;
  private range: Range;
  private removedCells: Map<
    string,
    { value: any; style: CellStyle | undefined }
  > = new Map();

  constructor(worksheet: Worksheet, range: Range) {
    this.worksheet = worksheet;
    this.range = range;

    const norm = this.normalizeRange(range);
    for (let r = norm.start.row; r <= norm.end.row; r++) {
      for (let c = norm.start.col; c <= norm.end.col; c++) {
        if (r === norm.start.row && c === norm.start.col) continue;
        const key = `${r},${c}`;
        const addr = { row: r, col: c };
        this.removedCells.set(key, {
          value: worksheet.getCellValue(addr),
          style: worksheet.getDirectCellStyle(addr),
        });
      }
    }
  }

  private normalizeRange(range: Range): { start: Address; end: Address } {
    return {
      start: {
        row: Math.min(range.start.row, range.end.row),
        col: Math.min(range.start.col, range.end.col),
      },
      end: {
        row: Math.max(range.start.row, range.end.row),
        col: Math.max(range.start.col, range.end.col),
      },
    };
  }

  execute(): void {
    this.worksheet.mergeCells(this.range);
  }

  undo(): void {
    this.worksheet.cancelMerge(this.range);
    for (const [key, data] of this.removedCells.entries()) {
      const [rowStr, colStr] = key.split(",");
      const addr = { row: parseInt(rowStr), col: parseInt(colStr) };
      if (data.value !== undefined)
        this.worksheet.setCellValue(addr, data.value);
      if (data.style) this.worksheet.setCellStyle(addr, data.style);
    }
  }
}

/**
 * UnmergeCellsCommand - Unmerge a range (remove merge overlapping with range)
 */
class UnmergeCellsCommand implements Command {
  description = "Unmerge cells";

  private worksheet: Worksheet;
  private range: Range;
  private removedMerges: Array<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  }> = [];

  constructor(worksheet: Worksheet, range: Range) {
    this.worksheet = worksheet;
    this.range = range;
  }

  execute(): void {
    this.worksheet.cancelMerge(this.range);
  }

  undo(): void {
    for (const merge of this.removedMerges) {
      const mergeRange: Range = {
        start: { row: merge.startRow, col: merge.startCol },
        end: { row: merge.endRow, col: merge.endCol },
      };
      this.worksheet.mergeCells(mergeRange);
    }
  }
}

/**
 * FormattingController - High-level formatting operations
 */
export class FormattingController {
  private worksheet: Worksheet;
  private commandManager: CommandManager;
  private formatPainterState: FormatPainterState = {
    sourceStyles: new Map(),
    isActive: false,
    isPersistent: false,
  };

  constructor(worksheet: Worksheet, commandManager: CommandManager) {
    this.worksheet = worksheet;
    this.commandManager = commandManager;
  }

  private executeStyleBatch(
    targets: AddressTarget,
    styleOrFn: StyleUpdater,
    options?: { minRowHeight?: number },
  ): void {
    if (targets.length === 0) return;
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      targets,
      styleOrFn,
      options,
    );
    this.commandManager.execute(cmd);
  }

  private firstAddressInRanges(ranges: AddressRange[]): Address | undefined {
    return firstAddressInTarget(ranges);
  }

  // ============================================================================
  // FONT FORMATTING
  // ============================================================================

  /**
   * Apply font family to selection
   */
  setFontFamily(addresses: Address[], fontFamily: string): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      fontFamily,
    }));
  }

  setFontFamilyInRanges(ranges: AddressRange[], fontFamily: string): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      fontFamily,
    }));
  }

  /**
   * Smallest row height (px) that fits a single line of text at `fontSize`.
   * Matches the default sheet: an 11px font fits the default 20px row.
   */
  static rowHeightForFont(fontSize: number): number {
    return Math.ceil(fontSize * 1.25) + 6;
  }

  /**
   * Apply font size to selection.
   * Like Excel, rows grow to fit the larger font so the text is not clipped.
   */
  setFontSize(addresses: Address[], fontSize: number): void {
    this.executeStyleBatch(
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        fontSize,
      }),
      { minRowHeight: FormattingController.rowHeightForFont(fontSize) },
    );
  }

  setFontSizeInRanges(ranges: AddressRange[], fontSize: number): void {
    this.executeStyleBatch(
      ranges,
      (prevStyle) => ({
        ...(prevStyle || {}),
        fontSize,
      }),
      { minRowHeight: FormattingController.rowHeightForFont(fontSize) },
    );
  }

  /**
   * Toggle bold formatting across the selection.
   * Excel behavior: if every cell is bold, remove bold; otherwise apply bold to all.
   */
  toggleBold(addresses: Address[]): void {
    if (addresses.length === 0) return;
    const allBold = addresses.every(
      (addr) => this.worksheet.getCellStyle(addr)?.bold === true,
    );
    this.setBold(addresses, !allBold);
  }

  /**
   * Set bold formatting explicitly
   */
  setBold(addresses: Address[], bold: boolean): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      bold,
    }));
  }

  setBoldInRanges(ranges: AddressRange[], bold: boolean): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      bold,
    }));
  }

  toggleBoldInRanges(ranges: AddressRange[]): void {
    const first = this.firstAddressInRanges(ranges);
    if (!first) return;
    const next = this.worksheet.getCellStyle(first)?.bold !== true;
    this.setBoldInRanges(ranges, next);
  }

  /**
   * Toggle italic formatting across the selection uniformly.
   */
  toggleItalic(addresses: Address[]): void {
    if (addresses.length === 0) return;
    const allItalic = addresses.every(
      (addr) => this.worksheet.getCellStyle(addr)?.italic === true,
    );
    this.setItalic(addresses, !allItalic);
  }

  /**
   * Set italic formatting explicitly
   */
  setItalic(addresses: Address[], italic: boolean): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      italic,
    }));
  }

  setItalicInRanges(ranges: AddressRange[], italic: boolean): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      italic,
    }));
  }

  toggleItalicInRanges(ranges: AddressRange[]): void {
    const first = this.firstAddressInRanges(ranges);
    if (!first) return;
    const next = this.worksheet.getCellStyle(first)?.italic !== true;
    this.setItalicInRanges(ranges, next);
  }

  /**
   * Toggle underline formatting across the selection uniformly.
   */
  toggleUnderline(addresses: Address[]): void {
    if (addresses.length === 0) return;
    const allUnderline = addresses.every(
      (addr) => this.worksheet.getCellStyle(addr)?.underline === true,
    );
    this.setUnderline(addresses, !allUnderline);
  }

  /**
   * Set underline formatting explicitly
   */
  setUnderline(addresses: Address[], underline: boolean): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      underline,
    }));
  }

  setUnderlineInRanges(ranges: AddressRange[], underline: boolean): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      underline,
    }));
  }

  toggleUnderlineInRanges(ranges: AddressRange[]): void {
    const first = this.firstAddressInRanges(ranges);
    if (!first) return;
    const next = this.worksheet.getCellStyle(first)?.underline !== true;
    this.setUnderlineInRanges(ranges, next);
  }

  /**
   * Toggle strikethrough formatting
   */
  toggleStrikethrough(addresses: Address[]): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        strikethrough: !prevStyle?.strikethrough,
      }),
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Set font color
   */
  setFontColor(addresses: Address[], color: string): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      color,
    }));
  }

  setFontColorInRanges(ranges: AddressRange[], color: string): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      color,
    }));
  }

  // ============================================================================
  // ALIGNMENT
  // ============================================================================

  /**
   * Set horizontal alignment
   */
  setHorizontalAlign(
    addresses: Address[],
    align: "left" | "center" | "right" | "fill" | "justify",
  ): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        align,
      }),
    );

    this.commandManager.execute(cmd);
  }

  setHorizontalAlignInRanges(
    ranges: AddressRange[],
    align: "left" | "center" | "right" | "fill" | "justify",
  ): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      align,
    }));
  }

  /**
   * Set vertical alignment
   */
  setVerticalAlign(
    addresses: Address[],
    valign: "top" | "middle" | "bottom",
  ): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        valign,
      }),
    );

    this.commandManager.execute(cmd);
  }

  setVerticalAlignInRanges(
    ranges: AddressRange[],
    valign: "top" | "middle" | "bottom",
  ): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      valign,
    }));
  }

  /**
   * Toggle wrap text
   */
  toggleWrapText(addresses: Address[]): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        wrap: !prevStyle?.wrap,
      }),
    );

    this.commandManager.execute(cmd);
  }

  toggleWrapTextInRanges(ranges: AddressRange[]): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      wrap: !prevStyle?.wrap,
    }));
  }

  /**
   * Set text rotation (degrees)
   */
  setRotation(addresses: Address[], rotation: number): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        rotation,
      }),
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Set text indentation
   */
  setIndent(addresses: Address[], indent: number): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        indent,
      }),
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Increase indent level
   */
  increaseIndent(addresses: Address[]): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => {
        const currentIndent = prevStyle?.indent || 0;
        return {
          ...(prevStyle || {}),
          indent: Math.min(currentIndent + 1, 250), // Excel max  indent is 250
        };
      },
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Decrease indent level
   */
  decreaseIndent(addresses: Address[]): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => {
        const currentIndent = prevStyle?.indent || 0;
        return {
          ...(prevStyle || {}),
          indent: Math.max(currentIndent - 1, 0),
        };
      },
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Merge cells in a range
   * Only keeps the top-left cell's content
   *
   * @param range - Range to merge
   * @throws MergeConflictError if any cell in range is already merged
   * @throws RangeError if range is single cell
   */
  mergeCells(range: Range): void {
    const cmd = new MergeCellsCommand(this.worksheet, range);
    this.commandManager.execute(cmd);
  }

  /**
   * Merge cells and center content
   * Convenience method that merges AND applies center alignment
   */
  mergeAndCenter(range: Range): void {
    // First merge
    this.mergeCells(range);

    // Then center the anchor cell
    const addresses = [range.start];
    this.setHorizontalAlign(addresses, "center");
    this.setVerticalAlign(addresses, "middle");
  }

  /**
   * Unmerge cells (cancel merge overlapping with range)
   */
  unmergeCells(range: Range): void {
    const cmd = new UnmergeCellsCommand(this.worksheet, range);
    this.commandManager.execute(cmd);
  }

  // ============================================================================
  // FILL / BACKGROUND
  // ============================================================================

  /**
   * Set cell background fill color
   */
  setFill(addresses: Address[], fill: string): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      fill,
    }));
  }

  setFillInRanges(ranges: AddressRange[], fill: string): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      fill,
    }));
  }

  /**
   * Remove fill (make transparent)
   */
  removeFill(addresses: Address[]): void {
    this.executeStyleBatch(addresses, (prevStyle) => {
      const newStyle = { ...(prevStyle || {}) };
      delete newStyle.fill;
      return newStyle;
    });
  }

  removeFillInRanges(ranges: AddressRange[]): void {
    this.executeStyleBatch(ranges, (prevStyle) => {
      const newStyle = { ...(prevStyle || {}) };
      delete newStyle.fill;
      return newStyle;
    });
  }

  // ============================================================================
  // BORDERS
  // ============================================================================

  /**
   * Set border for cells
   */
  setBorder(addresses: Address[], border: CellStyle["border"]): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        border,
      }),
    );

    this.commandManager.execute(cmd);
  }

  setBorderInRanges(ranges: AddressRange[], border: CellStyle["border"]): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      border,
    }));
  }

  /**
   * Set all borders (outline + inside)
   */
  setAllBorders(addresses: Address[], color: string = "#000000"): void {
    const border = {
      top: color,
      right: color,
      bottom: color,
      left: color,
    };

    this.setBorder(addresses, border);
  }

  /**
   * Set outer border only
   */
  setOuterBorder(
    addresses: Address[],
    range: Range,
    color: string = "#000000",
  ): void {
    // For outer border, we need to selectively apply to edge cells only
    const startRow = Math.min(range.start.row, range.end.row);
    const endRow = Math.max(range.start.row, range.end.row);
    const startCol = Math.min(range.start.col, range.end.col);
    const endCol = Math.max(range.start.col, range.end.col);

    for (const addr of addresses) {
      const isTop = addr.row === startRow;
      const isBottom = addr.row === endRow;
      const isLeft = addr.col === startCol;
      const isRight = addr.col === endCol;

      const border: any = {};
      if (isTop) border.top = color;
      if (isBottom) border.bottom = color;
      if (isLeft) border.left = color;
      if (isRight) border.right = color;

      if (Object.keys(border).length > 0) {
        const cmd = new SetStyleCommand(this.worksheet, addr, {
          ...this.worksheet.getDirectCellStyle(addr),
          border,
        });
        this.commandManager.execute(cmd);
      }
    }
  }

  /**
   * Remove all borders
   */
  removeBorders(addresses: Address[]): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => {
        const newStyle = { ...(prevStyle || {}) };
        delete newStyle.border;
        return newStyle;
      },
    );

    this.commandManager.execute(cmd);
  }

  removeBordersInRanges(ranges: AddressRange[]): void {
    this.executeStyleBatch(ranges, (prevStyle) => {
      const newStyle = { ...(prevStyle || {}) };
      delete newStyle.border;
      return newStyle;
    });
  }

  // ============================================================================
  // NUMBER FORMATS
  // ============================================================================

  /**
   * Set number format string
   */
  setNumberFormat(addresses: Address[], numberFormat: string): void {
    this.executeStyleBatch(addresses, (prevStyle) => ({
      ...(prevStyle || {}),
      numberFormat,
    }));
  }

  setNumberFormatInRanges(ranges: AddressRange[], numberFormat: string): void {
    this.executeStyleBatch(ranges, (prevStyle) => ({
      ...(prevStyle || {}),
      numberFormat,
    }));
  }

  /**
   * Quick format presets
   */
  applyNumberFormatPreset(
    addresses: Address[],
    preset:
      | "general"
      | "number"
      | "currency"
      | "accounting"
      | "percentage"
      | "date"
      | "time"
      | "scientific"
      | "fraction"
      | "text",
  ): void {
    const formatMap: Record<string, string> = {
      general: "General",
      number: "#,##0.00",
      currency: "$#,##0.00",
      accounting: "$#,##0.00;($#,##0.00)",
      percentage: "0.00%",
      date: "M/D/YYYY",
      time: "h:mm:ss AM/PM",
      scientific: "0.00E+00",
      fraction: "# ?/?",
      text: "@",
    };

    const format = formatMap[preset] || "General";
    this.setNumberFormat(addresses, format);
  }

  applyNumberFormatPresetInRanges(
    ranges: AddressRange[],
    preset:
      | "general"
      | "number"
      | "currency"
      | "accounting"
      | "percentage"
      | "date"
      | "time"
      | "scientific"
      | "fraction"
      | "text",
  ): void {
    const formatMap: Record<string, string> = {
      general: "General",
      number: "#,##0.00",
      currency: "$#,##0.00",
      accounting: "$#,##0.00;($#,##0.00)",
      percentage: "0.00%",
      date: "M/D/YYYY",
      time: "h:mm:ss AM/PM",
      scientific: "0.00E+00",
      fraction: "# ?/?",
      text: "@",
    };
    this.setNumberFormatInRanges(ranges, formatMap[preset] || "General");
  }

  /**
   * Increase decimal places
   */
  increaseDecimalPlaces(addresses: Address[]): void {
    this.executeStyleBatch(addresses, (prevStyle) => {
      const currentFormat = prevStyle?.numberFormat || "0";

      // Simple implementation: add one decimal place
      const match = currentFormat.match(/0\.(0*)/);
      if (match) {
        const decimals = match[1].length;
        const newFormat = currentFormat.replace(
          /0\.(0*)/,
          `0.${"0".repeat(decimals + 1)}`,
        );
        return { ...(prevStyle || {}), numberFormat: newFormat };
      }

      // Default: add .0
      return { ...(prevStyle || {}), numberFormat: currentFormat + ".0" };
    });
  }

  increaseDecimalPlacesInRanges(ranges: AddressRange[]): void {
    this.executeStyleBatch(ranges, (prevStyle) => {
      const currentFormat = prevStyle?.numberFormat || "0";
      const match = currentFormat.match(/0\.(0*)/);
      if (match) {
        const decimals = match[1].length;
        const newFormat = currentFormat.replace(
          /0\.(0*)/,
          `0.${"0".repeat(decimals + 1)}`,
        );
        return { ...(prevStyle || {}), numberFormat: newFormat };
      }
      return { ...(prevStyle || {}), numberFormat: currentFormat + ".0" };
    });
  }

  /**
   * Decrease decimal places
   */
  decreaseDecimalPlaces(addresses: Address[]): void {
    this.executeStyleBatch(addresses, (prevStyle) => {
      const currentFormat = prevStyle?.numberFormat || "0";

      const match = currentFormat.match(/0\.(0+)/);
      if (match && match[1].length > 0) {
        const decimals = match[1].length;
        const newFormat = currentFormat.replace(
          /0\.0+/,
          `0.${"0".repeat(Math.max(0, decimals - 1))}`,
        );
        return { ...(prevStyle || {}), numberFormat: newFormat };
      }

      return prevStyle || {};
    });
  }

  decreaseDecimalPlacesInRanges(ranges: AddressRange[]): void {
    this.executeStyleBatch(ranges, (prevStyle) => {
      const currentFormat = prevStyle?.numberFormat || "0";
      const match = currentFormat.match(/0\.(0+)/);
      if (match && match[1].length > 0) {
        const decimals = match[1].length;
        const newFormat = currentFormat.replace(
          /0\.0+/,
          `0.${"0".repeat(Math.max(0, decimals - 1))}`,
        );
        return { ...(prevStyle || {}), numberFormat: newFormat };
      }
      return prevStyle || {};
    });
  }

  // ============================================================================
  // FORMAT PAINTER
  // ============================================================================

  /**
   * Copy formatting from source cells
   * @param persistent If true, format painter stays active for multiple applications (double-click behavior)
   */
  copyFormat(addresses: Address[], persistent: boolean = false): void {
    this.formatPainterState.sourceStyles.clear();

    for (const addr of addresses) {
      const style = this.worksheet.getCellStyle(addr);
      const key = `${addr.row},${addr.col}`;
      this.formatPainterState.sourceStyles.set(key, style ? { ...style } : {});
    }

    this.formatPainterState.isActive = true;
    this.formatPainterState.isPersistent = persistent;
  }

  /**
   * Apply copied formatting to target cells
   */
  applyFormat(targetAddresses: Address[]): void {
    if (
      !this.formatPainterState.isActive ||
      this.formatPainterState.sourceStyles.size === 0
    ) {
      return;
    }

    // If we only have one source style, apply it to all targets
    const sourceStyles = Array.from(
      this.formatPainterState.sourceStyles.values(),
    );
    const sourceStyle = sourceStyles[0];

    if (sourceStyles.length === 1) {
      // Single source: apply same style to all targets
      const cmd = new BatchSetStyleCommand(
        this.worksheet,
        targetAddresses,
        sourceStyle,
      );
      this.commandManager.execute(cmd);
    } else {
      // Multiple sources: apply pattern (tile source styles over target)
      const commands = targetAddresses.map((addr, index) => {
        const style = sourceStyles[index % sourceStyles.length];
        return new SetStyleCommand(this.worksheet, addr, style);
      });
      const cmd = new BatchCommand(commands, "Format Painter");
      this.commandManager.execute(cmd);
    }

    // Clear format painter if not persistent
    if (!this.formatPainterState.isPersistent) {
      this.clearFormatPainter();
    }
  }

  /**
   * Cancel format painter
   */
  clearFormatPainter(): void {
    this.formatPainterState = {
      sourceStyles: new Map(),
      isActive: false,
      isPersistent: false,
    };
  }

  /**
   * Check if format painter is active
   */
  isFormatPainterActive(): boolean {
    return this.formatPainterState.isActive;
  }

  // ============================================================================
  // CLEAR FORMATTING
  // ============================================================================

  /**
   * Clear all formatting from cells (keep values)
   */
  clearFormat(addresses: Address[]): void {
    const cmd = new BatchSetStyleCommand(this.worksheet, addresses, () => ({}));
    this.commandManager.execute(cmd);
  }

  clearFormatInRanges(ranges: AddressRange[]): void {
    this.executeStyleBatch(ranges, () => ({}));
  }

  /**
   * Clear specific format property
   */
  clearFormatProperty<K extends keyof CellStyle>(
    addresses: Address[],
    property: K,
  ): void {
    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => {
        if (!prevStyle) return {};

        const newStyle = { ...prevStyle };
        delete newStyle[property];
        return newStyle;
      },
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Apply a full cell style preset (Cell Styles gallery) in one undo step.
   */
  applyCellStylePreset(addresses: Address[], preset: CellStyle): void {
    if (addresses.length === 0) return;

    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle) => ({
        ...(prevStyle || {}),
        ...preset,
      }),
    );

    this.commandManager.execute(cmd);
  }

  applyCellStylePresetInRanges(
    ranges: AddressRange[],
    preset: CellStyle,
  ): void {
    if (ranges.length === 0) return;

    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      ranges,
      (prevStyle) => ({
        ...(prevStyle || {}),
        ...preset,
      }),
    );

    this.commandManager.execute(cmd);
  }

  /**
   * Build a single undo step for Format as Table styling.
   */
  createTableStyleCommand(
    range: Range,
    options: {
      headerRowColor: string;
      firstRowStripedColor: string;
      secondRowStripedColor: string;
      borderColor?: string;
    },
  ): Command {
    const startRow = Math.min(range.start.row, range.end.row);
    const endRow = Math.max(range.start.row, range.end.row);
    const startCol = Math.min(range.start.col, range.end.col);
    const endCol = Math.max(range.start.col, range.end.col);

    const addresses: Address[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        addresses.push({ row, col });
      }
    }

    const borderColor = options.borderColor ?? "#BFBFBF";

    const cmd = new BatchSetStyleCommand(
      this.worksheet,
      addresses,
      (prevStyle, addr) => {
        const isHeader = addr.row === startRow;
        const isTop = addr.row === startRow;
        const isBottom = addr.row === endRow;
        const isLeft = addr.col === startCol;
        const isRight = addr.col === endCol;

        const nextStyle: CellStyle = { ...(prevStyle || {}) };

        if (isHeader) {
          nextStyle.fill = options.headerRowColor;
          nextStyle.bold = true;
          nextStyle.color = "#FFFFFF";
        } else {
          const dataRowIndex = addr.row - startRow - 1;
          nextStyle.fill =
            dataRowIndex % 2 === 0
              ? options.firstRowStripedColor
              : options.secondRowStripedColor;
        }

        if (isTop || isBottom || isLeft || isRight) {
          const border: NonNullable<CellStyle["border"]> = {};
          if (isTop) border.top = borderColor;
          if (isBottom) border.bottom = borderColor;
          if (isLeft) border.left = borderColor;
          if (isRight) border.right = borderColor;
          nextStyle.border = border;
        }

        return nextStyle;
      },
    );

    cmd.description = "Format as table";
    return cmd;
  }

  /**
   * Apply Format as Table styling to a range in a single undo step.
   */
  applyTableStyle(
    range: Range,
    options: {
      headerRowColor: string;
      firstRowStripedColor: string;
      secondRowStripedColor: string;
      borderColor?: string;
    },
  ): void {
    const startRow = Math.min(range.start.row, range.end.row);
    const endRow = Math.max(range.start.row, range.end.row);
    const startCol = Math.min(range.start.col, range.end.col);
    const endCol = Math.max(range.start.col, range.end.col);

    const addresses: Address[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        addresses.push({ row, col });
      }
    }

    if (addresses.length === 0) return;

    this.commandManager.execute(this.createTableStyleCommand(range, options));
  }
}
