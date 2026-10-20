import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

// Bootstrap the owner and view atomically. Cell/style setup deliberately uses
// the typed port; R1 rejects it before writing until its journal slice exists.
const workbook = Workbook.create({ sheets: [{ name: 'Sheet1', rows: 1000, cols: 26 }] });
const sheet = workbook.getSheet('Sheet1')!;

// Populate test data
workbook.mutationPort.setCellValue(sheet, { row: 1, col: 1 }, 'Product'); // A1
workbook.mutationPort.setCellValue(sheet, { row: 1, col: 2 }, 'Price');   // B1

workbook.mutationPort.setCellValue(sheet, { row: 2, col: 1 }, 'Widget');  // A2
workbook.mutationPort.setCellValue(sheet, { row: 2, col: 2 }, 100);       // B2

workbook.mutationPort.setCellValue(sheet, { row: 3, col: 1 }, 'Gadget');  // A3
workbook.mutationPort.setCellValue(sheet, { row: 3, col: 2 }, 200);       // B3

// Formula evaluation/results require R3 generation ownership; R1 accepts only
// the typed operation shape and still rejects before changing workbook state.
workbook.mutationPort.setCellFormula(sheet, { row: 4, col: 2 }, '=SUM(B2:B3)');

// Style header row
workbook.mutationPort.setCellStyle(sheet, { row: 1, col: 1 }, {
  bold: true,
  fill: '#2196F3',
  color: '#ffffff',
  align: 'center'
});
workbook.mutationPort.setCellStyle(sheet, { row: 1, col: 2 }, {
  bold: true,
  fill: '#2196F3',
  color: '#ffffff',
  align: 'center'
});

// Style formula cell
workbook.mutationPort.setCellStyle(sheet, { row: 4, col: 2 }, {
  bold: true,
  fill: '#f0f0f0'
});

// Initialize renderer
const container = document.getElementById('sheet-container');
if (container) {
  const renderer = new CanvasRenderer(container, sheet, {
    debug: false
  });
  
  // Expose for testing
  (window as any).cyberSheet = {
    workbook,
    sheet,
    renderer,
  };
  
  console.log('CyberSheet initialized successfully');
}
