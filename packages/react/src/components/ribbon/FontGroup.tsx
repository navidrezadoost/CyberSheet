/**
 * FontGroup.tsx
 * 
 * Font formatting group for Home ribbon tab
 * Provides font family, size, bold, italic, underline, colors
 * 
 * Microinteractions:
 * - Live preview on dropdown hover
 * - Button highlight on keyboard shortcut
 * - Color picker droplet animation
 * - Font size increment animation
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Address } from '@cyber-sheet/core';
import type { FormattingController } from '@cyber-sheet/core';
import type { SelectionStyleSummary } from '@cyber-sheet/core';

export interface FontGroupProps {
  formattingController: FormattingController;
  selectedCells: Address[];
  selectionStyle: SelectionStyleSummary;
  onStyleChange?: () => void;
  onOpenFormatDialog?: (tab: 'font') => void;
}

export const FontGroup: React.FC<FontGroupProps> = ({
  formattingController,
  selectedCells,
  selectionStyle,
  onStyleChange,
  onOpenFormatDialog,
}) => {
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);
  
  const fontPickerRef = useRef(null);
  const sizePickerRef = useRef(null);
  const colorPickerRef = useRef(null);
  const fillPickerRef = useRef(null);

  // Common font families
  const fontFamilies = [
    'Arial',
    'Calibri',
    'Cambria',
    'Comic Sans MS',
    'Consolas',
    'Courier New',
    'Georgia',
    'Helvetica',
    'Impact',
    'Lucida Console',
    'Segoe UI',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
  ];

  // Common font sizes
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

  // Color palette
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#800000', '#008000',
    '#000080', '#808000', '#800080', '#008080', '#C0C0C0',
    '#808080', '#FFA500', '#FFD700', '#90EE90', '#87CEEB',
  ];

  // Current values from selection
  const currentFontFamily = selectionStyle.fontFamily?.value || 'Calibri';
  const currentFontSize = selectionStyle.fontSize?.value || 11;
  const isBold = selectionStyle.bold?.value || false;
  const isItalic = selectionStyle.italic?.value || false;
  const isUnderline = selectionStyle.underline?.value || false;
  const isStrikethrough = selectionStyle.strikethrough?.value || false;
  const currentColor = selectionStyle.color?.value || '#000000';
  const currentFill = selectionStyle.fill?.value || 'transparent';

  // === Font Handlers ===

  const handleFontChange = (fontFamily: string) => {
    formattingController.setFontFamily(selectedCells, fontFamily);
    setShowFontPicker(false);
    onStyleChange?.();
  };

  const handleSizeChange = (fontSize: number) => {
    formattingController.setFontSize(selectedCells, fontSize);
    setShowSizePicker(false);
    onStyleChange?.();
    
    // Brief bounce animation on cell
    document.body.classList.add('font-size-change');
    setTimeout(() => document.body.classList.remove('font-size-change'), 300);
  };

  const handleBoldToggle = () => {
    formattingController.toggleBold(selectedCells);
    onStyleChange?.();
    
    // Highlight button briefly
    document.body.classList.add('format-button-highlight');
    setTimeout(() => document.body.classList.remove('format-button-highlight'), 200);
  };

  const handleItalicToggle = () => {
    formattingController.toggleItalic(selectedCells);
    onStyleChange?.();
  };

  const handleUnderlineToggle = () => {
    formattingController.toggleUnderline(selectedCells);
    onStyleChange?.();
  };

  const handleStrikethroughToggle = () => {
    formattingController.toggleStrikethrough(selectedCells);
    onStyleChange?.();
  };

  const handleColorChange = (color: string) => {
    formattingController.setFontColor(selectedCells, color);
    setShowColorPicker(false);
    onStyleChange?.();
  };

  const handleFillChange = (fill: string) => {
    formattingController.setFill(selectedCells, fill);
    setShowFillPicker(false);
    onStyleChange?.();
    
    // Droplet animation
    document.body.classList.add('fill-droplet');
    setTimeout(() => document.body.classList.remove('fill-droplet'), 400);
  };

  const handleIncreaseFontSize = () => {
    const currentIdx = fontSizes.findIndex(s => s >= currentFontSize);
    const nextSize = currentIdx < fontSizes.length - 1 ? fontSizes[currentIdx + 1] : fontSizes[fontSizes.length - 1];
    handleSizeChange(nextSize);
  };

  const handleDecreaseFontSize = () => {
    const currentIdx = fontSizes.findIndex(s => s >= currentFontSize);
    const prevSize = currentIdx > 0 ? fontSizes[currentIdx - 1] : fontSizes[0];
    handleSizeChange(prevSize);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setShowFontPicker(false);
      }
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) {
        setShowSizePicker(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (fillPickerRef.current && !fillPickerRef.current.contains(e.target as Node)) {
        setShowFillPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // === Styles ===

  const groupStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px 8px',
    borderRight: '1px solid #d0d0d0',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '11px',
    color: '#444',
    textAlign: 'center',
    marginTop: '2px',
  };

  const rowStyles: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  };

  const selectStyles: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    backgroundColor: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    minWidth: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  };

  const activeButtonStyles: React.CSSProperties = {
    ...buttonStyles,
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    color: '#1976d2',
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '2px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
    animation: 'slideDown 0.2s ease',
  };

  const dropdownItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
  };

  const colorPickerStyles: React.CSSProperties = {
    ...dropdownStyles,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '4px',
    padding: '8px',
    minWidth: '180px',
  };

  const colorSwatchStyles: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'transform 0.15s, border-color 0.15s',
  };

  return (
    <div style={groupStyles}>
      <div style={{ ...labelStyles, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Font</span>
        {onOpenFormatDialog && (
          <button
            onClick={() => onOpenFormatDialog('font')}
            style={{
              width: '16px',
              height: '16px',
              padding: '0',
              border: 'none',
              background: 'none',
              fontSize: '10px',
              cursor: 'pointer',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Font Settings"
            aria-label="Font Settings"
          >
            ↘
          </button>
        )}
      </div>
      
      {/* Row 1: Font Family and Size */}
      <div style={rowStyles}>
        {/* Font Family Dropdown */}
        <div style={{ position: 'relative' }} ref={fontPickerRef}>
          <button
            style={{ ...selectStyles, minWidth: '120px', textAlign: 'left' }}
            onClick={() => setShowFontPicker(!showFontPicker)}
          >
            {currentFontFamily} <span style={{ float: 'right' }}>▼</span>
          </button>
          
          {showFontPicker && (
            <div style={dropdownStyles}>
              {fontFamilies.map((font) => (
                <div
                  key={font}
                  style={{
                    ...dropdownItemStyles,
                    fontFamily: font,
                    fontWeight: font === currentFontFamily ? 600 : 400,
                    backgroundColor: font === currentFontFamily ? '#f5f5f5' : 'transparent',
                  }}
                  onClick={() => handleFontChange(font)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (font !== currentFontFamily) {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {font}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Font Size Dropdown */}
        <div style={{ position: 'relative' }} ref={sizePickerRef}>
          <button
            style={{ ...selectStyles, minWidth: '60px', textAlign: 'center' }}
            onClick={() => setShowSizePicker(!showSizePicker)}
          >
            {currentFontSize} <span>▼</span>
          </button>
          
          {showSizePicker && (
            <div style={dropdownStyles}>
              {fontSizes.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyles,
                    fontWeight: size === currentFontSize ? 600 : 400,
                    backgroundColor: size === currentFontSize ? '#f5f5f5' : 'transparent',
                  }}
                  onClick={() => handleSizeChange(size)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    if (size !== currentFontSize) {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Increase/Decrease Size */}
        <button
          style={buttonStyles}
          onClick={handleIncreaseFontSize}
          title="Increase Font Size"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          ▲
        </button>
        <button
          style={buttonStyles}
          onClick={handleDecreaseFontSize}
          title="Decrease Font Size"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          ▼
        </button>
      </div>

      {/* Row 2: Format Buttons */}
      <div style={rowStyles}>
        <button
          style={isBold ? activeButtonStyles : buttonStyles}
          onClick={handleBoldToggle}
          title="Bold (Ctrl+B)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isBold) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isBold) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <strong>B</strong>
        </button>
        
        <button
          style={isItalic ? activeButtonStyles : buttonStyles}
          onClick={handleItalicToggle}
          title="Italic (Ctrl+I)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isItalic) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isItalic) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <em>I</em>
        </button>
        
        <button
          style={isUnderline ? activeButtonStyles : buttonStyles}
          onClick={handleUnderlineToggle}
          title="Underline (Ctrl+U)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isUnderline) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isUnderline) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <u>U</u>
        </button>
        
        <button
          style={isStrikethrough ? activeButtonStyles : buttonStyles}
          onClick={handleStrikethroughToggle}
          title="Strikethrough"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isStrikethrough) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (!isStrikethrough) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <s>S</s>
        </button>

        {/* Font Color Picker */}
        <div style={{ position: 'relative' }} ref={colorPickerRef}>
          <button
            style={buttonStyles}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Font Color"
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }}
          >
            <span style={{ color: currentColor }}>A</span>
          </button>
          
          {showColorPicker && (
            <div style={colorPickerStyles}>
              {colors.map((color) => (
                <div
                  key={color}
                  style={{
                    ...colorSwatchStyles,
                    backgroundColor: color,
                    borderColor: color === currentColor ? '#2196f3' : 'transparent',
                  }}
                  onClick={() => handleColorChange(color)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.transform = 'scale(1)';
                  }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Fill Color Picker */}
        <div style={{ position: 'relative' }} ref={fillPickerRef}>
          <button
            style={buttonStyles}
            onClick={() => setShowFillPicker(!showFillPicker)}
            title="Fill Color"
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }}
          >
            🪣
          </button>
          
          {showFillPicker && (
            <div style={colorPickerStyles}>
              {colors.map((color) => (
                <div
                  key={color}
                  style={{
                    ...colorSwatchStyles,
                    backgroundColor: color,
                    borderColor: color === currentFill ? '#2196f3' : 'transparent',
                  }}
                  onClick={() => handleFillChange(color)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    (e.target as HTMLElement).style.transform = 'scale(1)';
                  }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FontGroup;
