import React, { useRef, useState } from 'react';
import { ColorDropdown } from './ColorDropdown';
import { useRecentColors } from './hooks/useRecentColors';
import { AUTOMATIC_COLOR } from './colors';
import { resolveColor, isMixedState } from './colorUtils';
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
  const anchorRef = useRef<HTMLDivElement>(null);
  
  // Last explicitly chosen color (UI state only, NOT source of truth)
  // Used as fallback when selection is mixed or undefined
  const [lastUsedColor, setLastUsedColor] = useState<ColorValue>(AUTOMATIC_COLOR);

  // Mixed state detection
  const isMixed = isMixedState(selectionColor);
  
  // Effective color resolution (selection is source of truth)
  // Rule: Selection state > Last used > Automatic
  const effectiveColor = resolveColor(selectionColor, lastUsedColor);

  /**
   * Apply color through command pattern (range-aware)
   * 
   * CRITICAL: Command receives selection context for multi-cell operations
   */
  const applyColor = (color: ColorValue) => {
    command.execute(color, command as any);  // TODO: Pass real SelectionState from parent
    setLastUsedColor(color);  // Update fallback only
    addColor(color);
  };

  /**
   * Handle main button click (apply effective color)
   * 
   * Excel behavior:
   * - Single selection → reapply current color (idempotent)
   * - Mixed selection → apply last used color (resolve ambiguity)
   */
  const handleMainClick = () => {
    applyColor(effectiveColor);
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
    <div ref={anchorRef} className="cs-font-color-split-button">
      {/* Main button - apply current color */}
      <button
        className="cs-font-color-main-btn"
        onClick={handleMainClick}
        aria-label={`Font color ${effectiveColor}`}
        title={`Font Color\n${isMixed ? 'Mixed selection' : 'Current: ' + effectiveColor}`}
        type="button"
      >
        {/* "A" icon */}
        <span className="cs-font-color-icon">A</span>

        {/* Color indicator bar */}
        <span
          className={`cs-font-color-bar ${isMixed ? 'mixed' : ''}`}
          style={{
            backgroundColor: isMixed ? undefined : effectiveColor,
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
          anchorRef={anchorRef}
          onSelect={handleColorSelect}
          recentColors={recentColors}
          selectedColor={isMixed ? undefined : selectionColor}  // Mixed: don't highlight anything
          onClose={() => setDropdownOpen(false)}
          showAutomatic={true}
          showNoFill={false}
        />
      )}
    </div>
  );
};
