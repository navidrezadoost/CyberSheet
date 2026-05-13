/**
 * CellEditOverlay.tsx
 * 
 * In-cell editing overlay that appears when user double-clicks a cell or presses F2.
 * Provides inline formula/value editing with cell reference picking support.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Address } from '@cyber-sheet/core';

export interface CellEditOverlayProps {
  /** The cell being edited */
  cell: Address;
  /** Initial value to edit */
  initialValue: string;
  /** Cell bounds for positioning */
  bounds: { x: number; y: number; width: number; height: number };
  /** Callback when edit is committed (Enter pressed) */
  onCommit: (value: string) => void;
  /** Callback when edit is cancelled (Escape pressed) */
  onCancel: () => void;
  /** Callback when value changes (for tracking current value) */
  onValueChange?: (value: string) => void;
  /** Whether in formula reference picking mode */
  isPickingReference?: boolean;
  /** Callback when reference picking mode changes */
  onReferencePickingChange?: (picking: boolean) => void;
  /** Callback when user clicks a cell while editing formula */
  onCellReferencePicked?: (address: string) => void;
  /** Current zoom level */
  zoom?: number;
}

/**
 * Floating input overlay for in-cell editing
 */
export const CellEditOverlay: React.FC<CellEditOverlayProps> = ({
  cell,
  initialValue,
  bounds,
  onCommit,
  onCancel,
  onValueChange,
  isPickingReference = false,
  onReferencePickingChange,
  onCellReferencePicked,
  zoom = 1,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null as HTMLInputElement | null);

  // Focus and position cursor at end on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end (Excel behavior for F2 and typing)
      inputRef.current.selectionStart = inputRef.current.value.length;
      inputRef.current.selectionEnd = inputRef.current.value.length;
    }
  }, []);

  // Sync with external initialValue changes (for cell reference insertion)
  useEffect(() => {
    setValue(initialValue);
    // Move cursor to end when value changes externally
    if (inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      }, 0);
    }
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Stop propagation to prevent ExcelApp from handling these keys
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Notify parent of value change
    onValueChange?.(newValue);

    // Enable reference picking if typing a formula
    onReferencePickingChange?.(newValue.startsWith('='));
  };

  const handleBlur = () => {
    // Commit on blur unless picking references
    if (!isPickingReference) {
      onCommit(value);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: 'absolute',
        left: `${bounds.x * zoom}px`,
        top: `${bounds.y * zoom}px`,
        width: `${bounds.width * zoom}px`,
        height: `${bounds.height * zoom}px`,
        // Excel-like styling: no heavy border, just use the cell's selection border
        border: 'none',
        backgroundColor: '#ffffff',
        // Match renderer's exact font
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: `${11 * zoom}px`,
        // Match renderer's cell padding (4px horizontal, 2px vertical)
        padding: `${2 * zoom}px ${4 * zoom}px`,
        margin: 0,
        outline: 'none',
        boxSizing: 'border-box',
        zIndex: 1001,  // Higher than overlay wrapper to receive clicks
        // No box shadow - Excel doesn't have one
        boxShadow: 'none',
        pointerEvents: 'auto',
        // Text rendering to match canvas
        lineHeight: `${bounds.height * zoom - 4 * zoom}px`,
        verticalAlign: 'middle',
      }}
      spellCheck={false}
      autoComplete="off"
    />
  );
};
