/**
 * AddinsGroup.tsx
 *
 * Add-ins Group - Manage Excel and COM add-ins
 * Features: Excel Add-ins, COM Add-ins, Add-in Manager
 */

import React from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface AddinsGroupProps {
  workbook: Workbook;
  onCommand?: (command: any) => void;
}

export const AddinsGroup: React.FC<AddinsGroupProps> = ({ workbook, onCommand }) => {
  const handleExcelAddins = () => {
    console.log('Open Excel Add-ins');
    onCommand?.({ type: 'openExcelAddins' });
    alert('Excel Add-ins: Feature coming soon!\n\nBrowse and manage Excel add-ins to extend functionality:\n• Analysis ToolPak\n• Solver\n• Euro Currency Tools\n• And more...');
  };

  const handleCOMAddins = () => {
    console.log('Open COM Add-ins');
    onCommand?.({ type: 'openCOMAddins' });
    alert('COM Add-ins: Feature coming soon!\n\nManage Component Object Model (COM) add-ins installed on your system.');
  };

  return (
    <div className="ribbon-tab-shell ribbon-tab-shell-center">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Excel Add-ins */}
        <button
          onClick={handleExcelAddins}
          title="Excel Add-ins"
          style={{
            width: 120,
            height: 28,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            gap: 6,
            fontSize: 11,
            fontFamily: 'Segoe UI, sans-serif',
            color: '#333',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="#107C10" strokeWidth="1.5" fill="none" />
            <path d="M6 6h4M6 8h4M6 10h4" stroke="#107C10" strokeWidth="1.5" />
          </svg>
          <span>Excel Add-ins</span>
        </button>

        {/* COM Add-ins */}
        <button
          onClick={handleCOMAddins}
          title="COM Add-ins"
          style={{
            width: 120,
            height: 28,
            border: 'none',
            background: '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            gap: 6,
            fontSize: 11,
            fontFamily: 'Segoe UI, sans-serif',
            color: '#333',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="#0078D4" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="3" stroke="#0078D4" strokeWidth="1.5" fill="none" />
          </svg>
          <span>COM Add-ins</span>
        </button>
      </div>

      <div className="ribbon-tab-shell-title">Add-ins</div>
    </div>
  );
};
