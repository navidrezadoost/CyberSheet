/**
 * ChartsGroup.tsx
 *
 * Insert Tab - Charts Group
 * Contains: Recommended Charts, Column, Line, Pie, Bar, Area, Scatter, Other Charts
 */

import React, { useState } from 'react';
import { RibbonDropdownHost } from '../RibbonDropdownHost';
import { ribbonDropdownChrome } from '../ribbonDropdownChrome';
import type { DrawingLayer } from '@cyber-sheet/core';

export interface ChartsGroupProps {
  drawingLayer?: DrawingLayer;
  onInsertChart?: (chartType: string) => void;
}

export const ChartsGroup: React.FC<ChartsGroupProps> = ({
  drawingLayer,
  onInsertChart,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '4px 8px',
    position: 'relative',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    maxWidth: 200,
  };

  const smallButtonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '4px 8px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 3,
    fontSize: 10,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    color: '#333',
    minWidth: 45,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 20,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Segoe UI, Arial, sans-serif',
  };

  const menuStyle = ribbonDropdownChrome({ minWidth: 180, maxHeight: 400, overflowY: 'auto' });

  const dropdownItemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    borderBottom: '1px solid #F0F0F0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const chartTypes = [
    { type: 'column', icon: '📊', label: 'Column' },
    { type: 'line', icon: '📈', label: 'Line' },
    { type: 'pie', icon: '🥧', label: 'Pie' },
    { type: 'bar', icon: '📊', label: 'Bar' },
    { type: 'area', icon: '📉', label: 'Area' },
    { type: 'scatter', icon: '◆', label: 'Scatter' },
  ];

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean): void => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (isEnter) {
      btn.style.background = '#E8E8E8';
      btn.style.borderColor = '#D1D1D1';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'transparent';
    }
  };

  return (
    <div style={groupStyle}>
      <div style={buttonContainerStyle}>
        {/* Chart type buttons */}
        {chartTypes.slice(0, 4).map((chart) => (
          <button
            key={chart.type}
            style={smallButtonStyle}
            onClick={() => onInsertChart?.(chart.type)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
            title={chart.label}
          >
            <span style={iconStyle}>{chart.icon}</span>
            <span>{chart.label}</span>
          </button>
        ))}

        {/* More charts dropdown */}
        <RibbonDropdownHost open={showDropdown} menuStyle={menuStyle} menu={<>{chartTypes.map((chart, index) => (
                <div
                  key={chart.type}
                  style={{
                    ...dropdownItemStyle,
                    borderBottom: index === chartTypes.length - 1 ? 'none' : '1px solid #F0F0F0',
                  }}
                  onClick={() => {
                    setShowDropdown(false);
                    onInsertChart?.(chart.type);
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = '#E8F4FD';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 16 }}>{chart.icon}</span>
                  <span>{chart.label}</span>
                </div>
              ))}</>}>
<button
            style={{
              ...smallButtonStyle,
              minWidth: 35,
              padding: '4px 4px',
            }}
            onClick={() => setShowDropdown(!showDropdown)}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, true)}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => handleButtonHover(e, false)}
            title="More Charts"
          >
            <span style={{ fontSize: 16 }}>▼</span>
            <span>More</span>
          </button>

</RibbonDropdownHost>
      </div>

      <div style={labelStyle}>Charts</div>
    </div>
  );
};
