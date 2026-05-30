/**
 * BorderDropdown Component
 * 
 * Full border panel orchestrating preset grid, line style selector, and color picker.
 * Validates that dropdown pattern from Font/Fill Color scales to multi-section layouts.
 * 
 * Layout (top → bottom):
 * 1. Border Presets (13 common operations)
 * 2. Line Style (13 stroke patterns)
 * 3. Line Color (reuses ColorGrid 100%)
 */

import React, { useRef, useEffect, useState } from "react";
import { BorderPresetGrid } from "./BorderPresetGrid";
import { LineStyleGrid } from "./LineStyleGrid";
import { ColorGrid } from "./ColorGrid";
import { THEME_COLORS } from "./colors";
import type { BorderStyle, BorderPayload, BorderValue } from "./borderTypes";

interface BorderDropdownProps {
  /** Whether dropdown is currently open */
  isOpen: boolean;

  /** Callback to close dropdown */
  onClose: () => void;

  /** Current border style (for preview and selection) */
  currentStyle: BorderStyle;

  /** Current border color (for preview and selection) */
  currentColor: string;

  /** Callback when style changes */
  onStyleChange: (style: BorderStyle) => void;

  /** Callback when color changes */
  onColorChange: (color: string) => void;

  /** Callback when preset is applied */
  onPresetApply: (payloads: BorderPayload[]) => void;

  /** Position dropdown relative to button */
  buttonRef: React.RefObject<HTMLDivElement>;
}

export function BorderDropdown({
  isOpen,
  onClose,
  currentStyle,
  currentColor,
  onStyleChange,
  onColorChange,
  onPresetApply,
  buttonRef,
}: BorderDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<"presets" | "style" | "color">("presets");

  /**
   * Outside click detection (reuses pattern from Font/Fill Color)
   * Uses composedPath() for shadow DOM / portal compatibility
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath();

      // Check if click is inside dropdown or button
      const isInsideDropdown = dropdownRef.current && path.includes(dropdownRef.current);
      const isInsideButton = buttonRef.current && path.includes(buttonRef.current);

      if (!isInsideDropdown && !isInsideButton) {
        onClose();
      }
    };

    // Use pointerdown (more reliable than click)
    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  /**
   * ESC key handling (reuses pattern)
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="cs-border-dropdown"
      role="dialog"
      aria-label="Border options"
    >
      {/* Section 1: Border Presets (most common operations) */}
      <div className="cs-border-section">
        <div className="cs-border-section-label">Border Presets</div>
        <BorderPresetGrid
          onSelect={(preset, payloads) => {
            try {
              onPresetApply(payloads);
            } finally {
              onClose(); // Close after applying preset, even if apply reports an error.
            }
          }}
          currentColor={currentColor}
          currentStyle={currentStyle}
        />
      </div>

      {/* Separator */}
      <div className="cs-border-separator" />

      {/* Section 2: Line Style */}
      <div className="cs-border-section">
        <div className="cs-border-section-label">Line Style</div>
        <LineStyleGrid
          value={currentStyle}
          onChange={(style) => {
            onStyleChange(style);
            setActiveSection("style");
          }}
          color={currentColor}
        />
      </div>

      {/* Separator */}
      <div className="cs-border-separator" />

      {/* Section 3: Line Color (reuses ColorGrid 100%) */}
      <div className="cs-border-section">
        <div className="cs-border-section-label">Line Color</div>

        {/* Theme Colors (reused component) */}
        <div className="cs-section-subtitle">Theme Colors</div>
        <ColorGrid
          colors={THEME_COLORS}
          selectedColor={currentColor}
          onSelect={(color) => {
            onColorChange(color);
            setActiveSection("color");
          }}
        />

        {/* Standard Colors (reused component) */}
        <div className="cs-section-subtitle">Standard Colors</div>
        <div className="cs-standard-colors">
          {STANDARD_COLORS.map((color) => (
            <div
              key={color}
              className={`cs-color-swatch ${currentColor === color ? "selected" : ""}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                onColorChange(color);
                setActiveSection("color");
              }}
              role="button"
              aria-label={`Color ${color}`}
              tabIndex={0}
            />
          ))}
        </div>

        {/* TODO: Recent Colors (add later with useRecentColors hook) */}
      </div>
    </div>
  );
}

/**
 * Standard colors (Excel 365 exact palette)
 * Reused from Font/Fill Color system
 */
const STANDARD_COLORS = [
  "#C00000",
  "#FF0000",
  "#FFC000",
  "#FFFF00",
  "#92D050",
  "#00B050",
  "#00B0F0",
  "#0070C0",
  "#002060",
  "#7030A0",
];
