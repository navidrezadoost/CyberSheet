/**
 * NumberFormatGroup.tsx
 * 
 * Number formatting group for Home ribbon tab
 * Provides number format presets, decimal controls, currency/percent/comma formatters
 * 
 * Microinteractions:
 * - Format dropdown highlights current format
 * - Percent style animates from decimal to percentage 
 * - Decimal buttons show +/- indicator briefly
 * - Currency symbol smoothly swaps on format change
 * 
 * Phase 2: Excel 365-Level Number Formatting
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Address } from '@cyber-sheet/core';
import type { FormattingController } from '@cyber-sheet/core';
import type { SelectionStyleSummary } from '@cyber-sheet/core';

export interface NumberFormatGroupProps {
  formattingController: FormattingController;
  selectedCells: Address[];
  selectionStyle: SelectionStyleSummary;
  onStyleChange?: () => void;
  onOpenFormatDialog?: (tab: 'number') => void;
}

/**
 * Number format categories with their display names and format strings
 */
const NUMBER_FORMAT_CATEGORIES = [
  { name: 'General', format: 'General', category: 'general' },
  { name: 'Number', format: '#,##0.00', category: 'number' },
  { name: 'Currency', format: '$#,##0.00', category: 'currency' },
  { name: 'Accounting', format: '$#,##0.00;($#,##0.00)', category: 'accounting' },
  { name: 'Short Date', format: 'M/D/YYYY', category: 'date' },
  { name: 'Long Date', format: 'MMMM D, YYYY', category: 'date' },
  { name: 'Time', format: 'h:mm:ss AM/PM', category: 'time' },
  { name: 'Percentage', format: '0.00%', category: 'percentage' },
  { name: 'Fraction', format: '# ?/?', category: 'fraction' },
  { name: 'Scientific', format: '0.00E+00', category: 'scientific' },
  { name: 'Text', format: '@', category: 'text' },
] as const;

/**
 * Common number format presets
 */
const QUICK_FORMATS = {
  general: 'General',
  number: '#,##0.00',
  currency: '$#,##0.00',
  accounting: '$#,##0.00;($#,##0.00)',
  percentage: '0.00%',
  comma: '#,##0',
  date: 'M/D/YYYY',
  time: 'h:mm:ss AM/PM',
  scientific: '0.00E+00',
  fraction: '# ?/?',
  text: '@',
} as const;

export const NumberFormatGroup: React.FC<NumberFormatGroupProps> = ({
  formattingController,
  selectedCells,
  selectionStyle,
  onStyleChange,
  onOpenFormatDialog,
}) => {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [decimalPulse, setDecimalPulse] = useState<'+' | '-' | null>(null);
  
  const formatMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formatMenuRef.current && !(formatMenuRef.current as HTMLElement).contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current number format
  const currentFormat = (selectionStyle as any).numberFormat?.value || 'General';
  const isFormatMixed = (selectionStyle as any).numberFormat?.isMixed;

  // Determine current category from format string
  const getCurrentCategory = (): string => {
    if (currentFormat === 'General') return 'general';
    if (currentFormat.includes('$')) return 'currency';
    if (currentFormat.includes('%')) return 'percentage';
    if (currentFormat.includes('?')) return 'fraction';
    if (currentFormat.includes('E+')) return 'scientific';
    if (currentFormat.includes('M') || currentFormat.includes('D') || currentFormat.includes('Y')) return 'date';
    if (currentFormat.includes('h:') || currentFormat.includes('AM/PM')) return 'time';
    if (currentFormat === '@') return 'text';
    return 'number';
  };

  const currentCategory = getCurrentCategory();

  // Format handlers
  const handleFormatSelect = (format: string) => {
    formattingController.setNumberFormat(selectedCells, format);
    setShowFormatMenu(false);
    onStyleChange?.();
  };

  const handleCurrencyFormat = () => {
    formattingController.applyNumberFormatPreset(selectedCells, 'currency');
    onStyleChange?.();
  };

  const handlePercentFormat = () => {
    formattingController.applyNumberFormatPreset(selectedCells, 'percentage');
    onStyleChange?.();
  };

  const handleCommaFormat = () => {
    formattingController.setNumberFormat(selectedCells, QUICK_FORMATS.comma);
    onStyleChange?.();
  };

  const handleIncreaseDecimal = () => {
    formattingController.increaseDecimalPlaces(selectedCells);
    setDecimalPulse('+');
    setTimeout(() => setDecimalPulse(null), 300);
    onStyleChange?.();
  };

  const handleDecreaseDecimal = () => {
    formattingController.decreaseDecimalPlaces(selectedCells);
    setDecimalPulse('-');
    setTimeout(() => setDecimalPulse(null), 300);
    onStyleChange?.();
  };

  // Get display name for current format
  const getFormatDisplayName = (): string => {
    const match = NUMBER_FORMAT_CATEGORIES.find(cat => cat.format === currentFormat);
    if (match) return match.name;
    
    // Custom format - show abbreviated version
    if (currentFormat.length > 20) {
      return currentFormat.substring(0, 17) + '...';
    }
    return currentFormat;
  };

  // Common button styles
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
    minWidth: '140px',
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
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 150ms ease',
  };

  const categoryHeaderStyles: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    background: '#f8f8f8',
    borderBottom: '1px solid #e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
          onClick={() => onOpenFormatDialog('number')}
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
          title="Number Format Settings"
          aria-label="Number Format Settings"
        >
          ↘
        </button>
      )}
      {/* Row 1: Format Dropdown */}
      <div style={{ position: 'relative' }} ref={formatMenuRef}>
        <button
          style={dropdownButtonStyles}
          onClick={() => setShowFormatMenu(!showFormatMenu)}
          title="Number Format"
        >
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isFormatMixed ? '#999' : '#333',
            fontStyle: isFormatMixed ? 'italic' : 'normal',
          }}>
            {isFormatMixed ? 'Mixed' : getFormatDisplayName()}
          </span>
          <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
        </button>

        {showFormatMenu && (
          <div style={dropdownStyles}>
            {NUMBER_FORMAT_CATEGORIES.map((category, index) => (
              <div
                key={category.name}
                style={{
                  ...menuItemStyles,
                  background: category.format === currentFormat ? '#e3f2fd' : '#fff',
                  fontWeight: category.format === currentFormat ? 600 : 400,
                  borderBottom: index === NUMBER_FORMAT_CATEGORIES.length - 1 ? 'none' : '1px solid #f0f0f0',
                }}
                onClick={() => handleFormatSelect(category.format)}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  if (category.format !== currentFormat) {
                    (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  if (category.format !== currentFormat) {
                    (e.target as HTMLElement).style.backgroundColor = '#fff';
                  }
                }}
              >
                <span>{category.name}</span>
                <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                  {category.format.length > 20 ? category.format.substring(0, 17) + '...' : category.format}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: Quick Format Buttons */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          style={currentCategory === 'currency' ? activeButtonStyles : buttonStyles}
          onClick={handleCurrencyFormat}
          title="Accounting Number Format ($)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (currentCategory !== 'currency') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (currentCategory !== 'currency') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600 }}>$</span>
        </button>

        <button
          style={currentCategory === 'percentage' ? activeButtonStyles : buttonStyles}
          onClick={handlePercentFormat}
          title="Percent Style (%)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (currentCategory !== 'percentage') {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (currentCategory !== 'percentage') {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600 }}>%</span>
        </button>

        <button
          style={currentFormat === QUICK_FORMATS.comma ? activeButtonStyles : buttonStyles}
          onClick={handleCommaFormat}
          title="Comma Style (,)"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (currentFormat !== QUICK_FORMATS.comma) {
              (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (currentFormat !== QUICK_FORMATS.comma) {
              (e.target as HTMLElement).style.backgroundColor = '#fff';
            }
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600 }}>,</span>
        </button>
      </div>

      {/* Row 3: Decimal Controls */}
      <div style={{ display: 'flex', gap: '2px', position: 'relative' }}>
        <button
          style={buttonStyles}
          onClick={handleIncreaseDecimal}
          title="Increase Decimal Places"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <circle cx="4" cy="14" r="1.5" />
            <text x="7" y="13" fontSize="12" fontWeight="600">0</text>
            <text x="12" y="11" fontSize="10" fontWeight="600" fill="#0066cc">+</text>
          </svg>
        </button>

        <button
          style={buttonStyles}
          onClick={handleDecreaseDecimal}
          title="Decrease Decimal Places"
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.target as HTMLElement).style.backgroundColor = '#fff';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <circle cx="4" cy="14" r="1.5" />
            <text x="7" y="13" fontSize="12" fontWeight="600">0</text>
            <text x="12" y="12" fontSize="10" fontWeight="600" fill="#cc0000">−</text>
          </svg>
        </button>

        {/* Decimal pulse indicator */}
        {decimalPulse && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '8px',
            fontSize: '18px',
            fontWeight: 600,
            color: decimalPulse === '+' ? '#0066cc' : '#cc0000',
            animation: 'decimalPulse 300ms ease-out',
            pointerEvents: 'none',
          }}>
            {decimalPulse}
          </div>
        )}
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
          
          @keyframes decimalPulse {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-12px) scale(1.5);
            }
          }
        `}
      </style>
    </div>
  );
};
