/**
 * SpillEngine.ts
 * 
 * Handles Excel 365 dynamic array spill behavior.
 * Manages spill ranges, detects conflicts, and provides # operator support.
 */

import type { Address, Cell } from './types';
import type { Worksheet } from './worksheet';

/**
 * Spill Engine for Dynamic Array Functions
 * 
 * Features:
 * - Automatic spill detection for array formulas
 * - #SPILL! error when spill range is blocked
 * - Spill range metadata tracking
 * - # operator support for referencing spilled ranges
 * - Automatic cleanup when source formulas change
 */
export class SpillEngine {
  /**
   * Check if a range is available for spilling
   * @param worksheet The worksheet to check
   * @param sourceAddr The source cell address
   * @param rows Number of rows needed
   * @param cols Number of columns needed
   * @returns null if available, Error if blocked
   */
  checkSpillRange(
    worksheet: Worksheet,
    sourceAddr: Address,
    rows: number,
    cols: number
  ): Error | null {
    // Check each cell in the target range
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellAddr: Address = {
          row: sourceAddr.row + r,
          col: sourceAddr.col + c
        };

        // Skip the source cell itself
        if (r === 0 && c === 0) continue;

        const cell = worksheet.getCell(cellAddr);

        // If cell has a value, formula, or is spilled from another source, it's blocked
        if (cell) {
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            return new Error('#SPILL!');
          }
          if (cell.formula) {
            return new Error('#SPILL!');
          }
          // Allow cells that are spilled from the same source (for updates)
          if (
            cell.spilledFrom &&
            (cell.spilledFrom.row !== sourceAddr.row || cell.spilledFrom.col !== sourceAddr.col)
          ) {
            return new Error('#SPILL!');
          }
        }
      }
    }

    return null; // Range is available
  }

  /**
   * Apply spill to a worksheet range
   * @param worksheet The worksheet to spill to
   * @param sourceAddr The source cell address
   * @param arrayValue The array value to spill
   */
  applySpill(
    worksheet: Worksheet,
    sourceAddr: Address,
    arrayValue: any[][] | any[]
  ): void {
    // Determine dimensions
    let rows: number, cols: number;
    let is2D = false;

    if (Array.isArray(arrayValue[0])) {
      // 2D array
      is2D = true;
      rows = arrayValue.length;
      cols = arrayValue[0].length;
    } else {
      // 1D array - treat as single column
      rows = arrayValue.length;
      cols = 1;
    }

    // Clear any existing spill from this source FIRST
    // This allows the range check to pass for updates
    this.clearSpill(worksheet, sourceAddr);

    // Check if spill range is available
    const spillError = this.checkSpillRange(worksheet, sourceAddr, rows, cols);
    if (spillError) {
      // Set source cell to #SPILL! error
      const k = `${sourceAddr.row}:${sourceAddr.col}`;
      const cell = worksheet.getCell(sourceAddr) ?? { value: null };
      cell.value = spillError.message;
      delete cell.spillSource;
      (worksheet as any).cells.set(k, cell);
      return;
    }

    // Apply the spill
    const endAddr: Address = {
      row: sourceAddr.row + rows - 1,
      col: sourceAddr.col + cols - 1
    };

    // Set values in spill range
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellAddr: Address = {
          row: sourceAddr.row + r,
          col: sourceAddr.col + c
        };

        // Get value from array
        let value: any;
        if (is2D) {
          value = arrayValue[r][c];
        } else {
          value = arrayValue[r];
        }

        const k = `${cellAddr.row}:${cellAddr.col}`;
        const cell = worksheet.getCell(cellAddr) ?? { value: null };
        cell.value = value;

        if (r === 0 && c === 0) {
          // Source cell gets the spill metadata
          cell.spillSource = {
            dimensions: [rows, cols],
            endAddress: endAddr
          };
        } else {
          // Spilled cells get spilledFrom reference
          cell.spilledFrom = sourceAddr;
        }

        // Set the cell in worksheet
        (worksheet as any).cells.set(k, cell);
      }
    }
  }

  /**
   * Clear spill range from a source cell
   * @param worksheet The worksheet
   * @param sourceAddr The source cell that created the spill
   */
  clearSpill(worksheet: Worksheet, sourceAddr: Address): void {
    const sourceCell = worksheet.getCell(sourceAddr);
    if (!sourceCell?.spillSource) return;

    const { endAddress } = sourceCell.spillSource;

    // Clear all spilled cells
    for (let r = sourceAddr.row; r <= endAddress.row; r++) {
      for (let c = sourceAddr.col; c <= endAddress.col; c++) {
        if (r === sourceAddr.row && c === sourceAddr.col) continue; // Skip source

        const cellAddr: Address = { row: r, col: c };
        const cell = worksheet.getCell(cellAddr);
        if (cell?.spilledFrom?.row === sourceAddr.row && cell.spilledFrom.col === sourceAddr.col) {
          // Clear the spilled cell
          cell.value = null;
          delete cell.spilledFrom;
        }
      }
    }

    // Clear source metadata
    delete sourceCell.spillSource;
  }

  /**
   * Get the spilled range from a source cell (for # operator)
   * @param worksheet The worksheet
   * @param sourceAddr The source cell address
   * @returns The spilled array or error
   */
  getSpilledRange(worksheet: Worksheet, sourceAddr: Address): any[][] | any[] | Error {
    const sourceCell = worksheet.getCell(sourceAddr);
    if (!sourceCell?.spillSource) {
      return new Error('#REF!'); // Cell doesn't have a spill
    }

    const { dimensions, endAddress } = sourceCell.spillSource;
    const [rows, cols] = dimensions;

    // Build array from spilled range
    if (cols === 1) {
      // 1D array
      const result: any[] = [];
      for (let r = sourceAddr.row; r <= endAddress.row; r++) {
        const value = worksheet.getCellValue({ row: r, col: sourceAddr.col });
        result.push(value);
      }
      return result;
    } else {
      // 2D array
      const result: any[][] = [];
      for (let r = sourceAddr.row; r <= endAddress.row; r++) {
        const row: any[] = [];
        for (let c = sourceAddr.col; c <= endAddress.col; c++) {
          const value = worksheet.getCellValue({ row: r, col: c });
          row.push(value);
        }
        result.push(row);
      }
      return result;
    }
  }

  /**
   * Check if a cell is part of a spilled range
   * @param worksheet The worksheet
   * @param addr The cell address to check
   * @returns Source address if cell is spilled, null otherwise
   */
  getSpillSource(worksheet: Worksheet, addr: Address): Address | null {
    const cell = worksheet.getCell(addr);
    return cell?.spilledFrom ?? null;
  }

  /**
   * Check if a cell is the source of a spill
   * @param worksheet The worksheet
   * @param addr The cell address to check
   * @returns True if cell is a spill source
   */
  isSpillSource(worksheet: Worksheet, addr: Address): boolean {
    const cell = worksheet.getCell(addr);
    return !!cell?.spillSource;
  }
}
