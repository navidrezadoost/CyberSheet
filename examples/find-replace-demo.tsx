/**
 * find-replace-demo.tsx
 * 
 * Interactive demo of Find & Replace functionality
 * 
 * Features demonstrated:
 * - Ctrl+F to open Find dialog
 * - Ctrl+H to open Replace dialog
 * - Find Next/Previous navigation with wrap-around
 * - Case-sensitive and whole-cell match options
 * - Search in values, formulas, or comments
 * - Replace single or replace all operations
 * - Real-time match highlighting and navigation
 * 
 * Usage:
 * 1. Press Ctrl+F to open Find dialog
 * 2. Enter search term (e.g., "Apple")
 * 3. Click "Find All" to locate all matches
 * 4. Use "Next" and "Previous" to navigate
 * 5. Press Ctrl+H to switch to Replace mode
 * 6. Replace individual matches or all at once
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Workbook } from '@cyber-sheet/core';
import { ExcelApp } from '@cyber-sheet/react/src/components/ExcelApp';

// Create sample workbook with searchable data
function createDemoWorkbook(): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addSheet('Inventory');

  // Headers
  sheet.setCellValue({ row: 0, col: 0 }, 'Product');
  sheet.setCellValue({ row: 0, col: 1 }, 'Category');
  sheet.setCellValue({ row: 0, col: 2 }, 'Price');
  sheet.setCellValue({ row: 0, col: 3 }, 'Stock');
  sheet.setCellValue({ row: 0, col: 4 }, 'Notes');

  // Sample data with searchable content
  const products = [
    ['Apple iPhone 14', 'Electronics', 999, 50, 'Popular model'],
    ['Apple MacBook Pro', 'Electronics', 2499, 20, 'High performance'],
    ['Apple Watch Series 8', 'Electronics', 499, 100, 'Fitness tracking'],
    ['Samsung Galaxy S23', 'Electronics', 899, 75, 'Android flagship'],
    ['Dell XPS 15', 'Electronics', 1799, 30, 'Windows laptop'],
    ['Apple iPad Air', 'Electronics', 599, 60, 'Tablet device'],
    ['Green Apple (Granny Smith)', 'Produce', 1.29, 500, 'Fresh fruit'],
    ['Red Apple (Fuji)', 'Produce', 1.49, 450, 'Sweet variety'],
    ['Apple Juice', 'Beverages', 3.99, 200, 'Organic juice'],
    ['Sony PlayStation 5', 'Electronics', 499, 15, 'Gaming console'],
    ['Apple AirPods Pro', 'Electronics', 249, 150, 'Wireless earbuds'],
    ['Golden Apple', 'Produce', 1.39, 300, 'Yellow variety'],
  ];

  products.forEach((row, idx) => {
    row.forEach((value, colIdx) => {
      sheet.setCellValue({ row: idx + 1, col: colIdx }, value);
    });
  });

  // Add some formulas with "Apple" references
  sheet.setCellFormula({ row: 14, col: 2 }, '=SUM(C2:C13)');
  sheet.setCellFormula({ row: 14, col: 3 }, '=SUM(D2:D13)');

  // Add cell comments
  sheet.setCellComment({ row: 1, col: 0 }, {
    text: 'Apple products are selling well this quarter',
    author: 'Sales Team',
  });
  sheet.setCellComment({ row: 7, col: 0 }, {
    text: 'Apples need to be restocked weekly',
    author: 'Inventory Manager',
  });

  // Format headers
  for (let col = 0; col < 5; col++) {
    const cell = sheet.getCell({ row: 0, col });
    if (cell) {
      cell.style = {
        ...cell.style,
        bold: true,
        backgroundColor: '#4472C4',
        color: '#FFFFFF',
      };
    }
  }

  return workbook;
}

// Demo instructions component
const DemoInstructions: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: '#FFF9E6',
        border: '2px solid #FFD700',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '350px',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily: 'Segoe UI, sans-serif',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>
        🔍 Find & Replace Demo
      </h3>
      <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#555' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Search for "Apple"</strong> to see 9 matches across products, produce, and comments.
        </p>
        <div style={{ marginBottom: '8px' }}>
          <strong>Keyboard Shortcuts:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li><kbd>Ctrl+F</kbd> - Open Find</li>
            <li><kbd>Ctrl+H</kbd> - Open Replace</li>
            <li><kbd>Enter</kbd> - Find Next</li>
            <li><kbd>Esc</kbd> - Close dialog</li>
          </ul>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Try These Searches:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li>"Apple" - 9 matches</li>
            <li>"Electronics" - 7 matches</li>
            <li>"499" - 3 matches</li>
            <li>"=SUM" - 2 formulas (search in "Formulas")</li>
          </ul>
        </div>
        <div>
          <strong>Options to Test:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li>Match case (on/off)</li>
            <li>Match entire cell</li>
            <li>Search in: Values, Formulas, Comments</li>
            <li>Replace single vs Replace All</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Main demo component
const FindReplaceDemo: React.FC = () => {
  const [workbook] = React.useState(() => createDemoWorkbook());

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DemoInstructions />
      <ExcelApp
        workbook={workbook}
        fileName="Find & Replace Demo - Inventory.xlsx"
        onSave={() => console.log('Save clicked')}
      />
    </div>
  );
};

// Mount the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<FindReplaceDemo />);
}
