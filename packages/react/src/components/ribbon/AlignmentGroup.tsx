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

import React, { useCallback, useEffect, useRef, useState } from "react";
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

  /** Callback when merge & center is clicked */
  onMergeClick?: () => void;

  /** Callback when merge cells (no center) is chosen */
  onMergeCellsClick?: () => void;

  /** Callback when unmerge cells is chosen */
  onUnmergeClick?: () => void;

  /** Whether the current selection spans multiple cells */
  canMerge?: boolean;

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
  onMergeCellsClick,
  onUnmergeClick,
  canMerge = true,
  disabled = false,
}: AlignmentGroupProps) {
  const [mergeMenuOpen, setMergeMenuOpen] = useState(false);
  const mergeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mergeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (mergeMenuRef.current && !mergeMenuRef.current.contains(event.target as Node)) {
        setMergeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [mergeMenuOpen]);

  const runMergeAction = useCallback((action?: () => void) => {
    if (!action || disabled) return;
    action();
    setMergeMenuOpen(false);
  }, [disabled]);
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
            <div className="cs-merge-split-button" ref={mergeMenuRef}>
              <button
                type="button"
                className="cs-merge-main-button"
                onClick={() => runMergeAction(onMergeClick)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled || !canMerge}
                aria-label="Merge cells"
                title="Merge & Center"
              >
                <TableCellsMergeRegular />
              </button>
              <button
                type="button"
                className="cs-merge-dropdown-button"
                onClick={() => setMergeMenuOpen((open) => !open)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled}
                aria-label="Merge options"
                aria-expanded={mergeMenuOpen}
                aria-haspopup="menu"
              >
                <ChevronDown16Regular />
              </button>

              {mergeMenuOpen && (
                <div className="cs-merge-menu" role="menu">
                  <div
                    className={`cs-merge-menu-item${canMerge ? "" : " disabled"}`}
                    role="menuitem"
                    onClick={() => runMergeAction(canMerge ? onMergeClick : undefined)}
                  >
                    Merge &amp; Center
                  </div>
                  <div
                    className={`cs-merge-menu-item${canMerge ? "" : " disabled"}`}
                    role="menuitem"
                    onClick={() => runMergeAction(canMerge ? (onMergeCellsClick ?? onMergeClick) : undefined)}
                  >
                    Merge Cells
                  </div>
                  <div
                    className="cs-merge-menu-item"
                    role="menuitem"
                    onClick={() => runMergeAction(onUnmergeClick)}
                  >
                    Unmerge Cells
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
