/**
 * FormulaController.ts
 * 
 * Controller for managing formula editing, evaluation, and auto-recalculation.
 * Provides a controlled interface for React components to interact with formulas.
 */

import { Address, CellValue, ExtendedCellValue } from './types';
import { Worksheet } from './worksheet';
import { FormulaEngine, FormulaValue } from './FormulaEngine';

export interface FormulaValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: 'SYNTAX' | 'CIRCULAR' | 'NAME' | 'VALUE' | 'REF';
}

/**
 * Controller for formula operations with validation and auto-recalculation
 */
export class FormulaController {
  private engine: FormulaEngine;
  private worksheet: Worksheet;
  
  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
    this.engine = new FormulaEngine();
  }

  /**
   * Validate a formula without setting it
   */
  validateFormula(formula: string, cellAddress: Address): FormulaValidationResult {
    try {
      // Normalize formula
      const normalized = formula.startsWith('=') ? formula : `=${formula}`;
      
      // Basic syntax validation
      if (normalized.length === 1) {
        return {
          isValid: false,
          error: 'Empty formula',
          errorType: 'SYNTAX',
        };
      }

      // Try to evaluate
      const result = this.engine.evaluate(normalized, {
        worksheet: this.worksheet,
        currentCell: cellAddress,
      });

      // Check for error results
      if (result instanceof Error) {
        const errorType = this.getErrorType(result.message);
        return {
          isValid: false,
          error: result.message,
          errorType,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'SYNTAX',
      };
    }
  }

  /**
   * Set a formula for a cell with validation
   */
  setFormula(address: Address, formula: string): FormulaValidationResult {
    const validation = this.validateFormula(formula, address);
    
    if (!validation.isValid) {
      return validation;
    }

    // Normalize formula
    const normalized = formula.startsWith('=') ? formula : `=${formula}`;
    
    // Evaluate the formula
    const result = this.engine.evaluate(normalized, {
      worksheet: this.worksheet,
      currentCell: address,
    });
    
    // Use Worksheet's supported mutation path to register dependencies and
    // publish its normal cell-change/recalculation notifications.
    this.worksheet.setCellFormula(address, normalized, this.toCellValue(result));
    
    return { isValid: true };
  }

  /**
   * Get formula for a cell
   */
  getFormula(address: Address): string | undefined {
    return this.worksheet.getCell(address)?.formula;
  }

  /**
   * Clear formula from a cell
   */
  clearFormula(address: Address): void {
    const existing = this.worksheet.getCell(address);
    if (!existing || existing.formula === undefined) return;
    this.worksheet.clearCellFormula(address);
  }

  /**
   * Recalculate a cell's formula
   */
  recalculate(address: Address): boolean {
    const existing = this.worksheet.getCell(address);
    if (!existing || !existing.formula) return false;
    
    const result = this.engine.evaluate(existing.formula, {
      worksheet: this.worksheet,
      currentCell: address,
    });
    
    this.worksheet.setCellFormula(address, existing.formula, this.toCellValue(result));
    return true;
  }

  private toCellValue(result: FormulaValue): CellValue {
    if (result instanceof Error) return result.message;
    if (typeof result === 'object' && result !== null) return String(result);
    return result as CellValue;
  }

  /**
   * Get all cells with formulas
   */
  getAllFormulas(): Array<{ address: Address; formula: string; value: ExtendedCellValue }> {
    const result: Array<{ address: Address; formula: string; value: ExtendedCellValue }> = [];
    
    // Iterate through all cells in worksheet
    for (let row = 1; row <= this.worksheet.rowCount; row++) {
      for (let col = 1; col <= this.worksheet.colCount; col++) {
        const addr = { row, col };
        const cell = this.worksheet.getCell(addr);
        
        if (cell?.formula) {
          result.push({
            address: addr,
            formula: cell.formula,
            value: cell.value,
          });
        }
      }
    }
    
    return result;
  }

  /**
   * Parse cell reference from formula (e.g., "A1" -> {row: 1, col: 1})
   */
  parseCellReference(ref: string): Address | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    
    const [, colLetters, rowStr] = match;
    const row = parseInt(rowStr, 10);
    
    // Convert column letters to number (A=1, B=2, ..., Z=26, AA=27, etc.)
    let col = 0;
    for (let i = 0; i < colLetters.length; i++) {
      col = col * 26 + (colLetters.charCodeAt(i) - 64);
    }
    
    return { row, col };
  }

  /**
   * Format cell address as reference (e.g., {row: 1, col: 1} -> "A1")
   */
  formatCellReference(address: Address): string {
    let col = address.col;
    let letters = '';
    
    while (col > 0) {
      const remainder = (col - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      col = Math.floor((col - 1) / 26);
    }
    
    return `${letters}${address.row}`;
  }

  /**
   * Get error type from error message
   */
  private getErrorType(message: string): FormulaValidationResult['errorType'] {
    if (message.includes('#CIRC')) return 'CIRCULAR';
    if (message.includes('#NAME')) return 'NAME';
    if (message.includes('#VALUE')) return 'VALUE';
    if (message.includes('#REF')) return 'REF';
    return 'SYNTAX';
  }
}
