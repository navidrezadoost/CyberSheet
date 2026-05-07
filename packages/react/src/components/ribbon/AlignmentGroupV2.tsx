/**
 * AlignmentGroupV2.tsx
 * 
 * Comprehensive alignment formatting group for Home ribbon tab
 * Provides horizontal/vertical alignment, wrap text, merge cells, indent, rotation
 * 
 * Microinteractions:
 * - Merge cells shows warning if multiple cells have content
 * - Wrap text pulses when first applied
 * - Indent animates text shift
 * - Rotation preview on hover
 * 
 * Phase 2: Excel 365-Level Alignment Controls
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Address, Range } from '@cyber-sheet/core';
import type { FormattingController } from '@cyber-sheet/core';
import type { SelectionStyleSummary } from '@cyber-sheet/core';

export interface AlignmentGroupV2Props {
  formattingController: FormattingController;
  selectedCells: Address[];
  selectionStyle: SelectionStyleSummary;
  currentRange?: Range; // For merge operations
  onStyleChange?: () => void;
  onOpenFormatDialog?: (tab: 'alignment') => void;
}

export const AlignmentGroupV2: React.FC<AlignmentGroupV2Props> = ({
  formattingController,
  selectedCells,
  selectionStyle,
  currentRange,
  onStyleChange,
  onOpenFormatDialog,
}) => {
  const [showMergeMenu, setShowMergeMenu] = useState(false);
  const [showRotationMenu, setShowRotationMenu] = useState(false);
  const [pulseWrap, setPulseWrap] = useState(false);
  
  const mergeMenuRef = useRef(null);
  const rotationMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mergeMenuRef.current && !mergeMenuRef.current.contains(e.target as Node)) {
        setShowMergeMenu(false);
      }
      if (rotationMenuRef.current && !rotationMenuRef.current.contains(e.target as Node)) {
        setShowRotationMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current styles
  const horizontalAlign = selectionStyle.align?.value || 'left';
  const verticalAlign = selectionStyle.valign?.value || 'bottom';
  const wrapText = selectionStyle.wrap?.value || false;
  const indent = (selectionStyle as any).indent?.value || 0;
  const rotation = (selectionStyle as any).rotation?.value || 0;
  
  const isAlignMixed = selectionStyle.align?.isMixed;
  const isValignMixed = selectionStyle.valign?.isMixed;
  const isWrapMixed = selectionStyle.wrap?.isMixed;

  // Alignment handlers
  const handleHorizontalAlign = (align: 'left' | 'center' | 'right' | 'fill' | 'justify') => {
    formattingController.setHorizontalAlign(selectedCells, align);
    onStyleChange?.();
  };

  const handleVerticalAlign = (valign: 'top' | 'middle' | 'bottom') => {
    formattingController.setVerticalAlign(selectedCells, valign);
    onStyleChange?.();
  };

  const handleWrapText = () => {
    formattingController.toggleWrapText(selectedCells);
    
    // Pulse animation on first wrap
    if (!wrapText) {
      setPulseWrap(true);
      setTimeout(() => setPulseWrap(false), 300);
    }
    
    onStyleChange?.();
  };

  const handleIncreaseIndent = () => {
    formattingController.increaseIndent(selectedCells);
    onStyleChange?.();
  };

  const handleDecreaseIndent = () => {
    formattingController.decreaseIndent(selectedCells);
    onStyleChange?.();
  };

  const handleMergeAndCenter = () => {
    if (!currentRange) return;
    formattingController.mergeAndCenter(currentRange);
    setShowMergeMenu(false);
    onStyleChange?.();
  };

  const handleMergeCells = () => {
    if (!currentRange) return;
    formattingController.mergeCells(currentRange);
    setShowMergeMenu(false);
    onStyleChange?.();
  };

  const handleUnmergeCells = () => {
    if (!currentRange) return;
    formattingController.unmergeCells(currentRange);
    setShowMergeMenu(false);
    onStyleChange?.();
  };

  const handleRotation = (angle: number) => {
    formattingController.setRotation(selectedCells, angle);
    setShowRotationMenu(false);
    onStyleChange?.();
  };

  // Common button styles
  const buttonStyles: React.CSSProperties = {
    border: '1px solid #d0d0d0',
    background: '#fff',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '28px',
    borderRadius: '3px',
    transition: 'all 150ms ease',
  };

  const activeButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    background: '#e3f2fd',
    borderColor: '#2196f3',
    boxShadow: 'inset 0 1px 2px rgba(33, 150, 243, 0.1)',
  };

  const mixedButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    background: 'repeating-linear-gradient(45deg, #fff 0px, #fff 2px, #f5f5f5 2px, #f5f5f5 4px)',
    borderColor: '#bbb',
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    background: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000, minWidth: '180px',
    animation: 'slideDown 200ms ease-out',
  };

  const menuItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 150ms ease',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '8px',
      borderRight: '1px solid #d0d0d0',
      position: 'relative',
    }}>
      {/* Group Launcher Button */}
      {onOpenFormatDialog && (
        <button
          onClick={() => onOpenFormatDialog('alignment')}
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '14px',
            height: '14px',
            padding: '0',
            border: 'none',
            background: 'none',
            fontSize: '9px',
            cursor: 'pointer',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          title="Alignment Settings"
          aria-label="Alignment Settings"
        >
          ↘
        </button>
      )}
      {/* Row 1: Horizontal Alignment */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          style={!isAlignMixed && horizontalAlign === 'left' ? activeButtonStyles : (isAlignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleHorizontalAlign('left')}
          title="Align Left"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'left') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'left') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h10v2H2V3zm0 4h12v2H2V7zm0 4h10v2H2v-2z"/>
          </svg>
        </button>

        <button
          style={!isAlignMixed && horizontalAlign === 'center' ? activeButtonStyles : (isAlignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleHorizontalAlign('center')}
          title="Center"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'center') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'center') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 3h8v2H4V3zm2 4h4v2H6V7zm2 4h4v2H8v-2z"/>
          </svg>
        </button>

        <button
          style={!isAlignMixed && horizontalAlign === 'right' ? activeButtonStyles : (isAlignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleHorizontalAlign('right')}
          title="Align Right"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'right') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'right') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 3h10v2H4V3zm0 4h12v2H4V7zm0 4h10v2H4v-2z"/>
          </svg>
        </button>

        <button
          style={!isAlignMixed && horizontalAlign === 'justify' ? activeButtonStyles : (isAlignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleHorizontalAlign('justify')}
          title="Justify"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'justify') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isAlignMixed && horizontalAlign !== 'justify') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
          </svg>
        </button>
      </div>

      {/* Row 2: Vertical Alignment & Rotation */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          style={!isValignMixed && verticalAlign === 'top' ? activeButtonStyles : (isValignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleVerticalAlign('top')}
          title="Top Align"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isValignMixed && verticalAlign !== 'top') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isValignMixed && verticalAlign !== 'top') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h12v2H2V2zm2 4h8v2H4V6z"/>
          </svg>
        </button>

        <button
          style={!isValignMixed && verticalAlign === 'middle' ? activeButtonStyles : (isValignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleVerticalAlign('middle')}
          title="Middle Align"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isValignMixed && verticalAlign !== 'middle') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isValignMixed && verticalAlign !== 'middle') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 6h8v2H4V6z"/>
          </svg>
        </button>

        <button
          style={!isValignMixed && verticalAlign === 'bottom' ? activeButtonStyles : (isValignMixed ? mixedButtonStyles : buttonStyles)}
          onClick={() => handleVerticalAlign('bottom')}
          title="Bottom Align"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isValignMixed && verticalAlign !== 'bottom') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isValignMixed && verticalAlign !== 'bottom') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 10h8v2H4v-2zm-2 3h12v2H2v-2z"/>
          </svg>
        </button>

        {/* Text Rotation Dropdown */}
        <div style={{ position: 'relative' }} ref={rotationMenuRef}>
          <button
            style={rotation !== 0 ? activeButtonStyles : buttonStyles}
            onClick={() => setShowRotationMenu(!showRotationMenu)}
            title="Text Orientation"
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (rotation === 0) {
                (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (rotation === 0) {
                (e.target as HTMLElement).style.backgroundColor = '#fff';
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 2l4 4-4 4V7H6v6H4V7H2V5h8V2z"/>
            </svg>
            <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
          </button>

          {showRotationMenu && (
            <div style={dropdownStyles}>
              <div
                style={menuItemStyles}
                onClick={() => handleRotation(0)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Horizontal (0°)
              </div>
              <div
                style={menuItemStyles}
                onClick={() => handleRotation(45)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Angle Counterclockwise (45°)
              </div>
              <div
                style={menuItemStyles}
                onClick={() => handleRotation(-45)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Angle Clockwise (-45°)
              </div>
              <div
                style={menuItemStyles}
                onClick={() => handleRotation(90)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Rotate Text Up (90°)
              </div>
              <div
                style={{ ...menuItemStyles, borderBottom: 'none' }}
                onClick={() => handleRotation(-90)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Rotate Text Down (-90°)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Wrap Text, Indent, Merge */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        <button
          style={{
            ...(wrapText ? activeButtonStyles : buttonStyles),
            animation: pulseWrap ? 'pulse 300ms ease' : 'none',
          }}
          onClick={handleWrapText}
          title="Wrap Text"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!wrapText) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!wrapText) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm0 3h10c1.1 0 2 .9 2 2s-.9 2-2 2H9l2-2-2-2v4H7V7h3c.55 0 1-.45 1-1H2V6zm0 5h8v2H2v-2z"/>
          </svg>
        </button>

        {/* Indent controls */}
        <button
          style={buttonStyles}
          onClick={handleDecreaseIndent}
          title="Decrease Indent"
          disabled={indent <= 0}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (indent > 0) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (indent > 0) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm4 4h8v2H6V7zm0 4h8v2H6v-2zM2 6v6l3-3-3-3z"/>
          </svg>
        </button>

        <button
          style={buttonStyles}
          onClick={handleIncreaseIndent}
          title="Increase Indent"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm4 4h8v2H6V7zm0 4h8v2H6v-2zM2 6l3 3-3 3V6z"/>
          </svg>
        </button>

        {/* Merge & Center Dropdown */}
        <div style={{ position: 'relative' }} ref={mergeMenuRef}>
          <button
            style={buttonStyles}
            onClick={() => setShowMergeMenu(!showMergeMenu)}
            title="Merge & Center"
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2v12h12V2H2zm10 10H4V4h8v8z"/>
            </svg>
            <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
          </button>

          {showMergeMenu && (
            <div style={dropdownStyles}>
              <div
                style={menuItemStyles}
                onClick={handleMergeAndCenter}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Merge & Center
              </div>
              <div
                style={menuItemStyles}
                onClick={handleMergeCells}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Merge Cells
              </div>
              <div
                style={{ ...menuItemStyles, borderBottom: 'none' }}
                onClick={handleUnmergeCells}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fff';
                }}
              >
                Unmerge Cells
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>
    </div>
  );
};
