/**
 * cell-styles-demo.tsx
 * 
 * Interactive demonstration of CyberSheet's Cell Styles Gallery.
 * Shows all 40+ Excel-compatible cell style presets across 5 categories.
 * 
 * Features demonstrated:
 * - Good/Bad/Neutral status styles
 * - Data & Model financial modeling styles
 * - Titles & Headings document structure styles
 * - Themed Cell Styles with Office theme colors
 * - Number Format presets
 * 
 * Usage:
 * ```bash
 * npm run dev
 * # Open examples/cell-styles-demo.tsx in browser
 * ```
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExcelApp } from '@cyber-sheet/react';
import { Workbook, Worksheet, CommandManager, FormattingController } from '@cyber-sheet/core';
import type { Address } from '@cyber-sheet/core';

/**
 * Demo Instructions Overlay
 */
function DemoInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '600px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: '#2B579A', fontFamily: 'Segoe UI' }}>
          🎨 Cell Styles Gallery Demo
        </h2>
        
        <div style={{ lineHeight: '1.6', fontSize: '14px', color: '#333' }}>
          <p>
            <strong>What are Cell Styles?</strong><br />
            Pre-built formatting presets for consistent document styling.
            Excel-compatible with 40+ professional styles.
          </p>

          <p>
            <strong>📋 Categories:</strong>
          </p>
          <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
            <li><strong>Good/Bad/Neutral:</strong> Status indicators (3 styles)</li>
            <li><strong>Data & Model:</strong> Financial modeling (8 styles)</li>
            <li><strong>Titles & Headings:</strong> Document structure (6 styles)</li>
            <li><strong>Themed Cell Styles:</strong> Office theme colors (15 styles)</li>
            <li><strong>Number Format:</strong> Common formats (9 styles)</li>
          </ul>

          <p>
            <strong>🚀 How to Use:</strong>
          </p>
          <ol style={{ marginTop: '8px', paddingLeft: '24px' }}>
            <li>Select any cell(s) in the demo sheets below</li>
            <li>Click <strong>Home tab → Cell Styles</strong> button</li>
            <li>Choose a style from the gallery</li>
            <li>Style applies instantly with full undo/redo</li>
          </ol>

          <p>
            <strong>💡 Pro Tips:</strong>
          </p>
          <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
            <li>Hover over styles for live preview (coming soon)</li>
            <li>Use keyboard: Tab to navigate, Enter to apply, Esc to close</li>
            <li>Search styles by name or description</li>
            <li>Mix styles with manual formatting for custom looks</li>
          </ul>

          <p style={{ marginTop: '16px', color: '#666', fontSize: '13px' }}>
            <strong>📊 Sample Data:</strong> Financial report, product inventory, project status
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '24px',
            padding: '10px 24px',
            backgroundColor: '#2B579A',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Segoe UI',
          }}
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}

/**
 * Main Demo Component
 */
function CellStylesDemo() {
  const [showInstructions, setShowInstructions] = useState(true);

  // Create sample workbook
  const workbook = React.useMemo(() => {
    const wb = new Workbook();
    
    // Sheet 1: Financial Report
    const sheet1 = new Worksheet(wb, 'Financial Report');
    
    // Headers
    sheet1.setCell({ row: 0, col: 0, sheet: 0 }, { value: 'Q4 2024 Financial Summary' });
    sheet1.setCell({ row: 2, col: 0, sheet: 0 }, { value: 'Category' });
    sheet1.setCell({ row: 2, col: 1, sheet: 0 }, { value: 'Budget' });
    sheet1.setCell({ row: 2, col: 2, sheet: 0 }, { value: 'Actual' });
    sheet1.setCell({ row: 2, col: 3, sheet: 0 }, { value: 'Variance' });
    sheet1.setCell({ row: 2, col: 4, sheet: 0 }, { value: 'Status' });
    
    // Data rows
    const financialData = [
      ['Revenue', 1000000, 1050000, 50000, 'Good'],
      ['COGS', 400000, 380000, 20000, 'Good'],
      ['Operating Expenses', 300000, 320000, -20000, 'Bad'],
      ['Marketing', 150000, 155000, -5000, 'Neutral'],
      ['R&D', 100000, 95000, 5000, 'Good'],
      ['Admin', 50000, 52000, -2000, 'Neutral'],
    ];
    
    financialData.forEach((row, idx) => {
      sheet1.setCell({ row: 3 + idx, col: 0, sheet: 0 }, { value: row[0] });
      sheet1.setCell({ row: 3 + idx, col: 1, sheet: 0 }, { value: row[1] });
      sheet1.setCell({ row: 3 + idx, col: 2, sheet: 0 }, { value: row[2] });
      sheet1.setCell({ row: 3 + idx, col: 3, sheet: 0 }, { value: row[3] });
      sheet1.setCell({ row: 3 + idx, col: 4, sheet: 0 }, { value: row[4] });
    });
    
    // Total row
    sheet1.setCell({ row: 9, col: 0, sheet: 0 }, { value: 'Net Income' });
    sheet1.setCell({ row: 9, col: 1, sheet: 0 }, { value: 150000 });
    sheet1.setCell({ row: 9, col: 2, sheet: 0 }, { value: 198000 });
    sheet1.setCell({ row: 9, col: 3, sheet: 0 }, { value: 48000 });
    sheet1.setCell({ row: 9, col: 4, sheet: 0 }, { value: 'Good' });
    
    // Explanatory notes
    sheet1.setCell({ row: 11, col: 0, sheet: 0 }, { value: 'Note: Positive variance indicates over-budget for revenue, under-budget for expenses' });
    
    wb.addWorksheet(sheet1);
    
    // Sheet 2: Product Inventory
    const sheet2 = new Worksheet(wb, 'Product Inventory');
    
    sheet2.setCell({ row: 0, col: 0, sheet: 1 }, { value: 'Warehouse Inventory Status' });
    sheet2.setCell({ row: 2, col: 0, sheet: 1 }, { value: 'Product' });
    sheet2.setCell({ row: 2, col: 1, sheet: 1 }, { value: 'SKU' });
    sheet2.setCell({ row: 2, col: 2, sheet: 1 }, { value: 'Quantity' });
    sheet2.setCell({ row: 2, col: 3, sheet: 1 }, { value: 'Reorder Level' });
    sheet2.setCell({ row: 2, col: 4, sheet: 1 }, { value: 'Status' });
    
    const inventoryData = [
      ['Laptop Pro 15"', 'LPT-001', 45, 20, 'Good'],
      ['Desktop Workstation', 'DSK-002', 8, 15, 'Bad'],
      ['Monitor 27" 4K', 'MON-003', 22, 25, 'Neutral'],
      ['Wireless Mouse', 'ACC-004', 120, 50, 'Good'],
      ['Mechanical Keyboard', 'ACC-005', 18, 20, 'Neutral'],
      ['USB-C Hub', 'ACC-006', 5, 30, 'Bad'],
      ['Webcam HD', 'ACC-007', 35, 15, 'Good'],
      ['Headset Wireless', 'ACC-008', 12, 10, 'Good'],
    ];
    
    inventoryData.forEach((row, idx) => {
      sheet2.setCell({ row: 3 + idx, col: 0, sheet: 1 }, { value: row[0] });
      sheet2.setCell({ row: 3 + idx, col: 1, sheet: 1 }, { value: row[1] });
      sheet2.setCell({ row: 3 + idx, col: 2, sheet: 1 }, { value: row[2] });
      sheet2.setCell({ row: 3 + idx, col: 3, sheet: 1 }, { value: row[3] });
      sheet2.setCell({ row: 3 + idx, col: 4, sheet: 1 }, { value: row[4] });
    });
    
    sheet2.setCell({ row: 12, col: 0, sheet: 1 }, { value: 'Warning: Items below reorder level require immediate restocking' });
    
    wb.addWorksheet(sheet2);
    
    // Sheet 3: Project Status
    const sheet3 = new Worksheet(wb, 'Project Dashboard');
    
    sheet3.setCell({ row: 0, col: 0, sheet: 2 }, { value: 'Active Projects Overview' });
    sheet3.setCell({ row: 2, col: 0, sheet: 2 }, { value: 'Project Name' });
    sheet3.setCell({ row: 2, col: 1, sheet: 2 }, { value: 'Phase' });
    sheet3.setCell({ row: 2, col: 2, sheet: 2 }, { value: 'Budget ($)' });
    sheet3.setCell({ row: 2, col: 3, sheet: 2 }, { value: 'Spent ($)' });
    sheet3.setCell({ row: 2, col: 4, sheet: 2 }, { value: 'Progress (%)' });
    
    const projectData = [
      ['Website Redesign', 'Design', 75000, 45000, 60],
      ['Mobile App v2.0', 'Development', 150000, 120000, 80],
      ['CRM Integration', 'Planning', 50000, 8000, 15],
      ['Cloud Migration', 'Execution', 200000, 180000, 90],
      ['Security Audit', 'Review', 30000, 28000, 95],
    ];
    
    projectData.forEach((row, idx) => {
      sheet3.setCell({ row: 3 + idx, col: 0, sheet: 2 }, { value: row[0] });
      sheet3.setCell({ row: 3 + idx, col: 1, sheet: 2 }, { value: row[1] });
      sheet3.setCell({ row: 3 + idx, col: 2, sheet: 2 }, { value: row[2] });
      sheet3.setCell({ row: 3 + idx, col: 3, sheet: 2 }, { value: row[3] });
      sheet3.setCell({ row: 3 + idx, col: 4, sheet: 2 }, { value: row[4] });
    });
    
    sheet3.setCell({ row: 9, col: 0, sheet: 2 }, { value: 'Total Portfolio' });
    sheet3.setCell({ row: 9, col: 2, sheet: 2 }, { value: 505000 });
    sheet3.setCell({ row: 9, col: 3, sheet: 2 }, { value: 381000 });
    
    wb.addWorksheet(sheet3);
    
    return wb;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showInstructions && <DemoInstructions onClose={() => setShowInstructions(false)} />}
      
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f3f3f3',
          borderBottom: '1px solid #d0d0d0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', color: '#2B579A', fontFamily: 'Segoe UI' }}>
          🎨 Cell Styles Gallery Demo
        </h1>
        <button
          onClick={() => setShowInstructions(true)}
          style={{
            padding: '6px 12px',
            background: '#fff',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'Segoe UI',
          }}
        >
          📖 Show Instructions
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#666', fontFamily: 'Segoe UI' }}>
          <strong>Tip:</strong> Select cells → Home tab → Cell Styles button → Choose a style
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ExcelApp workbook={workbook} />
      </div>
    </div>
  );
}

// Mount the demo
const root = createRoot(document.getElementById('root')!);
root.render(<CellStylesDemo />);
