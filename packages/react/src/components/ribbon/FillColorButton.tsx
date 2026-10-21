import { FillColorButtonIcon1 } from '@cyber-sheet/icons/react';
import { RibbonAnchoredOverlay } from './RibbonAnchoredOverlay';
import React, { useState, useRef, useEffect } from 'react';
import { ColorGrid } from './ColorGrid';
import { PatternGrid } from './PatternGrid';
import { useRecentFills } from './hooks/useRecentFills';
import { THEME_COLORS, STANDARD_COLORS } from './colors';
import type { Fill, PatternType } from './fillTypes';
import { NO_FILL, solidFill, patternFill, isSolidFill } from './fillTypes';
import { resolveFill, isMixedFill } from './fillUtils';
import type { StyleState, FillColorCommand } from './types';
import './ribbon.css';

export interface FillColorButtonProps {
  /**
   * Command to execute when fill is selected
   */
  command: FillColorCommand;
  
  /**
   * Current selection's fill
   * - Fill object: single fill
   * - "mixed": multiple different fills in selection
   * - undefined: no fill set (uses NO_FILL)
   */
  selectionFill: StyleState<Fill>;
}

/**
 * FillColorButton - Split button for cell fill/background color
 * 
 * Same architecture as FontColorButton but works with Fill type (solid/pattern/gradient).
 * Reuses 80%+ of the color picker infrastructure while adding pattern/gradient support.
 * 
 * Split button with two parts:
 * 1. Main button (32×32px): Applies last used fill
 *    - Shows fill preview (solid/pattern/gradient rendering)
 *    - Mixed state: diagonal stripe pattern
 * 2. Dropdown button (16×16px): Opens fill picker
 * 
 * Behavior:
 * - Click main → apply effective fill
 * - Click dropdown → open palette (theme colors + patterns + gradients)
 * - Select fill → apply + add to recent + close dropdown
 * 
 * State Management:
 * - Effective fill: Last explicitly chosen fill (UI fallback only)
 * - Recent fills: Last 10 fills used (localStorage)
 * - Mixed indicator: Shows when selection contains multiple fills
 * 
 * Reuse from Font Color:
 * ✅ Split button pattern
 * ✅ ColorGrid component (for solid colors)
 * ✅ Dropdown management (outside-click, ESC)
 * ✅ Recent tracking pattern
 * ✅ Mixed state handling
 * ✅ Keyboard navigation foundation
 * 
 * New for Fill Color:
 * + PatternGrid component (18 pattern types)
 * + Gradient presets (future enhancement)
 * + Fill rendering in preview
 * 
 * @example
 * <FillColorButton
 *   command={{
 *     execute: (fill, selection) => applyFillColor(fill, selection)
 *   }}
 *   selectionFill={selection.fillColor}
 * />
 */
export const FillColorButton: React.FC<FillColorButtonProps> = ({
  command,
  selectionFill,
}) => {
  const { fills: recentFills, addFill } = useRecentFills();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Last explicitly chosen fill (UI state only, NOT source of truth)
  // Used as fallback when selection is mixed or undefined
  const [lastUsedFill, setLastUsedFill] = useState<Fill>(NO_FILL);

  // Section selection (theme colors or patterns)
  const [activeSection, setActiveSection] = useState<'color' | 'pattern'>('color');

  // Pattern color selection (for pattern fills)
  const [patternForeground, setPatternForeground] = useState('#000000');
  const [patternBackground, setPatternBackground] = useState('#FFFFFF');

  // Mixed state detection
  const isMixed = isMixedFill(selectionFill);
  
  // Effective fill resolution (selection is source of truth)
  // Rule: Selection state > Last used > NO_FILL
  const effectiveFill = resolveFill(selectionFill, lastUsedFill);

  /**
   * Apply fill through command pattern (range-aware)
   * 
   * CRITICAL: Command receives selection context for multi-cell operations
   */
  const applyFill = (fill: Fill) => {
    command.execute(fill, command as any);  // TODO: Pass real SelectionState from parent
    setLastUsedFill(fill);  // Update fallback only
    addFill(fill);
  };

  /**
   * Handle main button click (apply effective fill)
   * 
   * Excel behavior:
   * - Single selection → reapply current fill (idempotent)
   * - Mixed selection → apply last used fill (resolve ambiguity)
   */
  const handleMainClick = () => {
    applyFill(effectiveFill);
  };

  /**
   * Handle dropdown button click (toggle dropdown)
   */
  const handleDropdownClick = () => {
    setDropdownOpen((prev) => !prev);
  };

  /**
   * Handle solid color selection from color grid
   */
  const handleColorSelect = (color: string) => {
    const fill = solidFill(color);
    applyFill(fill);
    setDropdownOpen(false);
  };

  /**
   * Handle pattern selection from pattern grid
   */
  const handlePatternSelect = (pattern: PatternType) => {
    const fill = patternFill(patternForeground, patternBackground, pattern);
    applyFill(fill);
    setDropdownOpen(false);
  };

  /**
   * Handle NO FILL selection
   */
  const handleNoFill = () => {
    applyFill(NO_FILL);
    setDropdownOpen(false);
  };

  // Outside-click detection (hardened with composedPath)
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      const path = event.composedPath();
      const inPanel = panelRef.current && path.includes(panelRef.current);
      const inAnchor = anchorRef.current && path.includes(anchorRef.current);
      if (!inPanel && !inAnchor) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  /**
   * Render fill preview in button
   * 
   * Handles solid/pattern/gradient rendering
   */
  const renderFillPreview = (fill: Fill) => {
    if (isMixed) {
      // Mixed state: diagonal stripe pattern
      return (
        <div
          className="cs-fill-preview mixed"
          style={{
            width: '20px',
            height: '16px',
            background: 'repeating-linear-gradient(45deg, #999, #999 2px, #fff 2px, #fff 4px)',
          }}
        />
      );
    }

    if (fill.type === 'solid') {
      return (
        <div
          className="cs-fill-preview"
          style={{
            width: '20px',
            height: '16px',
            backgroundColor: fill.color,
            border: fill.color === 'transparent' ? '1px solid #d1d1d1' : undefined,
          }}
        />
      );
    }

    if (fill.type === 'pattern') {
      return (
        <div className="cs-fill-preview pattern" style={{ width: '20px', height: '16px' }}>
          <FillColorButtonIcon1 />
        </div>
      );
    }

    // Gradient (future)
    return <div className="cs-fill-preview" style={{ width: '20px', height: '16px' }} />;
  };

  return (
    <div className="cs-fill-color-split-button" ref={anchorRef}>
      {/* Main button - apply current fill */}
      <button
        className="cs-fill-color-main-btn"
        onClick={handleMainClick}
        aria-label={`Fill color ${isMixed ? 'mixed' : ''}`}
        title={`Fill Color\n${isMixed ? 'Mixed selection' : 'Current fill'}`}
        type="button"
      >
        {renderFillPreview(effectiveFill)}
      </button>

      {/* Dropdown toggle */}
      <button
        className="cs-fill-color-dropdown-btn"
        onClick={handleDropdownClick}
        aria-label="More fill colors"
        aria-expanded={dropdownOpen}
        title="Fill Color Options"
        type="button"
      >
        <span className="cs-dropdown-arrow">▼</span>
      </button>

      {/* Fill picker dropdown */}
      {dropdownOpen && (
        <RibbonAnchoredOverlay
          open={dropdownOpen}
          anchorRef={anchorRef}
          className="cs-fill-dropdown"
          style={{ minWidth: 220, padding: 8 }}
        >
        <div ref={panelRef} className="cs-fill-dropdown-inner">
          {/* Section tabs */}
          <div className="cs-section-tabs">
            <button
              className={activeSection === 'color' ? 'active' : ''}
              onClick={() => setActiveSection('color')}
            >
              Color
            </button>
            <button
              className={activeSection === 'pattern' ? 'active' : ''}
              onClick={() => setActiveSection('pattern')}
            >
              Pattern
            </button>
          </div>

          {/* No Fill option */}
          <div className="cs-section">
            <button className="cs-automatic-btn" onClick={handleNoFill}>
              <span className="cs-automatic-swatch" style={{ border: '1px solid #d1d1d1' }} />
              <span>No Fill</span>
            </button>
          </div>

          {/* Color section */}
          {activeSection === 'color' && (
            <>
              <div className="cs-section">
                <div className="cs-section-title">Theme Colors</div>
                <ColorGrid
                  colors={THEME_COLORS}
                  onSelect={handleColorSelect}
                  selectedColor={isSolidFill(effectiveFill) ? effectiveFill.color : undefined}
                />
              </div>

              <div className="cs-section">
                <div className="cs-section-title">Standard Colors</div>
                <div className="cs-standard-row">
                  {STANDARD_COLORS.map((color) => (
                    <button
                      key={color}
                      className="cs-color-cell"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              {recentFills.length > 0 && (
                <div className="cs-section">
                  <div className="cs-section-title">Recent Fills</div>
                  <div className="cs-standard-row">
                    {recentFills.slice(0, 10).map((fill, idx) => (
                      <button
                        key={idx}
                        className="cs-color-cell"
                        style={{
                          backgroundColor: fill.type === 'solid' ? fill.color : '#CCCCCC',
                        }}
                        onClick={() => applyFill(fill)}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Pattern section */}
          {activeSection === 'pattern' && (
            <>
              <div className="cs-section">
                <div className="cs-section-title">Pattern Colors</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px' }}>Foreground:</label>
                  <input
                    type="color"
                    value={patternForeground}
                    onChange={(e) => setPatternForeground(e.target.value)}
                    style={{ width: '32px', height: '24px' }}
                  />
                  <label style={{ fontSize: '11px', marginLeft: '8px' }}>Background:</label>
                  <input
                    type="color"
                    value={patternBackground}
                    onChange={(e) => setPatternBackground(e.target.value)}
                    style={{ width: '32px', height: '24px' }}
                  />
                </div>
              </div>

              <div className="cs-section">
                <div className="cs-section-title">Pattern Type</div>
                <PatternGrid
                  selectedPattern={
                    effectiveFill.type === 'pattern' ? effectiveFill.pattern : undefined
                  }
                  foregroundColor={patternForeground}
                  backgroundColor={patternBackground}
                  onSelect={handlePatternSelect}
                />
              </div>
            </>
          )}

          <button className="cs-more-colors-btn" onClick={() => console.log('More options...')}>
            More Fill Options...
          </button>
        </div>
        </RibbonAnchoredOverlay>
      )}
    </div>
  );
};
