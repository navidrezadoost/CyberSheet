/**
 * ExcelAppExample.tsx
 * 
 * Example usage of the ExcelApp component
 */

import React from 'react';
import { Workbook } from '@cyber-sheet/core';
import { ExcelApp } from '@cyber-sheet/react';
import '@cyber-sheet/react/dist/excel-app.css';

export const ExcelAppExample: React.FC = () => {
  // Create a workbook
  const workbook = React.useMemo(() => {
    const wb = new Workbook();
    const sheet = wb.getActiveSheet();
    
    // Add some sample data
    sheet.setCellValue(0, 0, 'Product');
    sheet.setCellValue(0, 1, 'Price');
    sheet.setCellValue(0, 2, 'Quantity');
    sheet.setCellValue(0, 3, 'Total');
    
    sheet.setCellValue(1, 0, 'Widget A');
    sheet.setCellValue(1, 1, 10);
    sheet.setCellValue(1, 2, 5);
    sheet.setCellFormula(1, 3, '=B2*C2');
    
    sheet.setCellValue(2, 0, 'Widget B');
    sheet.setCellValue(2, 1, 15);
    sheet.setCellValue(2, 2, 3);
    sheet.setCellFormula(2, 3, '=B3*C3');
    
    sheet.setCellValue(3, 0, 'Widget C');
    sheet.setCellValue(3, 1, 20);
    sheet.setCellValue(3, 2, 7);
    sheet.setCellFormula(3, 3, '=B4*C4');
    
    // Add bold style to headers
    for (let col = 0; col < 4; col++) {
      sheet.setCellStyle(0, col, { bold: true });
    }
    
    return wb;
  }, []);

  const handleSave = () => {
    console.log('Save clicked');
    // Implement save logic here
  };

  const handleUndo = () => {
    workbook.commandManager?.undo();
  };

  const handleRedo = () => {
    workbook.commandManager?.redo();
  };

  return (
    <ExcelApp
      workbook={workbook}
      fileName="Sample Workbook"
      onSave={handleSave}
      onUndo={handleUndo}
      onRedo={handleRedo}
    />
  );
};

export default ExcelAppExample;
