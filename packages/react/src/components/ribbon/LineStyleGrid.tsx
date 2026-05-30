/**
 * LineStyleGrid Component
 * 
 * Visual grid of 13 Excel border line styles with SVG previews.
 * Reuses keyboard navigation pattern from ColorGrid/PatternGrid - validates
 * that grid navigation abstraction is generic, not grid-specific.
 * 
 * Layout: 1 column (vertical stack), easier navigation than 2-column
 * Cell size: 160×20px (wide enough for stroke preview + label)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { BorderStyle } from "./borderTypes";
import { LINE_STYLES } from "./borderTypes";

interface LineStyleGridProps {
  /** Currently selected style (highlighted in UI) */
  value?: BorderStyle;

  /** Callback when user selects a style */
  onChange: (style: BorderStyle) => void;

  /** Color to render the line previews (defaults to black) */
  color?: string;
}

/**
 * Render SVG line preview for a border style
 */
function LinePreview({
  style,
  color = "#000000",
}: {
  style: BorderStyle;
  color?: string;
}) {
  const metadata = LINE_STYLES.find((s) => s.style === style);
  if (!metadata) return null;

  // Special case: double border (two parallel lines)
  if (style === "double") {
    return (
      <svg className="cs-line-preview" width="72" height="14" viewBox="0 0 72 14" aria-hidden="true">
        <line x1="2" y1="5" x2="70" y2="5" stroke={color} strokeWidth="1" />
        <line x1="2" y1="9" x2="70" y2="9" stroke={color} strokeWidth="1" />
      </svg>
    );
  }

  // Standard single-line styles
  return (
    <svg className="cs-line-preview" width="72" height="14" viewBox="0 0 72 14" aria-hidden="true">
      <line
        x1="2"
        y1="7"
        x2="70"
        y2="7"
        stroke={color}
        strokeWidth={metadata.strokeWidth}
        strokeDasharray={metadata.strokeDasharray}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LineStyleGrid({
  value,
  onChange,
  color = "#000000",
}: LineStyleGridProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Find currently selected index
  const selectedIndex = value
    ? LINE_STYLES.findIndex((s) => s.style === value)
    : -1;

  /**
   * Handle keyboard navigation (reuses ColorGrid pattern)
   * Arrow keys: navigate grid
   * Enter/Space: select focused item
   * ESC: bubble up to parent
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const numStyles = LINE_STYLES.length;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, numStyles - 1));
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        }

        case "Enter":
        case " ": {
          event.preventDefault();
          onChange(LINE_STYLES[focusedIndex].style);
          break;
        }

        case "Escape": {
          // Let parent handle (close dropdown)
          break;
        }

        default:
          break;
      }
    },
    [focusedIndex, onChange]
  );

  /**
   * Handle click selection
   */
  const handleClick = useCallback(
    (style: BorderStyle, index: number) => {
      setFocusedIndex(index);
      onChange(style);
    },
    [onChange]
  );

  /**
   * Auto-focus grid when mounted (for keyboard nav)
   */
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  return (
    <div
      ref={gridRef}
      className="cs-line-style-grid"
      role="listbox"
      aria-label="Border line styles"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {LINE_STYLES.map((metadata, index) => {
        const isSelected = selectedIndex === index;
        const isFocused = focusedIndex === index;

        return (
          <div
            key={metadata.style}
            className={`cs-line-style-cell ${isSelected ? "selected" : ""} ${
              isFocused ? "focused" : ""
            }`}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1} // Grid handles focus, not individual cells
            onClick={() => handleClick(metadata.style, index)}
            onMouseEnter={() => setFocusedIndex(index)}
          >
            <LinePreview style={metadata.style} color={color} />
            <span className="cs-line-style-label">{metadata.label}</span>
          </div>
        );
      })}
    </div>
  );
}
