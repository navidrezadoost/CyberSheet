/**
 * useFormulaController.ts
 * 
 * React hook for managing formula operations with controlled behavior.
 */

import { useState, useEffect } from 'react';
import { FormulaController, Address, Worksheet, ExtendedCellValue } from '@cyber-sheet/core';

export interface UseFormulaControllerOptions {
  worksheet: Worksheet | undefined;
  selectedCell: Address | null;
}

export interface UseFormulaControllerResult {
  /** FormulaController instance */
  controller: FormulaController;
  /** Current formula for selected cell */
  currentFormula: string | undefined;
  /** Current value for selected cell */
  currentValue: ExtendedCellValue;
  /** Set formula for current cell */
  setFormula: (formula: string) => { success: boolean; error?: string };
  /** Clear formula from current cell */
  clearFormula: () => void;
  /** Validate a formula */
  validateFormula: (formula: string) => { isValid: boolean; error?: string };
  /** Whether current cell has a formula */
  hasFormula: boolean;
  /** Recalculate current cell */
  recalculate: () => boolean;
}

/**
 * Hook for managing formula operations
 */
export function useFormulaController(options: UseFormulaControllerOptions): UseFormulaControllerResult {
  const { worksheet, selectedCell } = options;
  
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const [currentFormula, setCurrentFormula] = useState<string | undefined>(undefined);
  const [currentValue, setCurrentValue] = useState<ExtendedCellValue>(null);
  const [hasFormula, setHasFormula] = useState<boolean>(false);
  const [controller, setController] = useState<FormulaController | null>(null);
  
  // Update controller when worksheet changes
  useEffect(() => {
    if (worksheet) {
      setController(new FormulaController(worksheet));
    } else {
      setController(null);
    }
  }, [worksheet]);

  // Update current cell data when selection changes
  useEffect(() => {
    if (selectedCell && worksheet && controller) {
      const formula = controller.getFormula(selectedCell);
      const value = worksheet.getCellValue(selectedCell);
      
      setCurrentFormula(formula);
      setCurrentValue(value);
      setHasFormula(!!formula);
    } else {
      setCurrentFormula(undefined);
      setCurrentValue(null);
      setHasFormula(false);
    }
  }, [selectedCell, worksheet, controller]);

  // Listen for cell changes to update state
  useEffect(() => {
    if (!worksheet || !controller) return;
    
    const disposable = worksheet.on((event: any) => {
      if (event.type === 'cell-changed' && selectedCell) {
        if (event.address.row === selectedCell.row && event.address.col === selectedCell.col) {
          const formula = controller.getFormula(selectedCell);
          const value = worksheet.getCellValue(selectedCell);
          
          setCurrentFormula(formula);
          setCurrentValue(value);
          setHasFormula(!!formula);
        }
      }
    });

    return () => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    };
  }, [worksheet, selectedCell, controller]);

  // Set formula for current cell
  const setFormula = (formula: string) => {
    if (!selectedCell || !controller) {
      return { success: false, error: 'No cell selected or controller not initialized' };
    }

    const result = controller.setFormula(selectedCell, formula);
    
    if (result.isValid) {
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  // Clear formula from current cell
  const clearFormula = () => {
    if (selectedCell && controller) {
      controller.clearFormula(selectedCell);
    }
  };

  // Validate a formula
  const validateFormula = (formula: string) => {
    if (!selectedCell || !controller) {
      return { isValid: false, error: 'No cell selected or controller not initialized' };
    }

    const result = controller.validateFormula(formula, selectedCell);
    return {
      isValid: result.isValid,
      error: result.error,
    };
  };
  
  // Recalculate current cell
  const recalculate = () => {
    if (!selectedCell || !controller) return false;
    return controller.recalculate(selectedCell);
  };

  return {
    controller: controller!,
    currentFormula,
    currentValue,
    setFormula,
    clearFormula,
    validateFormula,
    hasFormula,
    recalculate,
  };
}
