/**
 * Formula Editing Example with CyberSheet
 * 
 * Demonstrates complete formula editing capability with:
 * - Formula bar for editing formulas
 * - Cell selection and editing
 * - Auto-recalculation on formula changes
 * - Validation and error handling
 */

import React, { useState, useEffect } from 'react';
import { Workbook, Worksheet, Address } from '@cyber-sheet/core';
import { CyberSheet } from '../packages/react/src/CyberSheet';
import { FormulaBar } from '../packages/react/src/FormulaBar';
import { useFormulaController } from '../packages/react/src/useFormulaController';
import { rejectR1ExampleInitialization } from './r1-initialization-gate';

export function FormulaEditingExample() {
  // Create workbook and worksheet
  const [workbook] = useState(() => {
    rejectR1ExampleInitialization('Formula editing demo', 'R2 initial cell content and formula edits');
    const wb = new Workbook();
    const sheet = wb.addSheet('Sheet1', 20, 10);
    
    // Set some initial data
    sheet.setCellValue({ row: 1, col: 1 }, 10);
    sheet.setCellValue({ row: 2, col: 1 }, 20);
    sheet.setCellValue({ row: 3, col: 1 }, 30);
    sheet.setCellValue({ row: 1, col: 2 }, 5);
    sheet.setCellValue({ row: 2, col: 2 }, 15);
    sheet.setCellValue({ row: 3, col: 2 }, 25);
    
    return wb;
  });

  const [activeSheet, setActiveSheet] = useState(() => workbook.getSheet('Sheet1')!);
  const [selectedCell, setSelectedCell] = useState<Address | null>({ row: 1, col: 1 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();

  // Use formula controller hook
  const {
    currentFormula,
    currentValue,
    setFormula,
    validateFormula,
    hasFormula,
  } = useFormulaController({
    worksheet: activeSheet,
    selectedCell,
  });

  // Handle cell selection
  const handleCellClick = (event: any) => {
    if (event.type === 'cell-click') {
      setSelectedCell(event.event.address);
      setIsEditMode(false);
      setValidationError(undefined);
    }
  };

  // Handle formula submission
  const handleFormulaSubmit = (formula: string) => {
    if (!selectedCell) return;

    // If empty, just clear the cell
    if (!formula.trim()) {
      activeSheet.setCellValue(selectedCell, null);
      setValidationError(undefined);
      return;
    }

    // If doesn't start with =, treat as value
    if (!formula.startsWith('=')) {
      // Try to parse as number
      const num = parseFloat(formula);
      if (!isNaN(num)) {
        activeSheet.setCellValue(selectedCell, num);
      } else {
        activeSheet.setCellValue(selectedCell, formula);
      }
      setValidationError(undefined);
      return;
    }

    // Validate and set formula
    const validation = validateFormula(formula);
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    const result = setFormula(formula);
    if (result.success) {
      setValidationError(undefined);
    } else {
      setValidationError(result.error);
    }
  };

  // Listen for sheet events
  useEffect(() => {
    const disposable = activeSheet.on((event) => {
      // Handle any sheet-level events if needed
      if (event.type === 'cell-changed') {
        // Auto-recalculation is handled by the FormulaController
      }
    });

    return () => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    };
  }, [activeSheet]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
          CyberSheet Formula Editor
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Click cells to select, type formulas in the formula bar (e.g., =SUM(A1:A3))
        </p>
      </div>

      {/* Formula Bar */}
      <FormulaBar
        selectedCell={selectedCell}
        cellValue={currentValue}
        cellFormula={currentFormula}
        onFormulaSubmit={handleFormulaSubmit}
        isEditing={isEditMode}
        onEditModeChange={setIsEditMode}
        validationError={validationError}
      />

      {/* Info Panel */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#f9f9f9',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '16px',
        fontSize: '13px',
      }}>
        <div>
          <strong>Selected:</strong>{' '}
          {selectedCell ? `Row ${selectedCell.row}, Col ${selectedCell.col}` : 'None'}
        </div>
        <div>
          <strong>Value:</strong> {String(currentValue ?? '')}
        </div>
        {hasFormula && (
          <div style={{ color: '#1976d2' }}>
            <strong>Formula:</strong> {currentFormula}
          </div>
        )}
      </div>

      {/* Spreadsheet */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CyberSheet
          workbook={workbook}
          sheetName="Sheet1"
          onRendererReady={(renderer) => {
            // Subscribe to cell click events
            const sheet = workbook.getSheet('Sheet1');
            if (sheet) {
              sheet.on((event) => {
                if (event.type === 'cell-click') {
                  handleCellClick(event);
                }
              });
            }
          }}
        />
      </div>

      {/* Instructions */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        fontSize: '12px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Formula Examples:</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          <div><code>=SUM(A1:A3)</code> - Sum of A1 to A3</div>
          <div><code>=AVERAGE(B1:B3)</code> - Average of B1 to B3</div>
          <div><code>=A1*B1</code> - Multiply A1 and B1</div>
          <div><code>=IF(A1{'>'}10, "High", "Low")</code> - Conditional</div>
        </div>
      </div>
    </div>
  );
}

export default FormulaEditingExample;
