import React from 'react';
import { createRoot } from 'react-dom/client';
import { FormulaEngine, StyleCache, Workbook, Worksheet } from '@cyber-sheet/core';
import { CyberSheet } from '@cyber-sheet/react';

const mount = document.getElementById('sheet-container');
if (!mount) throw new Error('Missing React E2E mount container');

// Seed the sheet before Workbook ownership, then render it through the public
// React wrapper. The fixture deliberately avoids the ExcelApp XLSX import path.
const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 1, cols: 1 }] });
const sourceSheet = new Worksheet('Sheet1', 1000, 26);
sourceSheet.setCellValue({ row: 1, col: 1 }, 'Product');
sourceSheet.setCellValue({ row: 1, col: 2 }, 'Price');
sourceSheet.setCellValue({ row: 2, col: 1 }, 'Widget');
sourceSheet.setCellValue({ row: 2, col: 2 }, 100);
sourceSheet.setCellValue({ row: 3, col: 1 }, 'Gadget');
sourceSheet.setCellValue({ row: 3, col: 2 }, 200);
const formulaResult = new FormulaEngine().evaluate('=SUM(B2:B3)', {
  worksheet: sourceSheet,
  currentCell: { row: 4, col: 2 },
});
sourceSheet.setCellFormula({ row: 4, col: 2 }, '=SUM(B2:B3)', formulaResult);
sourceSheet.completeScheduledRecalculation();

const styles = new StyleCache();
sourceSheet.setCellStyle({ row: 1, col: 1 }, styles.intern({
  bold: true,
  fill: '#2196F3',
  color: '#ffffff',
  align: 'center',
}));
sourceSheet.setCellStyle({ row: 1, col: 2 }, styles.intern({
  bold: true,
  fill: '#2196F3',
  color: '#ffffff',
  align: 'center',
}));
workbook.attachDevImportSheet(sourceSheet);

const sheet = workbook.getSheet('Sheet1')!;
const root = createRoot(mount);
(window as any).cyberSheet = { workbook, sheet, formulaResult };
root.render(React.createElement(CyberSheet, {
  workbook,
  sheetName: 'Sheet1',
  style: { width: '100%', height: '100%' },
  onRendererReady: (renderer) => {
    (window as any).cyberSheet.renderer = renderer;
  },
}));

window.addEventListener('beforeunload', () => {
  root.unmount();
  workbook.dispose();
});
