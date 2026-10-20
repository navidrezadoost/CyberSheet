import type { TransformCommand } from './CommandManager';
import type { Worksheet } from './worksheet';
import type { ClipboardPayload } from './ClipboardService';
import type { Address, Range } from './types';
import { AddressTransform, DeleteColumnTransform, InsertColumnTransform } from './dag/AddressTransform';
import { PasteCommand } from './PasteCommand';
import { InsertColumnCommand } from './InsertColumnCommand';
import { FormulaShiftingService } from './FormulaShiftingService';

/**
 * CellSnapshot for clipboard operations
 */
interface CellSnapshot {
  rowOffset: number;
  colOffset: number;
  value: any;
  formula?: string;
  style?: any;
  isMergeAnchor?: boolean;
  mergeWidth?: number;
  mergeHeight?: number;
}

/**
 * DeleteColumnCommand - Delete column at position k
 * 
 * Implements the verified Extract → Clear → Transform → Paste pipeline.
 * 
 * CRITICAL: Deletion means:
 * - Cells at col == k are discarded (not transformed)
 * - Cells at col > k shift left by -1
 * - Formula references to col == k become #REF!
 * - Formula references to col > k shift left by -1
 * 
 * Same architectural constraints as InsertColumnCommand:
 * - NEVER mutate DAG directly
 * - Use sparse extraction where possible
 * - Delegate formula shifting to FormulaShiftingService
 * - PasteCommand handles DAG lifecycle
 */
export class DeleteColumnCommand implements TransformCommand {
  private affectedSnapshot: ClipboardPayload | null = null;
  private deletedSnapshot: ClipboardPayload | null = null;
  private pasteCommand: PasteCommand | null = null;
  private affectedMerges: Array<{ range: Range; width: number; height: number }> = [];
  private executed = false;
  private deletedPayload: ClipboardPayload | null = null;
  private shiftedPayload: ClipboardPayload | null = null;
  private deletedAnchor: Address | null = null;
  private shiftedAnchor: Address | null = null;

  constructor(
    private readonly worksheet: Worksheet,
    private readonly deleteAt: number
  ) {}

  getTransform(): AddressTransform {
    return new DeleteColumnTransform(this.deleteAt);
  }

  getUndoTransform(): AddressTransform {
    // Inverse of delete(k) is insert(k) in CURRENT coordinate space
    return new InsertColumnTransform(this.deleteAt);
  }

  execute(): void {
    const k = this.deleteAt;
    const transform = this.getTransform();

    // STEP 1: Extract affected cells
    // CRITICAL: Include cells outside deleted column that reference it
    const cellsToDelete: CellSnapshot[] = [];
    const cellsToShift: CellSnapshot[] = [];
    const extractedAddresses: Address[] = []; // Track EXACT addresses for clearing (Invariant 11)
    
    let minRow = Infinity, maxRow = -Infinity;
    let minColShift = Infinity, maxColShift = -Infinity;
    
    // Helper to check if formula references deleted or shifted region
    const referencesAffectedRegion = (formula: string): boolean => {
      try {
        const tokens = FormulaShiftingService.tokenize(formula);
        for (const token of tokens) {
          if (token.type === 'CELL_REF') {
            if (token.col >= k) return true;  // Deleted or shifted
          } else if (token.type === 'RANGE') {
            if (token.start.col >= k || token.end.col >= k) return true;
          }
        }
      } catch {
        return true;
      }
      return false;
    };

    this.worksheet.forEachNonEmptyCell((row: number, col: number, cell: any) => {
      if (col === k) {
        // Cells to be deleted
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        
        extractedAddresses.push({ row, col }); // Track exact address
        
        cellsToDelete.push({
          rowOffset: row - 0,
          colOffset: 0,
          value: cell.value,
          formula: cell.formula,
          style: cell.style,
        });
      } else if (col > k || (cell.formula && referencesAffectedRegion(cell.formula))) {
        // Cells to shift OR cells with references to affected region
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minColShift = Math.min(minColShift, col);
        maxColShift = Math.max(maxColShift, col);
        
        extractedAddresses.push({ row, col }); // Track exact address
        
        cellsToShift.push({
          rowOffset: row - 0,
          colOffset: col - 0,
          value: cell.value,
          formula: cell.formula,
          style: cell.style,
        });
      }
    });

    // Merge-only edits still need a valid one-based PasteCommand anchor.
    // Structural commands may have no cells from which to derive bounds.
    const affectedMergesForBounds = this.worksheet.getMergedRanges().filter(merge => merge.end.col >= k);
    if (minRow === Infinity && affectedMergesForBounds.length > 0) {
      minRow = Math.min(...affectedMergesForBounds.map(merge => merge.start.row));
      maxRow = Math.max(...affectedMergesForBounds.map(merge => merge.end.row));
      minColShift = Math.min(...affectedMergesForBounds.map(merge => merge.start.col));
      maxColShift = Math.max(...affectedMergesForBounds.map(merge => merge.end.col));
    }

    // Save deleted cells for undo
    this.deletedSnapshot = {
      sourceRange: {
        start: { row: minRow !== Infinity ? minRow : 0, col: k },
        end: { row: maxRow !== -Infinity ? maxRow : 0, col: k },
      },
      width: 1,
      height: maxRow !== -Infinity ? maxRow - minRow + 1 : 1,
      cells: cellsToDelete.map(cell => ({
        ...cell,
        rowOffset: cell.rowOffset - (minRow !== Infinity ? minRow : 0),
      })),
      isCut: false,
    };

    // Capture deleted cells for undo (before transformation)
    if (cellsToDelete.length > 0) {
      const minDeleteRow = minRow !== Infinity ? minRow : 0;
      this.deletedPayload = {
        cells: cellsToDelete.map(cell => ({
          ...cell,
          rowOffset: cell.rowOffset - minDeleteRow,
        })),
        anchorRow: minDeleteRow,
        anchorCol: k,
      } as any;  // ClipboardPayload structure will be inferred
      this.deletedAnchor = { row: minDeleteRow, col: k };
    }

    // Save cells that will shift for transformation
    const shiftSourceStart = { row: minRow !== Infinity ? minRow : 0, col: minColShift !== Infinity ? minColShift : 0 };
    this.affectedSnapshot = {
      sourceRange: {
        start: shiftSourceStart,
        end: { row: maxRow !== -Infinity ? maxRow : 0, col: maxColShift !== -Infinity ? maxColShift : 0 },
      },
      width: maxColShift !== -Infinity ? maxColShift - minColShift + 1 : 1,
      height: maxRow !== -Infinity ? maxRow - minRow + 1 : 1,
      cells: cellsToShift.map(cell => ({
        ...cell,
        rowOffset: cell.rowOffset - shiftSourceStart.row,
        colOffset: cell.colOffset - shiftSourceStart.col,
      })),
      isCut: false,
    };

    // Extract affected merges (deleted or shifted)
    // Merges spanning deleted column OR col > k need transformation
    const allMerges = this.worksheet.getMergedRanges();
    for (const merge of allMerges) {
      if (merge.end.col >= k) {
        // Either deleted or needs shifting
        this.affectedMerges.push({
          range: merge,
          width: merge.end.col - merge.start.col + 1,
          height: merge.end.row - merge.start.row + 1
        });
      }
    }

    // STEP 2: Clear affected region
    // 🔴 CRITICAL: Clear EXACTLY what was extracted (Invariant 11: No Duplicate Mapping)
    // NOT region-based clearing - must match extraction set precisely
    for (const addr of extractedAddresses) {
      this.worksheet.deleteCell(addr);
    }
    
    // Clear merges (will be reconstructed after transformation)
    for (const { range } of this.affectedMerges) {
      this.worksheet.cancelMerge(range);
    }

    // STEP 3: Transform snapshot (only cells that weren't deleted)
    if (cellsToShift.length === 0 && this.affectedMerges.length === 0) {
      // No cells or merges to shift - deletion complete
      return;
    }
    
    const targetAnchor: Address = { row: shiftSourceStart.row, col: shiftSourceStart.col };
    const transformedPayload = this.applyTransformToPayload(
      this.affectedSnapshot,
      transform,
      targetAnchor,
      this.affectedMerges  // Pass merges for encoding into payload
    );

    // STEP 4: Paste transformed cells at new positions
    // Note: Cells from col k+1 now go to col k
    this.pasteCommand = new PasteCommand(
      this.worksheet,
      transformedPayload,
      targetAnchor
    );
    this.pasteCommand.execute();

    // STEP 5: Capture undo metadata (evaluated in CURRENT coordinate space)
    this.shiftedPayload = transformedPayload;
    this.shiftedAnchor = targetAnchor;
    this.executed = true;
  }

  undo(): void {
    if (!this.executed) {
      throw new Error('Cannot undo before execute');
    }

    // Step 1: Insert column back (shifts cells right)
    const insertCommand = new InsertColumnCommand(this.worksheet, this.deleteAt);
    insertCommand.execute();

    // Step 2: Restore deleted cells
    if (this.deletedPayload && this.deletedAnchor) {
      const restorePaste = new PasteCommand(
        this.worksheet,
        this.deletedPayload,
        this.deletedAnchor
      );
      restorePaste.execute();
    }

    this.executed = false;
  }

  /**
   * Transform a ClipboardPayload using an AddressTransform
   * 
   * CRITICAL: Preserves offset semantics!
   * Identical to InsertColumnCommand implementation for consistency.
   * 
   * @param payload - Original snapshot
   * @param transform - Transformation to apply
   * @param targetAnchor - Where payload will be pasted
   * @returns Transformed payload
   */
  private applyTransformToPayload(
    payload: ClipboardPayload,
    transform: AddressTransform,
    targetAnchor: Address,
    merges?: Array<{ range: Range; width: number; height: number }>
  ): ClipboardPayload {
    const transformedCells: CellSnapshot[] = [];

    for (const cell of payload.cells) {
      // STEP 1: Convert offset to absolute address
      const absoluteAddr: Address = {
        row: payload.sourceRange.start.row + cell.rowOffset,
        col: payload.sourceRange.start.col + cell.colOffset,
      };

      // STEP 2: Apply transformation
      const mappedAddr = transform.map(absoluteAddr);
      if (mappedAddr === null) {
        // Cell was deleted by transformation
        continue;
      }

      // STEP 3: Re-normalize to offset relative to targetAnchor
      const newOffset: Address = {
        row: mappedAddr.row - targetAnchor.row,
        col: mappedAddr.col - targetAnchor.col,
      };

      const transformedCell: CellSnapshot = {
        rowOffset: newOffset.row,
        colOffset: newOffset.col,
        value: cell.value,
        // CRITICAL: Pass original ABSOLUTE address for delta computation
        formula: cell.formula ? transform.shiftFormula(cell.formula, absoluteAddr) : undefined,
        style: cell.style,
        isMergeAnchor: cell.isMergeAnchor,
        mergeWidth: cell.mergeWidth,
        mergeHeight: cell.mergeHeight,
      };

      transformedCells.push(transformedCell);
    }

    // Transform merges and encode into payload
    // Merges spanning deleted column become invalid (mappedStart/mappedEnd will be null)
    // Merges col > k shift left by -1
    // CRITICAL INVARIANT: Reject degenerate merges (width < 2 OR height < 2)
    if (merges && merges.length > 0) {
      for (const { range } of merges) {
        const mappedStart = transform.map(range.start);
        const mappedEnd = transform.map(range.end);
        
        // Both must be valid (not deleted)
        if (mappedStart && mappedEnd) {
          const width = mappedEnd.col - mappedStart.col + 1;
          const height = mappedEnd.row - mappedStart.row + 1;
          
          // Guard: Reject degenerate merges
          // A merge MUST span at least 2 cells in one dimension
          if (width < 2 && height < 2) {
            continue; // Skip degenerate merge (collapsed by deletion)
          }
          
          // Calculate offset relative to target anchor
          const mergeAnchorOffset = {
            rowOffset: mappedStart.row - targetAnchor.row,
            colOffset: mappedStart.col - targetAnchor.col
          };
          
          // Encode as merge anchor cell in payload
          transformedCells.push({
            ...mergeAnchorOffset,
            value: null,
            isMergeAnchor: true,
            mergeWidth: width,
            mergeHeight: height
          });
        }
        // If merge spans deleted column, it's discarded (mappedStart or mappedEnd is null)
      }
    }

    return {
      sourceRange: payload.sourceRange,
      width: payload.width,
      height: payload.height,
      cells: transformedCells,
      isCut: payload.isCut,
    };
  }
}
