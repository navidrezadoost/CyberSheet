/**
 * BorderPresetGrid Component
 * 
 * Grid of 13 common Excel border presets (bottom, top, all, outer, etc.)
 * Reuses 2D keyboard navigation pattern from ColorGrid/PatternGrid.
 * 
 * Layout: 2 columns × 7 rows (last cell empty)
 * Cell size: ~200×28px (icon + label, Excel-exact spacing)
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  BorderBottomRegular,
  BorderTopRegular,
  BorderLeftRegular,
  BorderRightRegular,
  BorderNoneRegular,
  BorderAllRegular,
  BorderBottomDoubleRegular,
  BorderBottomThickRegular,
  BorderTopBottomRegular,
  BorderTopBottomDoubleRegular,
} from "@fluentui/react-icons";
import type { BorderPreset, BorderPayload } from "./borderTypes";
import { BORDER_PRESETS, resolvePreset } from "./borderTypes";

interface BorderPresetGridProps {
  /** Callback when user selects a preset */
  onSelect: (preset: BorderPreset, payloads: BorderPayload[]) => void;

  /** Current border color (affects preset operations) */
  currentColor: string;

  /** Current border style (affects preset operations) */
  currentStyle?: import("./borderTypes").BorderStyle;
}

/**
 * Map icon names to React components
 * Note: Some icons don't exist in FluentUI, using closest alternatives
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BorderBottomRegular,
  BorderTopRegular,
  BorderLeftRegular,
  BorderRightRegular,
  BorderNoneRegular,
  BorderAllRegular,
  BorderOuterRegular: BorderAllRegular, // Using BorderAllRegular as fallback
  BorderBottomDoubleRegular,
  BorderBottomThickRegular,
  BorderTopBottomRegular,
  BorderTopBottomDoubleRegular,
};

/**
 * Render icon for a border preset
 */
function PresetIcon({ iconName }: { iconName: string }) {
  const IconComponent = ICON_MAP[iconName] || BorderAllRegular;
  return <IconComponent className="cs-preset-icon" />;
}

export function BorderPresetGrid({
  onSelect,
  currentColor,
  currentStyle,
}: BorderPresetGridProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const numColumns = 2;
  const numPresets = BORDER_PRESETS.length;

  /**
   * Handle keyboard navigation (2D grid pattern from ColorGrid)
   * Arrow keys: navigate grid
   * Enter/Space: select focused preset
   * ESC: bubble up to parent
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const row = Math.floor(focusedIndex / numColumns);
      const col = focusedIndex % numColumns;
      const numRows = Math.ceil(numPresets / numColumns);

      switch (event.key) {
        case "ArrowRight": {
          event.preventDefault();
          if (col < numColumns - 1 && focusedIndex + 1 < numPresets) {
            setFocusedIndex(focusedIndex + 1);
          }
          break;
        }

        case "ArrowLeft": {
          event.preventDefault();
          if (col > 0) {
            setFocusedIndex(focusedIndex - 1);
          }
          break;
        }

        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = focusedIndex + numColumns;
          if (nextIndex < numPresets) {
            setFocusedIndex(nextIndex);
          }
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          const prevIndex = focusedIndex - numColumns;
          if (prevIndex >= 0) {
            setFocusedIndex(prevIndex);
          }
          break;
        }

        case "Enter":
        case " ": {
          event.preventDefault();
          const preset = BORDER_PRESETS[focusedIndex];
          const payloads = resolvePreset(preset.id, currentColor, currentStyle);
          onSelect(preset.id, payloads);
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
    [focusedIndex, numPresets, currentColor, currentStyle, onSelect]
  );

  /**
   * Handle click selection
   */
  const handleClick = useCallback(
    (preset: BorderPreset, index: number) => {
      setFocusedIndex(index);
      const payloads = resolvePreset(preset, currentColor, currentStyle);
      onSelect(preset, payloads);
    },
    [currentColor, currentStyle, onSelect]
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
      className="cs-border-preset-grid"
      role="listbox"
      aria-label="Border presets"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {BORDER_PRESETS.map((preset, index) => {
        const isFocused = focusedIndex === index;

        return (
          <div
            key={preset.id}
            className={`cs-border-preset-cell ${isFocused ? "focused" : ""}`}
            role="option"
            aria-selected={isFocused}
            tabIndex={-1} // Grid handles focus, not individual cells
            onClick={() => handleClick(preset.id, index)}
            onMouseEnter={() => setFocusedIndex(index)}
          >
            <PresetIcon iconName={preset.icon} />
            <span className="cs-preset-label">{preset.label}</span>
          </div>
        );
      })}
    </div>
  );
}
