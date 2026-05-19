/**
 * ChartDialog.tsx
 * 
 * Dialog for creating and configuring charts.
 * Allows users to select chart type, data range, and options.
 */

import React, { useState, useCallback } from 'react';
import type { ChartType, ChartObject, ChartCreateParams, CellRange } from '@cyber-sheet/core';

export interface ChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: ChartCreateParams) => void;
  initialChartType?: ChartType;
  suggestedRange?: CellRange;
}

/**
 * ChartDialog Component
 * 
 * Modal dialog for chart creation with:
 * - Chart type selection (bar, line, pie, sparkline)
 * - Data range input
 * - Chart options configuration
 * - Preview of selected chart type
 */
export const ChartDialog: React.FC<ChartDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  initialChartType = 'bar',
  suggestedRange,
}) => {
  // State
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [dataRangeText, setDataRangeText] = useState<string>(
    suggestedRange 
      ? `${suggestedRange.startRow}:${suggestedRange.startCol}-${suggestedRange.endRow}:${suggestedRange.endCol}`
      : ''
  );
  const [title, setTitle] = useState<string>('');
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [seriesDirection, setSeriesDirection] = useState<'rows' | 'columns'>('columns');
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [hasHeaderCol, setHasHeaderCol] = useState<boolean>(false);

  // Parse data range text into CellRange
  const parseDataRange = (): CellRange | null => {
    // Support formats: "A1:C10", "1:1-10:3", or manual input
    const trimmed = dataRangeText.trim();
    
    // Try Excel-style range (A1:C10)
    const excelMatch = trimmed.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (excelMatch) {
      const colToNum = (col: string) => {
        let num = 0;
        for (let i = 0; i < col.length; i++) {
          num = num * 26 + (col.charCodeAt(i) - 64);
        }
        return num;
      };
      
      return {
        startRow: parseInt(excelMatch[2]) - 1,
        startCol: colToNum(excelMatch[1]) - 1,
        endRow: parseInt(excelMatch[4]) - 1,
        endCol: colToNum(excelMatch[3]) - 1,
      };
    }
    
    // Try numeric format (1:1-10:3)
    const numericMatch = trimmed.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
    if (numericMatch) {
      return {
        startRow: parseInt(numericMatch[1]),
        startCol: parseInt(numericMatch[2]),
        endRow: parseInt(numericMatch[3]),
        endCol: parseInt(numericMatch[4]),
      };
    }
    
    return null;
  };

  // Handle create
  const handleCreate = useCallback(() => {
    const dataRange = parseDataRange();
    if (!dataRange) {
      alert('Invalid data range. Use format like "A1:C10" or "1:1-10:3"');
      return;
    }

    const params: ChartCreateParams = {
      type: chartType,
      dataRange,
      position: { x: 100, y: 100 }, // Default position
      size: { width: 400, height: 300 }, // Default size
      options: {
        title,
        showLegend,
        showAxes,
        showGrid,
      },
      seriesDirection,
      hasHeaderRow,
      hasHeaderCol,
      zIndex: 1,
    };

    onCreate(params);
    onClose();
  }, [chartType, dataRangeText, title, showLegend, showAxes, showGrid, seriesDirection, hasHeaderRow, hasHeaderCol, onCreate, onClose]);

  if (!isOpen) return null;

  // Chart type options
  const chartTypes: { type: ChartType; label: string; icon: string }[] = [
    { type: 'bar', label: 'Column Chart', icon: '📊' },
    { type: 'line', label: 'Line Chart', icon: '📈' },
    { type: 'pie', label: 'Pie Chart', icon: '🥧' },
    { type: 'sparkline', label: 'Sparkline', icon: '▁▂▃▅▇' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          width: 560,
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: 'Segoe UI, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Insert Chart</h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 18,
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {/* Chart Type Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Chart Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {chartTypes.map((ct) => (
                <button
                  key={ct.type}
                  onClick={() => setChartType(ct.type)}
                  style={{
                    padding: '12px 16px',
                    border: chartType === ct.type ? '2px solid #0078D4' : '1px solid #D9D9D9',
                    background: chartType === ct.type ? '#E6F2FF' : '#FFFFFF',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{ct.icon}</span>
                  <span>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data Range */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Data Range
            </label>
            <input
              type="text"
              value={dataRangeText}
              onChange={(e) => setDataRangeText(e.target.value)}
              placeholder="e.g., A1:C10 or 1:1-10:3"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #D9D9D9',
                borderRadius: 2,
                fontSize: 12,
                fontFamily: 'Consolas, monospace',
              }}
            />
            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
              Enter range in Excel format (A1:C10) or numeric format (row:col-row:col)
            </div>
          </div>

          {/* Chart Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Chart Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional chart title"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #D9D9D9',
                borderRadius: 2,
                fontSize: 12,
              }}
            />
          </div>

          {/* Data Interpretation */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Data Interpretation
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="radio"
                  checked={seriesDirection === 'columns'}
                  onChange={() => setSeriesDirection('columns')}
                />
                Series in Columns
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="radio"
                  checked={seriesDirection === 'rows'}
                  onChange={() => setSeriesDirection('rows')}
                />
                Series in Rows
              </label>
            </div>
          </div>

          {/* Header Options */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Headers
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={hasHeaderRow}
                  onChange={(e) => setHasHeaderRow(e.target.checked)}
                />
                First row contains labels
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={hasHeaderCol}
                  onChange={(e) => setHasHeaderCol(e.target.checked)}
                />
                First column contains labels
              </label>
            </div>
          </div>

          {/* Chart Options */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Display Options
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                />
                Show Legend
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => setShowAxes(e.target.checked)}
                />
                Show Axes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Show Grid
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E0E0E0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              border: '1px solid #D9D9D9',
              background: '#F0F0F0',
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '6px 16px',
              border: '1px solid #0078D4',
              background: '#0078D4',
              color: '#FFFFFF',
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Insert Chart
          </button>
        </div>
      </div>
    </div>
  );
};
