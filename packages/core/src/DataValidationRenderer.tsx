/**
 * DataValidationRenderer.ts
 * 
 * Canvas-based rendering for data validation UI elements.
 * Draws dropdown arrows and validation indicators directly on the grid.
 * 
 * Features:
 * - Dropdown arrow for list validation (right edge of cell)
 * - Red triangle indicator for invalid data (top-right corner)
 * - Integration with ExcelRenderer for overlay rendering
 * 
 * Usage:
 * ```typescript
 * const renderer = new DataValidationRenderer(validationEngine);
 * renderer.renderDropdownArrow(ctx, x, y, width, height);
 * renderer.renderInvalidIndicator(ctx, x, y, width, height);
 * ```
 */

import type { DataValidationEngine } from './DataValidationEngine';
import type { Address } from './types';

/**
 * Data Validation Renderer
 * 
 * Handles visual rendering of validation UI elements on canvas.
 */
export class DataValidationRenderer {
  private validationEngine: DataValidationEngine;
  
  constructor(validationEngine: DataValidationEngine) {
    this.validationEngine = validationEngine;
  }
  
  /**
   * Render dropdown arrow for list validation
   * 
   * Draws a small gray triangle arrow on the right edge of the cell,
   * matching Excel's dropdown indicator.
   * 
   * @param ctx Canvas rendering context
   * @param x Cell x position (pixels)
   * @param y Cell y position (pixels)
   * @param width Cell width (pixels)
   * @param height Cell height (pixels)
   */
  public renderDropdownArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const arrowSize = 8;
    const padding = 4;
    const arrowX = x + width - arrowSize - padding;
    const arrowY = y + height / 2;
    
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - 3);
    ctx.lineTo(arrowX + arrowSize, arrowY - 3);
    ctx.lineTo(arrowX + arrowSize / 2, arrowY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  
  /**
   * Render invalid data indicator
   * 
   * Draws a small red triangle in the top-right corner of the cell,
   * indicating that the cell contains invalid data.
   * 
   * @param ctx Canvas rendering context
   * @param x Cell x position (pixels)
   * @param y Cell y position (pixels)
   * @param width Cell width (pixels)
   * @param height Cell height (pixels)
   */
  public renderInvalidIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const size = 6;
    const triangleX = x + width - size;
    const triangleY = y;
    
    ctx.save();
    ctx.fillStyle = '#C00000';
    ctx.beginPath();
    ctx.moveTo(triangleX, triangleY);
    ctx.lineTo(triangleX + size, triangleY);
    ctx.lineTo(triangleX + size, triangleY + size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  
  /**
   * Check if cell should show dropdown arrow
   */
  public shouldShowDropdown(address: Address): boolean {
    return this.validationEngine.shouldShowDropdown(address);
  }
  
  /**
   * Check if cell contains invalid data
   * 
   * @param address Cell address
   * @param value Cell value
   * @returns True if data is invalid
   */
  public isInvalid(address: Address, value: any): boolean {
    const result = this.validationEngine.validateCell(address, value);
    return !result.valid;
  }
  
  /**
   * Get dropdown items for a cell
   * 
   * Returns array of items for list validation dropdown.
   * Returns null if cell doesn't have list validation.
   */
  public getDropdownItems(address: Address): string[] | null {
    return this.validationEngine.getDropdownItems(address);
  }
}

/**
 * Dropdown List Component (React)
 * 
 * Renders a dropdown list overlay for list validation.
 * Positioned below the cell, matching Excel's behavior.
 */
export interface DropdownListProps {
  /** List items */
  items: string[];
  /** Current value */
  value: string;
  /** Selection handler */
  onSelect: (value: string) => void;
  /** Close handler */
  onClose: () => void;
  /** Cell position (pixels) */
  cellX: number;
  cellY: number;
  cellWidth: number;
  cellHeight: number;
}

/**
 * Dropdown List React Component
 * 
 * Usage in ExcelApp or SheetView:
 * ```tsx
 * {showDropdown && (
 *   <DropdownList
 *     items={dropdownItems}
 *     value={currentValue}
 *     onSelect={(val) => setCellValue(val)}
 *     onClose={() => setShowDropdown(false)}
 *     cellX={cellRect.x}
 *     cellY={cellRect.y}
 *     cellWidth={cellRect.width}
 *     cellHeight={cellRect.height}
 *   />
 * )}
 * ```
 */
export function DropdownList({
  items,
  value,
  onSelect,
  onClose,
  cellX,
  cellY,
  cellWidth,
  cellHeight,
}: DropdownListProps) {
  const maxHeight = 300;
  const itemHeight = 24;
  
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-list')) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  
  return (
    <div
      className="dropdown-list"
      style={{
        position: 'absolute',
        left: cellX,
        top: cellY + cellHeight,
        width: cellWidth,
        maxHeight,
        overflowY: 'auto',
        backgroundColor: '#fff',
        border: '1px solid #d1d1d1',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          onClick={() => {
            onSelect(item);
            onClose();
          }}
          style={{
            padding: '4px 8px',
            height: itemHeight,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: item === value ? '#e6f2ff' : 'transparent',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              item === value ? '#e6f2ff' : 'transparent';
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

/**
 * Helper: Import React for DropdownList component
 */
import React from 'react';
