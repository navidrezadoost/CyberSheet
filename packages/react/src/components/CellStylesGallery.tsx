/**
 * CellStylesGallery.tsx
 * 
 * Excel 365-compatible Cell Styles Gallery component.
 * Displays preset cell styles in categorized grid layout with live preview.
 * 
 * Features:
 * - 40+ Excel-compatible presets across 5 categories
 * - Live visual preview of each style
 * - Keyboard navigation (Tab, Enter, Escape)
 * - Hover preview (optional)
 * - Search/filter capability
 * - Accessible with ARIA labels
 * 
 * Usage:
 * ```tsx
 * <CellStylesGallery
 *   onStyleSelect={(styleId) => applyStyle(styleId)}
 *   onClose={() => setShowGallery(false)}
 *   selectedCells={selectedCells}
 *   hoverPreview={true}
 * />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  CELL_STYLE_PRESETS,
  getCellStyleCategories,
  getCellStylesByCategory,
  type CellStyleCategory,
  type CellStylePreset,
} from '@cyber-sheet/core';

export interface CellStylesGalleryProps {
  /** Callback when style is selected */
  onStyleSelect: (styleId: string) => void;
  /** Callback when gallery should close */
  onClose: () => void;
  /** Optional: Show hover preview on selection */
  hoverPreview?: boolean;
  /** Optional: Filter by search term */
  searchTerm?: string;
  /** Optional: Custom width */
  width?: number | string;
  /** Optional: Custom height */
  maxHeight?: number | string;
}

/**
 * Cell Styles Gallery Component
 */
export function CellStylesGallery({
  onStyleSelect,
  onClose,
  hoverPreview = false,
  searchTerm = '',
  width = '420px',
  maxHeight = '500px',
}: CellStylesGalleryProps): JSX.Element {
  const [focusedStyleId, setFocusedStyleId] = useState<string | null>(null);
  const [hoveredStyleId, setHoveredStyleId] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const categories = getCellStyleCategories();

  // Filter styles by search term
  const filteredPresets = searchTerm
    ? CELL_STYLE_PRESETS.filter(
        (preset) =>
          preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          preset.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : CELL_STYLE_PRESETS;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && focusedStyleId) {
        onStyleSelect(focusedStyleId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedStyleId, onClose, onStyleSelect]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (galleryRef.current && !galleryRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleStyleClick = (styleId: string) => {
    onStyleSelect(styleId);
  };

  const handleMouseEnter = (styleId: string) => {
    setHoveredStyleId(styleId);
    if (hoverPreview) {
      // Optional: Trigger hover preview in parent
    }
  };

  const handleMouseLeave = () => {
    setHoveredStyleId(null);
  };

  return (
    <div
      ref={galleryRef}
      style={{
        width,
        maxHeight,
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d1d1',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        padding: '8px',
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
      }}
      role="menu"
      aria-label="Cell Styles Gallery"
    >
      {searchTerm && filteredPresets.length === 0 && (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: '#666',
          }}
        >
          No styles found for "{searchTerm}"
        </div>
      )}

      {!searchTerm &&
        categories.map((category) => {
          const categoryStyles = getCellStylesByCategory(category).filter((preset) =>
            filteredPresets.includes(preset)
          );

          if (categoryStyles.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: '12px' }}>
              {/* Category Header */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#333',
                  marginBottom: '6px',
                  paddingLeft: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {category}
              </div>

              {/* Style Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '6px',
                  marginBottom: '8px',
                }}
                role="group"
                aria-label={category}
              >
                {categoryStyles.map((preset) => (
                  <StyleTile
                    key={preset.id}
                    preset={preset}
                    isHovered={hoveredStyleId === preset.id}
                    isFocused={focusedStyleId === preset.id}
                    onClick={() => handleStyleClick(preset.id)}
                    onMouseEnter={() => handleMouseEnter(preset.id)}
                    onMouseLeave={handleMouseLeave}
                    onFocus={() => setFocusedStyleId(preset.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {searchTerm && filteredPresets.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '6px',
          }}
        >
          {filteredPresets.map((preset) => (
            <StyleTile
              key={preset.id}
              preset={preset}
              isHovered={hoveredStyleId === preset.id}
              isFocused={focusedStyleId === preset.id}
              onClick={() => handleStyleClick(preset.id)}
              onMouseEnter={() => handleMouseEnter(preset.id)}
              onMouseLeave={handleMouseLeave}
              onFocus={() => setFocusedStyleId(preset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Style Tile Component
 */
interface StyleTileProps {
  preset: CellStylePreset;
  isHovered: boolean;
  isFocused: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
}

function parseBorderSide(side: unknown): { width: string; color: string } | null {
  if (!side) return null;
  if (typeof side !== 'string') return null;
  if (side.includes('solid')) {
    const match = side.match(/([\d.]+px)\s+solid\s+(.+)/);
    if (match) return { width: match[1], color: match[2] };
  }
  return { width: '1px', color: side };
}

function tileBorderStyles(
  presetStyle: CellStylePreset['style'],
  isFocused: boolean,
): React.CSSProperties {
  const defaultColor = isFocused ? '#0078d4' : '#e1e1e1';
  const defaultWidth = isFocused ? '2px' : '1px';

  const top = parseBorderSide(presetStyle.border?.top);
  const bottom = parseBorderSide(presetStyle.border?.bottom);
  const left = parseBorderSide(presetStyle.border?.left);
  const right = parseBorderSide(presetStyle.border?.right);

  return {
    borderTopWidth: top?.width ?? defaultWidth,
    borderTopStyle: 'solid',
    borderTopColor: top?.color ?? defaultColor,
    borderBottomWidth: bottom?.width ?? defaultWidth,
    borderBottomStyle: 'solid',
    borderBottomColor: bottom?.color ?? defaultColor,
    borderLeftWidth: left?.width ?? defaultWidth,
    borderLeftStyle: 'solid',
    borderLeftColor: left?.color ?? defaultColor,
    borderRightWidth: right?.width ?? defaultWidth,
    borderRightStyle: 'solid',
    borderRightColor: right?.color ?? defaultColor,
  };
}

function StyleTile({
  preset,
  isHovered,
  isFocused,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
}: StyleTileProps): JSX.Element {
  const { style, name, description } = preset;

  const bgColor = typeof style.fill === 'string' ? style.fill : '#ffffff';
  const textColor = typeof style.color === 'string' ? style.color : '#000000';
  const borderStyles = tileBorderStyles(style, isFocused);

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      title={description || name}
      style={{
        padding: '8px',
        borderRadius: '3px',
        backgroundColor: bgColor,
        color: textColor,
        fontWeight: style.bold ? 'bold' : 'normal',
        fontStyle: style.italic ? 'italic' : 'normal',
        fontSize: style.fontSize ? `${style.fontSize}px` : '11px',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isHovered ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...borderStyles,
      }}
      aria-label={`${name}${description ? `: ${description}` : ''}`}
    >
      {name}
    </div>
  );
}

/**
 * Cell Styles Gallery with Search
 */
export interface CellStylesGalleryWithSearchProps extends CellStylesGalleryProps {
  /** Show search input */
  showSearch?: boolean;
}

export function CellStylesGalleryWithSearch({
  showSearch = true,
  ...props
}: CellStylesGalleryWithSearchProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {showSearch && (
        <input
          type="text"
          placeholder="Search styles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d1d1',
            borderRadius: '3px',
            fontSize: '11px',
            fontFamily: 'Segoe UI, sans-serif',
          }}
          aria-label="Search cell styles"
        />
      )}
      <CellStylesGallery {...props} searchTerm={searchTerm} />
    </div>
  );
}
