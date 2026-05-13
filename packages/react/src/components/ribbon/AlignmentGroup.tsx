/**
 * AlignmentGroup Component
 * 
 * Excel Alignment controls - validates architecture with:
 * - Mutually exclusive states (radio groups)
 * - Compound state (horizontal × vertical × wrap)
 * - Mixed state complexity (horizontal mixed, vertical not)
 * - Button grouping interaction (new pattern)
 * 
 * Layout:
 * Row 1: [Left] [Center] [Right] [Justify]
 * Row 2: [Top] [Middle] [Bottom]
 * Row 3: [Wrap Text] [Merge ▼]
 */

import React, { useCallback } from "react";
import {
  TextAlignLeftRegular,
  TextAlignCenterRegular,
  TextAlignRightRegular,
  TextAlignJustifyRegular,
  AlignTopRegular,
  AlignCenterVerticalRegular,
  AlignBottomRegular,
  TextWrapRegular,
  TableCellsMergeRegular,
  ChevronDown16Regular,
} from "@fluentui/react-icons";
import { RibbonButton } from "./RibbonButton";
import { RibbonRow } from "./RibbonRow";
import { HorizontalAlignGroup, VerticalAlignGroup } from "./RibbonToggleGroup";
import type { StyleState } from "./types";

export interface AlignmentGroupProps {
  /** Current horizontal alignment (may be "mixed") */
  horizontalAlign?: StyleState<"left" | "center" | "right" | "justify">;

  /** Current vertical alignment (may be "mixed") */
  verticalAlign?: StyleState<"top" | "middle" | "bottom">;

  /** Current wrap text state (may be "mixed") */
  wrapText?: StyleState<boolean>;

  /** Callback when horizontal alignment changes */
  onHorizontalAlignChange: (align: "left" | "center" | "right" | "justify") => void;

  /** Callback when vertical alignment changes */
  onVerticalAlignChange: (align: "top" | "middle" | "bottom") => void;

  /** Callback when wrap text toggles */
  onWrapTextToggle: () => void;

  /** Callback when merge button is clicked */
  onMergeClick?: () => void;

  /** Disabled state */
  disabled?: boolean;
}

/**
 * Alignment control group
 * Tests: mutually exclusive groups, compound state, mixed state handling
 * Layout: Vertical column with 3 rows of buttons
 */
export function AlignmentGroup({
  horizontalAlign,
  verticalAlign,
  wrapText,
  onHorizontalAlignChange,
  onVerticalAlignChange,
  onWrapTextToggle,
  onMergeClick,
  disabled = false,
}: AlignmentGroupProps) {
  /**
   * Resolve effective horizontal alignment (defaults to "left")
   */
  const effectiveHorizontal = horizontalAlign === "mixed" || horizontalAlign === undefined
    ? undefined // Let toggle group handle mixed state
    : horizontalAlign;

  /**
   * Resolve effective vertical alignment (defaults to "bottom")
   */
  const effectiveVertical = verticalAlign === "mixed" || verticalAlign === undefined
    ? undefined
    : verticalAlign;

  /**
   * Resolve effective wrap state (defaults to false)
   */
  const effectiveWrap = wrapText === "mixed" || wrapText === undefined
    ? false
    : wrapText;

  return (
    <div className="align-group-content">
      <div className="align-column">
        {/* Row 1: Horizontal Alignment (mutually exclusive) */}
        <div className="align-row">
          <HorizontalAlignGroup
            value={horizontalAlign === "mixed" ? "mixed" : effectiveHorizontal}
            onChange={onHorizontalAlignChange}
            disabled={disabled}
          >
            <RibbonButton
              value="left"
              icon={<TextAlignLeftRegular />}
              tooltip="Align Left"
              size="small"
            />
            <RibbonButton
              value="center"
              icon={<TextAlignCenterRegular />}
              tooltip="Align Center"
              size="small"
            />
            <RibbonButton
              value="right"
              icon={<TextAlignRightRegular />}
              tooltip="Align Right"
              size="small"
            />
            <RibbonButton
              value="justify"
              icon={<TextAlignJustifyRegular />}
              tooltip="Justify"
              size="small"
            />
          </HorizontalAlignGroup>
        </div>

        {/* Row 2: Vertical Alignment (mutually exclusive) */}
        <div className="align-row">
          <VerticalAlignGroup
            value={verticalAlign === "mixed" ? "mixed" : effectiveVertical}
            onChange={onVerticalAlignChange}
            disabled={disabled}
          >
            <RibbonButton
              value="top"
              icon={<AlignTopRegular />}
              tooltip="Align Top"
              size="small"
            />
            <RibbonButton
              value="middle"
              icon={<AlignCenterVerticalRegular />}
              tooltip="Align Middle"
              size="small"
            />
            <RibbonButton
              value="bottom"
              icon={<AlignBottomRegular />}
              tooltip="Align Bottom"
              size="small"
            />
          </VerticalAlignGroup>
        </div>

        {/* Row 3: Wrap Text (independent toggle) + Merge (dropdown future) */}
        <div className="align-row">
          <RibbonButton
            icon={<TextWrapRegular />}
            tooltip="Wrap Text"
            active={effectiveWrap}
            onClick={onWrapTextToggle}
            disabled={disabled}
            size="small"
          />

          {/* Merge button (placeholder - dropdown implementation later) */}
          {onMergeClick && (
            <div className="cs-merge-split-button">
              <button
                className="cs-merge-main-button"
                onClick={onMergeClick}
                disabled={disabled}
                aria-label="Merge cells"
                title="Merge & Center"
              >
                <TableCellsMergeRegular />
              </button>
              <button
                className="cs-merge-dropdown-button"
                disabled={disabled}
                aria-label="Merge options"
                aria-expanded={false}
              >
                <ChevronDown16Regular />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
