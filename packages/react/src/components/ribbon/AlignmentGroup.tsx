/**
 * AlignmentGroup — Excel Home tab layout (grid + side tools | wrap/merge).
 */

import React, { useCallback, useRef, useState } from "react";
import {
  TextAlignLeftRegular,
  TextAlignCenterRegular,
  TextAlignRightRegular,
  AlignTopRegular,
  AlignCenterVerticalRegular,
  AlignBottomRegular,
  TextWrapRegular,
  TableCellsMergeRegular,
  ChevronDown16Regular,
  TextDirectionHorizontalLtrRegular,
} from "@fluentui/react-icons";
import { RibbonButton } from "./RibbonButton";
import { HorizontalAlignGroup, VerticalAlignGroup } from "./RibbonToggleGroup";
import { RibbonPopoverPanel } from "./RibbonPopoverPanel";
import type { StyleState } from "./types";

export interface AlignmentGroupProps {
  horizontalAlign?: StyleState<"left" | "center" | "right" | "justify">;
  verticalAlign?: StyleState<"top" | "middle" | "bottom">;
  wrapText?: StyleState<boolean>;
  onHorizontalAlignChange: (
    align: "left" | "center" | "right" | "justify",
  ) => void;
  onVerticalAlignChange: (align: "top" | "middle" | "bottom") => void;
  onWrapTextToggle: () => void;
  onMergeClick?: () => void;
  onMergeCellsClick?: () => void;
  onUnmergeClick?: () => void;
  onIncreaseIndent?: () => void;
  onDecreaseIndent?: () => void;
  onOrientationClick?: () => void;
  canMerge?: boolean;
  disabled?: boolean;
}

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
  onIncreaseIndent,
  onDecreaseIndent,
  onOrientationClick,
  canMerge = true,
  disabled = false,
}: AlignmentGroupProps) {
  const [mergeMenuOpen, setMergeMenuOpen] = useState(false);
  const mergeMenuRef = useRef<HTMLDivElement>(null);

  const runMergeAction = useCallback(
    (action?: () => void) => {
      if (!action || disabled) return;
      action();
      setMergeMenuOpen(false);
    },
    [disabled],
  );

  const effectiveHorizontal =
    horizontalAlign === "mixed" || horizontalAlign === undefined
      ? undefined
      : horizontalAlign;

  const effectiveVertical =
    verticalAlign === "mixed" || verticalAlign === undefined
      ? undefined
      : verticalAlign;

  const effectiveWrap =
    wrapText === "mixed" || wrapText === undefined ? false : wrapText;

  return (
    <div className="align-group-content home-alignment-group">
      <div className="home-alignment-body">
        <div className="home-alignment-left">
          <div className="home-align-grid">
            <VerticalAlignGroup
              value={verticalAlign === "mixed" ? "mixed" : effectiveVertical}
              onChange={onVerticalAlignChange}
              disabled={disabled}
            >
              <RibbonButton
                className="home-align-hit"
                value="top"
                icon={<AlignTopRegular />}
                tooltip="Align Top"
                size="small"
              />
              <RibbonButton
                className="home-align-hit"
                value="middle"
                icon={<AlignCenterVerticalRegular />}
                tooltip="Align Middle"
                size="small"
              />
              <RibbonButton
                className="home-align-hit"
                value="bottom"
                icon={<AlignBottomRegular />}
                tooltip="Align Bottom"
                size="small"
              />
            </VerticalAlignGroup>
            <HorizontalAlignGroup
              value={horizontalAlign === "mixed" ? "mixed" : effectiveHorizontal}
              onChange={onHorizontalAlignChange}
              disabled={disabled}
            >
              <RibbonButton
                className="home-align-hit"
                value="left"
                icon={<TextAlignLeftRegular />}
                tooltip="Align Left"
                size="small"
              />
              <RibbonButton
                className="home-align-hit"
                value="center"
                icon={<TextAlignCenterRegular />}
                tooltip="Align Center"
                size="small"
              />
              <RibbonButton
                className="home-align-hit"
                value="right"
                icon={<TextAlignRightRegular />}
                tooltip="Align Right"
                size="small"
              />
            </HorizontalAlignGroup>
          </div>

          <div className="home-align-side-tools">
            <div className="home-align-orient-split">
              <button
                type="button"
                className="home-align-hit home-align-icon-btn"
                onClick={onOrientationClick}
                disabled={disabled || !onOrientationClick}
                title="Orientation"
                aria-label="Orientation"
              >
                <TextDirectionHorizontalLtrRegular />
              </button>
              <button
                type="button"
                className="home-align-hit home-align-mini-chevron"
                disabled={disabled || !onOrientationClick}
                aria-label="Orientation options"
                title="Orientation options"
              >
                <span className="home-align-chevron" aria-hidden>
                  ▼
                </span>
              </button>
            </div>
            <div className="home-align-indent-row">
              <RibbonButton
                className="home-align-hit"
                icon={<span className="home-align-indent-glyph home-align-indent-dec" aria-hidden />}
                tooltip="Decrease Indent"
                onClick={onDecreaseIndent}
                disabled={disabled || !onDecreaseIndent}
                size="small"
              />
              <RibbonButton
                className="home-align-hit"
                icon={<span className="home-align-indent-glyph home-align-indent-inc" aria-hidden />}
                tooltip="Increase Indent"
                onClick={onIncreaseIndent}
                disabled={disabled || !onIncreaseIndent}
                size="small"
              />
            </div>
          </div>
        </div>

        <span className="home-align-vsep" aria-hidden />

        <div className="home-align-text-actions">
          <button
            type="button"
            className={`home-align-text-btn home-align-hit${effectiveWrap ? " active" : ""}`}
            onClick={onWrapTextToggle}
            disabled={disabled}
            title="Wrap Text"
          >
            <TextWrapRegular />
            <span>Wrap Text</span>
          </button>

          {onMergeClick && (
            <div className="home-align-merge-split" ref={mergeMenuRef}>
              <button
                type="button"
                className="home-align-text-btn home-align-hit home-align-merge-main"
                onClick={() => runMergeAction(onMergeClick)}
                disabled={disabled || !canMerge}
                title="Merge & Center"
              >
                <TableCellsMergeRegular />
                <span>Merge &amp; Center</span>
              </button>
              <button
                type="button"
                className="home-align-hit home-align-merge-chevron"
                onClick={() => setMergeMenuOpen((open) => !open)}
                disabled={disabled}
                aria-expanded={mergeMenuOpen}
                aria-label="Merge options"
                title="Merge options"
              >
                <ChevronDown16Regular />
              </button>

              <RibbonPopoverPanel
                open={mergeMenuOpen}
                anchorRef={mergeMenuRef}
                style={{ minWidth: 180 }}
              >
                <div
                  className={`cs-ribbon-popover-item${canMerge ? "" : " disabled"}`}
                  role="menuitem"
                  onClick={() =>
                    runMergeAction(canMerge ? onMergeClick : undefined)
                  }
                >
                  Merge &amp; Center
                </div>
                <div
                  className={`cs-ribbon-popover-item${canMerge ? "" : " disabled"}`}
                  role="menuitem"
                  onClick={() =>
                    runMergeAction(
                      canMerge ? (onMergeCellsClick ?? onMergeClick) : undefined,
                    )
                  }
                >
                  Merge Cells
                </div>
                <div
                  className="cs-ribbon-popover-item"
                  role="menuitem"
                  onClick={() => runMergeAction(onUnmergeClick)}
                >
                  Unmerge Cells
                </div>
              </RibbonPopoverPanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
