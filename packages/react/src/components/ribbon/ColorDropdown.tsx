import React, { useEffect, useRef } from 'react';
import { ColorGrid } from './ColorGrid';
import { THEME_COLORS, STANDARD_COLORS, AUTOMATIC_COLOR } from './colors';
import './ribbon.css';

export interface ColorDropdownProps {
  /**
   * Called when user selects a color
   */
  onSelect: (color: string) => void;
  
  /**
   * Recent colors array (from useRecentColors hook)
   */
  recentColors: string[];
  
  /**
   * Currently selected color
   */
  selectedColor?: string;
  
  /**
   * Called when dropdown should close
   */
  onClose: () => void;
  
  /**
   * Show "Automatic" option (for font color)
   * Default: true
   */
  showAutomatic?: boolean;
  
  /**
   * Show "No Fill" option (for fill color)
   * Default: false
   */
  showNoFill?: boolean;
}

/**
 * ColorDropdown - Complete color picker dropdown
 * 
 * Excel-like dropdown with:
 * - Automatic/No Fill option
 * - Theme Colors (10 columns × 6 tints)
 * - Standard Colors (10 colors)
 * - Recent Colors (last 10 used)
 * - "More Colors..." button (future: opens color dialog)
 * 
 * Behavior:
 * - Click outside → closes
 * - ESC key → closes
 * - Click color → applies and closes
 * - Keyboard navigation (future enhancement)
 * 
 * @example
 * <ColorDropdown
 *   onSelect={(color) => applyColor(color)}
 *   recentColors={recentColors}
 *   selectedColor="#FF0000"
 *   onClose={() => setOpen(false)}
 * />
 */
export const ColorDropdown: React.FC<ColorDropdownProps> = ({
  onSelect,
  recentColors,
  selectedColor,
  onClose,
  showAutomatic = true,
  showNoFill = false,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Close on ESC key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSelect = (color: string) => {
    onSelect(color);
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="cs-color-dropdown"
      role="dialog"
      aria-label="Color picker"
    >
      {/* Automatic / No Fill */}
      {(showAutomatic || showNoFill) && (
        <div className="cs-section">
          <button
            className="cs-automatic-btn"
            onClick={() => handleSelect(showAutomatic ? AUTOMATIC_COLOR : 'transparent')}
          >
            <span
              className="cs-automatic-swatch"
              style={{
                backgroundColor: showAutomatic ? AUTOMATIC_COLOR : 'transparent',
                border: showNoFill ? '1px solid #d1d1d1' : undefined,
              }}
            />
            <span>{showAutomatic ? 'Automatic' : 'No Fill'}</span>
          </button>
        </div>
      )}

      {/* Theme Colors */}
      <div className="cs-section">
        <div className="cs-section-title">Theme Colors</div>
        <ColorGrid
          colors={THEME_COLORS}
          onSelect={handleSelect}
          selectedColor={selectedColor}
        />
      </div>

      {/* Standard Colors */}
      <div className="cs-section">
        <div className="cs-section-title">Standard Colors</div>
        <div className="cs-standard-row">
          {STANDARD_COLORS.map((color) => {
            const isSelected = color === selectedColor;
            return (
              <button
                key={color}
                className={`cs-color-cell ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleSelect(color)}
                aria-label={`Color ${color}`}
                title={color}
                type="button"
              />
            );
          })}
        </div>
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="cs-section">
          <div className="cs-section-title">Recent Colors</div>
          <div className="cs-standard-row">
            {recentColors.map((color, idx) => {
              const isSelected = color === selectedColor;
              return (
                <button
                  key={`${color}-${idx}`}
                  className={`cs-color-cell ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleSelect(color)}
                  aria-label={`Recent color ${color}`}
                  title={color}
                  type="button"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* More Colors */}
      <button
        className="cs-more-colors-btn"
        onClick={() => {
          // TODO: Open custom color dialog
          console.log('More Colors dialog not implemented yet');
        }}
      >
        More Colors...
      </button>
    </div>
  );
};
