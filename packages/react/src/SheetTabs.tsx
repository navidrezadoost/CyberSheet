/**
 * SheetTabs.tsx
 * 
 * Excel-like sheet tabs component for navigating between worksheets
 */

import React, { useState, useRef } from 'react';

export interface SheetTabsProps {
  sheets: string[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  onAddSheet?: () => void;
  onRenameSheet?: (oldName: string, newName: string) => void;
  onDeleteSheet?: (sheetName: string) => void;
  style?: React.CSSProperties;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheet,
  onSheetChange,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  style
}) => {
  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredSheet, setHoveredSheet] = useState<string | null>(null);
  const inputRef = useRef(null as HTMLInputElement | null);

  const handleDoubleClick = (sheetName: string) => {
    if (onRenameSheet) {
      setEditingSheet(sheetName);
      setEditValue(sheetName);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const handleRename = () => {
    if (editingSheet && editValue.trim() && editValue !== editingSheet) {
      onRenameSheet?.(editingSheet, editValue.trim());
    }
    setEditingSheet(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditingSheet(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, sheetName: string) => {
    e.preventDefault();
    if (onDeleteSheet && sheets.length > 1) {
      if (window.confirm(`Delete sheet "${sheetName}"?`)) {
        onDeleteSheet(sheetName);
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '32px',
      backgroundColor: '#e7e7e7',
      backgroundImage: 'linear-gradient(to bottom, #e7e7e7, #d8d8d8)',
      borderTop: '2px solid #c0c0c0',
      boxShadow: '0 -2px 5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
      overflow: 'auto',
      userSelect: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: '12px',
      ...style
    }}>
      {/* Navigation arrows (like Excel) */}
      <div style={{
        display: 'flex',
        borderRight: '1px solid #d1d1d1',
        padding: '0 6px',
        gap: '2px'
      }}>
        <button
          style={{
            background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '3px 6px',
            color: '#555',
            fontSize: '11px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fff, #f5f5f5)'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fafafa, #f0f0f0)'}
          title="Scroll to first sheet"
        >
          ◄◄
        </button>
        <button
          style={{
            background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '3px 6px',
            color: '#555',
            fontSize: '11px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fff, #f5f5f5)'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fafafa, #f0f0f0)'}
          title="Scroll to first sheet"
        >
          ◄◄
        </button>
        <button
          style={{
            background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '3px 6px',
            color: '#555',
            fontSize: '11px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fff, #f5f5f5)'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fafafa, #f0f0f0)'}
          title="Scroll left"
        >
          ◄
        </button>
        <button
          style={{
            background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '3px 6px',
            color: '#555',
            fontSize: '11px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fff, #f5f5f5)'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fafafa, #f0f0f0)'}
          title="Scroll right"
        >
          ►
        </button>
        <button
          style={{
            background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '3px 6px',
            color: '#555',
            fontSize: '11px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fff, #f5f5f5)'}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = 'linear-gradient(to bottom, #fafafa, #f0f0f0)'}
          title="Scroll to last sheet"
        >
          ►►
        </button>
      </div>

      {/* Sheet tabs */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'auto',
        alignItems: 'flex-end',
        padding: '0 8px',
        gap: '2px'
      }}>
        {sheets.map((sheetName) => {
          const isActive = sheetName === activeSheet;
          const isEditing = editingSheet === sheetName;
          const isHovered = hoveredSheet === sheetName;

          return (
            <div
              key={sheetName}
              onClick={() => !isEditing && onSheetChange(sheetName)}
              onDoubleClick={() => handleDoubleClick(sheetName)}
              onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => handleContextMenu(e, sheetName)}
              onMouseEnter={() => setHoveredSheet(sheetName)}
              onMouseLeave={() => setHoveredSheet(null)}
              style={{
                padding: '5px 16px',
                cursor: isEditing ? 'text' : 'pointer',
                backgroundColor: isActive ? '#ffffff' : (isHovered ? '#f8f8f8' : '#ececec'),
                backgroundImage: isActive ? 'linear-gradient(to bottom, #ffffff, #fafafa)' : (isHovered ? 'linear-gradient(to bottom, #f8f8f8, #f0f0f0)' : 'linear-gradient(to bottom, #ececec, #e0e0e0)'),
                border: isActive ? '1px solid #b0b0b0' : '1px solid #c8c8c8',
                borderBottom: isActive ? '3px solid #217346' : '1px solid #c8c8c8',
                borderRadius: '6px 6px 0 0',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#217346' : '#2c2c2c',
                whiteSpace: 'nowrap',
                position: 'relative',
                bottom: '0',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 -3px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)' : (isHovered ? '0 -1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)' : '0 -1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)'),
                transform: isActive ? 'translateY(-2px)' : 'translateY(0)'
              }}
              title={sheetName}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  style={{
                    border: '1px solid #217346',
                    padding: '0 2px',
                    fontSize: '12px',
                    width: `${Math.max(50, editValue.length * 8)}px`,
                    fontFamily: 'inherit'
                  }}
                  autoFocus
                />
              ) : (
                sheetName
              )}
            </div>
          );
        })}

        {/* Add sheet button */}
        {onAddSheet && (
          <button
            onClick={onAddSheet}
            style={{
              background: 'linear-gradient(to bottom, #fafafa, #f0f0f0)',
              border: '1px solid #d1d1d1',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '4px 10px',
              color: '#217346',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.15s ease',
              marginLeft: '4px'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = 'linear-gradient(to bottom, #fff, #f5f5f5)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = 'linear-gradient(to bottom, #fafafa, #f0f0f0)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Add new sheet"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};
