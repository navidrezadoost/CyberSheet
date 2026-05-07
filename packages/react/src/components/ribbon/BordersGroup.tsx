/**
 * BordersGroup.tsx
 * 
 * Border formatting group for Home ribbon tab
 * Provides border presets, line styles, colors, and draw/erase modes
 * 
 * Microinteractions:
 * - Border grid preview highlights on hover
 * - Draw mode cursor changes to pencil
 * - Border drawing animation (stroke-dashoffset)
 * - Erase mode fades out borders
 * 
 * Phase 3: Excel 365-Level Border Controls
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Address, Range } from '@cyber-sheet/core';
import type { FormattingController } from '@cyber-sheet/core';
import type { SelectionStyleSummary } from '@cyber-sheet/core';

export interface BordersGroupProps {
  formattingController: FormattingController;
  selectedCells: Address[];
  selectionStyle: SelectionStyleSummary;
  currentRange?: Range;
  onStyleChange?: () => void;
  onDrawModeChange?: (active: boolean, mode: 'draw' | 'erase' | null) => void;
}

/**
 * Border edge definition
 */
interface BorderDefinition {
  edge: 'top' | 'bottom' | 'left' | 'right' | 'all' | 'outer' | 'inner' | 'insideHorizontal' | 'insideVertical';
  style: string;
  color: string;
}

/**
 * Border preset definition with visual icon
 */
interface BorderPreset {
  id: string;
  label: string;
  borders: BorderDefinition[];
}

/**
 * Line style definition
 */
interface LineStyle {
  id: string;
  label: string;
  preview: string; // Unicode representation
  cssValue: string;
}

/**
 * Border presets matching Excel's border dropdown
 */
const BORDER_PRESETS: BorderPreset[] = [
  {
    id: 'bottom',
    label: 'Bottom Border',
    borders: [{ edge: 'bottom', style: 'thin', color: '#000000' }]
  },
  {
    id: 'top',
    label: 'Top Border',
    borders: [{ edge: 'top', style: 'thin', color: '#000000' }]
  },
  {
    id: 'left',
    label: 'Left Border',
    borders: [{ edge: 'left', style: 'thin', color: '#000000' }]
  },
  {
    id: 'right',
    label: 'Right Border',
    borders: [{ edge: 'right', style: 'thin', color: '#000000' }]
  },
  {
    id: 'none',
    label: 'No Border',
    borders: []
  },
  {
    id: 'all',
    label: 'All Borders',
    borders: [
      { edge: 'top', style: 'thin', color: '#000000' },
      { edge: 'bottom', style: 'thin', color: '#000000' },
      { edge: 'left', style: 'thin', color: '#000000' },
      { edge: 'right', style: 'thin', color: '#000000' },
    ]
  },
  {
    id: 'outside',
    label: 'Outside Borders',
    borders: [
      { edge: 'top', style: 'thin', color: '#000000' },
      { edge: 'bottom', style: 'thin', color: '#000000' },
      { edge: 'left', style: 'thin', color: '#000000' },
      { edge: 'right', style: 'thin', color: '#000000' }
    ]
  },
  {
    id: 'inside',
    label: 'Inside Borders',
    borders: [
      { edge: 'insideHorizontal', style: 'thin', color: '#000000' },
      { edge: 'insideVertical', style: 'thin', color: '#000000' }
    ]
  },
  {
    id: 'thickOutside',
    label: 'Thick Box Border',
    borders: [
      { edge: 'top', style: 'thick', color: '#000000' },
      { edge: 'bottom', style: 'thick', color: '#000000' },
      { edge: 'left', style: 'thick', color: '#000000' },
      { edge: 'right', style: 'thick', color: '#000000' }
    ]
  },
  {
    id: 'topBottom',
    label: 'Top and Bottom Border',
    borders: [
      { edge: 'top', style: 'thin', color: '#000000' },
      { edge: 'bottom', style: 'thin', color: '#000000' }
    ]
  },
  {
    id: 'topThickBottom',
    label: 'Top and Thick Bottom Border',
    borders: [
      { edge: 'top', style: 'thin', color: '#000000' },
      { edge: 'bottom', style: 'thick', color: '#000000' }
    ]
  },
  {
    id: 'topDoubleBottom',
    label: 'Top and Double Bottom Border',
    borders: [
      { edge: 'top', style: 'thin', color: '#000000' },
      { edge: 'bottom', style: 'double', color: '#000000' }
    ]
  }
];

/**
 * Line styles matching Excel
 */
const LINE_STYLES: LineStyle[] = [
  { id: 'thin', label: 'Thin', preview: '──────', cssValue: '1px solid' },
  { id: 'hair', label: 'Hairline', preview: '──────', cssValue: '0.5px solid' },
  { id: 'dotted', label: 'Dotted', preview: '┄┄┄┄┄┄', cssValue: '1px dotted' },
  { id: 'dashed', label: 'Dashed', preview: '┅┅┅┅┅┅', cssValue: '1px dashed' },
  { id: 'dashDot', label: 'Dash Dot', preview: '┆┅┆┅┆┅', cssValue: '1px dashed' },
  { id: 'medium', label: 'Medium', preview: '━━━━━━', cssValue: '2px solid' },
  { id: 'thick', label: 'Thick', preview: '━━━━━━', cssValue: '3px solid' },
  { id: 'double', label: 'Double', preview: '══════', cssValue: '3px double' },
];

/**
 * Standard border colors (20 colors matching FontGroup)
 */
const BORDER_COLORS = [
  // Row 1: Theme colors
  '#000000', '#FFFFFF', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47',
  
  // Row 2: Standard colors
  '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'
];

export const BordersGroup: React.FC<BordersGroupProps> = ({
  formattingController,
  selectedCells,
  selectionStyle,
  currentRange,
  onStyleChange,
  onDrawModeChange,
}) => {
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showLineStyleMenu, setShowLineStyleMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentLineStyle, setCurrentLineStyle] = useState<string>('thin');
  const [currentBorderColor, setCurrentBorderColor] = useState<string>('#000000');
  const [drawMode, setDrawMode] = useState<'draw' | 'erase' | null>(null);
  
  const borderMenuRef = useRef(null);
  const lineStyleMenuRef = useRef(null);
  const colorPickerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (borderMenuRef.current && !(borderMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowBorderMenu(false);
      }
      if (lineStyleMenuRef.current && !(lineStyleMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowLineStyleMenu(false);
      }
      if (colorPickerRef.current && !(colorPickerRef.current as HTMLElement).contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle border preset selection
  const handleBorderPreset = (preset: BorderPreset) => {
    if (preset.borders.length === 0) {
      // No border - remove all borders
      formattingController.removeBorders(selectedCells);
    } else {
      // Apply borders
      for (const border of preset.borders) {
        applySingleBorder(border);
      }
    }
    
    setShowBorderMenu(false);
    onStyleChange?.();
  };

  const applySingleBorder = (border: BorderDefinition) => {
    const color = border.color || currentBorderColor;
    
    switch (border.edge) {
      case 'all':
        formattingController.setAllBorders(selectedCells, color);
        break;
      case 'outer':
        if (currentRange) {
          formattingController.setOuterBorder(selectedCells, currentRange, color);
        }
        break;
      case 'insideHorizontal':
      case 'insideVertical':
        // Inside borders need special handling - not yet implemented in controller
        break;
      case 'top':
      case 'bottom':
      case 'left':
      case 'right':
        // Use setBorder for specific edges
        const borderObj: any = {};
        if (border.edge === 'top') borderObj.top = color;
        else if (border.edge === 'bottom') borderObj.bottom = color;
        else if (border.edge === 'left') borderObj.left = color;
        else if (border.edge === 'right') borderObj.right = color;
        
        if (Object.keys(borderObj).length > 0) {
          formattingController.setBorder(selectedCells, borderObj);
        }
        break;
    }
  };

  const handleLineStyleSelect = (styleId: string) => {
    setCurrentLineStyle(styleId);
    setShowLineStyleMenu(false);
  };

  const handleColorSelect = (color: string) => {
    setCurrentBorderColor(color);
    setShowColorPicker(false);
  };

  const handleDrawMode = () => {
    const newMode = drawMode === 'draw' ? null : 'draw';
    setDrawMode(newMode);
    onDrawModeChange?.(newMode !== null, newMode);
  };

  const handleEraseMode = () => {
    const newMode = drawMode === 'erase' ? null : 'erase';
    setDrawMode(newMode);
    onDrawModeChange?.(newMode !== null, newMode);
  };

  // Get current line style object
  const currentLineStyleObj = LINE_STYLES.find(s => s.id === currentLineStyle) || LINE_STYLES[0];

  // Border preset icon component
  const BorderPresetIcon: React.FC<{ preset: BorderPreset }> = ({ preset }) => {
    const size = 24;
    const hasBorder = (edge: string) => preset.borders.some(b => 
      b.edge === edge || b.edge === 'all' || 
      (b.edge === 'outer' && ['top', 'bottom', 'left', 'right'].includes(edge))
    );

    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
        <rect x="4" y="4" width="16" height="16" fill="none" 
          stroke={hasBorder('top') || hasBorder('bottom') || hasBorder('left') || hasBorder('right') ? '#ccc' : 'none'} 
          strokeWidth="0.5" />
        
        {/* Top border */}
        {hasBorder('top') && (
          <line x1="4" y1="4" x2="20" y2="4" stroke="#000" 
            strokeWidth={preset.borders.find(b => b.edge === 'top' || b.edge === 'all')?.style === 'thick' ? 2 : 1} />
        )}
        
        {/* Bottom border */}
        {hasBorder('bottom') && (
          <line x1="4" y1="20" x2="20" y2="20" stroke="#000" 
            strokeWidth={preset.borders.find(b => b.edge === 'bottom' || b.edge === 'all')?.style === 'thick' ? 2 : 1} />
        )}
        
        {/* Left border */}
        {hasBorder('left') && (
          <line x1="4" y1="4" x2="4" y2="20" stroke="#000" 
            strokeWidth={preset.borders.find(b => b.edge === 'left' || b.edge === 'all')?.style === 'thick' ? 2 : 1} />
        )}
        
        {/* Right border */}
        {hasBorder('right') && (
          <line x1="20" y1="4" x2="20" y2="20" stroke="#000" 
            strokeWidth={preset.borders.find(b => b.edge === 'right' || b.edge === 'all')?.style === 'thick' ? 2 : 1} />
        )}
        
        {/* Inside horizontal */}
        {preset.borders.some(b => b.edge === 'insideHorizontal') && (
          <line x1="4" y1="12" x2="20" y2="12" stroke="#000" strokeWidth="1" />
        )}
        
        {/* Inside vertical */}
        {preset.borders.some(b => b.edge === 'insideVertical') && (
          <line x1="12" y1="4" x2="12" y2="20" stroke="#000" strokeWidth="1" />
        )}
      </svg>
    );
  };

  // Common styles
  const buttonStyles: React.CSSProperties = {
    border: '1px solid #d0d0d0',
    background: '#fff',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '13px',
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

  const dropdownButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    minWidth: '100px',
    justifyContent: 'space-between',
    paddingRight: '8px',
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
    zIndex: 1000,
    minWidth: '220px',
    maxHeight: '400px',
    overflowY: 'auto',
    animation: 'slideDown 200ms ease-out',
  };

  const menuItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 150ms ease',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '8px',
      borderRight: '1px solid #d0d0d0',
    }}>
      {/* Row 1: Border Dropdown, Line Style, Color Picker */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Borders Dropdown */}
        <div style={{ position: 'relative' }} ref={borderMenuRef}>
          <button
            style={dropdownButtonStyles}
            onClick={() => setShowBorderMenu(!showBorderMenu)}
            title="Borders"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
          </button>

          {showBorderMenu && (
            <div style={dropdownStyles}>
              {BORDER_PRESETS.map((preset, index) => (
                <div
                  key={preset.id}
                  style={{
                    ...menuItemStyles,
                    borderBottom: index === BORDER_PRESETS.length - 1 ? 'none' : '1px solid #f0f0f0',
                  }}
                  onClick={() => handleBorderPreset(preset)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#fff';
                  }}
                >
                  <BorderPresetIcon preset={preset} />
                  <span>{preset.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Line Style Dropdown */}
        <div style={{ position: 'relative' }} ref={lineStyleMenuRef}>
          <button
            style={dropdownButtonStyles}
            onClick={() => setShowLineStyleMenu(!showLineStyleMenu)}
            title="Line Style"
          >
            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              {currentLineStyleObj.preview.substring(0, 6)}
            </span>
            <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
          </button>

          {showLineStyleMenu && (
            <div style={dropdownStyles}>
              {LINE_STYLES.map((style, index) => (
                <div
                  key={style.id}
                  style={{
                    ...menuItemStyles,
                    background: style.id === currentLineStyle ? '#e3f2fd' : '#fff',
                    fontWeight: style.id === currentLineStyle ? 600 : 400,
                    borderBottom: index === LINE_STYLES.length - 1 ? 'none' : '1px solid #f0f0f0',
                  }}
                  onClick={() => handleLineStyleSelect(style.id)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (style.id !== currentLineStyle) {
                      (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (style.id !== currentLineStyle) {
                      (e.target as HTMLElement).style.backgroundColor = '#fff';
                    }
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', marginRight: '12px' }}>
                    {style.preview}
                  </span>
                  <span>{style.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Border Color Picker */}
        <div style={{ position: 'relative' }} ref={colorPickerRef}>
          <button
            style={buttonStyles}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Border Color"
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="2" y="2" width="12" height="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="2" y="13" width="12" height="2" fill={currentBorderColor} />
            </svg>
          </button>

          {showColorPicker && (
            <div style={{
              ...dropdownStyles,
              padding: '8px',
              minWidth: '200px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: '4px',
              }}>
                {BORDER_COLORS.map(color => (
                  <div
                    key={color}
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: color,
                      border: color === currentBorderColor ? '2px solid #2196f3' : '1px solid #ccc',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      transition: 'transform 150ms ease',
                    }}
                    onClick={() => handleColorSelect(color)}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Draw/Erase Border Modes */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          style={drawMode === 'draw' ? activeButtonStyles : buttonStyles}
          onClick={handleDrawMode}
          title="Draw Border"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (drawMode !== 'draw') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (drawMode !== 'draw') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 2l-12 12M13 1 l-1 1 1 1 1-1-1-1z"/>
            <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span style={{ marginLeft: '4px', fontSize: '11px' }}>Draw</span>
        </button>

        <button
          style={drawMode === 'erase' ? activeButtonStyles : buttonStyles}
          onClick={handleEraseMode}
          title="Erase Border"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (drawMode !== 'erase') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (drawMode !== 'erase') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12 2L4 10l-2 4 4-2L14 4z M10 4l2 2"/>
          </svg>
          <span style={{ marginLeft: '4px', fontSize: '11px' }}>Erase</span>
        </button>
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
        `}
      </style>
    </div>
  );
};
