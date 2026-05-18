/**
 * conditional-formatting-demo.tsx
 * 
 * Interactive demo of Conditional Formatting with Icon Sets and Data Bars.
 * 
 * Features demonstrated:
 * - Icon Sets: 3-arrows, 5-ratings, traffic lights
 * - Data Bars: gradient bars with percentage fill
 * - Color Scales: red-yellow-green gradients
 * - Formula-based rules: Automatic evaluation via Formula DAG
 * 
 * Usage:
 * 1. View the "Sales Performance" sheet with icon sets showing trends
 * 2. Check "Product Ratings" with star ratings (5-ratings icon set)
 * 3. Examine "Revenue" with data bars showing relative values
 * 4. Try changing values to see conditional formatting update live
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Workbook } from '@cyber-sheet/core';
import type { ConditionalFormattingRule } from '@cyber-sheet/core';
import { ExcelApp } from '@cyber-sheet/react/src/components/ExcelApp';

// Create demo workbook with conditional formatting
function createDemoWorkbook(): Workbook {
  const workbook = new Workbook();
  
  // ===== Sheet 1: Sales Performance with Icon Sets =====
  const salesSheet = workbook.addSheet('Sales Performance');
  
  // Headers
  salesSheet.setCellValue({ row: 0, col: 0 }, 'Month');
  salesSheet.setCellValue({ row: 0, col: 1 }, 'Sales');
  salesSheet.setCellValue({ row: 0, col: 2 }, 'Growth %');
  salesSheet.setCellValue({ row: 0, col: 3 }, 'Status');
  
  // Data
  const salesData = [
    ['Jan', 120000, 5.2],
    ['Feb', 135000, 12.5],
    ['Mar', 128000, -5.2],
    ['Apr', 145000, 13.3],
    ['May', 142000, -2.1],
    ['Jun', 158000, 11.3],
    ['Jul', 165000, 4.4],
    ['Aug', 172000, 4.2],
    ['Sep', 168000, -2.3],
    ['Oct', 185000, 10.1],
    ['Nov', 195000, 5.4],
    ['Dec', 210000, 7.7],
  ];
  
  salesData.forEach((row, idx) => {
    salesSheet.setCellValue({ row: idx + 1, col: 0 }, row[0]);
    salesSheet.setCellValue({ row: idx + 1, col: 1 }, row[1]);
    salesSheet.setCellValue({ row: idx + 1, col: 2 }, row[2]);
  });
  
  // Icon Set Rule: 3-arrows for growth percentage
  const growthIconRule: ConditionalFormattingRule = {
    type: 'icon-set',
    iconSet: '3-arrows',
    ranges: [{ start: { row: 1, col: 2 }, end: { row: 12, col: 2 } }],
    thresholds: [
      { value: 8, type: 'number', icon: 'arrow-up-green', operator: '>=' },
      { value: 0, type: 'number', icon: 'arrow-right-yellow', operator: '>=' },
      { value: -100, type: 'number', icon: 'arrow-down-red', operator: '>=' },
    ],
  };
  
  salesSheet.addConditionalFormattingRule?.(growthIconRule);
  
  // ===== Sheet 2: Product Ratings with Stars =====
  const ratingsSheet = workbook.addSheet('Product Ratings');
  
  // Headers
  ratingsSheet.setCellValue({ row: 0, col: 0 }, 'Product');
  ratingsSheet.setCellValue({ row: 0, col: 1 }, 'Rating');
  ratingsSheet.setCellValue({ row: 0, col: 2 }, 'Reviews');
  
  // Data
  const productsData = [
    ['Laptop Pro', 4.8, 245],
    ['Wireless Mouse', 4.2, 189],
    ['Keyboard RGB', 3.9, 142],
    ['Monitor 27"', 4.6, 318],
    ['Webcam HD', 3.5, 92],
    ['Headset Noise-Cancel', 4.9, 412],
    ['USB Hub', 4.1, 156],
    ['External SSD', 4.7, 287],
  ];
  
  productsData.forEach((row, idx) => {
    ratingsSheet.setCellValue({ row: idx + 1, col: 0 }, row[0]);
    ratingsSheet.setCellValue({ row: idx + 1, col: 1 }, row[1]);
    ratingsSheet.setCellValue({ row: idx + 1, col: 2 }, row[2]);
  });
  
  // Icon Set Rule: 5-ratings (stars) for product ratings
  const ratingsIconRule: ConditionalFormattingRule = {
    type: 'icon-set',
    iconSet: '5-ratings',
    ranges: [{ start: { row: 1, col: 1 }, end: { row: 8, col: 1 } }],
    thresholds: [
      { value: 4.5, type: 'number', icon: 'rating-5', operator: '>=' },
      { value: 4.0, type: 'number', icon: 'rating-4-5', operator: '>=' },
      { value: 3.5, type: 'number', icon: 'rating-3-5', operator: '>=' },
      { value: 3.0, type: 'number', icon: 'rating-2-5', operator: '>=' },
      { value: 0, type: 'number', icon: 'rating-1-5', operator: '>=' },
    ],
  };
  
  ratingsSheet.addConditionalFormattingRule?.(ratingsIconRule);
  
  // ===== Sheet 3: Revenue with Data Bars =====
  const revenueSheet = workbook.addSheet('Revenue Analysis');
  
  // Headers
  revenueSheet.setCellValue({ row: 0, col: 0 }, 'Department');
  revenueSheet.setCellValue({ row: 0, col: 1 }, 'Q1');
  revenueSheet.setCellValue({ row: 0, col: 2 }, 'Q2');
  revenueSheet.setCellValue({ row: 0, col: 3 }, 'Q3');
  revenueSheet.setCellValue({ row: 0, col: 4 }, 'Q4');
  
  // Data
  const revenueData = [
    ['Sales', 450000, 520000, 480000, 610000],
    ['Marketing', 120000, 135000, 150000, 145000],
    ['Engineering', 280000, 295000, 310000, 330000],
    ['Support', 95000, 102000, 108000, 115000],
    ['Operations', 180000, 175000, 190000, 200000],
  ];
  
  revenueData.forEach((row, idx) => {
    revenueSheet.setCellValue({ row: idx + 1, col: 0 }, row[0]);
    revenueSheet.setCellValue({ row: idx + 1, col: 1 }, row[1]);
    revenueSheet.setCellValue({ row: idx + 1, col: 2 }, row[2]);
    revenueSheet.setCellValue({ row: idx + 1, col: 3 }, row[3]);
    revenueSheet.setCellValue({ row: idx + 1, col: 4 }, row[4]);
  });
  
  // Data Bar Rule: Blue gradient bars for all quarters
  const dataBarRule: ConditionalFormattingRule = {
    type: 'data-bar',
    color: '#638EC6',
    gradient: true,
    showValue: true,
    ranges: [{ start: { row: 1, col: 1 }, end: { row: 5, col: 4 } }],
    minValue: 0,
    maxValue: 650000,
  };
  
  revenueSheet.addConditionalFormattingRule?.(dataBarRule);
  
  // ===== Sheet 4: Traffic Light Indicators =====
  const statusSheet = workbook.addSheet('Project Status');
  
  // Headers
  statusSheet.setCellValue({ row: 0, col: 0 }, 'Project');
  statusSheet.setCellValue({ row: 0, col: 1 }, 'Progress %');
  statusSheet.setCellValue({ row: 0, col: 2 }, 'Budget Used %');
  statusSheet.setCellValue({ row: 0, col: 3 }, 'Status');
  
  // Data
  const projectsData = [
    ['Website Redesign', 95, 88],
    ['Mobile App', 65, 72],
    ['API Migration', 30, 45],
    ['Cloud Infrastructure', 85, 95],
    ['Security Audit', 100, 78],
    ['Performance Optimization', 45, 52],
  ];
  
  projectsData.forEach((row, idx) => {
    statusSheet.setCellValue({ row: idx + 1, col: 0 }, row[0]);
    statusSheet.setCellValue({ row: idx + 1, col: 1 }, row[1]);
    statusSheet.setCellValue({ row: idx + 1, col: 2 }, row[2]);
  });
  
  // Icon Set Rule: 3-traffic-lights for progress
  const trafficLightsRule: ConditionalFormattingRule = {
    type: 'icon-set',
    iconSet: '3-traffic-lights',
    ranges: [{ start: { row: 1, col: 1 }, end: { row: 6, col: 1 } }],
    thresholds: [
      { value: 80, type: 'number', icon: 'light-green', operator: '>=' },
      { value: 50, type: 'number', icon: 'light-yellow', operator: '>=' },
      { value: 0, type: 'number', icon: 'light-red', operator: '>=' },
    ],
  };
  
  statusSheet.addConditionalFormattingRule?.(trafficLightsRule);
  
  // Format all headers
  [salesSheet, ratingsSheet, revenueSheet, statusSheet].forEach(sheet => {
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
  });
  
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
        backgroundColor: '#E3F2FD',
        border: '2px solid #2196F3',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '350px',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily: 'Segoe UI, sans-serif',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1976D2' }}>
        📊 Conditional Formatting Demo
      </h3>
      <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#555' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Explore 4 Sheets:</strong>
        </p>
        <ul style={{ margin: '4px 0 12px 0', paddingLeft: '20px' }}>
          <li><strong>Sales Performance</strong> - 3-arrows icon set (↑↔↓)</li>
          <li><strong>Product Ratings</strong> - 5-star ratings (★★★★★)</li>
          <li><strong>Revenue Analysis</strong> - Blue gradient data bars</li>
          <li><strong>Project Status</strong> - Traffic lights (🔴🟡🟢)</li>
        </ul>
        <div>
          <strong>Try This:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li>Change values to see icons update</li>
            <li>Data bars grow/shrink with values</li>
            <li>Icons follow Excel's threshold rules</li>
            <li>Formula DAG auto-updates dependents</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Main demo component
const ConditionalFormattingDemo: React.FC = () => {
  const [workbook] = React.useState(() => createDemoWorkbook());

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <DemoInstructions />
      <ExcelApp
        workbook={workbook}
        fileName="Conditional Formatting Demo.xlsx"
        onSave={() => console.log('Save clicked')}
      />
    </div>
  );
};

// Mount the demo
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ConditionalFormattingDemo />);
}
