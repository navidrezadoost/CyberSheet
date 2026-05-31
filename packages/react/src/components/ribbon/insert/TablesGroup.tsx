/**
 * TablesGroup.tsx
 *
 * Insert Tab - Tables Group
 * Contains: PivotTable, Table commands
 */

import React from 'react';

export interface TablesGroupProps {
  onInsertTable?: () => void;
  onInsertPivotTable?: () => void;
}

export const TablesGroup: React.FC<TablesGroupProps> = ({
  onInsertTable,
  onInsertPivotTable,
}) => {

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
  };

  const bigButtonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 3,
    fontSize: 11,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    color: '#333',
    minWidth: 50,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 24,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Segoe UI, Arial, sans-serif',
  };

  return (
    <div style={groupStyle}>
      <div style={buttonContainerStyle}>
        <button
          style={bigButtonStyle}
          onClick={() => onInsertPivotTable?.()}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#E8E8E8';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D1D1';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }}
        >
          <span style={iconStyle}>📊</span>
          <span>PivotTable</span>
        </button>

        {/* Table Button */}
        <button
          style={bigButtonStyle}
          onClick={() => onInsertTable?.()}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#E8E8E8';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D1D1';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }}
        >
          <span style={iconStyle}>📋</span>
          <span>Table</span>
        </button>
      </div>

      <div style={labelStyle}>Tables</div>
    </div>
  );
};
