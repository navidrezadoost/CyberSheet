import type { TransformCommand } from './CommandManager';
import type { Worksheet } from './worksheet';
import type { ClipboardPayload } from './ClipboardService';
import type { Address, Range, Cell } from './types';
import { AddressTransform, InsertColumnTransform, DeleteColumnTransform } from './dag/AddressTransform';
import { PasteCommand } from './PasteCommand';
import { DeleteColumnCommand } from './DeleteColumnCommand';
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
 * InsertColumnCommand - Insert empty column at position k
 * 
 * Implements the verified Extract → Clear → Transform → Paste pipeline.
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. NEVER mutate DAG directly (no registerDependencies/clearDependencies calls)
 * 2. MUST use sparse extraction (iterate via getCell over reasonable bounds)
 * 3. MUST delegate ALL formula shifting to FormulaShiftingService
 * 4. PasteCommand handles 100% of DAG lifecycle management
 * 
 * Common bugs prevented by this design:
 * - Extracting after clearing (loses data)
 * - Extracting full sheet (O(n²) instead of O(n))
 * - Off-by-one errors in col >= k filter
 * - Direct DAG mutation (zombie edges)
 * - Inconsistent map()/shiftFormula() implementations
 */
export class InsertColumnCommand implements TransformCommand {
  private affectedSnapshot: ClipboardPayload | null = null;
  private pasteCommand: PasteCommand | null = null;
  private executed = false;
  private undoPayload: ClipboardPayload | null = null;
  private undoAnchor: Address | null = null;

  constructor(
    private readonly worksheet: Worksheet,
    private readonly insertAt: number
  ) {}

  getTransform(): AddressTransform {
    return new InsertColumnTransform(this.insertAt);
  }

  getUndoTransform(): AddressTransform {
    // Inverse of insert(k) is delete(k) in CURRENT coordinate space
    return new DeleteColumnTransform(this.insertAt);
  }

  execute(): void {
    const k = this.insertAt;
    const transform = this.getTransform();

    // STEP 1: Extract affected cells
    // CRITICAL: Affected region includes:
    // 1. Cells in shifted region (col >= k)
    // 2. Cells OUTSIDE that reference shifted region (dependency-aware)
    
    const affectedCells: CellSnapshot[] = [];
    const affectedMerges: Array<{ range: Range; width: number; height: number }> = [];
    const extractedAddresses: Address[] = []; // Track EXACT addresses for clearing
    
    // Track bounds
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;
    
    // Helper to check if formula references shifted region
    const referencesShiftedRegion = (formula: string): boolean => {
      try {
        const tokens = FormulaShiftingService.tokenize(formula);
        for (const token of tokens) {
          if (token.type === 'CELL_REF') {
            if (token.col >= k) return true;
          } else if (token.type === 'RANGE') {
            if (token.start.col >= k || token.end.col >= k) return true;
          }
        }
      } catch {
        // If tokenization fails, be conservative and include it
        return true;
      }
      return false;
    };
    
    this.worksheet.forEachNonEmptyCell((row: number, col: number, cell: any) => {
      // Include if:
      // 1. Cell is in shifted region (col >= k)
      // 2. Cell has formula referencing shifted region
      const inShiftedRegion = col >= k;
      const hasReferencesToShifted = cell.formula && referencesShiftedRegion(cell.formula);
      
      if (inShiftedRegion || hasReferencesToShifted) {
        // Track bounds for entire affected region
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
        
        // Track EXACT address for clearing
        extractedAddresses.push({ row, col });
        
        affectedCells.push({
          rowOffset: row - 0,  // Will normalize to sourceRange.start later
          colOffset: col - 0,  // Will normalize to sourceRange.start later
          value: cell.value,
          formula: cell.formula,
          style: cell.style,
        });
      }
    });
    
    // Extract and transform merges
    const merges = this.worksheet.getMergedRanges();
    for (const merge of merges) {
      // Include merge if ANY part touches shifted region
      if (merge.end.col >= k || merge.start.col >= k) {
        const width = merge.end.col - merge.start.col + 1;
        const height = merge.end.row - merge.start.row + 1;
        affectedMerges.push({ range: merge, width, height });
      }
    }

    // Handle case where no cells affected
    if (affectedCells.length === 0) {
      // Still need to handle merges even if no cell data
      if (affectedMerges.length === 0) return;
      
      // Anchor the merge-only payload at real worksheet coordinates.
      // The worksheet public Address contract is one-based; zero here makes
      // PasteCommand's dependency cleanup issue an invalid graph address.
      minRow = Math.min(...affectedMerges.map(({ range }) => range.start.row));
      maxRow = Math.max(...affectedMerges.map(({ range }) => range.end.row));
      minCol = Math.min(...affectedMerges.map(({ range }) => range.start.col));
      maxCol = Math.max(...affectedMerges.map(({ range }) => range.end.col));
    }
    
    // Create snapshot payload with normalized offsets
    const sourceStart = { row: minRow, col: minCol };
    
    this.affectedSnapshot = {
      sourceRange: {
        start: sourceStart,
        end: { row: maxRow, col: maxCol },
      },
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1,
      cells: affectedCells.map(cell => ({
        ...cell,
        rowOffset: cell.rowOffset - minRow,
        colOffset: cell.colOffset - minCol,
      })),
      isCut: false,
    };

    // STEP 2: Clear affected region
    // Must happen AFTER extraction
    // 🔴 CRITICAL: Clear EXACTLY what was extracted (Invariant 11: No Duplicate Mapping)
    // NOT region-based clearing - must match extraction set precisely
    for (const addr of extractedAddresses) {
      this.worksheet.deleteCell(addr);
    }
    
    // Clear merges (will be reconstructed after transformation)
    for (const { range } of affectedMerges) {
      this.worksheet.cancelMerge(range);
    }

    // STEP 3: Transform snapshot
    const targetAnchor: Address = { row: minRow, col: minCol };
    const transformedPayload = this.applyTransformToPayload(
      this.affectedSnapshot,
      transform,
      targetAnchor,
      affectedMerges  // Pass merges for encoding into payload
    );

    // STEP 4: Paste transformed cells + merges
    // PasteCommand is SINGLE WRITER for:
    // - Cell values/formulas/styles
    // - Dependency registration
    // - DAG updates
    // - Merge topology (reconstructed from payload metadata)
    this.pasteCommand = new PasteCommand(
      this.worksheet,
      transformedPayload,
      targetAnchor
    );
    this.pasteCommand.execute();

    // STEP 5: Capture undo metadata (evaluated in CURRENT coordinate space)
    this.undoAnchor = targetAnchor;
    this.executed = true;
  }

  undo(): void {
    if (!this.executed) {
      throw new Error('Cannot undo before execute');
    }

    // Replay-based undo: use inverse command
    // InsertColumn(k) inverse is DeleteColumn(k) IN CURRENT SPACE
    const inverseCommand = new DeleteColumnCommand(this.worksheet, this.insertAt);
    inverseCommand.execute();

    this.executed = false;
  }

  /**
   * Transform a ClipboardPayload using an AddressTransform
   * 
   * CRITICAL: Preserves offset semantics!
   * 1. Convert offset → absolute (relative to sourceRange)
   * 2. Apply transform.map(absolute)
   * 3. Convert back: newOffset = mapped - targetAnchor
   * 
   * This is where Invariant 7 (Reference Mapping Consistency) is enforced:
   * - map() transforms cell addresses
   * - shiftFormula() transforms formula references  
   * - Both MUST be consistent (validated by GraphTransformationValidator)
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
        // Cell was deleted by transformation (e.g., DeleteColumn)
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
        // CRITICAL: Pass original ABSOLUTE address to shiftFormula for delta computation
        formula: cell.formula ? transform.shiftFormula(cell.formula, absoluteAddr) : undefined,
        style: cell.style,
        isMergeAnchor: cell.isMergeAnchor,
        mergeWidth: cell.mergeWidth,
        mergeHeight: cell.mergeHeight,
      };

      transformedCells.push(transformedCell);
    }

    // Transform merges and encode into payload
    // This ensures PasteCommand is SINGLE WRITER for merge topology
    // CRITICAL INVARIANT: Reject degenerate merges (width < 2 OR height < 2)
    if (merges && merges.length > 0) {
      for (const { range } of merges) {
        const mappedStart = transform.map(range.start);
        const mappedEnd = transform.map(range.end);
        
        if (mappedStart && mappedEnd) {
          const width = mappedEnd.col - mappedStart.col + 1;
          const height = mappedEnd.row - mappedStart.row + 1;
          
          // Guard: Reject degenerate merges
          // A merge MUST span at least 2 cells in one dimension
          if (width < 2 && height < 2) {
            continue; // Skip degenerate merge
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
      }
    }

    return {
      sourceRange: payload.sourceRange, // Keep original for audit trail
      width: payload.width,
      height: payload.height,
      cells: transformedCells,
      isCut: payload.isCut,
    };
  }
}
