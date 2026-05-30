/**
 * StatusBar.tsx
 * 
 * Excel-style status bar with statistics and zoom controls
 */

import { StatusBarIcon3, StatusBarIcon2, StatusBarIcon1 } from '@cyber-sheet/icons/react';
import React from 'react';
import type { Workbook } from '@cyber-sheet/core';

export interface StatusBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selection?: { start: { row: number; col: number }; end: { row: number; col: number } };
  workbook?: Workbook;
  viewMode?: 'normal' | 'pageLayout' | 'pageBreak';
  onViewModeChange?: (mode: 'normal' | 'pageLayout' | 'pageBreak') => void;
  statusMessage?: string | null;
}

/**
 * StatusBar - Application status bar
 * 
 * Displays:
 * - Ready status
 * - Selection statistics (Average, Count, Sum)
 * - View mode buttons
 * - Zoom controls (slider and buttons)
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  zoom,
  onZoomChange,
  selection,
  workbook,
  viewMode = 'normal',
  onViewModeChange,
  statusMessage,
}) => {
  // Calculate selection statistics
  const calculateStatistics = React.useMemo(() => {
    if (!selection || !workbook || !workbook.activeSheet) {
      return { average: null, count: 0, sum: null, numericCount: 0 };
    }

    const sheet = workbook.activeSheet;
    const r1 = Math.min(selection.start.row, selection.end.row);
    const r2 = Math.max(selection.start.row, selection.end.row);
    const c1 = Math.min(selection.start.col, selection.end.col);
    const c2 = Math.max(selection.start.col, selection.end.col);

    let sum = 0;
    let count = 0;
    let numericCount = 0;

    // Iterate through selected cells
    for (let row = r1; row <= r2; row++) {
      for (let col = c1; col <= c2; col++) {
        const value = sheet.getCellValue({ row, col });
        
        if (value !== null && value !== undefined && value !== '') {
          count++;
          
          // Try to convert to number
          const numValue = typeof value === 'number' ? value : parseFloat(String(value));
          
          if (!isNaN(numValue) && isFinite(numValue)) {
            sum += numValue;
            numericCount++;
          }
        }
      }
    }

    const average = numericCount > 0 ? sum / numericCount : null;

    return { average, count, sum: numericCount > 0 ? sum : null, numericCount };
  }, [selection, workbook]);

  const { average, count, sum, numericCount } = calculateStatistics;

  // Format numbers for display
  const formatNumber = (num: number | null) => {
    if (num === null) return '—';
    // Format with commas and up to 2 decimal places
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(400, zoom + 10));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(10, zoom - 10));
  };

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(Number(e.target.value));
  };

  return (
    <footer className="status-bar">
      {/* Left: Status */}
      <div className="status-left">
        <span className="status-text">{statusMessage || 'Ready'}</span>
      </div>

      {/* Center: Statistics */}
      <div className="status-center">
        {numericCount > 0 && (
          <>
            <span className="status-item">Average: {formatNumber(average)}</span>
            <span className="status-item">Count: {count}</span>
            <span className="status-item">Sum: {formatNumber(sum)}</span>
          </>
        )}
        {numericCount === 0 && count > 0 && (
          <span className="status-item">Count: {count}</span>
        )}
      </div>

      {/* Right: View and Zoom */}
      <div className="status-right">
        {/* View Mode Buttons */}
        <div className="view-buttons">
          <button
            className={`view-btn ${viewMode === 'normal' ? 'active' : ''}`}
            title="Normal View"
            onClick={() => onViewModeChange?.('normal')}
          >
            <StatusBarIcon1 />
          </button>

          <button
            className={`view-btn ${viewMode === 'pageLayout' ? 'active' : ''}`}
            title="Page Layout View"
            onClick={() => onViewModeChange?.('pageLayout')}
          >
            <StatusBarIcon2 />
          </button>

          <button
            className={`view-btn ${viewMode === 'pageBreak' ? 'active' : ''}`}
            title="Page Break Preview"
            onClick={() => onViewModeChange?.('pageBreak')}
          >
            <StatusBarIcon3 />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button className="zoom-btn" title="Zoom Out" onClick={handleZoomOut}>
            −
          </button>
          <input
            type="range"
            min="10"
            max="400"
            value={zoom}
            onChange={handleZoomSlider}
            className="zoom-slider"
            title="Zoom"
          />
          <button className="zoom-btn" title="Zoom In" onClick={handleZoomIn}>
            +
          </button>
          <span className="zoom-level">{zoom}%</span>
        </div>
      </div>
    </footer>
  );
};
