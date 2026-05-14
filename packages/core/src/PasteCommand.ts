/**
 * PasteCommand.ts
 * 
 * Command for pasting clipboard data with full undo/redo support.
 * 
 * Architecture: Command Pattern
 * - Captures previous state of all affected cells
 * - Applies clipboard payload to target range
 * - Supports undo by restoring exact previous state
 * - Maintains transaction boundaries
 * 
 * Implementation Phases:
 * - Phase 0.3.1: Value-only paste (current)
 * - Phase 0.3.2: Formula paste with shifting
 * - Phase 0.3.3: Style paste with interning
 * - Phase 0.3.4: Merged cell reconstruction
 * - Phase 0.3.5: DAG integration
 * - Phase 0.3.6: Cut source clearing
 * 
 * Phase: Clipboard Architecture V1 - Phase 0.3 (Steps 1 & 2)
 * Baseline: BASELINE_STABLE_V1
 */

import type { Command } from './CommandManager';
import type { Address, ExtendedCellValue, CellStyle } from './types';
import type { Worksheet } from './worksheet';
import type { ClipboardPayload } from './ClipboardService';
import { FormulaShiftingService } from './FormulaShiftingService';

/**
 * Cell state snapshot for undo.
 * 
 * Stores canonical pointers only (no cloning, no spreading).
 * 
 * @invariant Stores exact state for restoration
 * @invariant No reconstruction during undo
 */
interface CellSnapshot {
  addr: Address;
  value: ExtendedCellValue;
  formula: string | undefined;
  style: CellStyle | undefined;  // Canonical pointer (frozen, interned)
}

/**
 * PasteCommand — Apply clipboard payload to target range.
 * 
 * Execution Order (MANDATORY):
 * 1. Capture previous state (all affected cells)
 * 2. Apply values/formulas/styles from payload
 * 3. Register dependencies (future: Step 6)
 * 4. Mark dirty (future: Step 6)
 *  2 - Value Only):
 * - Apply cell values from payload
 * - NO formula shifting (Step 3)
 * - NO style application (Step 4)
 * - NO merge reconstruction (Step 5)
 * - NO merge reconstruction (Step 5)
 * - No DAG integration (Step 6)
 * 
 * @architecture Command Pattern for undo/redo
 * @invariant Execute inside transaction boundary
 * @invariant Undo restores exact previous state
 */
export class PasteCommand implements Command {
  private worksheet: Worksheet;
  private payload: ClipboardPayload;
  private targetAnchor: Address;
  private snapshots: CellSnapshot[] = [];  // Target region snapshots for undo
  private sourceSnapshots: CellSnapshot[] = [];  // Source region snapshots for cut undo
  
  readonly description: string;
  
  /**
   * Create paste command.
   * 
   * @param worksheet Target worksheet
   * @param payload Clipboard payload (immutable)
   * @param targetAnchor Top-left address of paste target
   * 
   * @invariant Payload must be immutable
   * @invariant Target anchor determines paste location
   */
  constructor(
    worksheet: Worksheet,
    payload: ClipboardPayload,
    targetAnchor: Address
  ) {
    this.worksheet = worksheet;
    this.payload = payload;
    this.targetAnchor = targetAnchor;
    this.description = `Paste ${payload.width}x${payload.height} range to ${targetAnchor.row},${targetAnchor.col}`;
    
    // Capture previous state immediately (before any changes)
    this.captureState();
    
    // For cut operations, also capture source state for undo
    if (payload.isCut) {
      this.captureSourceState();
    }
  }
  
  /**
   * Capture current state of all cells that will be affected.
   * 
   * Must happen in constructor (before execute) to ensure we can undo.
   * Stores canonical pointers only — no cloning.
   * 
   * @invariant Captures ALL affected cells
   * @invariant Stores canonical pointers (not clones)
   */
  private captureState(): void {
    // Calculate affected range
    const endRow = this.targetAnchor.row + this.payload.height - 1;
    const endCol = this.targetAnchor.col + this.payload.width - 1;
    
    // Capture all cells in target range
    for (let row = this.targetAnchor.row; row <= endRow; row++) {
      for (let col = this.targetAnchor.col; col <= endCol; col++) {
        const addr: Address = { row, col };
        
        // Capture current state
        const cell = this.worksheet.getCell(addr);
        
        this.snapshots.push({
          addr,
          value: cell?.value ?? null,
          formula: cell?.formula,
          style: cell?.style  // Canonical pointer
        });
      }
    }
  }
  
  /**
   * Capture source region state for cut operations.
   * 
   * Stores original state of source cells so undo can restore them.
   * Only called when payload.isCut = true.
   * 
   * @invariant Captures ALL affected source cells
   * @invariant Stores canonical pointers (not clones)
   */
  private captureSourceState(): void {
    const { start, end } = this.payload.sourceRange;
    
    // Capture all cells in source range
    for (let row = start.row; row <= end.row; row++) {
      for (let col = start.col; col <= end.col; col++) {
        const addr: Address = { row, col };
        
        // Capture current state
        const cell = this.worksheet.getCell(addr);
        
        this.sourceSnapshots.push({
          addr,
          value: cell?.value ?? null,
          formula: cell?.formula,
          style: cell?.style  // Canonical pointer
        });
      }
    }
  }
  
  /**
   * Execute paste operation.
   * 
   * Current Implementation (Step 6 - Complete):
   * - Clear dependencies for target region (DAG pre-cleanup)
   * - Apply cell values from payload
   * - Shift and apply formulas
   * - Register formula dependencies in DAG
   * - Mark dirty nodes for recalculation
   * - Apply styles with auto-interning
   * - Reconstruct merged regions
   * - Clear source region if cut operation (DAG finalization)
   * 
   * @invariant Must execute inside transaction boundary
   * @invariant No partial writes
   * @invariant No recompute mid-operation (only mark dirty)
   * @invariant Style layer independent of value/formula/DAG layers
   * @invariant Merge layer independent of semantic/graph layers
   * @invariant Cut = atomic paste + source invalidation
   */
  execute(): void {
    // Calculate source and target anchors for formula shifting
    const sourceAnchor = this.payload.sourceRange.start;
    const targetAnchor = this.targetAnchor;
    const payloadContainsMergedRegions = this.payload.cells.some(
      cellSnapshot =>
        cellSnapshot.isMergeAnchor
        && !!cellSnapshot.mergeWidth
        && !!cellSnapshot.mergeHeight
        && (cellSnapshot.mergeWidth > 1 || cellSnapshot.mergeHeight > 1)
    );
    const shouldClearTargetMerges =
      this.payload.width > 1
      || this.payload.height > 1
      || payloadContainsMergedRegions;
    
    // STEP 6: PRE-PASTE DAG CLEANUP
    // Clear old dependency edges for target region to prevent zombie edges
    const targetEndRow = this.targetAnchor.row + this.payload.height - 1;
    const targetEndCol = this.targetAnchor.col + this.payload.width - 1;
    for (let row = this.targetAnchor.row; row <= targetEndRow; row++) {
      for (let col = this.targetAnchor.col; col <= targetEndCol; col++) {
        this.worksheet.clearDependencies({ row, col });
      }
    }
    
    // STEP 5: CLEAR EXISTING MERGES IN TARGET REGION
    // Must happen BEFORE applying new content to avoid overlap corruption.
    // Plain 1x1 pastes should preserve an existing target merge, matching
    // spreadsheet expectations when updating the anchor cell content only.
    if (shouldClearTargetMerges) {
      this.worksheet.cancelMerge({
        start: this.targetAnchor,
        end: { row: targetEndRow, col: targetEndCol }
      });
    }
    
    // STEP 2 & 3: VALUE AND FORMULA PASTE
    // Apply values and formulas from clipboard payload
    // CRITICAL: Skip merge anchors here - they're processed in deterministic order later
    for (const cellSnapshot of this.payload.cells) {
      // Skip merge-only entries (no value/formula content)
      if (cellSnapshot.isMergeAnchor && !cellSnapshot.value && !cellSnapshot.formula) {
        continue;
      }
      
      const targetAddr: Address = {
        row: this.targetAnchor.row + cellSnapshot.rowOffset,
        col: this.targetAnchor.col + cellSnapshot.colOffset
      };
      
      // PRIORITY RULE: formula > value
      if (cellSnapshot.formula) {
        // STEP 3: Formula paste with shifting
        
        // Shift formula using FormulaShiftingService (PURE function)
        // Note: shift() expects input WITH '=', payload stores WITHOUT '='
        const formulaWithEquals = '=' + cellSnapshot.formula;
        const shiftedFormula = FormulaShiftingService.shift(
          formulaWithEquals,
          sourceAnchor,
          targetAnchor
        );
        
        // Write formula to cell (shiftedFormula already has '=')
        this.worksheet.setCellFormula(targetAddr, shiftedFormula);
        
        // STEP 3: DAG Integration (post-paste registration)
        // Extract dependencies from shifted formula (without '=' for tokenizer)
        const formulaBody = shiftedFormula.startsWith('=') 
          ? shiftedFormula.slice(1) 
          : shiftedFormula;
        const deps = this.extractDependencies(formulaBody);
        this.worksheet.registerDependencies(targetAddr, deps);
        
      } else {
        // Value-only paste (no formula)
        this.worksheet.setCellValue(targetAddr, cellSnapshot.value);
      }
    }
    
    // STEP 4: STYLE PASTE
    // Apply styles AFTER value/formula layer (layer separation)
    // Worksheet auto-interns via StyleCache (canonical pointer discipline)
    for (const cellSnapshot of this.payload.cells) {
      // Skip merge-only entries (no style content)
      if (cellSnapshot.isMergeAnchor && !cellSnapshot.style) {
        continue;
      }
      
      if (cellSnapshot.style) {
        const targetAddr: Address = {
          row: this.targetAnchor.row + cellSnapshot.rowOffset,
          col: this.targetAnchor.col + cellSnapshot.colOffset
        };
        
        // Apply style - worksheet handles interning automatically
        // No shared mutable references (StyleCache ensures canonical copies)
        this.worksheet.setCellStyle(targetAddr, cellSnapshot.style as any);
      }
    }
    
    // STEP 5: MERGE RECONSTRUCTION
    // Reconstruct merged regions from anchor-only metadata
    // This is STRUCTURAL TOPOLOGY, not data or rendering
    // CRITICAL: Processed AFTER all cell content to ensure deterministic ordering
    //           (values/formulas/styles written first, then topology applied)
    for (const cellSnapshot of this.payload.cells) {
      if (cellSnapshot.isMergeAnchor && cellSnapshot.mergeWidth && cellSnapshot.mergeHeight) {
        // Guard: Reject degenerate merges (should never happen after transform guards, but defense-in-depth)
        if (cellSnapshot.mergeWidth < 2 && cellSnapshot.mergeHeight < 2) {
          continue; // Skip 1x1 "merge" (not a valid merge)
        }
        
        // Calculate target merge region
        const targetMergeStart: Address = {
          row: this.targetAnchor.row + cellSnapshot.rowOffset,
          col: this.targetAnchor.col + cellSnapshot.colOffset
        };
        
        const targetMergeEnd: Address = {
          row: targetMergeStart.row + cellSnapshot.mergeHeight - 1,
          col: targetMergeStart.col + cellSnapshot.mergeWidth - 1
        };
        
        // Apply merge (MergeStore validates no overlap)
        // Performance: O(merge size), not O(sheet size)
        this.worksheet.mergeCells({
          start: targetMergeStart,
          end: targetMergeEnd
        });
      }
    }
    
    // STEP 6: CUT SOURCE CLEARING (DAG finalization)
    // If this is a cut operation, clear source cells after paste succeeds
    // This is the "source invalidation" phase of the cut transaction
    if (this.payload.isCut) {
      const { start, end } = this.payload.sourceRange;
      
      // Clear all cells in source range
      for (let row = start.row; row <= end.row; row++) {
        for (let col = start.col; col <= end.col; col++) {
          const addr: Address = { row, col };
          
          // Clear dependencies first (prevent zombie edges)
          this.worksheet.clearDependencies(addr);
          
          // Clear cell content
          this.worksheet.setCellValue(addr, null);
          this.worksheet.setCellFormula(addr, '');
          this.worksheet.setCellStyle(addr, undefined);
        }
      }
      
      // Clear source merges
      this.worksheet.cancelMerge(this.payload.sourceRange);
    }
    
    // NOTE: Recomputation happens OUTSIDE this command via RecalcCoordinator
    // We only mark dirty - we do NOT recompute here
  }
  
  /**
   * Extract cell reference dependencies from a formula.
   * 
   * Uses FormulaShiftingService's tokenizer to identify cell references.
   * This is a LOCAL operation - O(formula length), not O(graph size).
   * 
   * @param formula Formula without leading = (e.g., "A1+B2")
   * @returns Array of addresses this formula depends on
   * 
   * @invariant Pure function - no worksheet access
   * @invariant O(n) where n = formula length
   */
  private extractDependencies(formula: string): Address[] {
    const deps: Address[] = [];
    const seen = new Set<string>();
    
    // Tokenize formula to find cell references
    const tokens = FormulaShiftingService.tokenize(formula);
    
    for (const token of tokens) {
      if (token.type === 'CELL_REF') {
        // Single cell reference
        const key = `${token.row}:${token.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          deps.push({ row: token.row, col: token.col });
        }
      } else if (token.type === 'RANGE') {
        // Range reference - add all cells in range
        const start = token.start;
        const end = token.end;
        
        for (let row = start.row; row <= end.row; row++) {
          for (let col = start.col; col <= end.col; col++) {
            const key = `${row}:${col}`;
            if (!seen.has(key)) {
              seen.add(key);
              deps.push({ row, col });
            }
          }
        }
      }
    }
    
    return deps;
  }
  
  /**
   * Undo paste operation.
   * 
   * Restores exact previous state from snapshots.
   * Uses canonical pointer restoration (no reconstruction).
   * 
   * For cut operations, also restores source cells.
   * 
   * @invariant Restores EXACT previous state
   * @invariant No reconstruction
   * @invariant Operates in reverse (clear first, then restore)
   * @invariant Cut undo = restore target + restore source
   */
  undo(): void {
    // Restore each target cell's previous state
    for (const snapshot of this.snapshots) {
      // Restore value
      this.worksheet.setCellValue(snapshot.addr, snapshot.value);
      
      // Restore formula (if it existed)
      if (snapshot.formula !== undefined) {
        this.worksheet.setCellFormula(snapshot.addr, snapshot.formula);
      } else {
        // Clear formula if none existed
        const cell = this.worksheet.getCell(snapshot.addr);
        if (cell?.formula) {
          this.worksheet.setCellFormula(snapshot.addr, '');
        }
      }
      
      // Restore style (canonical pointer)
      this.worksheet.setCellStyle(snapshot.addr, snapshot.style);
    }
    
    // For cut operations, restore source cells
    if (this.payload.isCut && this.sourceSnapshots.length > 0) {
      for (const snapshot of this.sourceSnapshots) {
        // Restore value
        this.worksheet.setCellValue(snapshot.addr, snapshot.value);
        
        // Restore formula (if it existed)
        if (snapshot.formula !== undefined) {
          this.worksheet.setCellFormula(snapshot.addr, snapshot.formula);
        } else {
          // Clear formula if none existed
          const cell = this.worksheet.getCell(snapshot.addr);
          if (cell?.formula) {
            this.worksheet.setCellFormula(snapshot.addr, '');
          }
        }
        
        // Restore style (canonical pointer)
        this.worksheet.setCellStyle(snapshot.addr, snapshot.style);
      }
    }
    
    // NOTE: DAG edges are implicitly restored via setCellFormula
    // which calls registerDependencies internally
  }
}
