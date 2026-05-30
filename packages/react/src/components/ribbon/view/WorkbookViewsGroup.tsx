/**
 * WorkbookViewsGroup.tsx
 *
 * View Tab - Workbook Views Group
 * Contains: Normal, Page Break Preview, Page Layout, Custom Views
 */

import { WorkbookViewsGroupIcon4, WorkbookViewsGroupIcon3, WorkbookViewsGroupIcon2, WorkbookViewsGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useCallback } from 'react';
import type { Workbook } from '@cyber-sheet/core';

interface WorkbookViewsGroupProps {
  workbook: Workbook;
  currentView?: 'normal' | 'pageBreak' | 'pageLayout';
  onViewChange?: (view: 'normal' | 'pageBreak' | 'pageLayout') => void;
  onCustomViews?: () => void;
}

export const WorkbookViewsGroup: React.FC<WorkbookViewsGroupProps> = ({
  workbook,
  currentView = 'normal',
  onViewChange,
  onCustomViews,
}) => {
  const [activeView, setActiveView] = useState(currentView);

  useEffect(() => {
    setActiveView(currentView);
  }, [currentView]);

  const handleViewChange = useCallback((view: 'normal' | 'pageBreak' | 'pageLayout') => {
    setActiveView(view);
    onViewChange?.(view);
    console.log('View changed:', view);
  }, [onViewChange]);

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    border: '1px solid transparent',
    background: isActive ? '#E0E0E0' : 'transparent',
    cursor: 'pointer',
    borderRadius: 2,
    fontSize: 11,
    color: '#333',
    fontFamily: 'Segoe UI, sans-serif',
    minWidth: 60,
    transition: 'background 150ms',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 8px' }}>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 2, fontFamily: 'Segoe UI, sans-serif' }}>
        Workbook Views
      </div>
      
      <div style={{ display: 'flex', gap: 4 }}>
        {/* Normal View */}
        <button
          style={buttonStyle(activeView === 'normal')}
          onClick={() => handleViewChange('normal')}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== 'normal') {
              e.currentTarget.style.background = '#E8E8E8';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== 'normal') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Normal View"
        >
          <WorkbookViewsGroupIcon1 />
          <span>Normal</span>
        </button>

        {/* Page Break Preview */}
        <button
          style={buttonStyle(activeView === 'pageBreak')}
          onClick={() => handleViewChange('pageBreak')}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== 'pageBreak') {
              e.currentTarget.style.background = '#E8E8E8';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== 'pageBreak') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Page Break Preview"
        >
          <WorkbookViewsGroupIcon2 />
          <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>Page Break<br/>Preview</span>
        </button>

        {/* Page Layout View */}
        <button
          style={buttonStyle(activeView === 'pageLayout')}
          onClick={() => handleViewChange('pageLayout')}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== 'pageLayout') {
              e.currentTarget.style.background = '#E8E8E8';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== 'pageLayout') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Page Layout View"
        >
          <WorkbookViewsGroupIcon3 />
          <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>Page<br/>Layout</span>
        </button>

        {/* Custom Views */}
        <button
          style={buttonStyle(false)}
          onClick={() => {
            onCustomViews?.();
            console.log('Custom Views dialog');
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Custom Views"
        >
          <WorkbookViewsGroupIcon4 />
          <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>Custom<br/>Views</span>
        </button>
      </div>
    </div>
  );
};
