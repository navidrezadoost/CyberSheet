/**
 * ZoomGroup.tsx
 *
 * View Tab - Zoom Group
 * Contains: Zoom slider (10-400%), Zoom to Selection, 100% button
 */

import { ZoomGroupIcon2, ZoomGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useCallback } from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface ZoomGroupProps {
  workbook: Workbook;
  currentZoom?: number;
  onZoomChange?: (zoom: number) => void;
  onZoomToSelection?: () => void;
}

export const ZoomGroup: React.FC<ZoomGroupProps> = ({
  workbook,
  currentZoom = 100,
  onZoomChange,
  onZoomToSelection,
}) => {
  const [zoom, setZoom] = useState(currentZoom);

  const handleZoomChange = useCallback((newZoom: number) => {
    // Clamp between 10% and 400%
    const clampedZoom = Math.max(10, Math.min(400, newZoom));
    setZoom(clampedZoom);
    onZoomChange?.(clampedZoom);
    console.log('Zoom changed:', clampedZoom + '%');
  }, [onZoomChange]);

  const handleZoomToSelection = useCallback(() => {
    onZoomToSelection?.();
    console.log('Zoom to Selection');
  }, [onZoomToSelection]);

  const handle100Percent = useCallback(() => {
    handleZoomChange(100);
  }, [handleZoomChange]);

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 2,
    fontSize: 11,
    color: '#333',
    fontFamily: 'Segoe UI, sans-serif',
    minWidth: 50,
    transition: 'background 150ms',
  };

  return (
    <div className="formulas-group view-ribbon-group">
      <div className="formulas-group-body view-ribbon-group-body">
        {/* Zoom Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <input
            type="range"
            min="10"
            max="400"
            value={zoom}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleZoomChange(parseInt(e.target.value))}
            style={{
              width: 100,
              height: 4,
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
            }}
            title={`Zoom: ${zoom}%`}
          />
          <span style={{ fontSize: 10, color: '#666', fontFamily: 'Segoe UI, sans-serif' }}>
            {zoom}%
          </span>
        </div>

        {/* Zoom to Selection */}
        <button
          style={buttonStyle}
          onClick={handleZoomToSelection}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Zoom to Selection"
        >
          <ZoomGroupIcon1 />
          <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>Zoom to<br/>Selection</span>
        </button>

        {/* 100% Button */}
        <button
          style={buttonStyle}
          onClick={handle100Percent}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="100% Zoom"
        >
          <ZoomGroupIcon2 />
          <span>100%</span>
        </button>
      </div>
      <div className="formulas-group-caption">Zoom</div>
    </div>
  );
};
