/**
 * ChangesGroup.tsx
 *
 * Changes and History group for Review tab
 * - Track Changes dropdown (Highlight Changes, Accept/Reject Changes)
 * - Version History button
 */

import { ChangesGroupIcon3, ChangesGroupIcon2, ChangesGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useRef, useEffect } from 'react';
import { RibbonDropdownHost } from '../RibbonDropdownHost';
import { ribbonDropdownChrome } from '../ribbonDropdownChrome';
import type { Workbook, Address } from '@cyber-sheet/core';

interface ChangesGroupProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const ChangesGroup: React.FC<ChangesGroupProps> = ({ workbook, selectedCells, onCommand }) => {
  const [showTrackChangesDropdown, setShowTrackChangesDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTrackChangesDropdown(false);
      }
    };

    if (showTrackChangesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTrackChangesDropdown]);

  const handleHighlightChanges = () => {
    setShowTrackChangesDropdown(false);
    onCommand?.({ type: 'highlightChanges' });
    console.log('Highlight Changes dialog');
  };

  const handleAcceptRejectChanges = () => {
    setShowTrackChangesDropdown(false);
    onCommand?.({ type: 'acceptRejectChanges' });
    console.log('Accept/Reject Changes dialog');
  };

  const handleToggleTrackChanges = () => {
    setShowTrackChangesDropdown(false);
    const trackingEnabled = (workbook as any).trackChangesEnabled || false;
    onCommand?.({ type: 'trackChanges', enabled: !trackingEnabled });
    console.log('Track Changes:', !trackingEnabled ? 'enabled' : 'disabled');
  };

  const handleVersionHistory = () => {
    onCommand?.({ type: 'versionHistory' });
    console.log('Version History panel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px', position: 'relative' }}>
      {/* Track Changes Dropdown */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setShowTrackChangesDropdown(!showTrackChangesDropdown)}
          title="Track Changes"
          style={{
            width: 56,
            height: 48,
            border: 'none',
            background: showTrackChangesDropdown ? '#E8E8E8' : '#F0F0F0',
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            fontFamily: 'Segoe UI, sans-serif',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!showTrackChangesDropdown) e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!showTrackChangesDropdown) e.currentTarget.style.background = '#F0F0F0';
          }}
        >
          {/* Track Changes icon: Document with pencil */}
          <ChangesGroupIcon1 />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 8 }}>
            <span style={{ textAlign: 'center', lineHeight: 1.2 }}>Track<br/>Changes</span>
            <ChangesGroupIcon2 />
          </div>
        </button>

        {/* Dropdown Menu */}
        {showTrackChangesDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 2,
              background: '#FFFFFF',
              border: '1px solid #D9D9D9',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              borderRadius: 2,
              zIndex: 1000,
              minWidth: 200,
            }}
          >
            {/* Toggle Track Changes */}
            <div
              onClick={handleToggleTrackChanges}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Segoe UI, sans-serif',
                background: 'transparent',
                borderBottom: '1px solid #E8E8E8',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = '#F0F0F0'}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = 'transparent'}
            >
              Track Changes
            </div>

            {/* Highlight Changes */}
            <div
              onClick={handleHighlightChanges}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Segoe UI, sans-serif',
                background: 'transparent',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = '#F0F0F0'}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = 'transparent'}
            >
              Highlight Changes...
            </div>

            {/* Accept/Reject Changes */}
            <div
              onClick={handleAcceptRejectChanges}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Segoe UI, sans-serif',
                background: 'transparent',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = '#F0F0F0'}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = 'transparent'}
            >
              Accept/Reject Changes...
            </div>
          </div>
        )}
      </div>

      {/* Version History Button */}
      <button
        onClick={handleVersionHistory}
        title="Version History"
        style={{
          width: 56,
          height: 48,
          border: 'none',
          background: '#F0F0F0',
          cursor: 'pointer',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          fontFamily: 'Segoe UI, sans-serif',
          marginTop: 4,
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#E8E8E8'}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = '#F0F0F0'}
      >
        {/* Version History icon: Clock with arrows */}
        <ChangesGroupIcon3 />
        <span style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.2 }}>Version<br/>History</span>
      </button>

      {/* Group Label */}
      <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontFamily: 'Segoe UI, sans-serif' }}>
        Changes
      </div>
    </div>
  );
};
