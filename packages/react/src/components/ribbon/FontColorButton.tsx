import React, { useState } from 'react';
import { ColorDropdown } from './ColorDropdown';
import { useRecentColors } from './hooks/useRecentColors';
import { AUTOMATIC_COLOR } from './colors';
import type { StyleState, ColorValue, FontColorCommand } from './types';
import './ribbon.css';

export interface FontColorButtonProps {
  /**
   * Command to execute when color is selected
   */
  command: FontColorCommand;
  
  /**
   * Current selection's font color
   * - string: single color
   * - "mixed": multiple different colors in selection
   * - undefined: no color set (uses automatic)
   */
  selectionColor: StyleState<ColorValue>;
}

/**
 * FontColorButton - Split button for font color
 * 
 * Excel-like split button with two parts:
 * 1. Main button (32×32px): Applies last used color
 *    - Shows "A" icon with color bar underneath
 *    - Color bar shows current/last color
 *    - Mixed state: diagonal stripe pattern
 * 2. Dropdown button (16×16px): Opens color picker
 * 
 * Behavior:
 * - Click main → apply current color
 * - Click dropdown → open palette
 * - Select color → apply + add to recent + close dropdown
 * 
 * State Management:
 * - Current color: Last explicitly chosen color (persists between selections)
 * - Recent colors: Last 10 colors used (localStorage)
 * - Mixed indicator: Shows when selection contains multiple colors
 * 
 * @example
 * <FontColorButton
 *   command={{
 *     execute: (color) => applyFontColor(color)
 *   }}
 *   selectionColor={selection.fontColor}
 * />
 */
export const FontColorButton: React.FC<FontColorButtonProps> = ({
  command,
  selectionColor,
}) => {
  const { colors: recentColors, addColor } = useRecentColors('font');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Last explicitly chosen color (persists across selections)
  const [currentColor, setCurrentColor] = useState<ColorValue>(AUTOMATIC_COLOR);

  // Mixed state detection
  const isMixed = selectionColor === 'mixed';
  
  // Display color (use selection color if single, otherwise current)
  const displayColor =
    selectionColor && selectionColor !== 'mixed' ? selectionColor : currentColor;

  /**
   * Apply color through command pattern
   */
  const applyColor = (color: ColorValue) => {
    command.execute(color);
    setCurrentColor(color);
    addColor(color);
  };

  /**
   * Handle main button click (apply current color)
   */
  const handleMainClick = () => {
    applyColor(currentColor);
  };

  /**
   * Handle dropdown button click (toggle dropdown)
   */
  const handleDropdownClick = () => {
    setDropdownOpen((prev) => !prev);
  };

  /**
   * Handle color selection from dropdown
   */
  const handleColorSelect = (color: ColorValue) => {
    applyColor(color);
    setDropdownOpen(false);
  };

  return (
    <div className="cs-font-color-split-button">
      {/* Main button - apply current color */}
      <button
        className="cs-font-color-main-btn"
        onClick={handleMainClick}
        aria-label={`Font color ${displayColor}`}
        title={`Font Color\nCurrent: ${displayColor}`}
        type="button"
      >
        {/* "A" icon */}
        <span className="cs-font-color-icon">A</span>

        {/* Color indicator bar */}
        <span
          className={`cs-font-color-bar ${isMixed ? 'mixed' : ''}`}
          style={{
            backgroundColor: isMixed ? undefined : displayColor,
          }}
        />
      </button>

      {/* Dropdown toggle */}
      <button
        className="cs-font-color-dropdown-btn"
        onClick={handleDropdownClick}
        aria-label="More font colors"
        aria-expanded={dropdownOpen}
        title="Font Color Options"
        type="button"
      >
        <span className="cs-dropdown-arrow">▼</span>
      </button>

      {/* Color picker dropdown */}
      {dropdownOpen && (
        <ColorDropdown
          onSelect={handleColorSelect}
          recentColors={recentColors}
          selectedColor={displayColor}
          onClose={() => setDropdownOpen(false)}
          showAutomatic={true}
          showNoFill={false}
        />
      )}
    </div>
  );
};
