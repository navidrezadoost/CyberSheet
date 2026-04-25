import React from 'react';
import './ribbon.css';

export interface ColorGridProps {
  /**
   * 2D array of hex colors
   * - Each sub-array is a column
   * - Rendered left-to-right, top-to-bottom
   */
  colors: string[][];
  
  /**
   * Called when user selects a color
   */
  onSelect: (color: string) => void;
  
  /**
   * Currently selected color (shows border)
   */
  selectedColor?: string;
}

/**
 * ColorGrid - Grid of color swatches for theme colors
 * 
 * Displays Excel-like theme color grid with tint/shade variations.
 * Each column represents a theme color with 6 tint/shade variations.
 * 
 * Layout:
 * - 10 columns (theme colors)
 * - 6 rows per column (tint/shade variations)
 * - 16×16px cells
 * - 2px gap between cells
 * - Hover state: border highlight
 * - Selected state: thick border
 * 
 * @example
 * <ColorGrid 
 *   colors={THEME_COLORS} 
 *   onSelect={(color) => applyColor(color)}
 *   selectedColor="#4472C4"
 * />
 */
export const ColorGrid: React.FC<ColorGridProps> = ({
  colors,
  onSelect,
  selectedColor,
}) => {
  return (
    <div className="cs-color-grid" role="grid" aria-label="Color grid">
      {colors.map((column, colIdx) => (
        <div key={colIdx} className="cs-color-column" role="row">
          {column.map((color, rowIdx) => {
            const isSelected = color === selectedColor;
            
            return (
              <button
                key={`${colIdx}-${rowIdx}`}
                className={`cs-color-cell ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onSelect(color)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(color);
                  }
                }}
                aria-label={`Color ${color}`}
                title={color}
                type="button"
                role="gridcell"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
