/**
 * CommentsGroup.tsx
 *
 * Review Tab - Comments Group
 * Contains: New Comment, Delete, Previous, Next, Show Comments dropdown
 */

import { CommentsGroupIcon6, CommentsGroupIcon5, CommentsGroupIcon4, CommentsGroupIcon3, CommentsGroupIcon2, CommentsGroupIcon1 } from '@cyber-sheet/icons/react';
import React, { useState, useRef, useEffect } from 'react';
import type { Workbook, Address } from '@cyber-sheet/core';

interface CommentsGroupProps {
  workbook: Workbook;
  selectedCells: Address[];
  onCommand?: (command: any) => void;
}

export const CommentsGroup: React.FC<CommentsGroupProps> = ({
  workbook,
  selectedCells,
  onCommand,
}) => {
  const [showCommentsDropdown, setShowCommentsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCommentsDropdown(false);
      }
    };

    if (showCommentsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCommentsDropdown]);

  const handleNewComment = () => {
    console.log('New Comment', selectedCells);
    onCommand?.({
      type: 'newComment',
      cell: selectedCells[0] || { row: 0, col: 0 },
    });
  };

  const handleDeleteComment = () => {
    console.log('Delete Comment', selectedCells);
    onCommand?.({
      type: 'deleteComment',
      cell: selectedCells[0] || { row: 0, col: 0 },
    });
  };

  const handlePreviousComment = () => {
    console.log('Previous Comment');
    onCommand?.({ type: 'previousComment' });
  };

  const handleNextComment = () => {
    console.log('Next Comment');
    onCommand?.({ type: 'nextComment' });
  };

  const handleShowComments = (option: 'show' | 'hide' | 'showIndicator') => {
    console.log('Show/Hide Comments:', option);
    onCommand?.({ type: 'toggleComments', option });
    setShowCommentsDropdown(false);
  };

  return (
    <div style={groupStyle}>
      <div style={{ display: 'flex', gap: 4 }}>
        {/* New Comment Button */}
        <button
          onClick={handleNewComment}
          style={buttonStyle}
          title="New Comment (Shift+F2)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CommentsGroupIcon1 />
          <span style={labelStyle}>New</span>
          <span style={labelStyle}>Comment</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDeleteComment}
          style={smallButtonStyle}
          title="Delete Comment"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CommentsGroupIcon2 />
          <span style={smallLabelStyle}>Delete</span>
        </button>

        {/* Previous Button */}
        <button
          onClick={handlePreviousComment}
          style={smallButtonStyle}
          title="Previous Comment"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CommentsGroupIcon3 />
          <span style={smallLabelStyle}>Previous</span>
        </button>

        {/* Next Button */}
        <button
          onClick={handleNextComment}
          style={smallButtonStyle}
          title="Next Comment"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CommentsGroupIcon4 />
          <span style={smallLabelStyle}>Next</span>
        </button>

        {/* Show Comments Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowCommentsDropdown(!showCommentsDropdown)}
            style={buttonStyle}
            title="Show Comments"
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = '#E8E8E8';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <CommentsGroupIcon5 />
            <span style={labelStyle}>Show</span>
            <span style={labelStyle}>Comments</span>
            <CommentsGroupIcon6 />
          </button>

          {/* Dropdown Menu */}
          {showCommentsDropdown && (
            <div style={dropdownMenuStyle}>
              <button onClick={() => handleShowComments('show')} style={menuItemStyle}>
                Open Comments Panel
              </button>
              <button onClick={() => handleShowComments('hide')} style={menuItemStyle}>
                Close Comments Panel
              </button>
              <div style={dividerStyle} />
              <button onClick={() => handleShowComments('showIndicator')} style={menuItemStyle}>
                Show Comment Indicator Only
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group Label */}
      <div style={groupLabelStyle}>Comments</div>
    </div>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  position: 'relative',
  paddingBottom: 18,
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  padding: '4px 6px',
  border: '1px solid transparent',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: 2,
  fontSize: 10,
  color: '#333',
  fontFamily: 'Segoe UI, sans-serif',
  minWidth: 50,
  height: 56,
  transition: 'background 0.1s',
};

const smallButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '4px 6px',
  border: '1px solid transparent',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: 2,
  fontSize: 10,
  color: '#333',
  fontFamily: 'Segoe UI, sans-serif',
  minWidth: 42,
  height: 56,
  transition: 'background 0.1s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#333',
  textAlign: 'center',
  lineHeight: '11px',
};

const smallLabelStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#333',
  textAlign: 'center',
  lineHeight: '10px',
};

const groupLabelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 2,
  left: 0,
  right: 0,
  textAlign: 'center',
  fontSize: 10,
  color: '#666',
  fontFamily: 'Segoe UI, sans-serif',
  pointerEvents: 'none',
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: '#FFFFFF',
  border: '1px solid #D9D9D9',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  borderRadius: 2,
  zIndex: 1000,
  minWidth: 220,
  padding: '4px 0',
};

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 12,
  color: '#333',
  fontFamily: 'Segoe UI, sans-serif',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: '#D9D9D9',
  margin: '4px 0',
};
