import React, { useEffect, useRef, useState } from 'react';
import { ColorPicker } from './ColorPicker';

interface MiniToolbarProps {
  x: number;
  y: number;
  onClose: () => void;
  onFontChange?: (font: string) => void;
  onFontSizeChange?: (size: number) => void;
  onBoldToggle?: () => void;
  onItalicToggle?: () => void;
  onUnderlineToggle?: () => void;
  onFillColor?: (color: string) => void;
  onFontColor?: (color: string) => void;
  currentFont?: string;
  currentFontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  recentFillColors?: string[];
  recentFontColors?: string[];
}

export const MiniToolbar: React.FC<MiniToolbarProps> = ({
  x,
  y,
  onClose,
  onFontChange,
  onFontSizeChange,
  onBoldToggle,
  onItalicToggle,
  onUnderlineToggle,
  onFillColor,
  onFontColor,
  currentFont = 'Segoe UI',
  currentFontSize = 11,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  recentFillColors = [],
  recentFontColors = [],
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fillColorButtonRef = useRef<HTMLButtonElement>(null);
  const fontColorButtonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x, y: y - 34 }); // 8px above + 26px toolbar height
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);

  // Adjust position to keep toolbar on screen
  useEffect(() => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      let adjustedX = x - rect.width / 2; // Center on cursor
      const adjustedY = y - 34;

      // Keep within viewport
      if (adjustedX < 4) adjustedX = 4;
      if (adjustedX + rect.width > viewportWidth - 4) {
        adjustedX = viewportWidth - rect.width - 4;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Don't close immediately - user might be clicking context menu
        setTimeout(() => onClose(), 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const buttonStyle: React.CSSProperties = {
    height: '24px',
    minWidth: '24px',
    padding: '0 6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#333',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#D3E3FD',
    borderRadius: '2px',
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    backgroundColor: '#D9D9D9',
    margin: '0 2px',
  };

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        height: '26px',
        backgroundColor: '#F0F0F0',
        border: '1px solid #CCCCCC',
        borderTop: '1px solid #FFFFFF',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        gap: '2px',
        zIndex: 10001,
        fontFamily: 'Segoe UI, Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Font Dropdown */}
      <select
        value={currentFont}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onFontChange?.(e.target.value)}
        style={{
          height: '22px',
          padding: '0 4px',
          border: '1px solid #AAA',
          borderRadius: '2px',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '11px',
          backgroundColor: 'white',
          cursor: 'pointer',
        }}
      >
        <option value="Segoe UI">Segoe UI</option>
        <option value="Arial">Arial</option>
        <option value="Calibri">Calibri</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
      </select>

      <div style={dividerStyle} />

      {/* Font Size */}
      <input
        type="number"
        value={currentFontSize}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFontSizeChange?.(parseInt(e.target.value, 10))}
        style={{
          width: '40px',
          height: '22px',
          padding: '0 4px',
          border: '1px solid #AAA',
          borderRadius: '2px',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '11px',
          backgroundColor: 'white',
        }}
      />

      {/* Increase Font Size */}
      <button
        onClick={() => onFontSizeChange?.(currentFontSize + 1)}
        style={buttonStyle}
        title="Increase Font Size"
      >
        A↑
      </button>

      {/* Decrease Font Size */}
      <button
        onClick={() => onFontSizeChange?.(Math.max(1, currentFontSize - 1))}
        style={buttonStyle}
        title="Decrease Font Size"
      >
        A↓
      </button>

      <div style={dividerStyle} />

      {/* Bold */}
      <button
        onClick={onBoldToggle}
        style={isBold ? activeButtonStyle : buttonStyle}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button
        onClick={onItalicToggle}
        style={isItalic ? activeButtonStyle : buttonStyle}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>

      {/* Underline */}
      <button
        onClick={onUnderlineToggle}
        style={isUnderline ? activeButtonStyle : buttonStyle}
        title="Underline (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <div style={dividerStyle} />

      {/* Fill Color */}
      <button
        ref={fillColorButtonRef}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setShowFillColorPicker(!showFillColorPicker);
          setShowFontColorPicker(false);
        }}
        style={buttonStyle}
        title="Fill Color"
      >
        🎨
      </button>

      {/* Font Color */}
      <button
        ref={fontColorButtonRef}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setShowFontColorPicker(!showFontColorPicker);
          setShowFillColorPicker(false);
        }}
        style={buttonStyle}
        title="Font Color"
      >
        <span style={{ color: '#000' }}>A</span>
      </button>

      {/* Fill Color Picker */}
      {showFillColorPicker && fillColorButtonRef.current && (
        <ColorPicker
          x={fillColorButtonRef.current.getBoundingClientRect().left}
          y={fillColorButtonRef.current.getBoundingClientRect().bottom + 4}
          onColorSelect={(color) => {
            onFillColor?.(color);
            setShowFillColorPicker(false);
          }}
          onClose={() => setShowFillColorPicker(false)}
          recentColors={recentFillColors}
        />
      )}

      {/* Font Color Picker */}
      {showFontColorPicker && fontColorButtonRef.current && (
        <ColorPicker
          x={fontColorButtonRef.current.getBoundingClientRect().left}
          y={fontColorButtonRef.current.getBoundingClientRect().bottom + 4}
          onColorSelect={(color) => {
            onFontColor?.(color);
            setShowFontColorPicker(false);
          }}
          onClose={() => setShowFontColorPicker(false)}
          recentColors={recentFontColors}
        />
      )}
    </div>
  );
};
