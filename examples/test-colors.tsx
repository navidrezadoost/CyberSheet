import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Workbook } from '@cyber-sheet/core';
import { CyberSheet } from '../packages/react/src';
import { rejectR1ExampleInitialization } from './r1-initialization-gate';

export const TestColors = () => {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    try {
      rejectR1ExampleInitialization('Test colors demo', 'R2 initial cell content and R5 styles');
    } catch (error) {
      setInitializationError(error instanceof Error ? error.message : String(error));
      return;
    }
    // Create a test workbook with colored cells
    const wb = new Workbook();
    const ws = wb.addSheet('Test', 20, 10);
    
    // Add some cells with colors
    ws.setCellValue({ row: 1, col: 1 }, 'Red Background');
    ws.setCellStyle({ row: 1, col: 1 }, { fill: '#FF0000', color: '#FFFFFF', bold: true });
    
    ws.setCellValue({ row: 2, col: 1 }, 'Blue Background');
    ws.setCellStyle({ row: 2, col: 1 }, { fill: '#0000FF', color: '#FFFFFF' });
    
    ws.setCellValue({ row: 3, col: 1 }, 'Green Background');
    ws.setCellStyle({ row: 3, col: 1 }, { fill: '#00FF00', color: '#000000' });
    
    ws.setCellValue({ row: 4, col: 1 }, 'Yellow Background');
    ws.setCellStyle({ row: 4, col: 1 }, { fill: '#FFFF00', color: '#000000', italic: true });
    
    ws.setCellValue({ row: 5, col: 1 }, 'Purple Background');
    ws.setCellStyle({ row: 5, col: 1 }, { fill: '#800080', color: '#FFFFFF', fontSize: 16 });
    
    ws.setCellValue({ row: 1, col: 2 }, 'With Border');
    ws.setCellStyle({ row: 1, col: 2 }, { 
      fill: '#CCCCCC', 
      border: { top: '#000000', right: '#FF0000', bottom: '#0000FF', left: '#00FF00' }
    });
    
    ws.setCellValue({ row: 2, col: 2 }, 12345);
    ws.setCellStyle({ row: 2, col: 2 }, { fill: '#FFE4B5', align: 'right', numberFormat: '#,##0' });
    
    console.log('[TestColors] Created workbook with styled cells');
    setWorkbook(wb);
  }, []);

  if (!workbook) {
    if (initializationError) {
      return <div role="alert" style={{ padding: 16 }}>{initializationError}</div>;
    }
    return <div style={{ padding: 16 }}>Creating test workbook...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <h3 style={{ margin: 0 }}>Color Test - Cell Styles</h3>
        <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
          Cells should show: Red, Blue, Green, Yellow, Purple backgrounds with white/black text
        </p>
      </div>
      <div style={{ flex: 1 }}>
        <CyberSheet
          workbook={workbook}
          sheetName="Test"
          rendererOptions={{
            onRender: (info) => {
              if (info.ms > 0) {
                console.log('[TestColors] Render took', info.ms.toFixed(2), 'ms');
              }
            }
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

const mountNode = document.getElementById('root');
if (mountNode) {
  const root = createRoot(mountNode);
  root.render(<TestColors />);
}
