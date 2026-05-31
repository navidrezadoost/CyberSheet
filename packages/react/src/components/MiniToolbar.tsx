import React, { useEffect, useRef, useState } from 'react';
import { NumberFormatGroupIcon1, NumberFormatGroupIcon2 } from '@cyber-sheet/icons/react';
import { ColorPicker } from './ColorPicker';
import { RibbonSelect } from './ribbon/RibbonSelect';
import { useCyberSheetConfig } from '../config/CyberSheetConfigContext';

const QUICK_FORMATS = {
  comma: '#,##0',
} as const;

interface MiniToolbarProps {
  x: number;
  y: number;
  /** Top edge of the context menu — toolbar sits directly above it */
  menuTopY?: number;
  onClose: () => void;
  /** When true, parent closes toolbar together with context menu */
  persistWithContextMenu?: boolean;
  onFontChange?: (font: string) => void;
  onFontSizeChange?: (size: number) => void;
  onBoldToggle?: () => void;
  onItalicToggle?: () => void;
  onUnderlineToggle?: () => void;
  onFillColor?: (color: string) => void;
  onFontColor?: (color: string) => void;
  onCurrencyFormat?: () => void;
  onPercentFormat?: () => void;
  onCommaFormat?: () => void;
  onIncreaseDecimal?: () => void;
  onDecreaseDecimal?: () => void;
  currentFont?: string;
  currentFontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  currentFontColor?: string;
  currentFillColor?: string;
  numberFormatCategory?: 'general' | 'currency' | 'percentage' | 'number' | 'comma';
  recentFillColors?: string[];
  recentFontColors?: string[];
}

export const MiniToolbar: React.FC<MiniToolbarProps> = ({
  x,
  y,
  menuTopY,
  onClose,
  persistWithContextMenu = false,
  onFontChange,
  onFontSizeChange,
  onBoldToggle,
  onItalicToggle,
  onUnderlineToggle,
  onFillColor,
  onFontColor,
  onCurrencyFormat,
  onPercentFormat,
  onCommaFormat,
  onIncreaseDecimal,
  onDecreaseDecimal,
  currentFont,
  currentFontSize,
  isBold = false,
  isItalic = false,
  isUnderline = false,
  currentFontColor = '#000000',
  currentFillColor = '#FFFF00',
  numberFormatCategory = 'general',
  recentFillColors = [],
  recentFontColors = [],
}) => {
  const cyberSheetConfig = useCyberSheetConfig();
  const resolvedFont = currentFont ?? cyberSheetConfig.fonts.defaultFamily;
  const resolvedFontSize = currentFontSize ?? cyberSheetConfig.fonts.defaultSize;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fillColorButtonRef = useRef<HTMLButtonElement>(null);
  const fontColorButtonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x, y: y - 70 });
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);

  useEffect(() => {
    if (!toolbarRef.current) return;

    const rect = toolbarRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 6;
    const anchorTop = menuTopY ?? y;

    let adjustedX = x;
    let adjustedY = anchorTop - rect.height - gap;

    if (adjustedX + rect.width > viewportWidth - 4) {
      adjustedX = viewportWidth - rect.width - 4;
    }
    if (adjustedX < 4) adjustedX = 4;
    if (adjustedY < 4) adjustedY = 4;
    if (adjustedY + rect.height > viewportHeight - 4) {
      adjustedY = viewportHeight - rect.height - 4;
    }

    setPosition({ x: adjustedX, y: adjustedY });
  }, [x, y, menuTopY]);

  useEffect(() => {
    if (persistWithContextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolbarRef.current?.contains(target)) return;
      if ((target as Element).closest?.('.excel-context-menu')) return;
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, persistWithContextMenu]);

  const buttonStyle: React.CSSProperties = {
    height: '22px',
    minWidth: '22px',
    padding: '0 5px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, Calibri, Arial, sans-serif',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#323130',
    borderRadius: '2px',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#CCE4F7',
  };

  const formatActiveStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#CCE4F7',
    fontWeight: 600,
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    backgroundColor: '#D1D1D1',
    margin: '0 3px',
    alignSelf: 'center',
  };

  const stopMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={toolbarRef}
      className="excel-mini-toolbar"
      onMouseDown={stopMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#F3F3F3',
        border: '1px solid #ABABAB',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        padding: '3px 4px',
        gap: '2px',
        zIndex: 10003,
        fontFamily: 'Segoe UI, Calibri, Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Row 1: Font formatting (Excel Mini Toolbar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        <RibbonSelect
          value={resolvedFont}
          options={cyberSheetConfig.fonts.families}
          onChange={(next) => onFontChange?.(next)}
          width={108}
          ariaLabel="Font"
        />

        <div style={dividerStyle} />

        <RibbonSelect
          value={resolvedFontSize}
          options={cyberSheetConfig.fonts.sizes}
          onChange={(next) => onFontSizeChange?.(parseInt(next, 10))}
          width={44}
          ariaLabel="Font size"
        />

        <button
          type="button"
          onClick={() => onFontSizeChange?.(resolvedFontSize + 1)}
          style={buttonStyle}
          title="Increase Font Size"
        >
          <span style={{ fontSize: '11px', lineHeight: 1 }}>
            A<sup style={{ fontSize: '8px' }}>▲</sup>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFontSizeChange?.(Math.max(1, resolvedFontSize - 1))}
          style={buttonStyle}
          title="Decrease Font Size"
        >
          <span style={{ fontSize: '11px', lineHeight: 1 }}>
            A<sup style={{ fontSize: '8px' }}>▼</sup>
          </span>
        </button>

        <div style={dividerStyle} />

        <button
          type="button"
          onClick={onBoldToggle}
          style={isBold ? activeButtonStyle : buttonStyle}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>

        <button
          type="button"
          onClick={onItalicToggle}
          style={isItalic ? activeButtonStyle : buttonStyle}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>

        <button
          type="button"
          onClick={onUnderlineToggle}
          style={isUnderline ? activeButtonStyle : buttonStyle}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>

        <div style={dividerStyle} />

        {/* Fill color — paint bucket with color bar */}
        <button
          ref={fillColorButtonRef}
          type="button"
          onClick={() => {
            setShowFillColorPicker(!showFillColorPicker);
            setShowFontColorPicker(false);
          }}
          style={{ ...buttonStyle, flexDirection: 'column', padding: '1px 4px', height: '24px' }}
          title="Fill Color"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M12.5 2.5l1 1-8.5 8.5-2-2L12.5 2.5zM3 11l1.5 1.5L2 15H0v-2l2.5-2.5z"
              fill="currentColor"
            />
          </svg>
          <span
            style={{
              display: 'block',
              width: '14px',
              height: '3px',
              backgroundColor: currentFillColor,
              border: '1px solid #888',
              marginTop: '1px',
            }}
          />
        </button>

        {/* Font color — A with underline bar */}
        <button
          ref={fontColorButtonRef}
          type="button"
          onClick={() => {
            setShowFontColorPicker(!showFontColorPicker);
            setShowFillColorPicker(false);
          }}
          style={{ ...buttonStyle, flexDirection: 'column', padding: '1px 4px', height: '24px' }}
          title="Font Color"
        >
          <span style={{ fontWeight: 700, fontSize: '13px', lineHeight: 1, color: '#323130' }}>A</span>
          <span
            style={{
              display: 'block',
              width: '14px',
              height: '3px',
              backgroundColor: currentFontColor,
              border: '1px solid #888',
              marginTop: '1px',
            }}
          />
        </button>
      </div>

      {/* Row 2: Number format quick controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        <button
          type="button"
          onClick={onCurrencyFormat}
          style={numberFormatCategory === 'currency' ? formatActiveStyle : buttonStyle}
          title="Accounting Number Format"
        >
          $
        </button>

        <button
          type="button"
          onClick={onPercentFormat}
          style={numberFormatCategory === 'percentage' ? formatActiveStyle : buttonStyle}
          title="Percent Style"
        >
          %
        </button>

        <button
          type="button"
          onClick={onCommaFormat}
          style={numberFormatCategory === 'comma' ? formatActiveStyle : buttonStyle}
          title="Comma Style"
        >
          ,
        </button>

        <div style={dividerStyle} />

        <button
          type="button"
          onClick={onIncreaseDecimal}
          style={buttonStyle}
          title="Increase Decimal"
        >
          <NumberFormatGroupIcon1 />
        </button>

        <button
          type="button"
          onClick={onDecreaseDecimal}
          style={buttonStyle}
          title="Decrease Decimal"
        >
          <NumberFormatGroupIcon2 />
        </button>
      </div>

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

export { QUICK_FORMATS };
