/**
 * BorderButton Component
 * 
 * Split button for border operations - validates that split button pattern
 * from Font/Fill Color scales to a third complex implementation without forking.
 * 
 * Structure:
 * - Main button (32px): Apply last-used border preset
 * - Dropdown button (16px): Open full border panel
 * 
 * Reuses: Split button pattern, mixed-state logic, keyboard handling
 * New: Border-specific preview icon, preset memory
 */

import React, { useState, useRef, useCallback } from "react";
import { ChevronDown16Regular, BorderAllRegular } from "@fluentui/react-icons";
import { BorderDropdown } from "./BorderDropdown";
import type { BorderValue, BorderPayload, BorderPreset, BorderStyle } from "./borderTypes";
import { getDefaultBorder, resolvePreset } from "./borderTypes";
import { resolveBorder, isMixedBorder, getBorderColor } from "./borderUtils";
import type { StyleState } from "./types";

interface BorderButtonProps {
  /** Current selection's border state (may be "mixed") */
  selectionBorder?: StyleState<BorderValue>;

  /** Callback when border command is executed */
  onApply: (payloads: BorderPayload[]) => void;

  /** Disabled state */
  disabled?: boolean;
}

export function BorderButton({
  selectionBorder,
  onApply,
  disabled = false,
}: BorderButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Last used border preset (remembers user's most recent operation)
  const [lastUsedPreset, setLastUsedPreset] = useState<BorderPreset>("bottom");

  // Current style/color for dropdown state
  const [currentStyle, setCurrentStyle] = useState<BorderStyle>("thin");
  const [currentColor, setCurrentColor] = useState<string>("#000000");

  /**
   * Resolve effective border for preview
   * Logic: selection → lastUsed → default (thin black)
   */
  const effectiveBorder = resolveBorder(
    selectionBorder,
    { style: currentStyle, color: currentColor }
  );

  const isMixed = isMixedBorder(selectionBorder);

  /**
   * Apply last-used border preset (main button click)
   */
  const handleMainButtonClick = useCallback(() => {
    if (disabled) return;

    const payloads = resolvePreset(lastUsedPreset, currentColor, currentStyle);
    onApply(payloads);
  }, [disabled, lastUsedPreset, currentColor, currentStyle, onApply]);

  /**
   * Toggle dropdown (dropdown button click)
   */
  const handleDropdownButtonClick = useCallback(() => {
    if (disabled) return;
    setIsDropdownOpen((prev) => !prev);
  }, [disabled]);

  /**
   * Handle preset selection from dropdown
   */
  const handlePresetApply = useCallback(
    (payloads: BorderPayload[]) => {
      // Extract preset from first payload (works for all presets)
      const firstPayload = payloads[0];
      if (firstPayload) {
        setCurrentStyle(firstPayload.style);
        setCurrentColor(firstPayload.color);

        // Infer preset from payload (simplified - could be more sophisticated)
        // For now, default to "all" if multiple positions, else first position
        if (payloads.length > 1 || firstPayload.position === "all") {
          setLastUsedPreset("all");
        } else {
          // Map position to preset
          const presetMap: Record<string, BorderPreset> = {
            top: "top",
            bottom: "bottom",
            left: "left",
            right: "right",
            clear: "none",
            outer: "outer",
          };
          setLastUsedPreset(presetMap[firstPayload.position] || "bottom");
        }
      }

      try {
        onApply(payloads);
      } finally {
        setIsDropdownOpen(false);
      }
    },
    [onApply]
  );

  /**
   * Handle style change from dropdown
   */
  const handleStyleChange = useCallback((style: BorderStyle) => {
    setCurrentStyle(style);
  }, []);

  /**
   * Handle color change from dropdown
   */
  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  /**
   * Render border preview icon
   * Shows current border style/color in main button
   */
  const renderPreviewIcon = () => {
    // If mixed state, show generic icon with no highlight
    if (isMixed) {
      return <BorderAllRegular className="cs-border-preview-icon" />;
    }

    // Otherwise show current border
    return (
      <BorderAllRegular
        className="cs-border-preview-icon"
        style={{ color: effectiveBorder.color }}
      />
    );
  };

  return (
    <div
      ref={buttonRef}
      className={`cs-border-split-button ${disabled ? "disabled" : ""} ${
        isMixed ? "mixed" : ""
      }`}
    >
      {/* Main Button: Apply last-used preset */}
      <button
        className="cs-border-main-button"
        onClick={handleMainButtonClick}
        disabled={disabled}
        aria-label="Apply borders"
        title="Borders"
      >
        {renderPreviewIcon()}
      </button>

      {/* Dropdown Button: Open border panel */}
      <button
        className="cs-border-dropdown-button"
        onClick={handleDropdownButtonClick}
        disabled={disabled}
        aria-label="Border options"
        aria-expanded={isDropdownOpen}
      >
        <ChevronDown16Regular />
      </button>

      {/* Border Dropdown Panel */}
      <BorderDropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        currentStyle={currentStyle}
        currentColor={currentColor}
        onStyleChange={handleStyleChange}
        onColorChange={handleColorChange}
        onPresetApply={handlePresetApply}
        buttonRef={buttonRef}
      />
    </div>
  );
}
