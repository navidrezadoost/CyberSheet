import { Workbook, FormulaEngine } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

console.log('🚀 Initializing CyberSheet...');

// Create workbook
const workbook = new Workbook();
const formulaEngine = new FormulaEngine();
workbook.setFormulaEngine(formulaEngine);

// Add a sheet
const sheet = workbook.addSheet('TestSheet');
console.log('✓ Workbook created');

// Initialize renderer
const container = document.getElementById('sheet');
if (!container) {
  console.error('Container not found!');
} else {
  const renderer = new CanvasRenderer(container, sheet, {
    headerWidth: 50,
    headerHeight: 25,
  });
  console.log('✓ Renderer initialized');

  // Store renderer globally for debugging
  window.renderer = renderer;
  window.workbook = workbook;
  window.sheet = sheet;

  // Add sample data function
  function addSampleData() {
    console.log('Adding sample data...');
    
    // Headers
    sheet.setCellValue({ row: 0, col: 0 }, 'Product');
    sheet.setCellValue({ row: 0, col: 1 }, 'Price');
    sheet.setCellValue({ row: 0, col: 2 }, 'Qty');
    sheet.setCellValue({ row: 0, col: 3 }, 'Total');
    
    // Style headers
    for (let col = 0; col < 4; col++) {
      sheet.setCellStyle({ row: 0, col }, {
        bold: true,
        fill: '#4472C4',
        color: '#FFFFFF'
      });
    }

    // Data rows
    const products = [
      ['Laptop', 999, 5],
      ['Mouse', 25, 20],
      ['Keyboard', 75, 15],
      ['Monitor', 299, 8],
      ['Headset', 89, 12]
    ];

    products.forEach((product, idx) => {
      const row = idx + 1;
      sheet.setCellValue({ row, col: 0 }, product[0]);
      sheet.setCellValue({ row, col: 1 }, product[1]);
      sheet.setCellValue({ row, col: 2 }, product[2]);
      sheet.setCellValue({ row, col: 3 }, `=B${row + 1}*C${row + 1}`);
    });

    // Total row
    sheet.setCellValue({ row: 6, col: 0 }, 'TOTAL');
    sheet.setCellStyle({ row: 6, col: 0 }, { bold: true });
    sheet.setCellValue({ row: 6, col: 3 }, '=SUM(D2:D6)');
    sheet.setCellStyle({ row: 6, col: 3 }, { bold: true });

    renderer.render();
    console.log('✓ Sample data added');
  }

  // Add formulas function
  function addFormulas() {
    console.log('Adding formula tests...');
    
    const startRow = 8;
    sheet.setCellValue({ row: startRow, col: 0 }, 'Formula Tests:');
    sheet.setCellStyle({ row: startRow, col: 0 }, { bold: true });
    
    const tests = [
      ['SUM', '=SUM(1,2,3,4,5)'],
      ['AVERAGE', '=AVERAGE(B2:B6)'],
      ['MAX', '=MAX(B2:B6)'],
      ['MIN', '=MIN(B2:B6)'],
      ['COUNT', '=COUNT(B2:B6)'],
      ['IF', '=IF(B2>500,"High","Low")']
    ];

    tests.forEach((test, idx) => {
      const row = startRow + idx + 1;
      sheet.setCellValue({ row, col: 0 }, test[0] + ':');
      sheet.setCellValue({ row, col: 1 }, test[1]);
    });

    renderer.render();
    console.log('✓ Formula tests added');
  }

  // Clear sheet function
  function clearSheet() {
    console.log('Clearing sheet...');
    // Create a new sheet
    const sheetName = sheet.name;
    workbook.getSheetNames().forEach(name => {
      const s = workbook.getSheet(name);
      if (s) {
        // Clear all cells
        for (let row = 0; row < 50; row++) {
          for (let col = 0; col < 10; col++) {
            sheet.setCellValue({ row, col }, null);
            sheet.setCellStyle({ row, col }, undefined);
          }
        }
      }
    });
    renderer.render();
    console.log('✓ Sheet cleared');
  }

  // Export function
  function exportData() {
    console.log('Exporting data...');
    const data = [];
    for (let row = 0; row < 20; row++) {
      const rowData = [];
      for (let col = 0; col < 4; col++) {
        const cell = sheet.getCell({ row, col });
        rowData.push(cell?.value || '');
      }
      data.push(rowData);
    }
    console.table(data);
    console.log('✓ Data exported to console');
  }

  // Zoom functions
  let currentZoom = 1.0;
  
  function zoomIn() {
    currentZoom = Math.min(currentZoom + 0.1, 2.0);
    if (renderer.setZoom) {
      renderer.setZoom(currentZoom);
    }
    console.log(`Zoom: ${Math.round(currentZoom * 100)}%`);
  }

  function zoomOut() {
    currentZoom = Math.max(currentZoom - 0.1, 0.5);
    if (renderer.setZoom) {
      renderer.setZoom(currentZoom);
    }
    console.log(`Zoom: ${Math.round(currentZoom * 100)}%`);
  }

  function resetZoom() {
    currentZoom = 1.0;
    if (renderer.setZoom) {
      renderer.setZoom(currentZoom);
    }
    console.log('Zoom reset to 100%');
  }

  // Attach event listeners
  document.getElementById('addData')?.addEventListener('click', addSampleData);
  document.getElementById('addFormulas')?.addEventListener('click', addFormulas);
  document.getElementById('clearSheet')?.addEventListener('click', clearSheet);
  document.getElementById('exportData')?.addEventListener('click', exportData);
  document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
  document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
  document.getElementById('resetZoom')?.addEventListener('click', resetZoom);

  // Add initial data
  addSampleData();

  console.log('✓ Event listeners attached');
  console.log('✅ CyberSheet initialized successfully!');
  console.log('💡 Tip: Check window.renderer, window.workbook, window.sheet for debugging');
}
