/**
 * StatusBar.tsx
 * 
 * Excel-style status bar with statistics and zoom controls
 */

import React from 'react';

export interface StatusBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  selection?: any;
  viewMode?: 'normal' | 'pageLayout' | 'pageBreak';
  onViewModeChange?: (mode: 'normal' | 'pageLayout' | 'pageBreak') => void;
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
  viewMode = 'normal',
  onViewModeChange,
}) => {
  // Calculate selection statistics (placeholder for now)
  const average = selection ? '—' : '—';
  const count = selection ? '—' : '—';
  const sum = selection ? '—' : '—';

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
        <span className="status-text">Ready</span>
      </div>

      {/* Center: Statistics */}
      <div className="status-center">
        <span className="status-item">Average: {average}</span>
        <span className="status-item">Count: {count}</span>
        <span className="status-item">Sum: {sum}</span>
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
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="5" height="5"/>
              <rect x="8" y="1" width="5" height="5"/>
              <rect x="1" y="8" width="5" height="5"/>
              <rect x="8" y="8" width="5" height="5"/>
            </svg>
          </button>

          <button
            className={`view-btn ${viewMode === 'pageLayout' ? 'active' : ''}`}
            title="Page Layout View"
            onClick={() => onViewModeChange?.('pageLayout')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="10" height="12" fill="none" stroke="currentColor"/>
              <line x1="4" y1="4" x2="10" y2="4" stroke="currentColor"/>
              <line x1="4" y1="6" x2="10" y2="6" stroke="currentColor"/>
              <line x1="4" y1="8" x2="10" y2="8" stroke="currentColor"/>
            </svg>
          </button>

          <button
            className={`view-btn ${viewMode === 'pageBreak' ? 'active' : ''}`}
            title="Page Break Preview"
            onClick={() => onViewModeChange?.('pageBreak')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="12" height="12" fill="none" stroke="currentColor"/>
              <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeDasharray="2"/>
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeDasharray="2"/>
            </svg>
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
